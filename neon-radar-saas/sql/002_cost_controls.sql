-- NEON RADAR — limites de custo e acesso por plano (migração adicional).
-- Rodar após schema.sql. NUNCA colocar um segredo nesta migração.
CREATE TABLE IF NOT EXISTS public.nr_plan_limits (
  plan text NOT NULL CHECK(plan IN ('gratuito','profissional','empresarial')),
  kind text NOT NULL CHECK(kind IN ('search','detail','route','autocomplete','ai')),
  daily_limit integer NOT NULL CHECK(daily_limit BETWEEN 0 AND 100000),
  PRIMARY KEY(plan,kind)
);
CREATE TABLE IF NOT EXISTS public.nr_global_limits (
  kind text PRIMARY KEY CHECK(kind IN ('search','detail','route','autocomplete','ai')),
  daily_limit integer NOT NULL CHECK(daily_limit BETWEEN 0 AND 100000)
);
CREATE TABLE IF NOT EXISTS public.nr_global_usage_daily (
  usage_date date NOT NULL,
  kind text NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  PRIMARY KEY(usage_date,kind)
);
ALTER TABLE public.nr_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nr_global_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nr_global_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nr_plan_limits, public.nr_global_limits, public.nr_global_usage_daily FROM anon, authenticated;
INSERT INTO public.nr_plan_limits(plan,kind,daily_limit) VALUES
 ('gratuito','search',3),('gratuito','detail',15),('gratuito','route',3),('gratuito','autocomplete',15),('gratuito','ai',0),
 ('profissional','search',30),('profissional','detail',60),('profissional','route',25),('profissional','autocomplete',80),('profissional','ai',15),
 ('empresarial','search',80),('empresarial','detail',160),('empresarial','route',60),('empresarial','autocomplete',200),('empresarial','ai',40)
ON CONFLICT(plan,kind) DO NOTHING;
INSERT INTO public.nr_global_limits(kind,daily_limit) VALUES
 ('search',80),('detail',180),('route',60),('autocomplete',200),('ai',40)
ON CONFLICT(kind) DO NOTHING;

CREATE OR REPLACE FUNCTION public.nr_consume_quota(p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 u uuid := auth.uid(); tier text; cap int; cap_all int; individual int; global_count int;
 day_utc date := (now() at time zone 'utc')::date;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 IF p_kind NOT IN ('search','detail','route','autocomplete','ai') THEN RAISE EXCEPTION 'Operação inválida'; END IF;
 -- Série pequena e determinística de locks transacionais: evita corrida entre usuários.
 PERFORM pg_advisory_xact_lock(hashtext('neon-global:'||day_utc::text||':'||p_kind));
 SELECT COALESCE(p.plan,'gratuito') INTO tier FROM (SELECT 1) anchor LEFT JOIN public.nr_profiles p ON p.id=u;
 tier := COALESCE(tier,'gratuito');
 SELECT daily_limit INTO cap FROM public.nr_plan_limits WHERE plan=tier AND kind=p_kind;
 SELECT daily_limit INTO cap_all FROM public.nr_global_limits WHERE kind=p_kind;
 IF cap IS NULL OR cap_all IS NULL THEN RETURN jsonb_build_object('allowed',false,'remaining',0,'reason','not_configured'); END IF;
 IF cap=0 THEN RETURN jsonb_build_object('allowed',false,'remaining',0,'plan',tier,'reason','upgrade_required'); END IF;
 SELECT COALESCE(calls,0) INTO individual FROM public.nr_usage_daily WHERE user_id=u AND usage_date=day_utc AND kind=p_kind;
 individual := COALESCE(individual,0);
 SELECT COALESCE(calls,0) INTO global_count FROM public.nr_global_usage_daily WHERE usage_date=day_utc AND kind=p_kind;
 global_count := COALESCE(global_count,0);
 IF individual>=cap THEN RETURN jsonb_build_object('allowed',false,'remaining',0,'plan',tier,'reason','user_limit'); END IF;
 IF global_count>=cap_all THEN RETURN jsonb_build_object('allowed',false,'remaining',0,'plan',tier,'reason','global_limit'); END IF;
 INSERT INTO public.nr_usage_daily(user_id,usage_date,kind,calls) VALUES(u,day_utc,p_kind,1)
 ON CONFLICT(user_id,usage_date,kind) DO UPDATE SET calls=nr_usage_daily.calls+1;
 INSERT INTO public.nr_global_usage_daily(usage_date,kind,calls) VALUES(day_utc,p_kind,1)
 ON CONFLICT(usage_date,kind) DO UPDATE SET calls=nr_global_usage_daily.calls+1;
 RETURN jsonb_build_object('allowed',true,'remaining',cap-individual-1,'plan',tier,'global_remaining',cap_all-global_count-1);
END $$;
REVOKE ALL ON FUNCTION public.nr_consume_quota(text) FROM public;
GRANT EXECUTE ON FUNCTION public.nr_consume_quota(text) TO authenticated;

-- Contas gratuitas podem explorar dados básicos; CRM/IA são planos pagos.
CREATE OR REPLACE FUNCTION public.nr_has_professional_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.nr_profiles WHERE id=auth.uid() AND plan IN ('profissional','empresarial'));
$$;
REVOKE ALL ON FUNCTION public.nr_has_professional_access() FROM public;
GRANT EXECUTE ON FUNCTION public.nr_has_professional_access() TO authenticated;

-- Políticas restritivas complementam as políticas atuais e previnem acesso direto via Supabase.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nr_favorites' AND policyname='nr_professional_favorites') THEN
  CREATE POLICY nr_professional_favorites ON public.nr_favorites AS RESTRICTIVE FOR ALL TO authenticated
   USING (public.nr_has_professional_access()) WITH CHECK (public.nr_has_professional_access());
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nr_leads' AND policyname='nr_professional_leads') THEN
  CREATE POLICY nr_professional_leads ON public.nr_leads AS RESTRICTIVE FOR ALL TO authenticated
   USING (public.nr_has_professional_access()) WITH CHECK (public.nr_has_professional_access());
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nr_tasks' AND policyname='nr_professional_tasks') THEN
  CREATE POLICY nr_professional_tasks ON public.nr_tasks AS RESTRICTIVE FOR ALL TO authenticated
   USING (public.nr_has_professional_access()) WITH CHECK (public.nr_has_professional_access());
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nr_interactions' AND policyname='nr_professional_interactions') THEN
  CREATE POLICY nr_professional_interactions ON public.nr_interactions AS RESTRICTIVE FOR ALL TO authenticated
   USING (public.nr_has_professional_access()) WITH CHECK (public.nr_has_professional_access());
 END IF;
END $$;
-- Administrador controla planos/limites via SQL Editor. Não há cobrança ativa.
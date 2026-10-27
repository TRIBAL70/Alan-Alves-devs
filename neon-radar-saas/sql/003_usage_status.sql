-- NEON RADAR — leitura autenticada do consumo próprio por operação (sem dados de outros usuários).
CREATE OR REPLACE FUNCTION public.nr_usage_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
 u uuid := auth.uid(); tier text; day_utc date := (now() at time zone 'utc')::date; kinds jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 SELECT plan INTO tier FROM public.nr_profiles WHERE id=u;
 tier:=coalesce(tier,'gratuito');
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'kind', l.kind,
  'limit',l.daily_limit,
  'used',coalesce(my.calls,0),
  'remaining',greatest(0,l.daily_limit-coalesce(my.calls,0)),
  'globalRemaining',greatest(0,coalesce(g.daily_limit,0)-coalesce(all_usage.calls,0))
 ) ORDER BY l.kind),'[]'::jsonb) INTO kinds
 FROM public.nr_plan_limits l
 LEFT JOIN public.nr_usage_daily my ON my.user_id=u AND my.usage_date=day_utc AND my.kind=l.kind
 LEFT JOIN public.nr_global_limits g ON g.kind=l.kind
 LEFT JOIN public.nr_global_usage_daily all_usage ON all_usage.kind=l.kind AND all_usage.usage_date=day_utc
 WHERE l.plan=tier;
 RETURN jsonb_build_object('day',day_utc,'plan',tier,'kinds',kinds);
END $$;
REVOKE ALL ON FUNCTION public.nr_usage_status() FROM public;
GRANT EXECUTE ON FUNCTION public.nr_usage_status() TO authenticated;
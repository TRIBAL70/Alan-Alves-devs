-- NEON RADAR: safe administrator module.
-- IMPORTANT: never make administrator enrollment depend solely on the supplied email.
-- Create a user with Supabase Auth, confirm ownership, then approve the user_id
-- from an authenticated owner management session. Do NOT store passwords in SQL.
CREATE TABLE IF NOT EXISTS public.nr_admins (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nr_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nr_admins FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.nr_admins TO authenticated;
DROP POLICY IF EXISTS nr_admin_self_select ON public.nr_admins;
CREATE POLICY nr_admin_self_select ON public.nr_admins FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.nr_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.nr_admins WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.nr_is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nr_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.nr_admin_list_users()
RETURNS TABLE(id uuid,email text,plan text,joined_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.nr_is_admin() THEN
  RAISE EXCEPTION 'Acesso administrativo não autorizado' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT u.id,u.email::text,coalesce(p.plan,'gratuito'),u.created_at
 FROM auth.users u LEFT JOIN public.nr_profiles p ON p.id=u.id
 ORDER BY u.created_at DESC LIMIT 100;
END;$$;
REVOKE ALL ON FUNCTION public.nr_admin_list_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nr_admin_list_users() TO authenticated;

CREATE TABLE IF NOT EXISTS public.nr_admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL,
 target_id uuid NOT NULL,
 action text NOT NULL,
 detail text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nr_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nr_admin_audit FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.nr_admin_set_plan(p_user_id uuid,p_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.nr_is_admin() THEN
  RAISE EXCEPTION 'Acesso administrativo não autorizado' USING ERRCODE='42501';
 END IF;
 IF p_plan NOT IN ('gratuito','profissional','empresarial') THEN
  RAISE EXCEPTION 'Plano inválido' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
  RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.nr_admins WHERE user_id=p_user_id) AND p_plan<>'empresarial' THEN
  RAISE EXCEPTION 'O administrador deve permanecer no plano empresarial' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.nr_profiles(id,plan) VALUES(p_user_id,p_plan)
  ON CONFLICT(id) DO UPDATE SET plan=EXCLUDED.plan;
 INSERT INTO public.nr_admin_audit(actor_id,target_id,action,detail)
 VALUES(auth.uid(),p_user_id,'plan',p_plan);
END;$$;
REVOKE ALL ON FUNCTION public.nr_admin_set_plan(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nr_admin_set_plan(uuid,text) TO authenticated;

-- MANUAL OWNER APPROVAL ONLY. Never create auth.users accounts with raw SQL.
-- After the owner signs up and verifies their account, use an owner-authorized
-- admin operation to insert the vetted auth.users.id into public.nr_admins.

-- NEON RADAR v3 — executar no SQL Editor do Supabase ANTES de ativar autenticação.
-- Persistir somente Place IDs / dados comerciais CRIADOS PELO USUÁRIO; não copiar o banco do Google.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 plan text not null default 'gratuito' check (plan in ('gratuito','profissional','empresarial')),
 created_at timestamptz not null default now()
);
create or replace function public.on_auth_created() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end $$;
drop trigger if exists auth_user_created_neon on auth.users;
create trigger auth_user_created_neon after insert on auth.users for each row execute function public.on_auth_created();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

create table if not exists public.favorites (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 place_id text not null check(length(place_id)between 8 and 180),created_at timestamptz default now(),
 unique(user_id,place_id)
);
create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 place_id text not null check(length(place_id)between 8 and 180),
 status text not null default 'Novo' check(status in ('Novo','Em análise','Contatado','Em negociação','Convertido','Encerrado')),
 notes text not null default '' check(length(notes)<=3000),created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),unique(user_id,place_id)
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 lead_id uuid not null references public.leads(id) on delete cascade,title text not null check(length(title)<=180),
 due_at timestamptz,done boolean not null default false,created_at timestamptz default now()
);
create table if not exists public.interactions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 lead_id uuid not null references public.leads(id) on delete cascade,
 kind text not null default 'nota',description text not null check(length(description)<=2000),created_at timestamptz default now()
);
create table if not exists public.search_history (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 query text not null check(length(query)<=180),result_count int not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.usage_daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_date date not null default (now() at time zone 'utc')::date,
 kind text not null,calls int not null default 0,
 primary key(user_id,usage_date,kind)
);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.interactions enable row level security;
alter table public.search_history enable row level security;
alter table public.usage_daily enable row level security;

create policy "profiles_self_read" on public.profiles for select to authenticated using(id=auth.uid());
-- Sem policy de UPDATE em profiles: impede que o usuário mude o próprio plano.

create policy "fav_select" on public.favorites for select to authenticated using(user_id=auth.uid());
create policy "fav_insert" on public.favorites for insert to authenticated with check(user_id=auth.uid());
create policy "fav_delete" on public.favorites for delete to authenticated using(user_id=auth.uid());

create policy "leads_select" on public.leads for select to authenticated using(user_id=auth.uid());
create policy "leads_insert" on public.leads for insert to authenticated with check(user_id=auth.uid());
create policy "leads_update" on public.leads for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "leads_delete" on public.leads for delete to authenticated using(user_id=auth.uid());

create policy "tasks_select" on public.tasks for select to authenticated using(user_id=auth.uid());
create policy "tasks_insert" on public.tasks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.leads l where l.id=lead_id and l.user_id=auth.uid()));
create policy "tasks_update" on public.tasks for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.leads l where l.id=lead_id and l.user_id=auth.uid()));
create policy "tasks_delete" on public.tasks for delete to authenticated using(user_id=auth.uid());

create policy "interactions_select" on public.interactions for select to authenticated using(user_id=auth.uid());
create policy "interactions_insert" on public.interactions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.leads l where l.id=lead_id and l.user_id=auth.uid()));
create policy "interactions_delete" on public.interactions for delete to authenticated using(user_id=auth.uid());

create policy "history_select" on public.search_history for select to authenticated using(user_id=auth.uid());
create policy "history_insert" on public.search_history for insert to authenticated with check(user_id=auth.uid());
create policy "history_delete" on public.search_history for delete to authenticated using(user_id=auth.uid());
-- usage_daily não tem SELECT/INSERT/UPDATE direto: somente RPC segura.

create or replace function public.consume_quota(p_kind text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 u uuid:=auth.uid(); tier text; quota int; n int;
begin
 if u is null then raise exception 'Login obrigatório'; end if;
 if p_kind not in ('search','route','ai','detail','autocomplete') then raise exception 'Operação inválida'; end if;
 select plan into tier from public.profiles where id=u;
 tier:=coalesce(tier,'gratuito');
 quota:=case tier
 when 'empresarial' then case p_kind when 'search' then 500 when 'ai' then 200 when 'route' then 400 when 'detail' then 1200 else 2000 end
 when 'profissional' then case p_kind when 'search' then 100 when 'ai' then 50 when 'route' then 100 when 'detail' then 350 else 500 end
 else case p_kind when 'search' then 5 when 'ai' then 3 when 'route' then 10 when 'detail' then 30 else 40 end end;
 insert into public.usage_daily(user_id,usage_date,kind,calls) values(u,(now() at time zone 'utc')::date,p_kind,1)
 on conflict(user_id,usage_date,kind) do update set calls=usage_daily.calls+1 where usage_daily.calls<quota
 returning calls into n;
 if n is null then return jsonb_build_object('allowed',false,'remaining',0,'plan',tier); end if;
 return jsonb_build_object('allowed',true,'remaining',quota-n,'plan',tier);
end $$;
revoke all on function public.consume_quota(text) from public;
grant execute on function public.consume_quota(text) to authenticated;

-- No dashboard Supabase: usar RLS habilitada; nunca disponibilizar SERVICE_ROLE ao navegador.
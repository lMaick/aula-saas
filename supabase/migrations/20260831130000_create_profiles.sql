create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  subject_taught text not null default '',
  whatsapp text not null default '',
  pix_key text,
  timezone text not null default 'America/Bahia',
  onboarding_completed_at timestamptz,
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  account_status text not null default 'trial'
    check (account_status in ('trial', 'active', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_trial_period_check
    check (trial_ends_at = trial_started_at + interval '14 days')
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (
  name,
  subject_taught,
  whatsapp,
  pix_key,
  timezone,
  onboarding_completed_at
) on table public.profiles to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trial_start timestamptz := now();
begin
  insert into public.profiles (
    id,
    name,
    trial_started_at,
    trial_ends_at,
    account_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    trial_start,
    trial_start + interval '14 days',
    'trial'
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.set_updated_at() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

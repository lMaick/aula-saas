create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'mercado_pago'
    check (provider = 'mercado_pago'),
  provider_subscription_id text,
  provider_status text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'cancelled')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  checkout_url text,
  activated_at timestamptz,
  cancelled_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_id_owner_unique unique (id, owner_id)
);

create unique index subscriptions_provider_id_unique
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create unique index subscriptions_owner_open_unique
  on public.subscriptions (owner_id)
  where status in ('pending', 'active', 'paused');

create index subscriptions_owner_created_idx
  on public.subscriptions (owner_id, created_at desc);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.reserve_subscription_checkout(
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subscription_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'subscription_price_invalid';
  end if;

  perform 1 from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'profile_not_found'; end if;

  select id into subscription_id
  from public.subscriptions
  where owner_id = auth.uid()
    and status in ('pending', 'active', 'paused')
  order by created_at desc
  limit 1
  for update;

  if subscription_id is not null then return subscription_id; end if;

  insert into public.subscriptions (owner_id, amount_cents)
  values (auth.uid(), p_amount_cents)
  returning id into subscription_id;

  return subscription_id;
exception
  when unique_violation then
    select id into subscription_id
    from public.subscriptions
    where owner_id = auth.uid()
      and status in ('pending', 'active', 'paused')
    order by created_at desc
    limit 1;
    return subscription_id;
end;
$$;

create or replace function public.bind_subscription_provider(
  p_subscription_id uuid,
  p_owner_id uuid,
  p_provider_subscription_id text,
  p_provider_status text,
  p_checkout_url text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_subscription_id is null or p_owner_id is null
    or nullif(trim(p_provider_subscription_id), '') is null then
    raise exception 'subscription_binding_invalid';
  end if;

  update public.subscriptions
  set provider_subscription_id = p_provider_subscription_id,
      provider_status = p_provider_status,
      checkout_url = p_checkout_url
  where id = p_subscription_id
    and owner_id = p_owner_id
    and status = 'pending'
    and (provider_subscription_id is null
      or provider_subscription_id = p_provider_subscription_id);

  if not found then raise exception 'subscription_binding_failed'; end if;
end;
$$;

create or replace function public.apply_subscription_provider_state(
  p_owner_id uuid,
  p_provider_subscription_id text,
  p_provider_status text,
  p_status text,
  p_amount_cents integer,
  p_currency text,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subscription_row public.subscriptions%rowtype;
begin
  if p_owner_id is null or nullif(trim(p_provider_subscription_id), '') is null
    or p_status not in ('pending', 'active', 'paused', 'cancelled')
    or p_amount_cents is null or p_amount_cents <= 0
    or p_currency <> 'BRL' then
    raise exception 'subscription_state_invalid';
  end if;

  select * into subscription_row
  from public.subscriptions
  where owner_id = p_owner_id
    and provider = 'mercado_pago'
    and provider_subscription_id = p_provider_subscription_id
  for update;

  if not found then raise exception 'subscription_not_found'; end if;
  if subscription_row.amount_cents <> p_amount_cents then
    raise exception 'subscription_amount_mismatch';
  end if;

  update public.subscriptions
  set provider_status = p_provider_status,
      status = p_status,
      currency = p_currency,
      current_period_end = p_current_period_end,
      activated_at = case
        when p_status = 'active' then coalesce(activated_at, now())
        else activated_at
      end,
      cancelled_at = case
        when p_status = 'cancelled' then coalesce(cancelled_at, now())
        else null
      end
  where id = subscription_row.id;

  update public.profiles
  set account_status = case
    when p_status = 'active' then 'active'
    when trial_ends_at > now() then 'trial'
    else 'expired'
  end
  where id = p_owner_id;
end;
$$;

create or replace function public.normalize_current_account_access()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select case
    when exists (
      select 1 from public.subscriptions
      where owner_id = auth.uid() and status = 'active'
    ) then 'active'
    when trial_ends_at > now() then 'trial'
    else 'expired'
  end into normalized_status
  from public.profiles
  where id = auth.uid()
  for update;

  if normalized_status is null then raise exception 'profile_not_found'; end if;

  update public.profiles
  set account_status = normalized_status
  where id = auth.uid() and account_status is distinct from normalized_status;

  return normalized_status;
end;
$$;

revoke all on function public.reserve_subscription_checkout(integer) from public, anon;
grant execute on function public.reserve_subscription_checkout(integer) to authenticated;

revoke all on function public.normalize_current_account_access() from public, anon;
grant execute on function public.normalize_current_account_access() to authenticated;

revoke all on function public.bind_subscription_provider(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.apply_subscription_provider_state(uuid, text, text, text, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.bind_subscription_provider(uuid, uuid, text, text, text) to service_role;
grant execute on function public.apply_subscription_provider_state(uuid, text, text, text, integer, text, timestamptz) to service_role;

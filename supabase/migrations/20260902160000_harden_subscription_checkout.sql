revoke all on function public.reserve_subscription_checkout(integer) from public, anon, authenticated;
drop function public.reserve_subscription_checkout(integer);

create or replace function public.reserve_subscription_checkout(
  p_owner_id uuid,
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
  if p_owner_id is null then raise exception 'subscription_owner_invalid'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'subscription_price_invalid';
  end if;

  perform 1 from public.profiles where id = p_owner_id for update;
  if not found then raise exception 'profile_not_found'; end if;

  select id into subscription_id
  from public.subscriptions
  where owner_id = p_owner_id
    and status in ('pending', 'active', 'paused')
  order by created_at desc
  limit 1
  for update;

  if subscription_id is not null then return subscription_id; end if;

  insert into public.subscriptions (owner_id, amount_cents)
  values (p_owner_id, p_amount_cents)
  returning id into subscription_id;

  return subscription_id;
exception
  when unique_violation then
    select id into subscription_id
    from public.subscriptions
    where owner_id = p_owner_id
      and status in ('pending', 'active', 'paused')
    order by created_at desc
    limit 1;
    return subscription_id;
end;
$$;

revoke all on function public.reserve_subscription_checkout(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_subscription_checkout(uuid, integer) to service_role;

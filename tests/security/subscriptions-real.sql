begin;

do $$
declare
  owner_a uuid;
  owner_b uuid;
  subscription_id uuid;
begin
  select id into owner_a from public.profiles order by created_at limit 1;
  select id into owner_b from public.profiles where id <> owner_a order by created_at limit 1;
  if owner_a is null then raise exception 'subscriptions_require_existing_profile'; end if;

  subscription_id := public.reserve_subscription_checkout(owner_a, 2990);

  if (select owner_id from public.subscriptions where id = subscription_id) <> owner_a then
    raise exception 'reservation_owner_mismatch';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    update public.subscriptions set status = 'active' where id = subscription_id;
    raise exception 'authenticated_direct_update_was_allowed';
  exception when insufficient_privilege then null;
  end;

  if owner_b is not null then
    perform set_config('request.jwt.claim.sub', owner_b::text, true);
    if exists (select 1 from public.subscriptions where id = subscription_id) then
      raise exception 'cross_tenant_subscription_visible';
    end if;
  end if;
end;
$$;

reset role;
rollback;

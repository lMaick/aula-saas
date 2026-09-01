begin;

create temporary table phase8_test_ids (
  owner_id uuid, other_owner_id uuid, per_student_id uuid, package_student_id uuid,
  per_original_id uuid, package_original_id uuid, package_id uuid
) on commit drop;
grant select on phase8_test_ids to authenticated;

do $$
declare
  v_owner uuid;
  v_other uuid;
  v_per_student uuid := gen_random_uuid();
  v_package_student uuid := gen_random_uuid();
  v_per_original uuid := gen_random_uuid();
  v_package_original uuid := gen_random_uuid();
  v_package uuid := gen_random_uuid();
begin
  select id into v_owner from public.profiles order by created_at limit 1;
  if v_owner is null then raise exception 'phase8_requires_existing_profile'; end if;
  select id into v_other from public.profiles where id <> v_owner order by created_at limit 1;

  insert into public.students (id, owner_id, name, whatsapp, billing_model, billing_amount_cents)
  values
    (v_per_student, v_owner, 'Fixture rollback per lesson', '5500000000000', 'per_lesson', 7000),
    (v_package_student, v_owner, 'Fixture rollback package', '5500000000001', 'package', 60000);

  insert into public.packages (id, owner_id, student_id, total_lessons, used_lessons, amount_cents, starts_on)
  values (v_package, v_owner, v_package_student, 10, 8, 60000, current_date - 30);

  insert into public.lessons (id, owner_id, student_id, starts_at, ends_at)
  values
    (v_per_original, v_owner, v_per_student, now() + interval '2 days', now() + interval '2 days 1 hour'),
    (v_package_original, v_owner, v_package_student, now() + interval '3 days', now() + interval '3 days 1 hour');

  insert into phase8_test_ids values (
    v_owner, v_other, v_per_student, v_package_student,
    v_per_original, v_package_original, v_package
  );
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', owner_id::text, true) from phase8_test_ids;

do $$
declare
  ids phase8_test_ids%rowtype;
  v_makeup uuid;
  v_package_makeup uuid;
  v_normal uuid;
  v_count integer;
  v_used integer;
begin
  select * into ids from phase8_test_ids;

  perform public.cancel_lesson_with_makeup(ids.per_original_id);
  if (select status from public.lessons where id = ids.per_original_id) <> 'makeup_pending' then
    raise exception 'per_lesson_pending_failed';
  end if;
  if exists (select 1 from public.charges where lesson_id = ids.per_original_id) then
    raise exception 'per_lesson_charged_too_early';
  end if;
  v_makeup := public.schedule_makeup_lesson(
    ids.per_original_id, now() + interval '10 days', now() + interval '10 days 1 hour'
  );
  perform public.complete_lesson(v_makeup);
  if (select status from public.lessons where id = ids.per_original_id) <> 'made_up'
    or (select status from public.lessons where id = v_makeup) <> 'completed' then
    raise exception 'per_lesson_completion_failed';
  end if;
  select count(*) into v_count from public.charges
  where lesson_id = ids.per_original_id and billing_model = 'per_lesson';
  if v_count <> 1 then raise exception 'per_lesson_charge_idempotency_failed'; end if;
  perform public.complete_lesson(v_makeup);
  select count(*) into v_count from public.charges where lesson_id = ids.per_original_id;
  if v_count <> 1 then raise exception 'per_lesson_double_charge'; end if;

  perform public.cancel_lesson_with_makeup(ids.package_original_id);
  if (select used_lessons from public.packages where id = ids.package_id) <> 8
    or (select reserved_package_id from public.lessons where id = ids.package_original_id) <> ids.package_id then
    raise exception 'package_reservation_failed';
  end if;

  insert into public.lessons (student_id, starts_at, ends_at)
  values (ids.package_student_id, now() + interval '4 days', now() + interval '4 days 1 hour')
  returning id into v_normal;
  perform public.complete_lesson(v_normal);
  if (select used_lessons from public.packages where id = ids.package_id) <> 9 then
    raise exception 'reserved_balance_not_respected';
  end if;

  v_package_makeup := public.schedule_makeup_lesson(
    ids.package_original_id, now() + interval '11 days', now() + interval '11 days 1 hour'
  );
  reset role;
  update public.packages set ends_on = current_date - 1 where id = ids.package_id;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ids.owner_id::text, true);
  perform public.complete_lesson(v_package_makeup);
  select used_lessons into v_used from public.packages where id = ids.package_id;
  if v_used <> 10 or (select status from public.packages where id = ids.package_id) <> 'completed' then
    raise exception 'reserved_expired_package_completion_failed';
  end if;
  if (select reserved_package_id from public.lessons where id = ids.package_original_id) <> ids.package_id then
    raise exception 'reserved_package_history_lost';
  end if;
  perform public.complete_lesson(v_package_makeup);
  if (select used_lessons from public.packages where id = ids.package_id) <> 10 then
    raise exception 'package_double_consumption';
  end if;

  if ids.other_owner_id is not null then
    perform set_config('request.jwt.claim.sub', ids.other_owner_id::text, true);
    if exists (select 1 from public.lessons where id in (ids.per_original_id, ids.package_original_id, v_makeup, v_package_makeup)) then
      raise exception 'rls_cross_tenant_visibility';
    end if;
  end if;
end;
$$;

reset role;
rollback;

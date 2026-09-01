begin;

do $$
declare
  v_owner uuid;
  v_other uuid;
  v_package_student uuid := gen_random_uuid();
  v_completed_student uuid := gen_random_uuid();
  v_cancelled_student uuid := gen_random_uuid();
  v_per_student uuid := gen_random_uuid();
  v_monthly_student uuid := gen_random_uuid();
  v_package_makeup_student uuid := gen_random_uuid();
  v_per_lesson uuid;
  v_makeup uuid;
begin
  select id into v_owner from public.profiles order by created_at limit 1;
  if v_owner is null then raise exception 'billing_guard_requires_existing_profile'; end if;
  select id into v_other from public.profiles where id <> v_owner order by created_at limit 1;

  insert into public.students (id, owner_id, name, whatsapp, billing_model, billing_amount_cents)
  values
    (v_package_student, v_owner, 'Fixture rollback active package', '5500000000100', 'package', 60000),
    (v_completed_student, v_owner, 'Fixture rollback completed package', '5500000000101', 'package', 60000),
    (v_cancelled_student, v_owner, 'Fixture rollback cancelled package', '5500000000102', 'package', 60000),
    (v_per_student, v_owner, 'Fixture rollback pending per lesson', '5500000000103', 'per_lesson', 7000),
    (v_monthly_student, v_owner, 'Fixture rollback pending monthly', '5500000000104', 'monthly', 35000),
    (v_package_makeup_student, v_owner, 'Fixture rollback pending package', '5500000000105', 'package', 60000);

  insert into public.packages (owner_id, student_id, total_lessons, used_lessons, amount_cents, status, starts_on)
  values
    (v_owner, v_package_student, 10, 0, 60000, 'active', current_date),
    (v_owner, v_completed_student, 10, 10, 60000, 'completed', current_date - 30),
    (v_owner, v_cancelled_student, 10, 3, 60000, 'cancelled', current_date - 30),
    (v_owner, v_package_makeup_student, 10, 0, 60000, 'active', current_date);

  insert into public.lessons (owner_id, student_id, starts_at, ends_at, status)
  values (v_owner, v_per_student, now() + interval '1 day', now() + interval '1 day 1 hour', 'makeup_pending')
  returning id into v_per_lesson;
  insert into public.lessons (owner_id, student_id, starts_at, ends_at, status)
  values
    (v_owner, v_monthly_student, now() + interval '2 days', now() + interval '2 days 1 hour', 'makeup_pending'),
    (v_owner, v_package_makeup_student, now() + interval '3 days', now() + interval '3 days 1 hour', 'makeup_pending');

  begin update public.students set billing_model = 'monthly' where id = v_package_student;
    raise exception 'active_package_to_monthly_was_allowed';
  exception when others then if sqlerrm <> 'student_has_active_package' then raise; end if; end;
  begin update public.students set billing_model = 'per_lesson' where id = v_package_student;
    raise exception 'active_package_to_per_lesson_was_allowed';
  exception when others then if sqlerrm <> 'student_has_active_package' then raise; end if; end;

  update public.students set billing_model = 'monthly' where id = v_completed_student;
  update public.students set billing_model = 'per_lesson' where id = v_cancelled_student;

  begin update public.students set billing_model = 'monthly' where id = v_per_student;
    raise exception 'pending_per_lesson_change_was_allowed';
  exception when others then if sqlerrm <> 'student_has_pending_makeups' then raise; end if; end;
  begin update public.students set billing_model = 'per_lesson' where id = v_monthly_student;
    raise exception 'pending_monthly_change_was_allowed';
  exception when others then if sqlerrm <> 'student_has_pending_makeups' then raise; end if; end;
  begin update public.students set billing_model = 'monthly' where id = v_package_makeup_student;
    raise exception 'pending_package_change_was_allowed';
  exception when others then if sqlerrm <> 'student_has_pending_makeups' then raise; end if; end;

  update public.students set name = name || ' editada' where id = v_per_student;
  update public.students set whatsapp = '5500000000199' where id = v_per_student;
  update public.students set billing_amount_cents = 7100 where id = v_per_student;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  v_makeup := public.schedule_makeup_lesson(
    v_per_lesson, now() + interval '10 days', now() + interval '10 days 1 hour'
  );
  perform public.complete_lesson(v_makeup);
  update public.students set billing_model = 'monthly' where id = v_per_student;

  if v_other is not null then
    perform set_config('request.jwt.claim.sub', v_other::text, true);
    set local role authenticated;
    update public.students set billing_model = 'package' where id = v_completed_student;
    if found then raise exception 'cross_tenant_student_update'; end if;
    reset role;
  end if;
end;
$$;

rollback;

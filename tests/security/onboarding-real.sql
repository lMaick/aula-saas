begin;

create temporary table onboarding_test_state (
  owner_id uuid,
  per_student_id uuid,
  monthly_student_id uuid,
  package_student_id uuid
) on commit drop;

grant all on onboarding_test_state to authenticated;

do $$
declare
  v_owner uuid;
begin
  select id into v_owner from public.profiles order by created_at limit 1;
  if v_owner is null then raise exception 'onboarding_requires_existing_profile'; end if;

  update public.lessons set status = 'cancelled'
  where owner_id = v_owner and status = 'scheduled';
  update public.students set status = 'inactive'
  where owner_id = v_owner and status = 'active';
  update public.profiles set
    name = 'Fixture rollback onboarding',
    subject_taught = 'Matemática',
    onboarding_completed_at = null
  where id = v_owner;

  insert into onboarding_test_state (owner_id) values (v_owner);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', owner_id::text, true) from onboarding_test_state;

do $$
declare
  v_owner uuid;
  v_student uuid;
  v_repeat uuid;
  v_recurrence uuid;
  v_count integer;
begin
  select owner_id into v_owner from onboarding_test_state;

  v_student := public.create_onboarding_student(
    'Fixture rollback per lesson', '5573999999901', 'per_lesson', 7000, null
  );
  v_repeat := public.create_onboarding_student(
    'Não deve duplicar', '5573999999999', 'per_lesson', 9999, null
  );
  if v_student <> v_repeat then raise exception 'onboarding_student_not_idempotent'; end if;
  update onboarding_test_state set per_student_id = v_student;

  v_recurrence := public.complete_onboarding_with_schedule(v_student, 1::smallint, '07:00'::time, 60);
  if not exists (select 1 from public.lesson_recurrences where id = v_recurrence and owner_id = v_owner)
    or not exists (select 1 from public.lessons where recurrence_id = v_recurrence) then
    raise exception 'onboarding_per_lesson_recurrence_failed';
  end if;
  select count(*) into v_count from public.charges where student_id = v_student;
  if v_count <> 0 then raise exception 'onboarding_per_lesson_created_charge'; end if;
  if (select onboarding_completed_at from public.profiles where id = v_owner) is null then
    raise exception 'onboarding_completion_missing';
  end if;

  reset role;
  update public.students set status = 'inactive' where id = v_student;
  update public.profiles set onboarding_completed_at = null where id = v_owner;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  v_student := public.create_onboarding_student(
    'Fixture rollback monthly', '5573999999902', 'monthly', 35000, null
  );
  update onboarding_test_state set monthly_student_id = v_student;
  perform public.complete_onboarding_with_schedule(v_student, 2::smallint, '08:00'::time, 45);
  select count(*) into v_count from public.charges where student_id = v_student;
  if v_count <> 0 then raise exception 'onboarding_monthly_created_charge'; end if;

  reset role;
  update public.students set status = 'inactive' where id = v_student;
  update public.profiles set onboarding_completed_at = null where id = v_owner;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  v_student := public.create_onboarding_student(
    'Fixture rollback package', '5573999999903', 'package', 60000, 10
  );
  v_repeat := public.create_onboarding_student(
    'Não deve duplicar package', '5573999999998', 'package', 60000, 10
  );
  if v_student <> v_repeat then raise exception 'onboarding_package_student_not_idempotent'; end if;
  update onboarding_test_state set package_student_id = v_student;
  select count(*) into v_count from public.packages
  where student_id = v_student and status = 'active';
  if v_count <> 1 then raise exception 'onboarding_package_count_failed'; end if;
  select count(*) into v_count from public.charges
  where student_id = v_student and billing_model = 'package';
  if v_count <> 1 then raise exception 'onboarding_package_charge_count_failed'; end if;
  perform public.complete_onboarding_with_schedule(v_student, 3::smallint, '09:00'::time, 90);
  if not exists (
    select 1 from public.lesson_recurrences
    where owner_id = v_owner and student_id = v_student and active
  ) then raise exception 'onboarding_package_recurrence_failed'; end if;
end;
$$;

reset role;
rollback;

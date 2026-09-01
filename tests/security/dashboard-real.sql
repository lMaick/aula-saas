begin;

do $$
declare
  v_owner uuid;
  v_other uuid;
  v_timezone text;
  v_today date;
  v_month_start date;
  v_student_paid_one uuid := gen_random_uuid();
  v_student_paid_two uuid := gen_random_uuid();
  v_student_future uuid := gen_random_uuid();
  v_student_overdue uuid := gen_random_uuid();
  v_package_student uuid := gen_random_uuid();
  v_makeup_one uuid := gen_random_uuid();
  v_makeup_two uuid := gen_random_uuid();
  v_package uuid := gen_random_uuid();
  v_received integer;
  v_pending integer;
  v_overdue integer;
  v_today_lessons integer;
  v_upcoming integer;
  v_makeups integer;
  v_near_end integer;
begin
  select id, coalesce(timezone, 'America/Bahia') into v_owner, v_timezone
  from public.profiles order by created_at limit 1;
  if v_owner is null then raise exception 'dashboard_requires_existing_profile'; end if;
  select id into v_other from public.profiles where id <> v_owner order by created_at limit 1;
  v_today := (now() at time zone v_timezone)::date;
  v_month_start := date_trunc('month', v_today)::date;

  insert into public.students (id, owner_id, name, whatsapp, billing_model, billing_amount_cents)
  values
    (v_student_paid_one, v_owner, 'Fixture rollback dashboard paid 1', '5500000000200', 'monthly', 7000),
    (v_student_paid_two, v_owner, 'Fixture rollback dashboard paid 2', '5500000000201', 'monthly', 14000),
    (v_student_future, v_owner, 'Fixture rollback dashboard future', '5500000000202', 'monthly', 8000),
    (v_student_overdue, v_owner, 'Fixture rollback dashboard overdue', '5500000000203', 'monthly', 10000),
    (v_package_student, v_owner, 'Fixture rollback dashboard package', '5500000000204', 'package', 60000);

  insert into public.charges (owner_id, student_id, billing_model, description, amount_cents, reference_month, due_date, status, paid_at)
  values
    (v_owner, v_student_paid_one, 'monthly', 'Dashboard paga 1', 7000, v_month_start, v_today, 'paid', now()),
    (v_owner, v_student_paid_two, 'monthly', 'Dashboard paga 2', 14000, v_month_start, v_today, 'paid', now()),
    (v_owner, v_student_future, 'monthly', 'Dashboard futura', 8000, v_month_start, v_today + 5, 'pending', null),
    (v_owner, v_student_overdue, 'monthly', 'Dashboard vencida', 10000, v_month_start, v_today - 5, 'pending', null);

  insert into public.lessons (owner_id, student_id, starts_at, ends_at, status)
  values
    (v_owner, v_student_paid_one, (v_today + time '00:01') at time zone v_timezone, (v_today + time '01:01') at time zone v_timezone, 'scheduled'),
    (v_owner, v_student_paid_one, ((v_today + 1) + time '14:00') at time zone v_timezone, ((v_today + 1) + time '15:00') at time zone v_timezone, 'scheduled'),
    (v_owner, v_student_paid_one, (v_today + time '16:00') at time zone v_timezone, (v_today + time '17:00') at time zone v_timezone, 'cancelled');
  insert into public.lessons (id, owner_id, student_id, starts_at, ends_at, status)
  values (v_makeup_one, v_owner, v_student_future, ((v_today - 2) + time '10:00') at time zone v_timezone, ((v_today - 2) + time '11:00') at time zone v_timezone, 'makeup_pending');

  insert into public.packages (id, owner_id, student_id, total_lessons, used_lessons, amount_cents, starts_on)
  values (v_package, v_owner, v_package_student, 10, 7, 60000, v_today - 30);
  insert into public.lessons (id, owner_id, student_id, starts_at, ends_at, status, reserved_package_id)
  values (v_makeup_two, v_owner, v_package_student, ((v_today - 1) + time '10:00') at time zone v_timezone, ((v_today - 1) + time '11:00') at time zone v_timezone, 'makeup_pending', v_package);
  insert into public.lessons (owner_id, student_id, starts_at, ends_at, status, is_makeup, makeup_for_lesson_id)
  values (v_owner, v_package_student, ((v_today + 2) + time '15:00') at time zone v_timezone, ((v_today + 2) + time '16:00') at time zone v_timezone, 'scheduled', true, v_makeup_two);

  select coalesce(sum(amount_cents), 0) into v_received from public.charges
  where owner_id = v_owner and status = 'paid'
    and paid_at >= (v_month_start::timestamp at time zone v_timezone)
    and paid_at < ((v_month_start + interval '1 month')::timestamp at time zone v_timezone);
  select coalesce(sum(amount_cents), 0), coalesce(sum(amount_cents) filter (where due_date < v_today), 0)
  into v_pending, v_overdue from public.charges where owner_id = v_owner and status = 'pending';
  select count(*) into v_today_lessons from public.lessons where owner_id = v_owner
    and status in ('scheduled', 'completed')
    and starts_at >= (v_today::timestamp at time zone v_timezone)
    and starts_at < ((v_today + 1)::timestamp at time zone v_timezone);
  select count(*) into v_upcoming from public.lessons where owner_id = v_owner and status = 'scheduled' and starts_at >= now();
  select count(*) into v_makeups from public.lessons where owner_id = v_owner and status = 'makeup_pending' and not is_makeup;
  select count(*) into v_near_end from public.packages p join public.students s on s.id = p.student_id and s.owner_id = p.owner_id
  where p.owner_id = v_owner and p.status = 'active' and s.status = 'active'
    and p.total_lessons - p.used_lessons - (
      select count(*) from public.lessons l where l.owner_id = p.owner_id
        and l.reserved_package_id = p.id and l.status = 'makeup_pending'
    ) between 1 and 2;

  if v_received <> 21000 or v_pending <> 18000 or v_overdue <> 10000 then raise exception 'dashboard_financial_failed'; end if;
  if v_today_lessons <> 1 or v_upcoming <> 2 then raise exception 'dashboard_agenda_failed'; end if;
  if v_makeups <> 2 then raise exception 'dashboard_makeups_failed'; end if;
  if v_near_end <> 1 then raise exception 'dashboard_package_failed'; end if;

  if v_other is not null then
    perform set_config('request.jwt.claim.sub', v_other::text, true);
    set local role authenticated;
    if exists (select 1 from public.charges where student_id in (v_student_paid_one, v_student_paid_two, v_student_future, v_student_overdue))
      or exists (select 1 from public.lessons where student_id in (v_student_paid_one, v_student_future, v_package_student))
      or exists (select 1 from public.packages where id = v_package) then
      raise exception 'dashboard_cross_tenant_visibility';
    end if;
    reset role;
  end if;
end;
$$;

rollback;

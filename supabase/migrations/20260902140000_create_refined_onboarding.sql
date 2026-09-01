-- Perfis criados antes do onboarding guiado já utilizaram o produto nas fases anteriores.
-- O backfill é executado uma única vez; novos perfis continuam sendo criados com null.
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;

revoke update (onboarding_completed_at) on table public.profiles from authenticated;

create or replace function public.create_onboarding_student(
  p_name text,
  p_whatsapp text,
  p_billing_model text,
  p_billing_amount_cents integer,
  p_package_total_lessons integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.profiles%rowtype;
  student_row public.students%rowtype;
  local_today date;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into profile_row
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then raise exception 'onboarding_profile_not_found'; end if;
  if profile_row.onboarding_completed_at is not null then
    raise exception 'onboarding_already_completed';
  end if;
  if char_length(trim(profile_row.name)) < 2
    or char_length(trim(profile_row.subject_taught)) < 1 then
    raise exception 'onboarding_profile_incomplete';
  end if;

  select * into student_row
  from public.students
  where owner_id = auth.uid() and status = 'active'
  order by created_at, id
  limit 1
  for update;

  if not found then
    if char_length(trim(coalesce(p_name, ''))) < 1
      or char_length(trim(coalesce(p_whatsapp, ''))) < 1
      or p_billing_model not in ('per_lesson', 'monthly', 'package')
      or p_billing_amount_cents is null
      or p_billing_amount_cents < 0 then
      raise exception 'onboarding_student_invalid';
    end if;

    insert into public.students (
      owner_id, name, whatsapp, billing_model, billing_amount_cents
    ) values (
      auth.uid(), trim(p_name), trim(p_whatsapp), p_billing_model,
      p_billing_amount_cents
    ) returning * into student_row;
  end if;

  if student_row.billing_model = 'package'
    and not exists (
      select 1 from public.packages
      where owner_id = auth.uid()
        and student_id = student_row.id
        and status = 'active'
    ) then
    if p_package_total_lessons is null or p_package_total_lessons <= 0
      or p_billing_amount_cents is null or p_billing_amount_cents < 0 then
      raise exception 'onboarding_package_invalid';
    end if;

    local_today := (now() at time zone coalesce(profile_row.timezone, 'America/Bahia'))::date;
    perform public.create_lesson_package(
      student_row.id,
      p_package_total_lessons,
      p_billing_amount_cents,
      local_today,
      null
    );
  end if;

  return student_row.id;
end;
$$;

create or replace function public.complete_onboarding_with_schedule(
  p_student_id uuid,
  p_weekday smallint,
  p_local_start_time time,
  p_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_row public.profiles%rowtype;
  student_row public.students%rowtype;
  recurrence_id uuid;
  local_today date;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_student_id is null
    or p_weekday is null or p_weekday not between 1 and 7
    or p_local_start_time is null
    or p_duration_minutes is null
    or p_duration_minutes not in (30, 45, 60, 90, 120) then
    raise exception 'onboarding_schedule_invalid';
  end if;

  select * into profile_row
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then raise exception 'onboarding_profile_not_found'; end if;
  if char_length(trim(profile_row.name)) < 2
    or char_length(trim(profile_row.subject_taught)) < 1 then
    raise exception 'onboarding_profile_incomplete';
  end if;

  select * into student_row
  from public.students
  where id = p_student_id
    and owner_id = auth.uid()
    and status = 'active'
  for update;

  if not found then raise exception 'onboarding_student_invalid'; end if;
  if student_row.billing_model = 'package'
    and not exists (
      select 1 from public.packages
      where owner_id = auth.uid()
        and student_id = student_row.id
        and status = 'active'
    ) then
    raise exception 'onboarding_package_required';
  end if;

  select id into recurrence_id
  from public.lesson_recurrences
  where owner_id = auth.uid()
    and student_id = student_row.id
    and active
    and weekday = p_weekday
    and local_start_time = p_local_start_time
    and duration_minutes = p_duration_minutes
  order by created_at, id
  limit 1;

  if profile_row.onboarding_completed_at is not null and recurrence_id is null then
    raise exception 'onboarding_already_completed';
  end if;

  if recurrence_id is null then
    local_today := (now() at time zone coalesce(profile_row.timezone, 'America/Bahia'))::date;
    recurrence_id := public.create_weekly_recurrence(
      student_row.id,
      p_weekday,
      p_local_start_time,
      p_duration_minutes,
      local_today,
      null
    );
  end if;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = auth.uid();

  return recurrence_id;
end;
$$;

revoke all on function public.create_onboarding_student(text, text, text, integer, integer) from public, anon;
revoke all on function public.complete_onboarding_with_schedule(uuid, smallint, time, integer) from public, anon;

grant execute on function public.create_onboarding_student(text, text, text, integer, integer) to authenticated;
grant execute on function public.complete_onboarding_with_schedule(uuid, smallint, time, integer) to authenticated;

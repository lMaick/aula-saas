alter table public.lesson_recurrences
  drop constraint lesson_recurrences_duration_minutes_check;

alter table public.lesson_recurrences
  add constraint lesson_recurrences_allowed_duration_minutes
  check (duration_minutes in (30, 45, 60, 90, 120)) not valid;

alter table public.lessons
  add constraint lessons_allowed_duration_minutes
  check (extract(epoch from (ends_at - starts_at)) in (1800, 2700, 3600, 5400, 7200)) not valid;

create or replace function public.create_weekly_recurrence(
  p_student_id uuid,
  p_weekday smallint,
  p_local_start_time time,
  p_duration_minutes integer,
  p_starts_on date,
  p_ends_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recurrence_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_weekday not between 1 and 7
    or p_duration_minutes not in (30, 45, 60, 90, 120)
    or (p_ends_on is not null and p_ends_on < p_starts_on) then
    raise exception 'recurrence_invalid';
  end if;

  if not exists (
    select 1 from public.students
    where id = p_student_id and owner_id = auth.uid() and status = 'active'
  ) then
    raise exception 'recurrence_student_invalid';
  end if;

  insert into public.lesson_recurrences (
    owner_id, student_id, weekday, local_start_time,
    duration_minutes, starts_on, ends_on
  ) values (
    auth.uid(), p_student_id, p_weekday, p_local_start_time,
    p_duration_minutes, p_starts_on, p_ends_on
  ) returning id into recurrence_id;

  perform public.materialize_weekly_recurrence(recurrence_id);
  return recurrence_id;
end;
$$;

create or replace function public.update_weekly_recurrence(
  p_recurrence_id uuid,
  p_weekday smallint,
  p_local_start_time time,
  p_duration_minutes integer,
  p_starts_on date,
  p_ends_on date default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recurrence_row public.lesson_recurrences%rowtype;
  profile_timezone text;
  local_today date;
  candidate_dates date[];
  affected_count integer;
begin
  select * into recurrence_row
  from public.lesson_recurrences
  where id = p_recurrence_id and owner_id = auth.uid() and active
  for update;
  if not found then raise exception 'recurrence_not_found'; end if;
  if p_weekday not between 1 and 7
    or p_duration_minutes not in (30, 45, 60, 90, 120)
    or (p_ends_on is not null and p_ends_on < p_starts_on) then
    raise exception 'recurrence_invalid';
  end if;

  select timezone into profile_timezone from public.profiles where id = auth.uid();
  profile_timezone := coalesce(profile_timezone, 'America/Bahia');
  local_today := (now() at time zone profile_timezone)::date;

  select coalesce(array_agg(occurrence_date::date), '{}'::date[]) into candidate_dates
  from generate_series(
    greatest(p_starts_on, local_today),
    least(coalesce(p_ends_on, local_today + 55), local_today + 55),
    interval '1 day'
  ) as series(occurrence_date)
  where extract(isodow from occurrence_date)::smallint = p_weekday
    and ((occurrence_date::date + p_local_start_time) at time zone profile_timezone) > now();

  if exists (
    select 1
    from unnest(candidate_dates) as candidate(occurrence_date)
    join public.lessons lesson
      on lesson.owner_id = recurrence_row.owner_id
      and lesson.status = 'scheduled'
      and lesson.starts_at < ((candidate.occurrence_date + p_local_start_time) at time zone profile_timezone) + make_interval(mins => p_duration_minutes)
      and lesson.ends_at > ((candidate.occurrence_date + p_local_start_time) at time zone profile_timezone)
    where not (
      lesson.recurrence_id = recurrence_row.id
      and lesson.recurrence_managed
      and lesson.starts_at > now()
    )
  ) then
    raise exception 'recurrence_conflict';
  end if;

  update public.lesson_recurrences set
    weekday = p_weekday,
    local_start_time = p_local_start_time,
    duration_minutes = p_duration_minutes,
    starts_on = p_starts_on,
    ends_on = p_ends_on
  where id = recurrence_row.id;

  update public.lessons set
    starts_at = (recurrence_date + p_local_start_time) at time zone profile_timezone,
    ends_at = ((recurrence_date + p_local_start_time) at time zone profile_timezone) + make_interval(mins => p_duration_minutes),
    recurrence_managed = true
  where recurrence_id = recurrence_row.id
    and recurrence_managed
    and status = 'scheduled'
    and starts_at > now()
    and recurrence_date = any(candidate_dates);

  update public.lessons set status = 'cancelled'
  where recurrence_id = recurrence_row.id
    and recurrence_managed
    and status = 'scheduled'
    and starts_at > now()
    and not (recurrence_date = any(candidate_dates));

  perform public.materialize_weekly_recurrence(recurrence_row.id);
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

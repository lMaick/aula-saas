-- ISO weekday convention: Monday = 1, ..., Sunday = 7.
create table public.lesson_recurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  student_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  local_start_time time without time zone not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_recurrences_valid_dates check (ends_on is null or ends_on >= starts_on),
  constraint lesson_recurrences_student_owner_fk
    foreign key (student_id, owner_id)
    references public.students (id, owner_id)
);

create index lesson_recurrences_owner_active_idx
  on public.lesson_recurrences (owner_id, active);

create index lesson_recurrences_student_idx
  on public.lesson_recurrences (student_id, active);

alter table public.lesson_recurrences enable row level security;

create policy "lesson_recurrences_select_own"
  on public.lesson_recurrences
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "lesson_recurrences_insert_own"
  on public.lesson_recurrences
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "lesson_recurrences_update_own"
  on public.lesson_recurrences
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on table public.lesson_recurrences from anon, authenticated;
grant select on table public.lesson_recurrences to authenticated;

create trigger lesson_recurrences_set_updated_at
  before update on public.lesson_recurrences
  for each row execute function public.set_updated_at();

alter table public.lessons
  add column recurrence_id uuid references public.lesson_recurrences (id),
  add column recurrence_date date,
  add column recurrence_managed boolean not null default false,
  add constraint lessons_recurrence_metadata_check check (
    (recurrence_id is null and recurrence_date is null and recurrence_managed = false)
    or (recurrence_id is not null and recurrence_date is not null)
  );

create unique index lessons_recurrence_occurrence_unique
  on public.lessons (recurrence_id, recurrence_date)
  where recurrence_id is not null;

create index lessons_recurrence_managed_idx
  on public.lessons (recurrence_id, recurrence_managed, starts_at)
  where recurrence_id is not null;

grant update (recurrence_managed) on table public.lessons to authenticated;

create or replace function public.materialize_weekly_recurrence(p_recurrence_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recurrence_row public.lesson_recurrences%rowtype;
  profile_timezone text;
  local_today date;
  inserted_count integer;
begin
  select * into recurrence_row
  from public.lesson_recurrences
  where id = p_recurrence_id and owner_id = auth.uid() and active
  for update;

  if not found then
    raise exception 'recurrence_not_found';
  end if;

  select timezone into profile_timezone
  from public.profiles where id = recurrence_row.owner_id;
  profile_timezone := coalesce(profile_timezone, 'America/Bahia');
  local_today := (now() at time zone profile_timezone)::date;

  if exists (
    with candidates as (
      select occurrence_date::date as occurrence_date,
        (occurrence_date::date + recurrence_row.local_start_time) at time zone profile_timezone as starts_at
      from generate_series(
        greatest(recurrence_row.starts_on, local_today),
        least(coalesce(recurrence_row.ends_on, local_today + 55), local_today + 55),
        interval '1 day'
      ) as series(occurrence_date)
      where extract(isodow from occurrence_date)::smallint = recurrence_row.weekday
    )
    select 1 from candidates candidate
    join public.lessons lesson
      on lesson.owner_id = recurrence_row.owner_id
      and lesson.status = 'scheduled'
      and lesson.starts_at < candidate.starts_at + make_interval(mins => recurrence_row.duration_minutes)
      and lesson.ends_at > candidate.starts_at
    where candidate.starts_at > now()
      and not (
        lesson.recurrence_id = recurrence_row.id
        and lesson.recurrence_date = candidate.occurrence_date
      )
  ) then
    raise exception 'recurrence_conflict';
  end if;

  insert into public.lessons (
    owner_id, student_id, starts_at, ends_at,
    recurrence_id, recurrence_date, recurrence_managed
  )
  select
    recurrence_row.owner_id,
    recurrence_row.student_id,
    candidate.starts_at,
    candidate.starts_at + make_interval(mins => recurrence_row.duration_minutes),
    recurrence_row.id,
    candidate.occurrence_date,
    true
  from (
    select occurrence_date::date as occurrence_date,
      (occurrence_date::date + recurrence_row.local_start_time) at time zone profile_timezone as starts_at
    from generate_series(
      greatest(recurrence_row.starts_on, local_today),
      least(coalesce(recurrence_row.ends_on, local_today + 55), local_today + 55),
      interval '1 day'
    ) as series(occurrence_date)
    where extract(isodow from occurrence_date)::smallint = recurrence_row.weekday
  ) candidate
  where candidate.starts_at > now()
  on conflict (recurrence_id, recurrence_date) where recurrence_id is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

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
    or p_duration_minutes not between 15 and 480
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
    or p_duration_minutes not between 15 and 480
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

create or replace function public.deactivate_weekly_recurrence(p_recurrence_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare affected_count integer;
begin
  update public.lesson_recurrences set active = false
  where id = p_recurrence_id and owner_id = auth.uid() and active;
  if not found then raise exception 'recurrence_not_found'; end if;

  update public.lessons set status = 'cancelled'
  where recurrence_id = p_recurrence_id
    and owner_id = auth.uid()
    and recurrence_managed
    and status = 'scheduled'
    and starts_at > now();
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.maintain_weekly_recurrences()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recurrence_record record; total_inserted integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  for recurrence_record in
    select id from public.lesson_recurrences where owner_id = auth.uid() and active
  loop
    total_inserted := total_inserted + public.materialize_weekly_recurrence(recurrence_record.id);
  end loop;
  return total_inserted;
end;
$$;

revoke all on function public.materialize_weekly_recurrence(uuid) from public, anon, authenticated;
revoke all on function public.create_weekly_recurrence(uuid, smallint, time, integer, date, date) from public, anon;
revoke all on function public.update_weekly_recurrence(uuid, smallint, time, integer, date, date) from public, anon;
revoke all on function public.deactivate_weekly_recurrence(uuid) from public, anon;
revoke all on function public.maintain_weekly_recurrences() from public, anon;

grant execute on function public.create_weekly_recurrence(uuid, smallint, time, integer, date, date) to authenticated;
grant execute on function public.update_weekly_recurrence(uuid, smallint, time, integer, date, date) to authenticated;
grant execute on function public.deactivate_weekly_recurrence(uuid) to authenticated;
grant execute on function public.maintain_weekly_recurrences() to authenticated;

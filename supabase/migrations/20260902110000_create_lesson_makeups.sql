alter table public.lessons
  drop constraint lessons_status_check,
  add constraint lessons_status_check
    check (status in ('scheduled', 'completed', 'cancelled', 'makeup_pending', 'made_up')),
  add column is_makeup boolean not null default false,
  add column makeup_for_lesson_id uuid,
  add column reserved_package_id uuid,
  add constraint lessons_makeup_original_owner_fk
    foreign key (makeup_for_lesson_id, owner_id)
    references public.lessons (id, owner_id),
  add constraint lessons_reserved_package_owner_fk
    foreign key (reserved_package_id, owner_id)
    references public.packages (id, owner_id),
  add constraint lessons_makeup_shape check (
    (is_makeup and makeup_for_lesson_id is not null
      and reserved_package_id is null
      and recurrence_id is null
      and recurrence_date is null
      and not recurrence_managed)
    or
    (not is_makeup and makeup_for_lesson_id is null)
  ),
  add constraint lessons_makeup_not_self check (makeup_for_lesson_id is distinct from id),
  add constraint lessons_reservation_status check (
    reserved_package_id is null or (not is_makeup and status = 'makeup_pending')
  );

create unique index lessons_one_scheduled_makeup_per_original
  on public.lessons (owner_id, makeup_for_lesson_id)
  where is_makeup and status = 'scheduled';

create index lessons_owner_makeup_pending_idx
  on public.lessons (owner_id, student_id, starts_at)
  where status = 'makeup_pending';

create index lessons_reserved_package_idx
  on public.lessons (reserved_package_id)
  where reserved_package_id is not null;

revoke insert on table public.lessons from authenticated;
grant insert (student_id, starts_at, ends_at, notes)
  on table public.lessons to authenticated;

create or replace function public.cancel_lesson_with_makeup(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lesson_row public.lessons%rowtype;
  student_row public.students%rowtype;
  package_row public.packages%rowtype;
  profile_timezone text;
  local_today date;
  reserved_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into lesson_row from public.lessons
  where id = p_lesson_id and owner_id = auth.uid()
  for update;

  if not found or lesson_row.status <> 'scheduled' or lesson_row.is_makeup then
    raise exception 'lesson_not_scheduled';
  end if;

  select * into student_row from public.students
  where id = lesson_row.student_id and owner_id = auth.uid();
  if not found then raise exception 'lesson_student_invalid'; end if;

  if student_row.billing_model = 'package' then
    select timezone into profile_timezone from public.profiles where id = auth.uid();
    profile_timezone := coalesce(profile_timezone, 'America/Bahia');
    local_today := (now() at time zone profile_timezone)::date;

    select * into package_row from public.packages
    where owner_id = auth.uid() and student_id = student_row.id and status = 'active'
    for update;
    if not found then raise exception 'package_not_available'; end if;
    if package_row.ends_on is not null and package_row.ends_on < local_today then
      raise exception 'package_expired';
    end if;

    select count(*) into reserved_count from public.lessons
    where owner_id = auth.uid() and reserved_package_id = package_row.id
      and status = 'makeup_pending';
    if package_row.total_lessons - package_row.used_lessons - reserved_count <= 0 then
      raise exception 'package_balance_empty';
    end if;

    update public.lessons set status = 'makeup_pending', reserved_package_id = package_row.id
    where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';
  else
    update public.lessons set status = 'makeup_pending'
    where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';
  end if;
  return true;
end;
$$;

create or replace function public.schedule_makeup_lesson(
  p_original_lesson_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare original_row public.lessons%rowtype; makeup_id uuid; duration_minutes integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'makeup_invalid';
  end if;
  duration_minutes := extract(epoch from (p_ends_at - p_starts_at))::integer / 60;
  if duration_minutes not in (30, 45, 60, 90, 120) then raise exception 'makeup_invalid'; end if;

  select * into original_row from public.lessons
  where id = p_original_lesson_id and owner_id = auth.uid()
  for update;
  if not found or original_row.is_makeup or original_row.status <> 'makeup_pending' then
    raise exception 'makeup_original_invalid';
  end if;

  if exists (
    select 1 from public.lessons where owner_id = auth.uid() and status = 'scheduled'
      and starts_at < p_ends_at and ends_at > p_starts_at
  ) then raise exception 'lesson_conflict'; end if;

  insert into public.lessons (
    owner_id, student_id, starts_at, ends_at, status, notes,
    is_makeup, makeup_for_lesson_id, recurrence_id, recurrence_date, recurrence_managed
  ) values (
    auth.uid(), original_row.student_id, p_starts_at, p_ends_at, 'scheduled',
    'Reposição da aula original', true, original_row.id, null, null, false
  ) returning id into makeup_id;
  return makeup_id;
exception
  when unique_violation then raise exception 'makeup_already_scheduled';
end;
$$;

create or replace function public.complete_lesson(p_lesson_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lesson_row public.lessons%rowtype;
  original_row public.lessons%rowtype;
  commercial_row public.lessons%rowtype;
  student_row public.students%rowtype;
  package_row public.packages%rowtype;
  profile_timezone text;
  local_service_date date;
  local_original_date date;
  reserved_count integer;
  charge_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into lesson_row from public.lessons
  where id = p_lesson_id and owner_id = auth.uid() for update;
  if not found then raise exception 'lesson_not_found'; end if;

  if lesson_row.status = 'completed' then
    select id into charge_id from public.charges
    where lesson_id = coalesce(lesson_row.makeup_for_lesson_id, lesson_row.id)
      and owner_id = auth.uid();
    return charge_id;
  end if;
  if lesson_row.status <> 'scheduled' then raise exception 'lesson_not_scheduled'; end if;

  if lesson_row.is_makeup then
    select * into original_row from public.lessons
    where id = lesson_row.makeup_for_lesson_id and owner_id = auth.uid() for update;
    if not found or original_row.is_makeup or original_row.student_id <> lesson_row.student_id
      or original_row.status <> 'makeup_pending' then raise exception 'makeup_original_invalid'; end if;
    commercial_row := original_row;
  else
    commercial_row := lesson_row;
  end if;

  select * into student_row from public.students
  where id = lesson_row.student_id and owner_id = auth.uid();
  if not found then raise exception 'lesson_student_invalid'; end if;

  select timezone into profile_timezone from public.profiles where id = auth.uid();
  profile_timezone := coalesce(profile_timezone, 'America/Bahia');
  local_service_date := (lesson_row.starts_at at time zone profile_timezone)::date;

  if student_row.billing_model = 'package' then
    if lesson_row.is_makeup then
      if original_row.reserved_package_id is null then raise exception 'package_reservation_missing'; end if;
      select * into package_row from public.packages
      where id = original_row.reserved_package_id and owner_id = auth.uid()
        and student_id = student_row.id for update;
      if not found then raise exception 'package_not_available'; end if;
      if package_row.used_lessons >= package_row.total_lessons then raise exception 'package_balance_empty'; end if;
    else
      select * into package_row from public.packages
      where owner_id = auth.uid() and student_id = student_row.id and status = 'active' for update;
      if not found then raise exception 'package_not_available'; end if;
      if package_row.ends_on is not null and package_row.ends_on < local_service_date then
        raise exception 'package_expired';
      end if;
      select count(*) into reserved_count from public.lessons
      where owner_id = auth.uid() and reserved_package_id = package_row.id
        and status = 'makeup_pending';
      if package_row.total_lessons - package_row.used_lessons - reserved_count <= 0 then
        raise exception 'package_balance_empty';
      end if;
    end if;
  end if;

  if lesson_row.is_makeup then
    update public.lessons set status = 'completed'
    where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';
    update public.lessons set status = 'made_up', reserved_package_id = null
    where id = original_row.id and owner_id = auth.uid() and status = 'makeup_pending';
  else
    update public.lessons set status = 'completed'
    where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';
  end if;

  if student_row.billing_model = 'per_lesson' then
    local_original_date := (commercial_row.starts_at at time zone profile_timezone)::date;
    insert into public.charges (
      owner_id, student_id, lesson_id, billing_model, description, amount_cents, due_date
    ) values (
      auth.uid(), student_row.id, commercial_row.id, 'per_lesson',
      'Aula de ' || to_char(local_original_date, 'DD/MM/YYYY'),
      student_row.billing_amount_cents, local_service_date
    ) on conflict (lesson_id) where lesson_id is not null do nothing returning id into charge_id;
    if charge_id is null then
      select id into charge_id from public.charges
      where lesson_id = commercial_row.id and owner_id = auth.uid();
    end if;
  elsif student_row.billing_model = 'package' then
    update public.packages set
      used_lessons = used_lessons + 1,
      status = case when used_lessons + 1 = total_lessons then 'completed' else status end
    where id = package_row.id and owner_id = auth.uid();
  end if;
  return charge_id;
end;
$$;

create or replace function public.cancel_lesson_package(p_package_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.lessons where owner_id = auth.uid()
    and reserved_package_id = p_package_id and status = 'makeup_pending') then
    raise exception 'package_has_makeup_reservations';
  end if;
  update public.packages set status = 'cancelled'
  where id = p_package_id and owner_id = auth.uid() and status = 'active';
  if not found then raise exception 'package_not_active'; end if;
  return true;
end;
$$;

revoke all on function public.cancel_lesson_with_makeup(uuid) from public, anon;
revoke all on function public.schedule_makeup_lesson(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.complete_lesson(uuid) from public, anon;
revoke all on function public.cancel_lesson_package(uuid) from public, anon;
grant execute on function public.cancel_lesson_with_makeup(uuid) to authenticated;
grant execute on function public.schedule_makeup_lesson(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.cancel_lesson_package(uuid) to authenticated;

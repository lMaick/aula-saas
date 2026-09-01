alter table public.lessons
  drop constraint lessons_reservation_status,
  add constraint lessons_reservation_status check (
    reserved_package_id is null
    or (not is_makeup and status in ('makeup_pending', 'made_up'))
  );

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
      if package_row.ends_on is not null and package_row.ends_on < local_service_date then raise exception 'package_expired'; end if;
      select count(*) into reserved_count from public.lessons
      where owner_id = auth.uid() and reserved_package_id = package_row.id and status = 'makeup_pending';
      if package_row.total_lessons - package_row.used_lessons - reserved_count <= 0 then raise exception 'package_balance_empty'; end if;
    end if;
  end if;

  if lesson_row.is_makeup then
    update public.lessons set status = 'completed'
    where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';
    update public.lessons set status = 'made_up'
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
    update public.packages set used_lessons = used_lessons + 1,
      status = case when used_lessons + 1 = total_lessons then 'completed' else status end
    where id = package_row.id and owner_id = auth.uid();
  end if;
  return charge_id;
end;
$$;

revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

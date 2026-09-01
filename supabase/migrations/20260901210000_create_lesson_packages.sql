create table public.packages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  student_id uuid not null,
  total_lessons integer not null check (total_lessons > 0),
  used_lessons integer not null default 0 check (used_lessons >= 0),
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_usage_limit check (used_lessons <= total_lessons),
  constraint packages_status_usage_consistency check (
    (status = 'active' and used_lessons < total_lessons)
    or (status = 'completed' and used_lessons = total_lessons)
    or status = 'cancelled'
  ),
  constraint packages_date_range check (ends_on is null or ends_on >= starts_on),
  constraint packages_student_owner_fk
    foreign key (student_id, owner_id)
    references public.students (id, owner_id),
  constraint packages_id_owner_unique unique (id, owner_id)
);

create unique index packages_one_active_per_student
  on public.packages (owner_id, student_id)
  where status = 'active';

create index packages_owner_status_created_idx
  on public.packages (owner_id, status, created_at desc);

create index packages_student_created_idx
  on public.packages (student_id, created_at desc);

alter table public.packages enable row level security;

create policy "packages_select_own"
  on public.packages
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.packages from anon, authenticated;
grant select on table public.packages to authenticated;

create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

alter table public.charges
  drop constraint charges_billing_model_check,
  drop constraint charges_origin_consistency;

alter table public.charges
  add column package_id uuid,
  add constraint charges_billing_model_check
    check (billing_model in ('per_lesson', 'monthly', 'package')),
  add constraint charges_package_owner_fk
    foreign key (package_id, owner_id)
    references public.packages (id, owner_id),
  add constraint charges_origin_consistency check (
    (billing_model = 'per_lesson' and lesson_id is not null
      and package_id is null and reference_month is null)
    or
    (billing_model = 'monthly' and lesson_id is null
      and package_id is null and reference_month is not null
      and reference_month = date_trunc('month', reference_month)::date)
    or
    (billing_model = 'package' and lesson_id is null
      and package_id is not null and reference_month is null)
  );

create unique index charges_package_unique
  on public.charges (package_id)
  where package_id is not null;

create or replace function public.create_lesson_package(
  p_student_id uuid,
  p_total_lessons integer,
  p_amount_cents integer,
  p_starts_on date,
  p_ends_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  student_row public.students%rowtype;
  package_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_total_lessons is null or p_total_lessons <= 0
    or p_amount_cents is null or p_amount_cents < 0
    or p_starts_on is null
    or (p_ends_on is not null and p_ends_on < p_starts_on) then
    raise exception 'package_invalid';
  end if;

  select * into student_row
  from public.students
  where id = p_student_id
    and owner_id = auth.uid()
    and status = 'active'
    and billing_model = 'package';

  if not found then raise exception 'package_student_invalid'; end if;

  insert into public.packages (
    owner_id, student_id, total_lessons, amount_cents, starts_on, ends_on
  ) values (
    auth.uid(), student_row.id, p_total_lessons, p_amount_cents, p_starts_on, p_ends_on
  ) returning id into package_id;

  insert into public.charges (
    owner_id, student_id, package_id, billing_model, description,
    amount_cents, due_date
  ) values (
    auth.uid(), student_row.id, package_id, 'package',
    'Pacote de ' || p_total_lessons || ' aulas', p_amount_cents, p_starts_on
  );

  return package_id;
exception
  when unique_violation then raise exception 'package_active_exists';
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

  update public.packages
  set status = 'cancelled'
  where id = p_package_id and owner_id = auth.uid() and status = 'active';

  if not found then raise exception 'package_not_active'; end if;
  return true;
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
  student_row public.students%rowtype;
  package_row public.packages%rowtype;
  profile_timezone text;
  local_lesson_date date;
  local_today date;
  charge_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into lesson_row
  from public.lessons
  where id = p_lesson_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'lesson_not_found'; end if;

  if lesson_row.status = 'completed' then
    select id into charge_id
    from public.charges
    where lesson_id = lesson_row.id and owner_id = auth.uid();
    return charge_id;
  end if;

  if lesson_row.status <> 'scheduled' then
    raise exception 'lesson_not_scheduled';
  end if;

  select * into student_row
  from public.students
  where id = lesson_row.student_id and owner_id = auth.uid();

  if not found then raise exception 'lesson_student_invalid'; end if;

  if student_row.billing_model = 'package' then
    select timezone into profile_timezone
    from public.profiles
    where id = auth.uid();
    profile_timezone := coalesce(profile_timezone, 'America/Bahia');
    local_today := (now() at time zone profile_timezone)::date;

    select * into package_row
    from public.packages
    where owner_id = auth.uid()
      and student_id = student_row.id
      and status = 'active'
    for update;

    if not found then raise exception 'package_not_available'; end if;
    if package_row.ends_on is not null and package_row.ends_on < local_today then
      raise exception 'package_expired';
    end if;
    if package_row.used_lessons >= package_row.total_lessons then
      raise exception 'package_balance_empty';
    end if;
  end if;

  update public.lessons
  set status = 'completed'
  where id = lesson_row.id and owner_id = auth.uid() and status = 'scheduled';

  if student_row.billing_model = 'per_lesson' then
    select timezone into profile_timezone
    from public.profiles
    where id = auth.uid();
    profile_timezone := coalesce(profile_timezone, 'America/Bahia');
    local_lesson_date := (lesson_row.starts_at at time zone profile_timezone)::date;

    insert into public.charges (
      owner_id, student_id, lesson_id, billing_model, description,
      amount_cents, due_date
    ) values (
      auth.uid(), student_row.id, lesson_row.id, 'per_lesson',
      'Aula de ' || to_char(local_lesson_date, 'DD/MM/YYYY'),
      student_row.billing_amount_cents, local_lesson_date
    )
    on conflict (lesson_id) where lesson_id is not null do nothing
    returning id into charge_id;

    if charge_id is null then
      select id into charge_id from public.charges
      where lesson_id = lesson_row.id and owner_id = auth.uid();
    end if;
  elsif student_row.billing_model = 'package' then
    update public.packages
    set used_lessons = used_lessons + 1,
        status = case
          when used_lessons + 1 = total_lessons then 'completed'
          else 'active'
        end
    where id = package_row.id and owner_id = auth.uid();
  end if;

  return charge_id;
end;
$$;

revoke all on function public.create_lesson_package(uuid, integer, integer, date, date) from public, anon;
revoke all on function public.cancel_lesson_package(uuid) from public, anon;
revoke all on function public.complete_lesson(uuid) from public, anon;

grant execute on function public.create_lesson_package(uuid, integer, integer, date, date) to authenticated;
grant execute on function public.cancel_lesson_package(uuid) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;

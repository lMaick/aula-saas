alter table public.lessons
  add constraint lessons_id_owner_unique unique (id, owner_id);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  student_id uuid not null,
  lesson_id uuid,
  billing_model text not null
    check (billing_model in ('per_lesson', 'monthly')),
  description text not null check (char_length(description) between 1 and 200),
  amount_cents integer not null check (amount_cents >= 0),
  reference_month date,
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint charges_student_owner_fk
    foreign key (student_id, owner_id)
    references public.students (id, owner_id),
  constraint charges_lesson_owner_fk
    foreign key (lesson_id, owner_id)
    references public.lessons (id, owner_id),
  constraint charges_origin_consistency check (
    (billing_model = 'per_lesson' and lesson_id is not null and reference_month is null)
    or
    (billing_model = 'monthly' and lesson_id is null and reference_month is not null
      and reference_month = date_trunc('month', reference_month)::date)
  ),
  constraint charges_payment_consistency check (
    (status = 'pending' and paid_at is null)
    or (status = 'paid' and paid_at is not null)
  )
);

create unique index charges_lesson_unique
  on public.charges (lesson_id)
  where lesson_id is not null;

create unique index charges_monthly_reference_unique
  on public.charges (owner_id, student_id, reference_month)
  where billing_model = 'monthly';

create index charges_owner_status_due_date_idx
  on public.charges (owner_id, status, due_date);

create index charges_owner_paid_at_idx
  on public.charges (owner_id, paid_at);

create index charges_student_created_at_idx
  on public.charges (student_id, created_at desc);

alter table public.charges enable row level security;

create policy "charges_select_own"
  on public.charges
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.charges from anon, authenticated;
grant select on table public.charges to authenticated;

revoke update (status) on table public.lessons from authenticated;

create trigger charges_set_updated_at
  before update on public.charges
  for each row execute function public.set_updated_at();

create or replace function public.complete_lesson(p_lesson_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lesson_row public.lessons%rowtype;
  student_row public.students%rowtype;
  profile_timezone text;
  local_lesson_date date;
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
  end if;

  return charge_id;
end;
$$;

create or replace function public.cancel_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  update public.lessons
  set status = 'cancelled'
  where id = p_lesson_id and owner_id = auth.uid() and status = 'scheduled';

  if not found then raise exception 'lesson_not_scheduled'; end if;
  return true;
end;
$$;

create or replace function public.create_monthly_charge(
  p_student_id uuid,
  p_reference_month date,
  p_due_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  student_row public.students%rowtype;
  charge_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_reference_month is null
    or p_reference_month <> date_trunc('month', p_reference_month)::date
    or p_due_date is null then
    raise exception 'monthly_charge_invalid';
  end if;

  select * into student_row
  from public.students
  where id = p_student_id
    and owner_id = auth.uid()
    and status = 'active'
    and billing_model = 'monthly';

  if not found then raise exception 'monthly_student_invalid'; end if;

  insert into public.charges (
    owner_id, student_id, billing_model, description,
    amount_cents, reference_month, due_date
  ) values (
    auth.uid(), student_row.id, 'monthly',
    'Mensalidade — ' || to_char(p_reference_month, 'MM/YYYY'),
    student_row.billing_amount_cents, p_reference_month, p_due_date
  )
  returning id into charge_id;

  return charge_id;
exception
  when unique_violation then raise exception 'monthly_charge_duplicate';
end;
$$;

create or replace function public.mark_charge_paid(p_charge_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_time timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  update public.charges
  set status = 'paid', paid_at = payment_time
  where id = p_charge_id and owner_id = auth.uid() and status = 'pending';

  if not found then raise exception 'charge_not_pending'; end if;
  return payment_time;
end;
$$;

revoke all on function public.complete_lesson(uuid) from public, anon;
revoke all on function public.cancel_lesson(uuid) from public, anon;
revoke all on function public.create_monthly_charge(uuid, date, date) from public, anon;
revoke all on function public.mark_charge_paid(uuid) from public, anon;

grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.cancel_lesson(uuid) to authenticated;
grant execute on function public.create_monthly_charge(uuid, date, date) to authenticated;
grant execute on function public.mark_charge_paid(uuid) to authenticated;

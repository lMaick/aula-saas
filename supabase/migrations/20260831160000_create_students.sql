create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  whatsapp text not null check (char_length(trim(whatsapp)) > 0),
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  billing_model text not null
    check (billing_model in ('per_lesson', 'monthly', 'package')),
  billing_amount_cents integer not null
    check (billing_amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_owner_status_idx
  on public.students (owner_id, status);

create index students_owner_name_idx
  on public.students (owner_id, lower(name));

alter table public.students enable row level security;

create policy "students_select_own"
  on public.students
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "students_insert_own"
  on public.students
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "students_update_own"
  on public.students
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on table public.students from anon, authenticated;
grant select on table public.students to authenticated;
grant insert (
  name,
  whatsapp,
  notes,
  status,
  billing_model,
  billing_amount_cents
) on table public.students to authenticated;
grant update (
  name,
  whatsapp,
  notes,
  status,
  billing_model,
  billing_amount_cents
) on table public.students to authenticated;

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

alter table public.students
  add constraint students_id_owner_unique unique (id, owner_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  student_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_valid_interval check (ends_at > starts_at),
  constraint lessons_student_owner_fk
    foreign key (student_id, owner_id)
    references public.students (id, owner_id)
);

create index lessons_owner_starts_at_idx
  on public.lessons (owner_id, starts_at);

create index lessons_owner_status_starts_at_idx
  on public.lessons (owner_id, status, starts_at);

create index lessons_student_starts_at_idx
  on public.lessons (student_id, starts_at desc);

alter table public.lessons enable row level security;

create policy "lessons_select_own"
  on public.lessons
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "lessons_insert_own"
  on public.lessons
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "lessons_update_own"
  on public.lessons
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on table public.lessons from anon, authenticated;
grant select on table public.lessons to authenticated;
grant insert (student_id, starts_at, ends_at, notes)
  on table public.lessons to authenticated;
grant update (starts_at, ends_at, status, notes)
  on table public.lessons to authenticated;

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

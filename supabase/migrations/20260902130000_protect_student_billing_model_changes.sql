create or replace function public.protect_student_billing_model_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.billing_model is not distinct from new.billing_model then
    return new;
  end if;

  if exists (
    select 1
    from public.lessons
    where owner_id = old.owner_id
      and student_id = old.id
      and status = 'makeup_pending'
  ) then
    raise exception 'student_has_pending_makeups';
  end if;

  if exists (
    select 1
    from public.packages
    where owner_id = old.owner_id
      and student_id = old.id
      and status = 'active'
  ) then
    raise exception 'student_has_active_package';
  end if;

  return new;
end;
$$;

create trigger students_protect_billing_model_change
  before update of billing_model on public.students
  for each row execute function public.protect_student_billing_model_change();

revoke all on function public.protect_student_billing_model_change() from public, anon, authenticated;

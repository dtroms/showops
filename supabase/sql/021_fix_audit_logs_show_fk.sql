begin;

-- =========================================================
-- FIX AUDIT LOGS SHOW FK
-- ---------------------------------------------------------
-- Audit logs must survive deletion of the records they describe.
-- The current FK from audit_logs.show_id -> shows(id) with
-- ON DELETE CASCADE causes show delete audit history to vanish.
-- =========================================================

do $$
declare
  constraint_name text;
begin
  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'audit_logs'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'show_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.audit_logs drop constraint %I', constraint_name);
  end if;
end $$;

commit;
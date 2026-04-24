begin;

-- =========================================================
-- SHOWOPS PHASE 2 AUDIT INSERT POLICY
-- ---------------------------------------------------------
-- Purpose:
--   - allow authenticated app/server actions to insert audit logs
--   - keep audit logs append-only
--   - preserve org isolation
--
-- Notes:
--   - leadership can view org-wide logs (already handled in 019)
--   - PMs can view logs tied to shows they can access (already handled in 019)
--   - this migration only opens INSERT in a controlled way
-- =========================================================


-- =========================================================
-- 1) HELPER: can_insert_audit_log
-- =========================================================

create or replace function public.can_insert_audit_log(
  audit_org_id uuid,
  audit_show_id uuid,
  audit_actor_user_id uuid,
  audit_actor_membership_id uuid,
  audit_actor_platform_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- platform users can insert platform/org support audit events
    (
      public.my_platform_role() in ('platform_admin', 'platform_support')
    )
    or
    -- normal org-scoped users can insert audit rows only inside their org
    (
      audit_org_id is not null
      and audit_org_id in (select * from public.my_active_org_ids())
      and (
        -- actor_user_id must match auth user when present
        audit_actor_user_id is null
        or audit_actor_user_id = auth.uid()
      )
      and (
        -- actor_membership_id must belong to current auth user when present
        audit_actor_membership_id is null
        or audit_actor_membership_id in (select * from public.my_active_membership_ids())
      )
      and (
        -- if show_id is provided, it must be a show the user can view
        audit_show_id is null
        or public.can_view_show(audit_show_id)
      )
      and (
        -- customer-side writes should not spoof a platform role
        audit_actor_platform_role is null
      )
    )
$$;

grant execute on function public.can_insert_audit_log(uuid, uuid, uuid, uuid, text) to authenticated;


-- =========================================================
-- 2) REPLACE AUDIT INSERT POLICY
-- =========================================================

drop policy if exists audit_logs_insert_none_phase2 on public.audit_logs;
drop policy if exists audit_logs_insert_phase2 on public.audit_logs;

create policy audit_logs_insert_phase2
on public.audit_logs
for insert
to authenticated
with check (
  public.can_insert_audit_log(
    organization_id,
    show_id,
    actor_user_id,
    actor_membership_id,
    actor_platform_role
  )
);


-- =========================================================
-- 3) KEEP AUDIT LOGS APPEND-ONLY
-- ---------------------------------------------------------
-- These may already exist from previous migrations, but we
-- recreate them defensively to keep the intent obvious.
-- =========================================================

drop policy if exists audit_logs_update_none_phase2 on public.audit_logs;

create policy audit_logs_update_none_phase2
on public.audit_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists audit_logs_delete_none_phase2 on public.audit_logs;

create policy audit_logs_delete_none_phase2
on public.audit_logs
for delete
to authenticated
using (false);


commit;
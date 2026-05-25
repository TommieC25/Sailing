-- In-app replies for bug reports.
-- Email should only be an optional alert later; the conversation lives here.

create table if not exists public.bug_report_replies (
  id uuid primary key default gen_random_uuid(),
  bug_report_id uuid not null references public.bug_reports(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bug_report_replies_bug_report_id_idx
on public.bug_report_replies (bug_report_id, created_at);

create index if not exists bug_report_replies_unread_idx
on public.bug_report_replies (read_at)
where read_at is null;

alter table public.bug_report_replies enable row level security;

drop policy if exists bug_report_replies_select_related on public.bug_report_replies;
create policy bug_report_replies_select_related
on public.bug_report_replies
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.bug_reports report
    where report.id = bug_report_replies.bug_report_id
      and report.user_id = auth.uid()
  )
);

drop policy if exists bug_report_replies_insert_related on public.bug_report_replies;
create policy bug_report_replies_insert_related
on public.bug_report_replies
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.bug_reports report
      where report.id = bug_report_replies.bug_report_id
        and report.user_id = auth.uid()
    )
  )
);

drop policy if exists bug_report_replies_update_related on public.bug_report_replies;
create policy bug_report_replies_update_related
on public.bug_report_replies
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.bug_reports report
    where report.id = bug_report_replies.bug_report_id
      and report.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.bug_reports report
    where report.id = bug_report_replies.bug_report_id
      and report.user_id = auth.uid()
  )
);

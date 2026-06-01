-- Target admin announcements to all users, skippers/owners, or crew.

alter table public.announcements
add column if not exists audience text not null default 'all';

alter table public.announcements
drop constraint if exists announcements_audience_check;

alter table public.announcements
add constraint announcements_audience_check
check (audience in ('all', 'owners', 'crew'));

update public.announcements
set audience = 'all'
where audience is null;

drop policy if exists announcements_select_authenticated on public.announcements;
create policy announcements_select_authenticated
on public.announcements
for select
to authenticated
using (
  public.is_admin()
  or audience = 'all'
  or exists (
    select 1
    from public.users viewer
    where viewer.id = auth.uid()
      and (
        (audience = 'owners' and viewer.user_type = 'owner')
        or (audience = 'crew' and viewer.user_type = 'crew')
      )
  )
);

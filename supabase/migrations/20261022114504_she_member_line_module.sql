-- Private defaults for every member; approved page links remain in she_people.
create table public.she_member_line_settings (
 owner_id uuid primary key references auth.users(id),
 line_url text not null check(length(line_url)<=300 and line_url ~ '^https://(line[.]me/R/ti/p/(%40|@)[A-Za-z0-9._-]{3,40}/?|lin[.]ee/[A-Za-z0-9_-]+/?)$'),
 updated_at timestamptz not null default now()
);
alter table public.she_member_line_settings enable row level security;
revoke all on public.she_member_line_settings from anon,authenticated;
grant select,insert,update on public.she_member_line_settings to authenticated;
create policy line_settings_read on public.she_member_line_settings for select to authenticated using(owner_id=auth.uid());
create policy line_settings_create on public.she_member_line_settings for insert to authenticated with check(owner_id=auth.uid());
create policy line_settings_edit on public.she_member_line_settings for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create table public.she_line_link_requests (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 person_id uuid not null references public.she_people(id),
 line_url text not null check(length(line_url)<=300 and line_url ~ '^https://(line[.]me/R/ti/p/(%40|@)[A-Za-z0-9._-]{3,40}/?|lin[.]ee/[A-Za-z0-9_-]+/?)$'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id)
);
create unique index she_line_request_one_pending on public.she_line_link_requests(person_id) where status='pending';
create index she_line_request_owner on public.she_line_link_requests(owner_id,created_at desc);
alter table public.she_line_link_requests enable row level security;
revoke all on public.she_line_link_requests from anon,authenticated;
grant select,insert on public.she_line_link_requests to authenticated;
grant update(status,reviewed_at,reviewed_by) on public.she_line_link_requests to authenticated;
create policy line_request_read on public.she_line_link_requests for select to authenticated using(owner_id=auth.uid() or she_private.has_any_role(array['super_admin','editor']));
create policy line_request_add on public.she_line_link_requests for insert to authenticated with check(owner_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null and exists(select 1 from public.she_people p where p.id=person_id and p.owner_id=auth.uid() and p.status='published'));
create policy line_request_review on public.she_line_link_requests for update to authenticated using(she_private.has_any_role(array['super_admin','editor'])) with check(she_private.has_any_role(array['super_admin','editor']) and reviewed_by=auth.uid());
-- Invoker permissions: existing profile publishing rules and explicit staff check both apply.
create function public.she_review_line_link(p_request_id uuid,p_approve boolean) returns void language plpgsql security invoker set search_path='' as $$
declare r public.she_line_link_requests; n integer;
begin
 if auth.uid() is null or not she_private.has_any_role(array['super_admin','editor']) then raise exception 'Not authorized'; end if;
 select * into r from public.she_line_link_requests where id=p_request_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'Request is not pending'; end if;
 if p_approve then
  update public.she_people set contact_url=r.line_url where id=r.person_id and owner_id=r.owner_id and status='published';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Published page no longer matches request'; end if;
 end if;
 update public.she_line_link_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
end $$;
revoke all on function public.she_review_line_link(uuid,boolean) from public,anon;
grant execute on function public.she_review_line_link(uuid,boolean) to authenticated;

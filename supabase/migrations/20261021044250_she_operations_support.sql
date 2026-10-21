create table public.she_support_threads (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.she_profiles(id),
 subject text not null check(length(trim(subject)) between 1 and 150), status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now()
);
create table public.she_support_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.she_support_threads(id),
 sender_id uuid not null default auth.uid() references public.she_profiles(id),
 body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create index she_support_member_idx on public.she_support_threads(member_id,created_at desc);
create index she_support_message_idx on public.she_support_messages(thread_id,created_at);
alter table public.she_support_threads enable row level security;
alter table public.she_support_messages enable row level security;
create policy thread_read on public.she_support_threads for select to authenticated using(member_id=auth.uid() or she_private.is_super_admin());
create policy thread_create on public.she_support_threads for insert to authenticated with check(member_id=auth.uid() and status='open');
create policy thread_manage on public.she_support_threads for update to authenticated using(she_private.is_super_admin()) with check(she_private.is_super_admin());
create policy message_read on public.she_support_messages for select to authenticated using(exists(select 1 from public.she_support_threads t where t.id=thread_id and (t.member_id=auth.uid() or she_private.is_super_admin())));
create policy message_send on public.she_support_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.she_support_threads t where t.id=thread_id and t.status='open' and (t.member_id=auth.uid() or she_private.is_super_admin())));
grant select,insert,update on public.she_support_threads to authenticated;
grant select,insert on public.she_support_messages to authenticated;
revoke all on public.she_support_threads,public.she_support_messages from anon;
-- Explicitly authorized verified administrator, resolved by email rather than a hardcoded ID.
insert into public.she_staff_roles(user_id,role)
 select id,'super_admin' from auth.users where lower(email)='selfonly@gmail.com' and email_confirmed_at is not null
 on conflict(user_id) do update set role=excluded.role;



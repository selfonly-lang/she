-- Disposable fixture only; every write is rolled back. Run as postgres.
begin;
insert into auth.users(id, email) values
 ('a1000000-0000-4000-8000-000000000001','she-line-test-a@example.invalid'),
 ('a1000000-0000-4000-8000-000000000002','she-line-test-b@example.invalid');
insert into public.she_profiles(id,display_name,member_tier) values
 ('a1000000-0000-4000-8000-000000000001','LINE isolation A','member'),
 ('a1000000-0000-4000-8000-000000000002','LINE isolation B','member');
insert into public.she_member_line_settings(owner_id,line_url) values
 ('a1000000-0000-4000-8000-000000000001','https://line.me/R/ti/p/%40testA'),
 ('a1000000-0000-4000-8000-000000000002','https://line.me/R/ti/p/%40testB');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare n integer;
begin
 select count(*) into n from public.she_profiles where id in ('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002');
 if n <> 1 then raise exception 'Profile isolation failed'; end if;
 select count(*) into n from public.she_member_line_settings;
 if n <> 1 then raise exception 'LINE settings isolation failed'; end if;
 update public.she_profiles set display_name='Forbidden' where id='a1000000-0000-4000-8000-000000000002';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-member profile update allowed'; end if;
 update public.she_member_line_settings set line_url='https://line.me/R/ti/p/%40wrong' where owner_id='a1000000-0000-4000-8000-000000000002';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-member LINE update allowed'; end if;
 begin
  perform 1 from public.she_auth_identities;
  raise exception 'Identity mapping exposed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: owner-only profiles and LINE contacts; server-only identities; all fixture data rolled back' as result;

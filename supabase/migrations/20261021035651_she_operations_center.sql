-- SHE operations: financial records are TWD; no payment or payout execution.
create table public.she_tier_rules (
 tier text primary key check(tier in ('member','paid','business','manager')),
 label text not null, benefits text not null default '' check(length(benefits)<=4000),
 commission_percent numeric(5,2) check(commission_percent between 0 and 100),
 commission_enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not commission_enabled or commission_percent is not null)
);
insert into public.she_tier_rules(tier,label) values ('member','一般會員'),('paid','付費會員'),('business','商務 VIP'),('manager','經理／版主');
alter table public.she_tier_rules enable row level security;
create policy tier_read on public.she_tier_rules for select to authenticated using(true);
create policy tier_edit on public.she_tier_rules for update to authenticated using(she_private.is_super_admin()) with check(she_private.is_super_admin());
grant select,update on public.she_tier_rules to authenticated;
revoke all on public.she_tier_rules from anon;

create table public.she_ledger_entries (
 id uuid primary key default gen_random_uuid(), entry_date date not null default current_date,
 kind text not null check(kind in ('income','expense','refund','commission_payment')),
 amount numeric(14,2) not null check(amount>0),
 reference text not null check(length(trim(reference)) between 1 and 200),
 note text not null default '' check(length(note)<=2000),
 order_id uuid references public.she_orders(id),
 reversal_of uuid unique references public.she_ledger_entries(id),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
alter table public.she_ledger_entries enable row level security;
create policy ledger_read on public.she_ledger_entries for select to authenticated using(she_private.has_any_role(array['super_admin','finance']));
create policy ledger_add on public.she_ledger_entries for insert to authenticated with check(she_private.has_any_role(array['super_admin','finance']) and created_by=auth.uid());
grant select,insert on public.she_ledger_entries to authenticated;
revoke all on public.she_ledger_entries from anon;

create table public.she_ops_audit (
 id bigint generated always as identity primary key, actor_id uuid, entity text not null,
 record_id text, operation text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
alter table public.she_ops_audit enable row level security;
create policy audit_read on public.she_ops_audit for select to authenticated using(she_private.has_any_role(array['super_admin','finance']));
grant select on public.she_ops_audit to authenticated;
revoke all on public.she_ops_audit from anon;
-- Private trigger writes audit records independently of client grants.
create function she_private.audit_operations() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.she_ops_audit(actor_id,entity,record_id,operation,before_data,after_data)
 values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'tier',to_jsonb(old)->>'id'),tg_op,to_jsonb(old),to_jsonb(new));
 return coalesce(new,old);
end $$;
revoke all on function she_private.audit_operations() from public,anon,authenticated;


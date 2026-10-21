-- Limit existing financial access to the intended roles, retaining each member's own read access.
alter policy she_order_manage on public.she_orders to authenticated using(she_private.has_any_role(array['super_admin','finance'])) with check(she_private.has_any_role(array['super_admin','finance']));
alter policy she_order_read on public.she_orders using(buyer_id=auth.uid() or seller_id=auth.uid() or she_private.has_any_role(array['super_admin','finance']));
alter policy she_commission_manage on public.she_commissions to authenticated using(she_private.has_any_role(array['super_admin','finance'])) with check(she_private.has_any_role(array['super_admin','finance']));
alter policy she_commission_read on public.she_commissions using(beneficiary_id=auth.uid() or she_private.has_any_role(array['super_admin','finance']));
revoke delete on public.she_orders,public.she_commissions from authenticated;
alter table public.she_commissions add column rule_snapshot jsonb;
alter table public.she_orders add column business_note text not null default '' check(length(business_note)<=2000);

create function she_private.guard_commission() returns trigger language plpgsql set search_path='' as $$
declare o public.she_orders; r public.she_tier_rules; t text;
begin
 if tg_op='INSERT' then
  select * into o from public.she_orders where id=new.order_id for update;
  if o.id is null or o.status not in ('paid','completed') or o.seller_id is null or o.seller_id<>new.beneficiary_id then raise exception 'Order must be paid and assigned to this seller'; end if;
  select member_tier into t from public.she_profiles where id=o.seller_id;
  select * into r from public.she_tier_rules where tier=t;
  if not coalesce(r.commission_enabled,false) or r.commission_percent is null then raise exception 'Commission rule is not enabled'; end if;
  new.amount:=round(o.actual_total*r.commission_percent/100,2); new.state:='pending';
  new.rule_snapshot:=jsonb_build_object('tier',t,'percent',r.commission_percent,'base',o.actual_total,'currency','TWD','calculated_at',now());
 else
  if (new.order_id,new.beneficiary_id,new.amount,new.rule_snapshot,new.created_at) is distinct from (old.order_id,old.beneficiary_id,old.amount,old.rule_snapshot,old.created_at) then raise exception 'Commission calculation is immutable'; end if;
  if not ((old.state='pending' and new.state in ('approved','reversed')) or (old.state in ('approved','paid') and new.state='reversed')) then raise exception 'Invalid commission transition'; end if;
  select * into o from public.she_orders where id=new.order_id for update;
  if new.state='approved' and o.status not in ('paid','completed') then raise exception 'Order is not paid'; end if;
 end if;
 return new;
end $$;
create trigger she_commission_guard before insert or update on public.she_commissions for each row execute function she_private.guard_commission();

create function she_private.guard_order() returns trigger language plpgsql set search_path='' as $$
begin
 if new.actual_unit_price<0 or new.actual_unit_price>=1000000000 or new.quantity>100000 then raise exception 'Amount or quantity out of range'; end if;
 if tg_op='INSERT' then
  if new.status not in ('draft','awaiting_payment') then raise exception 'Create a draft before confirming payment'; end if;
  if not exists(select 1 from public.she_products where id=new.product_id and ad_source_product_id is not null and not is_demo) then raise exception 'Select an AD product'; end if;
 else
  if old.status not in ('draft','awaiting_payment') and (new.product_id,new.buyer_id,new.seller_id,new.quantity,new.actual_unit_price,new.payment_reference) is distinct from (old.product_id,old.buyer_id,old.seller_id,old.quantity,old.actual_unit_price,old.payment_reference) then raise exception 'Confirmed order amounts and parties are locked'; end if;
  if new.status<>old.status and not ((old.status='draft' and new.status in ('awaiting_payment','paid','void')) or (old.status='awaiting_payment' and new.status in ('paid','void')) or (old.status='paid' and new.status in ('completed','refunded')) or (old.status='completed' and new.status='refunded')) then raise exception 'Invalid order transition'; end if;
 end if;
 if new.status in ('paid','completed') and nullif(trim(new.payment_reference),'') is null then raise exception 'Payment reference required'; end if;
 if new.status='refunded' and old.status is distinct from new.status then
  update public.she_commissions set state='reversed' where order_id=new.id and state<>'reversed';
 end if;
 return new;
end $$;
create trigger she_order_guard before insert or update on public.she_orders for each row execute function she_private.guard_order();

create function she_private.guard_ledger() returns trigger language plpgsql set search_path='' as $$
declare e public.she_ledger_entries;
begin
 if new.reversal_of is not null then
  select * into e from public.she_ledger_entries where id=new.reversal_of;
  if e.id is null or e.reversal_of is not null then raise exception 'Invalid reversal'; end if;
  new.amount:=e.amount; new.kind:=e.kind; new.order_id:=e.order_id;
 end if;
 return new;
end $$;
create trigger she_ledger_guard before insert on public.she_ledger_entries for each row execute function she_private.guard_ledger();
create trigger she_orders_audit after insert or update on public.she_orders for each row execute function she_private.audit_operations();
create trigger she_commissions_audit after insert or update on public.she_commissions for each row execute function she_private.audit_operations();
create trigger she_tiers_audit after update on public.she_tier_rules for each row execute function she_private.audit_operations();
create trigger she_ledger_audit after insert on public.she_ledger_entries for each row execute function she_private.audit_operations();

revoke all on function she_private.guard_commission(),she_private.guard_order(),she_private.guard_ledger() from public,anon,authenticated;

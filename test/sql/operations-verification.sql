begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='selfonly@gmail.com'),true);
set local role authenticated;
do $$
declare o uuid; c uuid; entry uuid; amount numeric; st text; v_tier text;
begin
 select member_tier into v_tier from public.she_profiles where id=auth.uid();
 if v_tier is null then raise exception 'Admin profile missing'; end if;
 update public.she_tier_rules set commission_enabled=true,commission_percent=10 where she_tier_rules.tier=v_tier;
 insert into public.she_orders(product_id,seller_id,quantity,actual_unit_price,business_note)
 select id,auth.uid(),2,125.55,'ROLLBACK verification' from public.she_products where ad_source_product_id is not null and not is_demo limit 1 returning id into o;
 if o is null then raise exception 'No AD product'; end if;
 begin
  insert into public.she_commissions(order_id,beneficiary_id,amount) values(o,auth.uid(),999);
  raise exception 'TEST FAILED unpaid commission accepted';
 exception when raise_exception then
  if sqlerrm like 'TEST FAILED%' then raise; end if;
 end;
 update public.she_orders set status='paid',payment_reference='ROLLBACK-TEST' where id=o;
 insert into public.she_commissions(order_id,beneficiary_id,amount) values(o,auth.uid(),999) returning id,she_commissions.amount into c,amount;
 if amount<>25.11 then raise exception 'Wrong rounding %',amount; end if;
 update public.she_tier_rules set commission_percent=20 where she_tier_rules.tier=v_tier;
 select she_commissions.amount into amount from public.she_commissions where id=c;
 if amount<>25.11 then raise exception 'Snapshot changed'; end if;
 begin
  insert into public.she_commissions(order_id,beneficiary_id,amount) values(o,auth.uid(),999);
  raise exception 'TEST FAILED duplicate accepted';
 exception when unique_violation then null;
 end;
 update public.she_commissions set state='approved' where id=c;
 update public.she_orders set status='refunded' where id=o;
 select state into st from public.she_commissions where id=c;
 if st<>'reversed' then raise exception 'Refund did not reverse'; end if;
 insert into public.she_ledger_entries(kind,amount,reference) values('income',100,'ROLLBACK-TEST') returning id into entry;
 insert into public.she_ledger_entries(kind,amount,reference,reversal_of) values('expense',1,'ROLLBACK-TEST',entry) returning she_ledger_entries.amount into amount;
 if amount<>100 then raise exception 'Incorrect reversal'; end if;
 begin
  insert into public.she_ledger_entries(kind,amount,reference,reversal_of) values('expense',1,'ROLLBACK-TEST',entry);
  raise exception 'TEST FAILED repeated reversal';
 exception when unique_violation then null;
 end;
end $$;
select 'PASS: rounding, paid-only calculation, rule snapshot, duplicate prevention, approval, refund reversal, ledger reversal' as verification;
rollback;

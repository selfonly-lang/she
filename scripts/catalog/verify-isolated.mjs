// Optional integration check. PGLITE_MODULE points to a pinned @electric-sql/pglite 0.3.14 entry.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {planSync,compileSql} from './sync.mjs';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db=new PGlite();
await db.exec(`CREATE TABLE she_products(id uuid primary key default gen_random_uuid(), title text not null, brand text not null default '', category text not null default '美妝保養', spec text not null default '', image_url text, source_url text, sku text unique, ad_source_product_id uuid unique, active boolean not null default false, price_visible boolean not null default false, verification_status text not null default 'pending' check(verification_status in ('pending','verified')), medical_review_required boolean not null default false, ad_last_synced_at timestamptz);
CREATE TABLE she_prices(product_id uuid, price_key text, amount numeric);
CREATE TABLE she_orders(id int, snapshot jsonb);
CREATE TABLE she_commissions(id int, rate numeric);
CREATE TABLE she_product_visibility(product_id uuid, enabled boolean);
INSERT INTO she_prices VALUES(null,'dealer',321); INSERT INTO she_orders VALUES(1,'{"amount":999}'); INSERT INTO she_commissions VALUES(1,0.3); INSERT INTO she_product_visibility VALUES(null,true);`);
const id='11111111-1111-4111-8111-111111111111';
const item={id,title:"Quote ' $catalog_sync$; drop table she_prices; --",spec:'10ml',brand:'Test only',image_url:'https://example.com/1.jpg',source_url:`https://ad.self.com.tw/products/${id}`,list_price:800};
const source=products=>({schema_version:1,scope:'public-visible',observed_at:'2026-10-27T00:00:00Z',products});
const snapshot=async()=>({products:(await db.query('select * from she_products')).rows,prices:(await db.query('select * from she_prices')).rows});
const apply=async p=>db.exec(compileSql(p,{plan_hash:p.plan_hash,operation_indexes:p.operations.map((_,i)=>i)}));
let p=planSync(source([item]),await snapshot());await apply(p);await apply(p);
assert.equal((await snapshot()).products.length,1);assert.equal((await snapshot()).products[0].active,false);
let changed={...item,spec:'100ml',image_url:'https://example.com/2.jpg'};
p=planSync(source([changed]),await snapshot());await apply(p);await apply(p);
assert.equal((await snapshot()).products[0].spec,'100ml');assert.equal((await snapshot()).products[0].image_url,changed.image_url);
// A concurrently edited row causes the whole batch, including an earlier insert, to roll back.
let next={...item,id:'00000000-1111-4111-8111-111111111111',title:'Second',source_url:'https://ad.self.com.tw/products/00000000-1111-4111-8111-111111111111'};
p=planSync(source([next,{...changed,spec:'200ml'}]),await snapshot());
await db.exec("update she_products set title='Manual editorial change'");
await assert.rejects(()=>apply(p),/Stale product/);await db.exec('ROLLBACK');
assert.equal((await snapshot()).products.length,1);assert.equal((await snapshot()).products[0].title,'Manual editorial change');
// Explicit cessation only disables, preserves ID and all financial data.
await db.exec('update she_products set active=true');const src=source([{...changed,title:'Manual editorial change',status:'discontinued',status_evidence:'Synthetic verified supplier tombstone'}]);src.scope='authoritative';
p=planSync(src,await snapshot());await apply(p);assert.equal((await snapshot()).products[0].active,false);
assert.equal((await db.query('select amount from she_prices')).rows[0].amount,'321');
assert.deepEqual((await db.query('select snapshot from she_orders')).rows[0].snapshot,{amount:999});
assert.equal((await db.query('select rate from she_commissions')).rows[0].rate,'0.3');
assert.equal((await db.query('select enabled from she_product_visibility')).rows[0].enabled,true);
assert.equal(planSync(source([changed]),await snapshot()).operations.some(o=>o.values.active===true),false);
// Combined update/discontinue: review order, partial approval, replay and stale rollback.
await db.exec("CREATE TABLE she_memberships(id int, rights jsonb); INSERT INTO she_memberships VALUES(1,'{\"tier\":\"VIP\"}');");
const protectedSnapshot=async()=>{const result={};for(const table of ['she_prices','she_orders','she_commissions','she_product_visibility','she_memberships'])result[table]=(await db.query(`select * from ${table}`)).rows;return result;};
const protectedBefore=await protectedSnapshot();
for(const indexes of [[0,1],[1,0],[0],[1]]) {
  await db.exec("update she_products set active=true,spec='100ml'");
  const before=(await snapshot()).products[0];
  const combined=source([{...changed,title:before.title,spec:'300ml',status:'discontinued',status_evidence:'Verified synthetic tombstone'}]);combined.scope='authoritative';
  const plan=planSync(combined,await snapshot());assert.deepEqual(plan.operations.map(o=>o.kind),['update','discontinue']);
  const statement=compileSql(plan,{plan_hash:plan.plan_hash,operation_indexes:indexes});
  await db.exec(statement);const first=(await snapshot()).products[0];
  assert.equal(first.id,before.id);assert.equal(first.ad_source_product_id,before.ad_source_product_id);
  assert.equal(first.spec,indexes.includes(0)?'300ml':'100ml');assert.equal(first.active,!indexes.includes(1));
  assert.equal(first.price_visible,before.price_visible);
  await db.exec(statement);assert.deepEqual((await snapshot()).products[0],first);
  assert.deepEqual(await protectedSnapshot(),protectedBefore);
}
// A stale combined operation rolls back an earlier approved insert, even with reverse selection.
await db.exec("update she_products set active=true,spec='100ml'");
const staleSource=source([next,{...changed,title:'Manual editorial change',spec:'400ml',status:'discontinued',status_evidence:'Verified tombstone'}]);staleSource.scope='authoritative';
const stalePlan=planSync(staleSource,await snapshot());
await db.exec("update she_products set spec='Concurrent edit'");
const staleBefore=await snapshot();
await assert.rejects(()=>db.exec(compileSql(stalePlan,{plan_hash:stalePlan.plan_hash,operation_indexes:[2,1,0]})),/Stale product/);
await db.exec('ROLLBACK');assert.deepEqual(await snapshot(),staleBefore);assert.deepEqual(await protectedSnapshot(),protectedBefore);
console.log('PASS: combined forward/reverse/partial approvals, replay, stale combined batch rollback; identities, prices, memberships, orders, commissions and visibility preserved.');
await db.close();console.log('PASS: isolated PostgreSQL insert/update/replay, hostile text, stale-batch rollback, discontinuation, prices/orders/commissions/visibility preservation.');

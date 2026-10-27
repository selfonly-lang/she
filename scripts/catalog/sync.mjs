import { createHash } from 'node:crypto';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const fields = ['title','brand','category','spec','image_url','source_url'];
const own = (o,k) => Object.hasOwn(o,k);
const stable = x => JSON.stringify(x && typeof x === 'object' ? Array.isArray(x) ? x.map(v=>JSON.parse(stable(v))) : Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(stable(x[k]))])) : x);
export const digest = x => createHash('sha256').update(stable(x)).digest('hex');
const equal = (a,b) => stable(a) === stable(b);
const pick = (p,ks) => Object.fromEntries(ks.filter(k=>own(p,k)).map(k=>[k,p[k]]));
function assert(ok,msg) { if (!ok) throw Error(msg); }
function uuid(x) { assert(typeof x === 'string' && UUID.test(x),'Invalid UUID'); }
function unique(rows,key) { const ids=rows.map(r=>r[key]).filter(Boolean); assert(new Set(ids).size===ids.length,`Duplicate ${key}`); }
function https(x) { try { const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password; } catch { return false; } }
/** Pure planning only. Source is an authorized, permission-filtered export, not raw products_public. */
export function planSync(source, target) {
  assert(source.schema_version===1 && ['public-visible','authoritative'].includes(source.scope) && source.observed_at && Number.isFinite(Date.parse(source.observed_at)), 'Invalid source envelope');
  assert(Array.isArray(source.products)&&Array.isArray(target.products)&&Array.isArray(target.prices),'Invalid snapshot');
  unique(source.products,'id'); unique(target.products,'id'); unique(target.products,'ad_source_product_id');
  const operations=[], reviews=[];
  for (const s of [...source.products].sort((a,b)=>a.id.localeCompare(b.id))) {
    uuid(s.id); assert(typeof s.title==='string' && s.title.trim(),'Missing title');
    for (const k of fields) if (own(s,k)) assert(s[k]===null&&k==='image_url'||typeof s[k]==='string',`Invalid ${k}`);
    if (s.image_url) assert(https(s.image_url),'Invalid image URL');
    assert(s.source_url===`https://ad.self.com.tw/products/${s.id}`,'Source ID/URL mismatch');
    const p=target.products.find(p=>p.ad_source_product_id===s.id);
    const incoming=pick(s,fields);
    if (p) {
      const changes=Object.fromEntries(Object.entries(incoming).filter(([k,v])=>!equal(p[k]??null,v)));
      // Never clear a curated value when source omits or blanks it. Record a review instead.
      for (const [k,v] of Object.entries(changes)) if(v===null||v==='') { reviews.push({kind:'empty-source-field',source_id:s.id,field:k,current:p[k]}); delete changes[k]; }
      if(Object.keys(changes).length) operations.push({kind:'update',source_id:s.id,target_id:p.id,before:pick(p,[...fields,'active','ad_source_product_id']),values:changes});
      if(s.status==='discontinued') {
        assert(source.scope==='authoritative'&&typeof s.status_evidence==='string'&&s.status_evidence.trim(),'Unverified discontinuation');
        if(p.active) operations.push({kind:'discontinue',source_id:s.id,target_id:p.id,before:{active:true,ad_source_product_id:s.id},values:{active:false},evidence:s.status_evidence});
      }
    } else {
      // Legacy rows without source ID require explicit linking, never a name-based automatic merge.
      const candidates=target.products.filter(p=>!p.ad_source_product_id&&(p.source_url===s.source_url || p.title.trim()===s.title.trim()));
      if(candidates.length) reviews.push({kind:'identity-conflict',source_id:s.id,candidates:candidates.map(p=>p.id)});
      else if(s.status!=='discontinued') operations.push({kind:'insert',source_id:s.id,values:{...incoming,sku:`SHE-AD-${s.id}`,ad_source_product_id:s.id,active:false,price_visible:false,verification_status:'pending',medical_review_required:true}});
    }
    if(own(s,'list_price')) {
      assert(s.list_price===null||typeof s.list_price==='number'&&Number.isFinite(s.list_price)&&s.list_price>=0&&Math.abs(s.list_price*100-Math.round(s.list_price*100))<1e-6,'Invalid list price');
      const current=p?target.prices.find(x=>x.product_id===p.id&&x.price_key==='list'):null;
      if(s.list_price!==null && (!current||Number(current.amount)!==s.list_price)) reviews.push({kind:'price-proposal',source_id:s.id,price_key:'list',current:current?.amount??null,proposed:s.list_price,currency:'TWD',action:'manual-approval-only'});
    }
  }
  for(const p of target.products) if(p.ad_source_product_id&&!source.products.some(s=>s.id===p.ad_source_product_id)) reviews.push({kind:'not-observed',source_id:p.ad_source_product_id,target_id:p.id,action:'retain-until-authoritative-status'});
  const body={version:1,observed_at:source.observed_at,scope:source.scope,source_hash:digest(source),target_hash:digest(target),operations,reviews};
  return {...body,plan_hash:digest(body)};
}
const lit = x => x===null?'NULL':typeof x==='boolean'?(x?'TRUE':'FALSE'):"'"+String(x).replaceAll("'","''")+"'";
const json = x => lit(JSON.stringify(x))+'::jsonb';
/** Generate only, never execute. Explicit hash and operation indexes bind a review to exact content. */
export function compileSql(plan, approval) {
  const {plan_hash,...body}=plan;
  assert(digest(body)===plan_hash&&approval.plan_hash===plan_hash,'Approval hash mismatch');
  assert(Array.isArray(approval.operation_indexes)&&approval.operation_indexes.length>0,'Select reviewed operations');
  assert(new Set(approval.operation_indexes).size===approval.operation_indexes.length,'Duplicate operation index');
  const blocks=[];
  for(const i of approval.operation_indexes) {
    assert(Number.isInteger(i)&&plan.operations[i],'Invalid operation index');
    const op=plan.operations[i]; uuid(op.source_id);
    assert(['insert','update','discontinue'].includes(op.kind),'Invalid operation');
    const allowed=op.kind==='insert'?[...fields,'sku','ad_source_product_id','active','price_visible','verification_status','medical_review_required']:op.kind==='discontinue'?['active']:fields;
    assert(Object.keys(op.values).length&&Object.keys(op.values).every(k=>allowed.includes(k)),'Protected field');
    if(op.kind==='insert') {
      assert(op.values.active===false&&op.values.price_visible===false&&op.values.verification_status==='pending'&&op.values.medical_review_required===true,'Unsafe insert');
      assert(op.values.ad_source_product_id===op.source_id&&op.values.sku===`SHE-AD-${op.source_id}`,'Invalid insert identity');
      const keys=Object.keys(op.values);
      blocks.push(`SELECT to_jsonb(p) INTO current_row FROM public.she_products p WHERE ad_source_product_id=${lit(op.source_id)}::uuid;
IF current_row IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.she_products WHERE ad_source_product_id IS NULL AND (source_url=${lit(op.values.source_url)} OR title=${lit(op.values.title)})) THEN RAISE EXCEPTION 'Legacy identity conflict'; END IF;
  INSERT INTO public.she_products (${keys.join(',')},ad_last_synced_at) VALUES (${keys.map(k=>lit(op.values[k])).join(',')},now());
ELSIF NOT current_row @> ${json(op.values)} THEN RAISE EXCEPTION 'Insert identity changed; replan'; END IF;`);
    } else {
      uuid(op.target_id);
      assert(op.before.ad_source_product_id===op.source_id,'Invalid before identity');
      if(op.kind==='discontinue') assert(op.values.active===false&&plan.scope==='authoritative'&&op.evidence,'Unverified discontinuation');
      blocks.push(`SELECT to_jsonb(p) INTO current_row FROM public.she_products p WHERE id=${lit(op.target_id)}::uuid;
IF current_row IS NULL OR NOT current_row @> ${json({ad_source_product_id:op.source_id})} THEN RAISE EXCEPTION 'Missing or relinked product'; END IF;
IF NOT current_row @> ${json(op.values)} THEN
 IF NOT current_row @> ${json(op.before)} THEN RAISE EXCEPTION 'Stale product; replan'; END IF;
 UPDATE public.she_products SET ${Object.entries(op.values).map(([k,v])=>k+'='+lit(v)).join(',')},ad_last_synced_at=now() WHERE id=${lit(op.target_id)}::uuid;
END IF;`);
    }
  }
  // Lock prevents simultaneous imports/manual edits from slipping between compare and write.
  // Existing unique ad_source_product_id is the ultimate duplicate guard. No other tables touched.
  let tag='$catalog_sync$';
  while(blocks.join('\n').includes(tag)) tag=tag.slice(0,-1)+'x$';
  return `-- Reviewed plan ${plan_hash}\nBEGIN;\nSET LOCAL standard_conforming_strings=on;\nSET LOCAL lock_timeout='5s';\nLOCK TABLE public.she_products IN SHARE ROW EXCLUSIVE MODE;\nDO ${tag}\nDECLARE current_row jsonb;\nBEGIN\n${blocks.join('\n')}\nEND\n${tag};\nCOMMIT;\n`;
}

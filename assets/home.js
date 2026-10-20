// Reuse the existing public catalog and published-story sources; never fabricate inventory.
const url = 'https://tlpsqaywjcgowprhauod.supabase.co';
const key = 'sb_publishable_sQQtebH-fuHcAMm4e4wCPg_xRmac_l-';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
function https(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; } }
async function rows(table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, {headers: {apikey: key}, signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('unavailable');
  const data = await response.json(); if (!Array.isArray(data)) throw Error('unavailable'); return data;
}
function image(src, alt, className) {
  const frame = el('div', '', className); const safe = https(src);
  if (!safe) { frame.append(el('span', 'SHE')); return frame; }
  const img = el('img'); img.src = safe; img.alt = alt; img.loading = 'lazy'; img.width = 600; img.height = 700;
  img.addEventListener('error', () => frame.replaceChildren(el('span','SHE')), {once:true}); frame.append(img); return frame;
}
async function loadProducts() {
  const container = document.getElementById('home-products');
  try {
    const products = await rows('she_products', {select:'id,title,brand,summary,image_url,category',order:'display_order',limit:'4'});
    container.replaceChildren();
    if (!products.length) { container.append(el('p','精選商品整理中，歡迎透過 LINE 詢問。','simple-empty')); return; }
    for (const p of products) {
      const card = el('a','','simple-product'); card.href = '/catalog/#product-' + encodeURIComponent(p.id);
      const copy = el('div','','simple-product-copy');
      copy.append(el('p',p.brand || p.category,'simple-eyebrow'),el('h3',p.title),el('p',p.summary,'simple-product-description'),el('span','查看商品 ↗','simple-product-link'));
      card.append(image(p.image_url,p.title,'simple-product-image'),copy); container.append(card);
    }
  } catch { container.replaceChildren(el('p','商品暫時無法載入，請前往精選商品或聯絡 LINE 客服。','simple-empty')); }
}
async function loadPeople() {
  const container = document.getElementById('home-people');
  try {
    const people = await rows('she_people',{select:'slug,name,headline,cover_url',status:'eq.published',order:'sort_order',limit:'3'});
    container.replaceChildren();
    if (!people.length) { container.append(el('p','首批女性故事徵集中。下一位封面主角，可以是妳。','simple-empty')); return; }
    for (const p of people) {
      const card = el('a','','simple-person'); card.href = '/people/?slug=' + encodeURIComponent(p.slug);
      card.append(image(p.cover_url,p.name,'simple-person-image'),el('h3',p.name),el('p',p.headline)); container.append(card);
    }
  } catch { container.replaceChildren(el('p','人物故事暫時無法載入，請稍後至女性人物頁查看。','simple-empty')); }
}
void Promise.allSettled([loadProducts(),loadPeople()]);

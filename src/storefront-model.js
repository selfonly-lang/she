export function normalizeLine(value='') {
 const s=String(value||'').trim();
 if(/^@[a-zA-Z0-9._-]{3,40}$/.test(s))return 'https://line.me/R/ti/p/'+encodeURIComponent(s);
 try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';if(u.hostname==='lin.ee'&&/^\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname)&&!u.search&&!u.hash)return u.href;if(u.hostname==='line.me'&&/^\/R\/ti\/p\/(?:%40|@)[a-zA-Z0-9._-]{3,40}\/?$/i.test(u.pathname)&&!u.search&&!u.hash)return u.href;}catch{}
 return '';
}
export function curatedProducts(products,ids){if(!Array.isArray(ids))return [];const byId=new Map(products.filter(p=>p.active!==false&&!p.is_demo).map(p=>[p.id,p]));return [...new Set(ids)].map(id=>byId.get(id)).filter(Boolean);}

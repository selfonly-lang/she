import {build} from 'esbuild';
await build({entryPoints:['src/experience.jsx','src/magazine.jsx','src/storefront-model.js'],bundle:true,splitting:true,format:'esm',outdir:'assets/experience',minify:true,chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},target:['es2022'],metafile:true}).then(r=>console.log('React experience built:',Object.keys(r.metafile.outputs)));
import {cp,mkdir,rm} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});
await mkdir('public',{recursive:true});
for(const name of ['index.html','assets','admin','catalog','women','people','studio','manage-products','policies','line','workspace','operations']) await cp(name,`public/${name}`,{recursive:true});
// Preview-only viewport fixture for visual QA; never emitted to production.
if(process.env.VERCEL_ENV!=='production'){
  await mkdir('public/__review',{recursive:true});
  const {writeFile}=await import('node:fs/promises');
  await writeFile('public/__review/mobile.html','<!doctype html><html><head><meta charset="utf-8"><title>SHE mobile preview</title></head><body style="margin:0;background:#d9d2c8;display:grid;place-items:center;min-height:100vh"><iframe title="SHE 手機預覽" src="/" style="width:390px;height:844px;border:0;background:white"></iframe></body></html>');
}

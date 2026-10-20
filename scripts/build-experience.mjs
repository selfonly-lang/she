import {build} from 'esbuild';
await build({entryPoints:['src/experience.jsx'],bundle:true,splitting:true,format:'esm',outdir:'assets/experience',minify:true,chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},target:['es2022'],metafile:true}).then(r=>console.log('React experience built:',Object.keys(r.metafile.outputs)));
import {cp,mkdir,rm} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});
await mkdir('public',{recursive:true});
for(const name of ['index.html','assets','admin','catalog','women','people','studio','manage-products','policies','line']) await cp(name,`public/${name}`,{recursive:true});

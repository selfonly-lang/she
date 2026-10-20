import {build} from 'esbuild';
await build({entryPoints:['src/experience.jsx'],bundle:true,splitting:true,format:'esm',outdir:'assets/experience',minify:true,chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},target:['es2022'],metafile:true}).then(r=>console.log('React experience built:',Object.keys(r.metafile.outputs)));

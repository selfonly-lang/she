import {readFileSync,writeFileSync} from 'node:fs';
import {planSync,compileSql} from './sync.mjs';
const [command,a,b,out]=process.argv.slice(2);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
if(!out||!['plan','sql'].includes(command)) throw Error('Usage: node scripts/catalog/cli.mjs plan SOURCE TARGET OUTPUT | sql PLAN APPROVAL OUTPUT');
const result=command==='plan'?JSON.stringify(planSync(read(a),read(b)),null,2)+'\n':compileSql(read(a),read(b));
writeFileSync(out,result,{flag:'wx',mode:0o600});
console.log(`Created ${out}; no database writes performed.`);

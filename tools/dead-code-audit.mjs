import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const skipDirs=new Set(['.git','legacy','node_modules','dist','build']);
const sourceExt=new Set(['.js','.css','.html','.json','.md','.txt','.bat','.sh','.yml','.yaml']);
const candidatesExt=new Set(['.js','.css','.html']);
const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const full=path.join(dir,name);const rel=path.relative(root,full).replaceAll('\\','/');const stat=fs.statSync(full);if(stat.isDirectory()){if(skipDirs.has(name))continue;walk(full)}else if(sourceExt.has(path.extname(name)))files.push(rel)}}
walk(root);
const texts=new Map(files.map(rel=>[rel,fs.readFileSync(path.join(root,rel),'utf8')]));
const basenameRefs=new Map();
for(const rel of files){const base=path.basename(rel);basenameRefs.set(rel,[]);for(const [other,text] of texts){if(other===rel)continue;if(text.includes(base))basenameRefs.get(rel).push(other)}}
const allowOrphans=new Set([
  'index.html','tests/smoke.html','modules/book-builder/index.html','modules/maze-studio/index.html','modules/complete-picture/index.html',
  'tools/dead-code-audit.mjs'
]);
for(const rel of files){if(/^modules\/[a-z0-9-]+\/index\.html$/.test(rel))allowOrphans.add(rel)}
const orphanCandidates=files.filter(rel=>candidatesExt.has(path.extname(rel))&&!allowOrphans.has(rel)&&basenameRefs.get(rel).length===0);
const hashes=new Map();
for(const rel of files){if(!candidatesExt.has(path.extname(rel)))continue;const buf=fs.readFileSync(path.join(root,rel));if(!buf.length)continue;const hash=crypto.createHash('sha256').update(buf).digest('hex');if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(rel)}
const duplicateGroups=[...hashes.values()].filter(group=>group.length>1);
const suspiciousPatterns=[
  ['studio-live-ui','studio-live-ui'],
  ['mobilePage legacy path','mobilePage'],
  ['duplicate inline maze generator','function buildMaze'],
  ['duplicate inline maze solver','function solveMaze'],
  ['uppercase A4 storage','value="A4"']
];
const suspicious=[];
for(const [label,needle] of suspiciousPatterns){const hits=[];for(const [rel,text] of texts){if(rel==='tools/dead-code-audit.mjs'||rel.startsWith('docs/'))continue;if(text.includes(needle))hits.push(rel)}if(hits.length)suspicious.push({label,needle,hits})}
console.log(`AUDIT files=${files.length}`);
console.log(`ORPHAN_CANDIDATES ${orphanCandidates.length}`);orphanCandidates.forEach(x=>console.log(`  ${x}`));
console.log(`EXACT_DUPLICATE_GROUPS ${duplicateGroups.length}`);duplicateGroups.forEach(g=>console.log(`  ${g.join(' == ')}`));
console.log(`SUSPICIOUS_RUNTIME_PATTERNS ${suspicious.length}`);suspicious.forEach(x=>console.log(`  ${x.label}: ${x.hits.join(', ')}`));
if(orphanCandidates.length||duplicateGroups.length){
  if(orphanCandidates.length)console.error('Unreferenced active source files detected.');
  if(duplicateGroups.length)console.error('Exact duplicate source files detected.');
  process.exitCode=2;
}

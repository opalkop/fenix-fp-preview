"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const [syncRoot,outputFile]=process.argv.slice(2);
if(!syncRoot||!outputFile)throw new Error("Usage: node rebuild-sync-fixture.cjs <fenix-sync-dir> <output.json>");
const readJson=file=>JSON.parse(fs.readFileSync(file,"utf8"));
function hydrate(manifest){
  const result=structuredClone(manifest),assembled=new Map();
  for(const item of manifest.assetChunks||[]){
    const chunk=readJson(path.join(path.dirname(syncRoot),item.path));
    for(const piece of chunk.pieces||[]){const id=JSON.stringify(piece.path),entry=assembled.get(id)||{path:piece.path,parts:new Array(Number(piece.parts)||1)};entry.parts[Number(piece.part)||0]=String(piece.data||"");assembled.set(id,entry)}
  }
  for(const entry of assembled.values()){
    let node=result;for(let index=0;index<entry.path.length-1;index++)node=node[entry.path[index]];
    node[entry.path.at(-1)]=entry.parts.join("");
  }
  if(Number(result.payloadCount||0)!==assembled.size)throw new Error(`Missing payloads: ${assembled.size}/${result.payloadCount}`);
  return result;
}
const projects=hydrate(readJson(path.join(syncRoot,"projects.json"))),assets=hydrate(readJson(path.join(syncRoot,"assets.json"))),project=projects.projects.find(item=>item.id===projects.activeId)||projects.projects[0],library=assets.assetLibrary||{};
for(const asset of Object.values(project.assets||{})){const ref=String(asset.libraryRef||asset.meta?.libraryRef||"");if(ref&&library[ref]?.dataUrl)asset.dataUrl=library[ref].dataUrl}
const sandbox={window:{},console,Object};
for(const file of ["core/production-plan.js","core/book-order.js"])vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),sandbox,{filename:file});
const planned=sandbox.window.FenixProductionPlan.applyPreset(project.pages,"ocean-fantasy-50");project.pages=sandbox.window.FenixBookOrder.sort(planned.pages);
fs.mkdirSync(path.dirname(outputFile),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify({project,library,stats:{pages:project.pages.length,activities:planned.assignedCount,solutions:project.pages.filter(page=>page.solution?.available).length,assets:Object.values(project.assets||{}).filter(asset=>asset.dataUrl).length}},null,2));
console.log(JSON.stringify({name:project.name,pages:project.pages.length,activities:planned.assignedCount,solutions:project.pages.filter(page=>page.solution?.available).length,hydratedAssets:Object.values(project.assets||{}).filter(asset=>asset.dataUrl).length},null,2));

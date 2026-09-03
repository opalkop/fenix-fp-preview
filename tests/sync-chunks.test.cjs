"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const window={dispatchEvent(){},FenixPageSchema:{VERSION:3}};
const FenixCore={getProjects:()=>[],getActiveProjectId:()=>"project",getAssetLibrary:()=>({}),ready:Promise.resolve(),flushStorage:async()=>true};
const sandbox={window,FenixCore,localStorage:storage,sessionStorage:storage,structuredClone,TextEncoder,TextDecoder,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Blob,console,setTimeout,fetch:async()=>{throw new Error("fetch should not run")},atob};
const source=fs.readFileSync(path.join(__dirname,"../core/sync-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"sync-core.js"});
const sync=window.FenixSync;

const libraryData=`data:image/svg+xml;base64,${"A".repeat(4100000)}`;
const projectData=`data:image/png;base64,${"B".repeat(1900000)}`;
const previewData=`data:image/png;base64,${"C".repeat(1700000)}`;
const bundle={type:sync.FORMAT,version:sync.VERSION,schemaVersion:3,updatedAt:"2026-09-03T00:00:00.000Z",activeId:"project",assetLibrary:{ocean:{id:"ocean",dataUrl:libraryData,pack:"Ocean Fantasy"}},projects:[{id:"project",assets:{local:{id:"local",dataUrl:projectData}},pages:[{id:"page",preview:{imageData:previewData}}]}]};

const plan=sync.buildCloudPlan(bundle,"fenix-sync/projects.json");
assert.ok(plan.chunks.length>=3,"Duża synchronizacja powinna zostać podzielona na kilka części.");
assert.ok(plan.chunks.every(chunk=>chunk.bytes<=2800000),"Każda część musi mieścić się w bezpiecznym limicie GitHuba.");
assert.ok(JSON.stringify(plan.manifest).length<10000,"Manifest nie może zawierać ciężkich danych obrazów.");
assert.equal(plan.manifest.assetLibrary.ocean.dataUrl,"");
assert.equal(plan.manifest.projects[0].assets.local.dataUrl,"");
assert.equal(plan.manifest.projects[0].pages[0].preview.imageData,"");

const restored=sync.hydrateCloudBundle(plan.manifest,plan.chunks.map(chunk=>JSON.parse(chunk.text)));
assert.equal(restored.assetLibrary.ocean.dataUrl,libraryData);
assert.equal(restored.projects[0].assets.local.dataUrl,projectData);
assert.equal(restored.projects[0].pages[0].preview.imageData,previewData);

console.log(`PASS sync-chunks: ${plan.size} bajtów podzielono na ${plan.chunks.length} bezpiecznych części i odtworzono 1:1.`);

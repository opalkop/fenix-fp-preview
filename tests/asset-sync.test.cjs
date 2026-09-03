"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const projects=[{id:"project-1",updatedAt:"2026-09-03T00:00:00.000Z",assets:{linked:{id:"linked",libraryRef:"ocean-1",dataUrl:"data:image/png;base64,PROJECT",meta:{libraryRef:"ocean-1",role:"decor"}}},pages:[]}];
const library={"ocean-1":{id:"ocean-1",name:"Ocean 1",dataUrl:"data:image/png;base64,GLOBAL",meta:{pack:"Ocean Fantasy"}}};
let projectWrites=0;
let libraryWrites=0;
const FenixCore={
  getProjects:()=>structuredClone(projects),
  getActiveProjectId:()=>"project-1",
  getAssetLibrary:()=>structuredClone(library),
  createProject(){projectWrites++;},
  updateProject(){projectWrites++;},
  setActiveProject(){},
  mergeAssetLibrary(){libraryWrites++;throw new Error("Project Sync must not merge global library");},
  putLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  updateLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  removeLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  replaceAssetLibrary(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  ready:Promise.resolve(),
  flushStorage:async()=>true,
  getStorageInfo:()=>({mode:"indexeddb"})
};
const window={dispatchEvent(){},FenixPageSchema:{VERSION:3}};
const sandbox={window,FenixCore,localStorage:storage,sessionStorage:storage,structuredClone,TextEncoder,TextDecoder,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Blob,console,setTimeout,fetch:async()=>{throw new Error("fetch should not run")},atob};
const source=fs.readFileSync(path.join(__dirname,"../core/sync-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"sync-core.js"});
const sync=window.FenixSync;

assert.equal(sync.FORMAT,"FENIX_SYNC_BUNDLE");
assert.equal(sync.VERSION,6);
assert.equal(sync.ASSET_FORMAT,"FENIX_ASSET_SYNC_BUNDLE");
assert.equal(sync.ASSET_VERSION,1);
assert.equal(sync.ASSET_PATH,"fenix-sync/assets.json");

const projectSnapshot=sync.snapshot();
assert.equal(Object.hasOwn(projectSnapshot,"assetLibrary"),false,"Project Sync snapshot nie może zawierać globalnej biblioteki.");
assert.equal(projectSnapshot.projects[0].assets.linked.id,"linked");
assert.equal(projectSnapshot.projects[0].assets.linked.libraryRef,"ocean-1");
assert.equal(projectSnapshot.projects[0].assets.linked.meta.libraryRef,"ocean-1");
assert.equal(projectSnapshot.projects[0].assets.linked.dataUrl,"");

const assetSnapshot=sync.assetSnapshot();
assert.deepEqual(Object.keys(assetSnapshot).sort(),["assetCount","assetLibrary","type","updatedAt","version"].sort());
assert.equal(assetSnapshot.type,sync.ASSET_FORMAT);
assert.equal(assetSnapshot.version,sync.ASSET_VERSION);
assert.equal(assetSnapshot.assetCount,1);
assert.equal(assetSnapshot.assetLibrary["ocean-1"].dataUrl,"data:image/png;base64,GLOBAL");
assert.equal(Object.hasOwn(assetSnapshot,"projects"),false);
assert.equal(Object.hasOwn(assetSnapshot,"activeId"),false);

const projectPlan=sync.buildCloudPlan(projectSnapshot,"fenix-sync/projects.json");
const assetPlan=sync.buildCloudPlan(assetSnapshot,sync.ASSET_PATH);
assert.ok(projectPlan.chunks.every(chunk=>chunk.path.includes("/chunks/projects-"))||projectPlan.chunks.length===0);
assert.ok(assetPlan.chunks.every(chunk=>chunk.path.includes("/chunks/assets-"))||assetPlan.chunks.length===0);
if(projectPlan.chunks.length&&assetPlan.chunks.length)assert.notEqual(projectPlan.chunks[0].path,assetPlan.chunks[0].path);

const legacy={...projectSnapshot,assetLibrary:{evil:{id:"evil",dataUrl:"data:image/png;base64,EVIL"}},projects:[]};
sync.mergeBundle(legacy,{prefer:"remote"});
assert.equal(projectWrites,0,"Pusty legacy bundle nie powinien tworzyć ani aktualizować projektów.");
assert.equal(libraryWrites,0,"Legacy assetLibrary w Project Sync musi być ignorowane bez zapisów globalnej biblioteki.");
assert.equal(JSON.stringify(library),JSON.stringify({"ocean-1":{id:"ocean-1",name:"Ocean 1",dataUrl:"data:image/png;base64,GLOBAL",meta:{pack:"Ocean Fantasy"}}}));

assert.equal(typeof sync.pushAssets,"function");
assert.equal(typeof sync.pullAssets,"function");
assert.equal(Object.hasOwn(sync,"syncAssets"),false,"Nie wolno eksportować automatycznego pull→push Asset Sync.");

console.log("PASS asset-sync: project/library separation, snapshot contracts and path separation are preserved.");

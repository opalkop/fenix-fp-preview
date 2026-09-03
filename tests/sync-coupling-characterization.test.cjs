"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const sentinel={id:"global-sentinel",name:"Ocean Sentinel",dataUrl:"data:image/png;base64,SENTINEL",meta:{pack:"Ocean Fantasy"}};
const projects=[{id:"local-project",name:"Local",updatedAt:"2026-09-03T10:00:00.000Z",assets:{linked:{id:"linked",libraryRef:"global-sentinel",dataUrl:"data:image/png;base64,LINKED",meta:{libraryRef:"global-sentinel",role:"decor"}}},pages:[]}];
let libraryWrites=0;
let projectWrites=0;
const FenixCore={
  getProjects:()=>structuredClone(projects),
  getActiveProjectId:()=>"local-project",
  getAssetLibrary:()=>({"global-sentinel":structuredClone(sentinel)}),
  mergeAssetLibrary(){libraryWrites++;throw new Error("Project Sync must not merge global library");},
  putLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  updateLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  removeLibraryAsset(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  replaceAssetLibrary(){libraryWrites++;throw new Error("Project Sync must not write global library");},
  createProject(project){projectWrites++;projects.push(structuredClone(project));},
  updateProject(id,project){projectWrites++;const i=projects.findIndex(p=>p.id===id);if(i>=0)projects[i]=structuredClone(project);},
  setActiveProject(){},
  ready:Promise.resolve(),
  flushStorage:async()=>true
};
const window={dispatchEvent(){},FenixPageSchema:{VERSION:3}};
const sandbox={window,FenixCore,localStorage:storage,sessionStorage:storage,structuredClone,TextEncoder,TextDecoder,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Blob,console,setTimeout,fetch:async()=>{throw new Error("fetch should not run")},atob};
const source=fs.readFileSync(path.join(__dirname,"../core/sync-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"sync-core.js"});
const sync=window.FenixSync;

const snapshot=sync.snapshot();
assert.equal(Object.hasOwn(snapshot,"assetLibrary"),false,"Project snapshot must not contain global assetLibrary");
assert.equal(snapshot.projects[0].assets.linked.id,"linked");
assert.equal(snapshot.projects[0].assets.linked.libraryRef,"global-sentinel");
assert.equal(snapshot.projects[0].assets.linked.meta.libraryRef,"global-sentinel");
assert.equal(snapshot.projects[0].assets.linked.dataUrl,"");

const legacy={
  type:sync.FORMAT,
  version:sync.VERSION,
  activeId:"remote-project",
  updatedAt:"2026-09-03T12:00:00.000Z",
  assetLibrary:{
    "global-sentinel":{id:"global-sentinel",dataUrl:"data:image/png;base64,EVIL"},
    injected:{id:"injected",dataUrl:"data:image/png;base64,INJECTED"}
  },
  projects:[{id:"remote-project",name:"Remote",updatedAt:"2026-09-03T12:00:00.000Z",assets:{},pages:[]}]
};

const beforeLibrary=JSON.stringify(FenixCore.getAssetLibrary());
const stats=sync.mergeBundle(legacy,{prefer:"remote"});
const afterLibrary=JSON.stringify(FenixCore.getAssetLibrary());
assert.equal(stats.created,1);
assert.equal(projectWrites,1,"Project merge should still import project records");
assert.equal(libraryWrites,0,"Project merge must perform zero global-library writes");
assert.equal(afterLibrary,beforeLibrary,"Legacy top-level assetLibrary must be ignored 1:1");

console.log("PASS sync-coupling-characterization: Project Sync remains fully decoupled from the global asset library.");

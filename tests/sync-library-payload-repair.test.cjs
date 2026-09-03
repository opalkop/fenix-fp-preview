"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const localLibrary={
  ocean:{id:"ocean",name:"Ocean",dataUrl:"",updatedAt:"2026-09-03T10:00:00.000Z"},
  keep:{id:"keep",name:"Keep local",dataUrl:"data:image/png;base64,LOCAL",updatedAt:"2026-09-03T10:00:00.000Z"}
};
const mergeCalls=[];
const FenixCore={
  getProjects:()=>[],
  getActiveProjectId:()=>"project",
  getAssetLibrary:()=>structuredClone(localLibrary),
  mergeAssetLibrary:(value,{prefer}={})=>{mergeCalls.push({value:structuredClone(value),prefer});return{created:0,updated:Object.keys(value||{}).length,kept:0}},
  ready:Promise.resolve(),flushStorage:async()=>true
};
const window={dispatchEvent(){},FenixPageSchema:{VERSION:3}};
const sandbox={window,FenixCore,localStorage:storage,sessionStorage:storage,structuredClone,TextEncoder,TextDecoder,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Blob,console,setTimeout,fetch:async()=>{throw new Error("fetch should not run")},atob};
const source=fs.readFileSync(path.join(__dirname,"../core/sync-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"sync-core.js"});

const sync=window.FenixSync;
const bundle={
  type:sync.FORMAT,
  version:sync.VERSION,
  activeId:"project",
  assetLibrary:{
    ocean:{id:"ocean",name:"Ocean",dataUrl:"data:image/png;base64,REMOTE",updatedAt:"2026-09-02T10:00:00.000Z"},
    keep:{id:"keep",name:"Keep remote",dataUrl:"data:image/png;base64,REMOTE2",updatedAt:"2026-09-02T10:00:00.000Z"}
  },
  projects:[]
};

const stats=sync.mergeBundle(bundle,{prefer:"newer"});
assert.equal(mergeCalls.length,2,"Merge powinien rozdzielić zwykłe dane i naprawę brakującego payloadu.");
const normal=mergeCalls.find(call=>call.prefer==="newer");
const repair=mergeCalls.find(call=>call.prefer==="remote");
assert.deepEqual(Object.keys(normal.value),["keep"],"Pełny lokalny asset nadal podlega zwykłej regule newer.");
assert.deepEqual(Object.keys(repair.value),["ocean"],"Pusty lokalny asset ma zostać naprawiony pełnym payloadem z chmury.");
assert.equal(stats.library.repaired,1);
console.log("PASS sync-library-payload-repair: pusty lokalny dataUrl jest naprawiany z chmury bez globalnego wymuszania remote.");

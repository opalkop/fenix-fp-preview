"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const projects=[{id:"project-1",assets:{local:{id:"local",dataUrl:"data:image/png;base64,PROJECT"}},pages:[]}];
const localLibrary={sentinel:{id:"sentinel",name:"Sentinel",mime:"image/png",dataUrl:"data:image/png;base64,LOCAL",meta:{pack:"Ocean Fantasy"}}};
let projectWrites=0;
const records=new Map([
  ["project-1::local",{key:"project-1::local",projectId:"project-1",assetId:"local",dataUrl:"data:image/png;base64,PROJECT",mime:"image/png"}],
  ["__fenix_library__::sentinel",{key:"__fenix_library__::sentinel",projectId:"__fenix_library__",assetId:"sentinel",dataUrl:"data:image/png;base64,LOCAL",mime:"image/png"}]
]);

function makeIndexedDb(){
  const db={
    objectStoreNames:{contains:name=>name==="assets"},
    createObjectStore(){throw new Error("unexpected upgrade")},
    transaction(){
      const tx={oncomplete:null,onerror:null,onabort:null};
      const store={
        index(){
          return {openCursor(range){
            const request={result:null,onsuccess:null,onerror:null};
            const keys=()=>[...records.keys()].filter(key=>records.get(key)?.projectId===range.value);
            let index=0;
            const advance=()=>queueMicrotask(()=>{
              const list=keys();
              if(index>=list.length){request.result=null;request.onsuccess?.();return;}
              const key=list[index];
              request.result={
                value:records.get(key),
                delete(){records.delete(key);},
                continue(){index=0;advance();}
              };
              request.onsuccess?.();
            });
            advance();
            return request;
          }};
        },
        put(record){records.set(record.key,structuredClone(record));}
      };
      tx.objectStore=()=>store;
      setTimeout(()=>tx.oncomplete?.(),5);
      return tx;
    }
  };
  return {open(){const request={result:db,onupgradeneeded:null,onsuccess:null,onerror:null};queueMicrotask(()=>request.onsuccess?.());return request;}};
}

let remoteBundle={type:"FENIX_ASSET_SYNC_BUNDLE",version:1,updatedAt:"2026-09-03T12:00:00.000Z",assetCount:0,assetLibrary:{},assetChunks:[],payloadCount:0};
let missingChunk=false;
const encode=value=>Buffer.from(typeof value==="string"?value:JSON.stringify(value),"utf8").toString("base64");
function response({status=200,json=null,text=null}={}){
  return {ok:status>=200&&status<300,status,async json(){return typeof json==="function"?json():json;},async text(){return text??"";}};
}
async function fetchMock(url){
  const value=String(url);
  if(value.includes("/contents/fenix-sync/assets.json"))return response({json:{sha:"manifest-sha",content:encode(remoteBundle)}});
  if(value.includes("/contents/fenix-sync/chunks/assets-/payload-0001.json")){
    if(missingChunk)return response({status:404,json:{}});
    return response({json:{sha:"chunk-sha",content:encode({type:"FENIX_SYNC_PAYLOAD_CHUNK",version:1,pieces:[]})}});
  }
  throw new Error(`unexpected fetch ${value}`);
}

const FenixCore={
  getProjects:()=>structuredClone(projects),
  getActiveProjectId:()=>"project-1",
  getAssetLibrary:()=>structuredClone(localLibrary),
  createProject(){projectWrites++;},updateProject(){projectWrites++;},setActiveProject(){projectWrites++;},
  ready:Promise.resolve(),flushStorage:async()=>true,getStorageInfo:()=>({mode:"indexeddb"})
};
const window={dispatchEvent(){},FenixPageSchema:{VERSION:3}};
const sandbox={window,FenixCore,localStorage:storage,sessionStorage:storage,structuredClone,TextEncoder,TextDecoder,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Blob,console,setTimeout,queueMicrotask,fetch:fetchMock,atob,indexedDB:makeIndexedDb(),IDBKeyRange:{only:value=>({value})},Buffer};
const source=fs.readFileSync(path.join(__dirname,"../core/sync-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"sync-core.js"});
const sync=window.FenixSync;
sync.setConfig({token:"test-token",rememberToken:false});

(async()=>{
  const before=[...records.entries()].map(([key,value])=>[key,structuredClone(value)]);
  const guarded=await sync.pullAssets();
  assert.equal(guarded.requiresConfirmation,true);
  assert.equal(guarded.reason,"remote-empty-local-nonempty");
  assert.equal(guarded.reloadRequired,false);
  assert.deepEqual([...records.entries()],before,"Guarded empty pull must not mutate IndexedDB");

  const cleared=await sync.pullAssets({allowEmptyReplacement:true});
  assert.equal(cleared.reloadRequired,true);
  assert.equal(records.has("__fenix_library__::sentinel"),false,"Confirmed empty pull should clear global scope");
  assert.equal(records.has("project-1::local"),true,"Confirmed empty pull must preserve project scope");
  assert.equal(projectWrites,0,"Asset pull must not mutate projects");

  records.set("__fenix_library__::old",{key:"__fenix_library__::old",projectId:"__fenix_library__",assetId:"old",dataUrl:"data:image/png;base64,OLD",mime:"image/png"});
  remoteBundle={type:sync.ASSET_FORMAT,version:sync.ASSET_VERSION,updatedAt:"2026-09-03T13:00:00.000Z",assetCount:1,assetLibrary:{fresh:{id:"fresh",name:"Fresh",mime:"image/png",dataUrl:"data:image/png;base64,FRESH",meta:{pack:"Ocean Fantasy"}}},assetChunks:[],payloadCount:0};
  const replaced=await sync.pullAssets();
  assert.equal(replaced.reloadRequired,true);
  assert.equal(records.has("__fenix_library__::old"),false);
  assert.equal(records.get("__fenix_library__::fresh")?.dataUrl,"data:image/png;base64,FRESH");
  assert.equal(records.has("project-1::local"),true);
  const metadata=JSON.parse(storage.getItem("fenix-asset-library-v1"));
  assert.equal(metadata.fresh.meta.pack,"Ocean Fantasy");
  assert.equal(metadata.fresh.dataUrl,"");

  const stable=[...records.entries()].map(([key,value])=>[key,structuredClone(value)]);
  remoteBundle={...remoteBundle,assetCount:2};
  await assert.rejects(()=>sync.pullAssets(),/Liczba assetów/);
  assert.deepEqual([...records.entries()],stable,"assetCount mismatch must not mutate storage");

  remoteBundle={type:sync.ASSET_FORMAT,version:sync.ASSET_VERSION,updatedAt:"2026-09-03T14:00:00.000Z",assetCount:0,assetLibrary:{},assetChunks:[{path:"fenix-sync/chunks/assets-/payload-0001.json",index:1}],payloadCount:1};
  missingChunk=true;
  await assert.rejects(()=>sync.pullAssets(),/brakuje części/);
  assert.deepEqual([...records.entries()],stable,"Missing chunk must not mutate storage");

  assert.equal(projectWrites,0,"Asset Sync must remain project-blind");
  console.log("PASS asset-sync-pull: validation, empty-remote guard, scoped replacement and project isolation are preserved.");
})().catch(error=>{console.error(error);process.exitCode=1;});

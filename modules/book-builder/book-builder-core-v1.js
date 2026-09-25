"use strict";

// Dedicated, cache-independent Book Builder core. It deliberately reads only
// the active project's metadata and the image assets referenced by its pages.
window.FenixCore=(()=>{
  const PROJECTS_KEY="fenix-projects-v1",ACTIVE_KEY="fenix-active-project-v1",LIBRARY_KEY="fenix-asset-library-v1";
  const DB_NAME="fenix-assets-v1",DB_VERSION=1,STORE="assets",LIBRARY_SCOPE="__fenix_library__";
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}};
  const key=(scope,id)=>`${scope}::${id}`;
  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  let projects=read(PROJECTS_KEY,[]),library=read(LIBRARY_KEY,{}),activeId=localStorage.getItem(ACTIVE_KEY),storageMode="indexeddb",storageReady=false,requestedAssets=0;
  if(!Array.isArray(projects))projects=[];
  if(!library||typeof library!=="object"||Array.isArray(library))library={};
  if(!projects.some(project=>project.id===activeId))activeId=projects[0]?.id||"";

  const active=()=>projects.find(project=>project.id===activeId)||projects[0]||{id:"",name:"Brak projektu",format:"8.5x11",bleed:"no-bleed",pages:[],assets:{}};
  function stripPage(page){const out=clone(page)||{};if(out.preview)out.preview={...out.preview,imageData:null};if(out.solution)out.solution={...out.solution,imageData:null};if(Object.hasOwn(out,"imageData"))out.imageData=null;if(Object.hasOwn(out,"solutionImageData"))out.solutionImageData=null;return out}
  function persist(){const lightweight=projects.map(project=>({...project,pages:(project.pages||[]).map(stripPage),assets:Object.fromEntries(Object.entries(project.assets||{}).map(([id,asset])=>[id,{...asset,dataUrl:""}]))}));localStorage.setItem(PROJECTS_KEY,JSON.stringify(lightweight));if(activeId)localStorage.setItem(ACTIVE_KEY,activeId)}
  function referencedIds(project){const known=new Set(Object.keys(project?.assets||{})),found=new Set(),seen=new Set();const visit=value=>{if(value==null)return;if(typeof value==="string"){if(known.has(value))found.add(value);return}if(typeof value!=="object"||seen.has(value))return;seen.add(value);if(Array.isArray(value))value.forEach(visit);else Object.values(value).forEach(visit)};(project?.pages||[]).forEach(visit);return found}
  function timeout(promise,ms,message){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))])}
  function openDb(){return timeout(new Promise((resolve,reject)=>{try{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:"key"});store.createIndex("projectId","projectId",{unique:false})}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("IndexedDB unavailable"));request.onblocked=()=>reject(new Error("IndexedDB blocked"))}catch(error){reject(error)}}),5000,"IndexedDB open timeout")}
  function getRequest(store,itemKey){return timeout(new Promise((resolve,reject)=>{const request=store.get(itemKey);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error||new Error("IndexedDB read failed"))}),8000,"IndexedDB asset timeout")}
  async function hydrate(){
    const project=active();
    if(!project.id){storageMode="metadata";storageReady=true;return}
    try{
      const ids=referencedIds(project),db=await openDb(),store=db.transaction(STORE,"readonly").objectStore(STORE),lookups=[];
      for(const id of ids){const asset=project.assets?.[id];if(!asset)continue;const ref=libraryRefOf(asset);lookups.push({id,ref,itemKey:key(ref?LIBRARY_SCOPE:project.id,ref||id)})}
      requestedAssets=lookups.length;
      const records=await timeout(Promise.all(lookups.map(async item=>({...item,record:await getRequest(store,item.itemKey)}))),12000,"IndexedDB project assets timeout");
      for(const item of records){if(!item.record?.dataUrl)continue;const asset=project.assets[item.id];asset.dataUrl=item.record.dataUrl;if(item.ref&&library[item.ref])library[item.ref].dataUrl=item.record.dataUrl}
      for(const asset of Object.values(project.assets||{})){const ref=libraryRefOf(asset),source=ref?library[ref]:null;if(source?.dataUrl){asset.dataUrl=source.dataUrl;asset.mime=source.mime||asset.mime}}
      storageReady=true;db.close();
    }catch(error){console.error("Book Builder asset hydration fallback",error);storageMode="metadata";storageReady=true}
  }
  const ready=hydrate().then(()=>{queueMicrotask(()=>window.dispatchEvent(new CustomEvent("fenix-storage-ready",{detail:getStorageInfo()})));return getStorageInfo()});
  function getStorageInfo(){return{mode:storageMode,ready:storageReady,bookBuilderCore:"v1",requestedAssets,heavyAssetsInIndexedDB:storageMode==="indexeddb",heavyPageSnapshotsInIndexedDB:false,globalLibrary:true,libraryAssets:Object.keys(library).length}}
  const getActiveProject=()=>clone(active()),getCart=()=>clone(active().pages||[]);
  function setCart(pages){const project=active();project.pages=Array.isArray(pages)?clone(pages):[];project.updatedAt=new Date().toISOString();persist();window.dispatchEvent(new Event("fenix-cart-change"));return clone(project.pages)}
  function getAsset(id){const project=active();return clone(project.assets?.[id]||null)}
  function listAssets(){return clone(Object.values(active().assets||{}))}
  const flushStorage=async()=>true;
  return Object.freeze({ready,getStorageInfo,getActiveProject,getCart,setCart,getAsset,listAssets,flushStorage});
})();

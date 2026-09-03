"use strict";
window.FenixSync=(()=>{
  const CONFIG_KEY="fenix-sync-config-v1";
  const TOKEN_KEY="fenix-sync-token-v1";
  const FORMAT="FENIX_SYNC_BUNDLE";
  const VERSION=6;
  const ASSET_FORMAT="FENIX_ASSET_SYNC_BUNDLE";
  const ASSET_VERSION=1;
  const ASSET_PATH="fenix-sync/assets.json";
  const CHUNK_FORMAT="FENIX_SYNC_PAYLOAD_CHUNK";
  const MAX_CHUNK_BYTES=2800000;
  const MAX_PART_CHARS=1800000;
  const ASSET_DB_NAME="fenix-assets-v1";
  const ASSET_DB_VERSION=1;
  const ASSET_STORE="assets";
  const LIBRARY_SCOPE="__fenix_library__";
  const LIBRARY_KEY="fenix-asset-library-v1";
  const DEFAULTS=Object.freeze({provider:"github",owner:"opalkop",repo:"fenix",branch:"fenix-sync-data",path:"fenix-sync/projects.json",autoSync:true});

  let pushInFlight=null;
  let assetPushInFlight=null;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const safeParse=(value,fallback)=>{try{return JSON.parse(value)||fallback}catch{return fallback}};
  const readConfig=()=>safeParse(localStorage.getItem(CONFIG_KEY),{});

  function getConfig(){
    const c=readConfig();
    return {...DEFAULTS,...c,token:sessionStorage.getItem(TOKEN_KEY)||c.token||"",rememberToken:Boolean(c.token),autoSync:c.autoSync!==false};
  }
  function setConfig(next={}){
    const merged={...getConfig(),...next};
    const persistent={provider:"github",owner:String(merged.owner||DEFAULTS.owner).trim(),repo:String(merged.repo||DEFAULTS.repo).trim(),branch:String(merged.branch||DEFAULTS.branch).trim(),path:String(merged.path||DEFAULTS.path).trim(),autoSync:merged.autoSync!==false};
    if(next.rememberToken&&merged.token)persistent.token=merged.token;
    localStorage.setItem(CONFIG_KEY,JSON.stringify(persistent));
    if(merged.token)sessionStorage.setItem(TOKEN_KEY,merged.token);else sessionStorage.removeItem(TOKEN_KEY);
    return getConfig();
  }
  function clearToken(){
    sessionStorage.removeItem(TOKEN_KEY);
    const c=readConfig();delete c.token;localStorage.setItem(CONFIG_KEY,JSON.stringify(c));
  }

  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  function compactProjects(projects){
    return projects.map(project=>({...project,assets:Object.fromEntries(Object.entries(project.assets||{}).map(([id,asset])=>[id,libraryRefOf(asset)?{...asset,dataUrl:""}:asset]))}));
  }
  function snapshot(){
    const projects=FenixCore.getProjects();
    if(!Array.isArray(projects)||!projects.length)throw new Error("Fenix Sync: brak lokalnych projektów do wysłania.");
    return {type:FORMAT,version:VERSION,schemaVersion:window.FenixPageSchema?.VERSION||3,updatedAt:new Date().toISOString(),activeId:FenixCore.getActiveProjectId(),projects:compactProjects(projects)};
  }
  function assetSnapshot(){
    const assetLibrary=FenixCore.getAssetLibrary?.()||{};
    return {type:ASSET_FORMAT,version:ASSET_VERSION,updatedAt:new Date().toISOString(),assetCount:Object.keys(assetLibrary).length,assetLibrary};
  }

  const copy=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const byteSize=value=>new TextEncoder().encode(String(value||"")).byteLength;
  const progress=(phase,current,total)=>window.dispatchEvent(new CustomEvent("fenix-sync-progress",{detail:{phase,current,total}}));

  function extractPayloads(value,path=[],out=[]){
    if(!value||typeof value!=="object")return out;
    for(const key of Object.keys(value)){
      const item=value[key],next=[...path,key];
      if(typeof item==="string"&&item.startsWith("data:")&&item.length){out.push({path:next,data:item});value[key]="";}
      else if(item&&typeof item==="object")extractPayloads(item,next,out);
    }
    return out;
  }
  function chunkRoot(path){
    const clean=String(path||DEFAULTS.path).replace(/^\/+|\/+$/g,"");
    const cut=clean.lastIndexOf("/");
    const dir=cut>=0?`${clean.slice(0,cut)}/`:"";
    const file=cut>=0?clean.slice(cut+1):clean;
    const stem=(file.replace(/\.[^.]+$/,"-")||"sync-").replace(/[^a-z0-9_-]+/gi,"-");
    return `${dir}chunks/${stem}`;
  }
  function buildCloudPlan(source=snapshot(),manifestPath=getConfig().path){
    const manifest=copy(source),payloads=extractPayloads(manifest),pieces=[];
    for(const payload of payloads){
      const parts=Math.max(1,Math.ceil(payload.data.length/MAX_PART_CHARS));
      for(let part=0;part<parts;part++)pieces.push({path:payload.path,part,parts,data:payload.data.slice(part*MAX_PART_CHARS,(part+1)*MAX_PART_CHARS)});
    }
    const groups=[];let current=[];
    for(const piece of pieces){
      const candidate={type:CHUNK_FORMAT,version:1,pieces:[...current,piece]};
      if(current.length&&byteSize(JSON.stringify(candidate))>MAX_CHUNK_BYTES){groups.push(current);current=[piece];}else current.push(piece);
    }
    if(current.length)groups.push(current);
    const root=chunkRoot(manifestPath);
    const chunks=groups.map((group,index)=>{
      const text=JSON.stringify({type:CHUNK_FORMAT,version:1,pieces:group});
      const path=`${root}/payload-${String(index+1).padStart(4,"0")}.json`;
      return {path,text,bytes:byteSize(text),pieceCount:group.length};
    });
    manifest.assetChunks=chunks.map(({path,bytes,pieceCount},index)=>({path,bytes,pieceCount,index:index+1}));
    manifest.payloadCount=payloads.length;
    return {manifest,chunks,payloadCount:payloads.length,size:byteSize(JSON.stringify(source)),manifestSize:byteSize(JSON.stringify(manifest))};
  }
  function setAtPath(target,path,value){
    if(!Array.isArray(path)||!path.length)throw new Error("Fenix Sync: nieprawidłowa ścieżka danych assetu.");
    let node=target;
    for(let index=0;index<path.length-1;index++){
      const key=path[index];
      if(!node||typeof node!=="object"||!(key in node))throw new Error("Fenix Sync: paczka assetów nie pasuje do manifestu.");
      node=node[key];
    }
    node[path.at(-1)]=value;
  }
  function hydrateCloudBundle(source,chunkDocuments=[]){
    const bundle=copy(source),assembled=new Map();
    for(const chunk of chunkDocuments){
      if(chunk?.type!==CHUNK_FORMAT||!Array.isArray(chunk.pieces))throw new Error("Fenix Sync: nieprawidłowa część danych assetów.");
      for(const piece of chunk.pieces){
        const key=JSON.stringify(piece.path),entry=assembled.get(key)||{path:piece.path,parts:new Array(Number(piece.parts)||1)};
        entry.parts[Number(piece.part)||0]=String(piece.data||"");assembled.set(key,entry);
      }
    }
    for(const entry of assembled.values()){
      if(entry.parts.some(part=>typeof part!=="string"))throw new Error("Fenix Sync: brakuje fragmentu danych assetu.");
      setAtPath(bundle,entry.path,entry.parts.join(""));
    }
    if(Number(bundle.payloadCount||0)!==assembled.size)throw new Error(`Fenix Sync: pobrano ${assembled.size} z ${bundle.payloadCount||0} danych assetów.`);
    return bundle;
  }

  const newer=(a,b)=>String(a?.updatedAt||a?.createdAt||"").localeCompare(String(b?.updatedAt||b?.createdAt||""))>0;
  function mergeBundle(bundle,{prefer="newer"}={}){
    if(!bundle||bundle.type!==FORMAT||!Array.isArray(bundle.projects))throw new Error("Nieprawidłowy pakiet synchronizacji FENIX.");
    const byId=new Map(FenixCore.getProjects().map(project=>[project.id,project]));
    const stats={created:0,updated:0,kept:0};
    for(const remote of bundle.projects){
      const here=byId.get(remote.id);
      if(!here){FenixCore.createProject(remote);stats.created++;byId.set(remote.id,remote);continue;}
      const take=prefer==="remote"||(prefer==="newer"&&newer(remote,here));
      if(take){FenixCore.updateProject(here.id,remote);stats.updated++;}else stats.kept++;
    }
    if(bundle.activeId&&FenixCore.getProjects().some(project=>project.id===bundle.activeId))FenixCore.setActiveProject(bundle.activeId);
    return stats;
  }
  async function mergeAndFlush(bundle,options){await FenixCore.ready;const stats=mergeBundle(bundle,options);await FenixCore.flushStorage();return stats;}

  function unb64utf8(text){
    const clean=String(text||"").replace(/\s/g,"");if(!clean)return"";
    const bin=atob(clean),bytes=Uint8Array.from(bin,char=>char.charCodeAt(0));return new TextDecoder().decode(bytes);
  }
  function requireConfig(){const c=getConfig();if(!c.token)throw new Error("Fenix Sync wymaga jednorazowego tokenu GitHub na tym urządzeniu.");return c;}
  async function githubRequest(url,options={}){
    const c=requireConfig(),headers={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",Authorization:`Bearer ${c.token}`,...options.headers};
    const response=await fetch(url,{...options,headers});
    if(!response.ok&&response.status!==404){
      const body=await response.text().catch(()=>"");const error=new Error(`GitHub Sync ${response.status}: ${body.slice(0,220)}`);error.status=response.status;throw error;
    }
    return response;
  }
  const apiBase=c=>`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`;
  const contentsUrl=(c,path=c.path)=>`${apiBase(c)}/contents/${String(path||"").split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(c.branch)}`;
  async function readRemoteMeta(path=null){const c=requireConfig(),res=await githubRequest(contentsUrl(c,path||c.path));if(res.status===404)return null;return res.json();}
  async function readRemoteText(meta=null,path=null){
    const c=requireConfig();
    if(meta?.git_url){const res=await githubRequest(meta.git_url),blob=await res.json(),text=unb64utf8(blob?.content);if(text)return text;}
    const res=await githubRequest(contentsUrl(c,path||c.path),{headers:{Accept:"application/vnd.github.raw+json"}});if(res.status===404)return null;
    const text=await res.text();if(!text.trim())throw new Error("Plik synchronizacji w GitHubie jest pusty lub niedostępny.");return text;
  }
  async function readBundleAt(path,phase="pull"){
    const meta=await readRemoteMeta(path);if(!meta)return {found:false,bundle:null,sha:null,chunks:0,size:0};
    const text=meta.content?unb64utf8(meta.content):await readRemoteText(meta,path);let bundle;
    try{bundle=JSON.parse(text)}catch{throw new Error("Nie można odczytać danych synchronizacji z GitHuba. Plik może być uszkodzony albo niekompletny.");}
    const chunkRefs=Array.isArray(bundle.assetChunks)?bundle.assetChunks:[];
    if(chunkRefs.length){
      const documents=[];
      for(let index=0;index<chunkRefs.length;index++){
        progress(phase,index,chunkRefs.length);
        const chunkMeta=await readRemoteMeta(chunkRefs[index].path);if(!chunkMeta)throw new Error(`Fenix Sync: brakuje części ${index+1}/${chunkRefs.length}.`);
        const chunkText=chunkMeta.content?unb64utf8(chunkMeta.content):await readRemoteText(chunkMeta,chunkRefs[index].path);
        try{documents.push(JSON.parse(chunkText));}catch{throw new Error(`Fenix Sync: część ${index+1}/${chunkRefs.length} jest uszkodzona.`);}
      }
      bundle=hydrateCloudBundle(bundle,documents);progress(phase,chunkRefs.length,chunkRefs.length);
    }
    return {found:true,bundle,sha:meta.sha||null,chunks:chunkRefs.length,size:byteSize(JSON.stringify(bundle))};
  }
  async function pull({merge=true,prefer="newer"}={}){
    const remote=await readBundleAt(getConfig().path,"pull");if(!remote.found)return {found:false,bundle:null,stats:null};
    const stats=merge?await mergeAndFlush(remote.bundle,{prefer}):null;localStorage.setItem("fenix-sync-last-pull",new Date().toISOString());return {...remote,stats};
  }

  async function jsonRequest(url,method,body){const res=await githubRequest(url,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});return res.json();}
  async function writeViaGitData(bundle,manifestPath=getConfig().path,phase="push"){
    const c=requireConfig(),plan=buildCloudPlan(bundle,manifestPath),base=apiBase(c),refUrl=`${base}/git/ref/heads/${encodeURIComponent(c.branch)}`,refUpdateUrl=`${base}/git/refs/heads/${encodeURIComponent(c.branch)}`;
    for(let attempt=0;attempt<5;attempt++){
      const ref=await(await githubRequest(refUrl)).json(),head=ref?.object?.sha;if(!head)throw new Error("Fenix Sync nie może odczytać aktualnego commita brancha synchronizacji.");
      const commit=await(await githubRequest(`${base}/git/commits/${head}`)).json(),baseTree=commit?.tree?.sha;if(!baseTree)throw new Error("Fenix Sync nie może odczytać drzewa brancha synchronizacji.");
      const treeEntries=[];
      for(let index=0;index<plan.chunks.length;index++){
        progress(phase,index,plan.chunks.length+1);const chunk=plan.chunks[index],blob=await jsonRequest(`${base}/git/blobs`,"POST",{content:chunk.text,encoding:"utf-8"});treeEntries.push({path:chunk.path,mode:"100644",type:"blob",sha:blob.sha});
      }
      progress(phase,plan.chunks.length,plan.chunks.length+1);
      const manifestText=JSON.stringify(plan.manifest),manifestBlob=await jsonRequest(`${base}/git/blobs`,"POST",{content:manifestText,encoding:"utf-8"});
      treeEntries.push({path:String(manifestPath||"").replace(/^\/+/,""),mode:"100644",type:"blob",sha:manifestBlob.sha});
      const tree=await jsonRequest(`${base}/git/trees`,"POST",{base_tree:baseTree,tree:treeEntries}),next=await jsonRequest(`${base}/git/commits`,"POST",{message:`Fenix Sync ${new Date().toISOString()}`,tree:tree.sha,parents:[head]});
      try{await jsonRequest(refUpdateUrl,"PATCH",{sha:next.sha,force:false});progress(phase,plan.chunks.length+1,plan.chunks.length+1);return {commit:next.sha,chunks:plan.chunks.length,size:plan.size,manifestSize:plan.manifestSize,payloadCount:plan.payloadCount};}
      catch(error){if(error?.status!==409&&error?.status!==422)throw error;if(attempt===4)throw new Error("Fenix Sync wykrył równoległą zmianę w chmurze. Zamknij Fenix na innych urządzeniach i spróbuj ponownie.");await sleep(300*(attempt+1));}
    }
  }
  async function doPush(){await FenixCore.ready;await FenixCore.flushStorage();const bundle=snapshot(),cloud=await writeViaGitData(bundle,getConfig().path,"push");localStorage.setItem("fenix-sync-last-push",new Date().toISOString());return {bundle,...cloud};}
  async function push(){if(pushInFlight)return pushInFlight;pushInFlight=doPush();try{return await pushInFlight;}finally{pushInFlight=null;}}

  async function openAssetDb(){
    if(typeof indexedDB==="undefined")throw new Error("To urządzenie nie obsługuje IndexedDB. Nie można bezpiecznie zsynchronizować dużej biblioteki assetów.");
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(ASSET_DB_NAME,ASSET_DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(ASSET_STORE)){const store=db.createObjectStore(ASSET_STORE,{keyPath:"key"});store.createIndex("projectId","projectId",{unique:false});}};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("Nie można otworzyć magazynu assetów IndexedDB."));
    });
  }
  const stripLibraryPayloads=value=>Object.fromEntries(Object.entries(value||{}).map(([id,asset])=>[id,{...asset,dataUrl:""}]));
  function validateAssetBundle(bundle){
    if(!bundle||bundle.type!==ASSET_FORMAT)throw new Error("Nieprawidłowy format paczki synchronizacji assetów FENIX.");
    if(Number(bundle.version)!==ASSET_VERSION)throw new Error("Nieobsługiwana wersja paczki synchronizacji assetów FENIX.");
    const library=bundle.assetLibrary;
    if(!library||typeof library!=="object"||Array.isArray(library))throw new Error("Nieprawidłowa biblioteka w paczce synchronizacji assetów FENIX.");
    for(const [id,asset] of Object.entries(library)){
      if(!asset||typeof asset!=="object"||Array.isArray(asset))throw new Error(`Nieprawidłowy rekord assetu: ${id}.`);
      if(String(asset.id||"")!==String(id))throw new Error(`Niezgodny identyfikator assetu: ${id}.`);
      if(typeof asset.dataUrl!=="string")throw new Error(`Brak danych assetu: ${id}.`);
    }
    if(Number(bundle.assetCount)!==Object.keys(library).length)throw new Error("Liczba assetów w manifeście nie zgadza się z zawartością biblioteki.");
    return library;
  }
  async function replaceAssetLibraryStorage(assetLibrary){
    const library=assetLibrary&&typeof assetLibrary==="object"&&!Array.isArray(assetLibrary)?assetLibrary:{};
    const db=await openAssetDb(),tx=db.transaction(ASSET_STORE,"readwrite"),store=tx.objectStore(ASSET_STORE),index=store.index("projectId");
    await new Promise((resolve,reject)=>{
      const request=index.openCursor(IDBKeyRange.only(LIBRARY_SCOPE));
      request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve();return;}cursor.delete();cursor.continue();};
      request.onerror=()=>reject(request.error||new Error("Nie można wyczyścić starej biblioteki assetów."));
    });
    for(const asset of Object.values(library)){
      if(!asset?.id)continue;
      store.put({key:`${LIBRARY_SCOPE}::${asset.id}`,projectId:LIBRARY_SCOPE,assetId:asset.id,dataUrl:String(asset.dataUrl||""),mime:asset.mime||"",updatedAt:asset.updatedAt||new Date().toISOString()});
    }
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("Nie udało się zapisać biblioteki assetów."));tx.onabort=()=>reject(tx.error||new Error("Zapis biblioteki assetów został przerwany."));});
    localStorage.setItem(LIBRARY_KEY,JSON.stringify(stripLibraryPayloads(library)));
    localStorage.setItem("fenix-sync-assets-last-pull",new Date().toISOString());
    return {count:Object.keys(library).length,storage:"indexeddb"};
  }
  async function doPushAssets(){
    await FenixCore.ready;
    const bundle=assetSnapshot(),cloud=await writeViaGitData(bundle,ASSET_PATH,"asset-push");
    localStorage.setItem("fenix-sync-assets-last-push",new Date().toISOString());
    return {bundle,count:bundle.assetCount,...cloud};
  }
  async function pushAssets(){if(assetPushInFlight)return assetPushInFlight;assetPushInFlight=doPushAssets();try{return await assetPushInFlight;}finally{assetPushInFlight=null;}}
  async function pullAssets({allowEmptyReplacement=false}={}){
    await FenixCore.ready;
    const remote=await readBundleAt(ASSET_PATH,"asset-pull");
    if(!remote.found)return {found:false,count:0,...remote};
    const library=validateAssetBundle(remote.bundle);
    const remoteCount=Object.keys(library).length;
    const localLibrary=FenixCore.getAssetLibrary?.()||{};
    const localCount=Object.keys(localLibrary).length;
    if(remoteCount===0&&localCount>0&&!allowEmptyReplacement){
      return {...remote,count:0,requiresConfirmation:true,reason:"remote-empty-local-nonempty",reloadRequired:false};
    }
    const stored=await replaceAssetLibraryStorage(library);
    return {...remote,count:stored.count,storage:stored.storage,reloadRequired:true,requiresConfirmation:false};
  }

  async function sync(){
    let remote=null;
    try{remote=await pull({merge:true,prefer:"newer"});}catch(error){if(!/pusty|uszkodzony|niekompletny/i.test(String(error.message||error)))throw error;}
    const pushed=await push();window.dispatchEvent(new CustomEvent("fenix-sync-complete",{detail:{remote,pushed}}));return {remote,pushed};
  }
  async function auto(){const c=getConfig();if(!c.autoSync||!c.token)return {skipped:true};try{return await pull({merge:true,prefer:"newer"});}catch(error){console.warn("Fenix auto sync",error);return {error:String(error.message||error)};}}
  function bundleToText({pretty=true}={}){const bundle=snapshot(),text=JSON.stringify(bundle,null,pretty?2:0);return {bundle,text,size:new Blob([text]).size};}
  function exportLocalBundle(){const out=bundleToText({pretty:true}),date=new Date().toISOString().replace(/[:.]/g,"-");FenixCore.download(`fenix-sync-${date}.fenixsync`,out.text,"application/json");localStorage.setItem("fenix-sync-last-export",new Date().toISOString());return {bundle:out.bundle,size:out.size};}
  function parseLocalBundle(text){let bundle;try{bundle=JSON.parse(String(text||""));}catch{throw new Error("Nie można odczytać pliku Fenix Sync. Plik nie jest poprawnym JSON-em.");}if(!bundle||bundle.type!==FORMAT||!Array.isArray(bundle.projects))throw new Error("To nie jest prawidłowy plik Fenix Sync.");return bundle;}
  async function importLocalBundle(file,{prefer="remote"}={}){if(!file)throw new Error("Nie wybrano pliku Fenix Sync.");await FenixCore.ready;const text=await file.text(),size=Number(file.size)||new Blob([text]).size,bundle=parseLocalBundle(text),stats=await mergeAndFlush(bundle,{prefer});localStorage.setItem("fenix-sync-last-import",new Date().toISOString());const storage=FenixCore.getStorageInfo();window.dispatchEvent(new CustomEvent("fenix-sync-local-import",{detail:{stats,size,storage}}));return {bundle,stats,size,storage};}

  return Object.freeze({FORMAT,VERSION,ASSET_FORMAT,ASSET_VERSION,ASSET_PATH,DEFAULTS,getConfig,setConfig,clearToken,snapshot,assetSnapshot,buildCloudPlan,hydrateCloudBundle,mergeBundle,pull,push,sync,auto,pushAssets,pullAssets,bundleToText,exportLocalBundle,parseLocalBundle,importLocalBundle});
})();

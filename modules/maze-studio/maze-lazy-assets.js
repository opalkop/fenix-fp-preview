"use strict";
(()=>{
  if(typeof window==="undefined"||typeof FenixCore==="undefined"||!window.FenixMaze)return;
  const DB_NAME="fenix-assets-v1",STORE="assets",LIB_SCOPE="__fenix_library__";
  const key=(scope,id)=>`${scope}::${id}`;
  let dbPromise=null;
  const openDb=()=>{
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(resolve=>{
      try{
        const req=indexedDB.open(DB_NAME,1);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>resolve(null);
        req.onblocked=()=>resolve(null);
      }catch(_){resolve(null)}
    });
    return dbPromise;
  };
  const readRecord=async(scope,id)=>{
    if(typeof indexedDB==="undefined"||!scope||!id)return null;
    const db=await openDb();if(!db)return null;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get(key(scope,id));
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>resolve(null);
      }catch(_){resolve(null)}
    });
  };
  const refOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  async function payloadFor(asset,id){
    if(asset?.dataUrl)return asset.dataUrl;
    const libRef=refOf(asset);
    if(libRef){const record=await readRecord(LIB_SCOPE,libRef);if(record?.dataUrl)return record.dataUrl}
    const projectId=FenixCore.getActiveProjectId?.();
    const record=await readRecord(projectId,id);
    return record?.dataUrl||"";
  }
  const base=window.FenixMaze;
  const enhanced={...base};
  enhanced.prepareAssets=async page=>{
    const normalized=window.FenixPageSchema?.normalize?window.FenixPageSchema.normalize(page):page||{};
    const s=normalized.recipe?.settings||page?.settings||page?.recipe?.settings||{};
    const refs=[...new Set([s.startAssetRef,s.goalAssetRef,s.checkpointAssetRef,s.hazardAssetRef,...(Array.isArray(s.decoAssetRefs)?s.decoAssetRefs:[])].filter(Boolean))];
    const images={};
    await Promise.all(refs.map(async id=>{
      const asset=FenixCore.getAsset?.(id);
      if(!asset)return;
      const src=await payloadFor(asset,id);if(!src)return;
      images[id]=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src});
    }));
    return images;
  };
  window.FenixMaze=Object.freeze(enhanced);
  window.FenixMazeLazyAssets=Object.freeze({version:"0.1.0",readRecord,payloadFor});
})();

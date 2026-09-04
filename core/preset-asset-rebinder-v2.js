"use strict";

(()=>{
  const normalizeLabel=value=>String(value||"").trim().toLowerCase().replace(/\.(png|jpe?g|webp|svg)$/i,"");
  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function buildAssetIndex(assets=[]){const index=new Map();for(const asset of assets){for(const label of [asset?.name,asset?.filename]){const key=normalizeLabel(label);if(!key)continue;const bucket=index.get(key)||[];bucket.push(asset);index.set(key,bucket)}}return index}
  function uniqueMatch(index,label){const matches=index.get(normalizeLabel(label))||[];const unique=[...new Map(matches.map(asset=>[asset.id,asset])).values()];return unique.length===1?unique[0]:null}
  function refKeysFor(key){if(key==="assetName"||key==="assetFilename")return{ref:"assetRef",library:"assetLibraryRef"};const match=key.match(/^(.*Asset)(?:Name|Filename)$/);return match?{ref:`${match[1]}Ref`,library:`${match[1]}LibraryRef`}:null}
  function listRefKeysFor(key){if(key==="assetNames"||key==="assetFilenames")return{refs:"assetRefs",libraries:"assetLibraryRefs"};const match=key.match(/^(.*Asset)(?:Names|Filenames)$/);return match?{refs:`${match[1]}Refs`,libraries:`${match[1]}LibraryRefs`}:null}
  function bindObject(value,index,stats,seen=new Set()){
    if(value==null||typeof value!=="object"||seen.has(value))return value;seen.add(value);
    if(Array.isArray(value)){for(const item of value)bindObject(item,index,stats,seen);return value}
    for(const [key,label] of Object.entries(value)){if(typeof label!=="string")continue;const keys=refKeysFor(key);if(!keys)continue;const asset=uniqueMatch(index,label);if(!asset){if(label)stats.unresolved.add(label);continue}value[keys.ref]=asset.id;const lib=libraryRefOf(asset);if(lib)value[keys.library]=lib;stats.bound++;stats.matched.add(asset.id)}
    for(const [key,labels] of Object.entries(value)){if(!Array.isArray(labels)||!labels.every(item=>typeof item==="string"))continue;const keys=listRefKeysFor(key);if(!keys)continue;const matched=labels.map(label=>uniqueMatch(index,label));if(!matched.some(Boolean))continue;value[keys.refs]=matched.map(asset=>asset?.id||null);value[keys.libraries]=matched.map(asset=>asset?libraryRefOf(asset)||null:null);matched.forEach((asset,i)=>{if(asset)stats.matched.add(asset.id);else if(labels[i])stats.unresolved.add(labels[i])});stats.bound+=matched.filter(Boolean).length}
    for(const child of Object.values(value))bindObject(child,index,stats,seen);return value;
  }
  function hasPresetBindings(project){return Boolean(project&&Array.isArray(project.pages)&&project.pages.some(page=>page?.recipe?.meta?.assetBindingMode==="name-filename"||Array.isArray(page?.recipe?.meta?.assetNames)&&page.recipe.meta.assetNames.length))}

  async function rebindProject(projectId=FenixCore.getActiveProjectId()){
    await FenixCore.ready;
    let project=FenixCore.getProjects().find(item=>item.id===projectId);if(!project)return{ok:false,reason:"project-not-found",activated:0,bound:0,unresolved:[]};
    const requestedPacks=[...(project.assetPacks||[])];
    let activated=0;const packResults=[];let libraryMatches=0;let forcedLinks=0;
    for(const pack of requestedPacks){
      const libraryAssets=FenixCore.listLibraryAssets({pack});libraryMatches+=libraryAssets.length;
      const result=FenixCore.activateLibraryPack(pack,projectId);packResults.push(result);if(result?.activated)activated+=Number(result.added)||0;
      project=FenixCore.getProjects().find(item=>item.id===projectId)||project;
      const linkedLibraryRefs=new Set(Object.values(project.assets||{}).map(libraryRefOf).filter(Boolean));
      for(const libraryAsset of libraryAssets){if(linkedLibraryRefs.has(libraryAsset.id))continue;const linked=FenixCore.linkLibraryAsset(libraryAsset.id,projectId);if(linked){forcedLinks++;linkedLibraryRefs.add(libraryAsset.id)}}
    }
    await FenixCore.flushStorage();
    project=FenixCore.getProjects().find(item=>item.id===projectId)||project;
    const assets=FenixCore.listAssets(projectId),index=buildAssetIndex(assets),stats={bound:0,matched:new Set(),unresolved:new Set()};
    const pages=clone(project.pages||[]).map(page=>bindObject(page,index,stats));FenixCore.updateProject(projectId,{pages});
    await FenixCore.flushStorage();
    return{ok:true,projectId,requestedPacks,libraryMatches,activated,forcedLinks,bound:stats.bound,matched:stats.matched.size,unresolved:[...stats.unresolved],projectAssets:FenixCore.listAssets(projectId).length,packResults};
  }

  let running=false;
  async function runForActive(reason="manual"){
    if(running||!window.FenixCore)return null;running=true;
    try{await FenixCore.ready;const project=FenixCore.getActiveProject();if(!hasPresetBindings(project))return null;const result=await rebindProject(project.id);result.reason=reason;window.dispatchEvent(new CustomEvent("fenix-preset-assets-rebound",{detail:result}));console.info("FENIX preset asset rebinding",result);return result}catch(error){console.error("FENIX preset asset rebinding failed",error);return{ok:false,reason,message:String(error?.message||error)}}finally{running=false}}

  async function retryForActive(reason){for(const delay of [0,100,500,1500]){if(delay)await sleep(delay);const result=await runForActive(`${reason}:${delay}`);if(result?.projectAssets>0&&result?.bound>0)return result}return null}

  window.FenixPresetAssetRebinderV2=Object.freeze({rebindProject,hasPresetBindings,runForActive,retryForActive});
  window.addEventListener("fenix-storage-ready",()=>retryForActive("storage-ready"));
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.activeProject||event.detail?.projects)retryForActive("state-change")});
  document.addEventListener("change",event=>{if(event.target?.id==="importProjectFile")setTimeout(()=>retryForActive("project-import-file-change"),75)},true);
  FenixCore.ready.then(()=>retryForActive("startup"));
})();

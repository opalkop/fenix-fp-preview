"use strict";

(()=>{
  const normalizeLabel=value=>String(value||"").trim().toLowerCase().replace(/\.(png|jpe?g|webp|svg)$/i,"");
  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));

  function buildAssetIndex(assets=[]){
    const index=new Map();
    for(const asset of assets){
      for(const label of [asset?.name,asset?.filename]){
        const key=normalizeLabel(label);
        if(!key)continue;
        const bucket=index.get(key)||[];
        bucket.push(asset);
        index.set(key,bucket);
      }
    }
    return index;
  }

  function uniqueMatch(index,label){
    const matches=index.get(normalizeLabel(label))||[];
    const unique=[...new Map(matches.map(asset=>[asset.id,asset])).values()];
    return unique.length===1?unique[0]:null;
  }

  function refKeysFor(key){
    if(key==="assetName"||key==="assetFilename")return{ref:"assetRef",library:"assetLibraryRef"};
    const match=key.match(/^(.*Asset)(?:Name|Filename)$/);
    return match?{ref:`${match[1]}Ref`,library:`${match[1]}LibraryRef`}:null;
  }

  function listRefKeysFor(key){
    if(key==="assetNames"||key==="assetFilenames")return{refs:"assetRefs",libraries:"assetLibraryRefs"};
    const match=key.match(/^(.*Asset)(?:Names|Filenames)$/);
    return match?{refs:`${match[1]}Refs`,libraries:`${match[1]}LibraryRefs`}:null;
  }

  function bindObject(value,index,stats,seen=new Set()){
    if(value==null||typeof value!=="object"||seen.has(value))return value;
    seen.add(value);
    if(Array.isArray(value)){
      for(const item of value)bindObject(item,index,stats,seen);
      return value;
    }

    for(const [key,label] of Object.entries(value)){
      if(typeof label!=="string")continue;
      const keys=refKeysFor(key);
      if(!keys)continue;
      const asset=uniqueMatch(index,label);
      if(!asset){if(label)stats.unresolved.add(label);continue}
      if(value[keys.ref]!==asset.id){value[keys.ref]=asset.id;stats.bound++}
      const libraryRef=libraryRefOf(asset);
      if(libraryRef)value[keys.library]=libraryRef;
      stats.matched.add(asset.id);
    }

    for(const [key,labels] of Object.entries(value)){
      if(!Array.isArray(labels)||!labels.every(item=>typeof item==="string"))continue;
      const keys=listRefKeysFor(key);
      if(!keys)continue;
      const matched=labels.map(label=>uniqueMatch(index,label));
      if(!matched.some(Boolean))continue;
      value[keys.refs]=matched.map(asset=>asset?.id||null);
      value[keys.libraries]=matched.map(asset=>asset?libraryRefOf(asset)||null:null);
      matched.forEach((asset,i)=>{if(asset)stats.matched.add(asset.id);else if(labels[i])stats.unresolved.add(labels[i])});
      stats.bound+=matched.filter(Boolean).length;
    }

    for(const child of Object.values(value))bindObject(child,index,stats,seen);
    return value;
  }

  function hasPresetBindings(project){
    if(!project||!Array.isArray(project.pages)||!project.pages.length)return false;
    return project.pages.some(page=>{
      const meta=page?.recipe?.meta||{};
      return meta.assetBindingMode==="name-filename"||Array.isArray(meta.assetNames)&&meta.assetNames.length>0;
    });
  }

  function rebindProject(projectId=FenixCore.getActiveProjectId()){
    let project=FenixCore.getProjects().find(item=>item.id===projectId);
    if(!project)return{ok:false,reason:"project-not-found",activated:0,bound:0,unresolved:[]};

    let activated=0;
    for(const pack of project.assetPacks||[]){
      const result=FenixCore.activateLibraryPack(pack,projectId);
      if(result?.activated)activated+=Number(result.added)||0;
    }

    project=FenixCore.getProjects().find(item=>item.id===projectId)||project;
    const assets=FenixCore.listAssets(projectId),index=buildAssetIndex(assets);
    const stats={bound:0,matched:new Set(),unresolved:new Set()};
    const pages=clone(project.pages||[]).map(page=>bindObject(page,index,stats));
    FenixCore.updateProject(projectId,{pages});

    return{ok:true,projectId,activated,bound:stats.bound,matched:stats.matched.size,unresolved:[...stats.unresolved],projectAssets:assets.length};
  }

  let busy=false;
  function maybeRebind(){
    if(busy||!window.FenixCore)return;
    const project=FenixCore.getActiveProject();
    if(!hasPresetBindings(project))return;
    const unresolved=project.pages.some(page=>{
      const text=JSON.stringify(page?.recipe||{});
      return /Asset(?:Name|Filename|Names|Filenames)/.test(text)&&!/AssetRef/.test(text);
    });
    if(!unresolved&&Object.keys(project.assets||{}).length)return;
    busy=true;
    try{
      const result=rebindProject(project.id);
      window.dispatchEvent(new CustomEvent("fenix-preset-assets-rebound",{detail:result}));
      console.info("FENIX preset asset rebinding",result);
    }catch(error){
      console.error("FENIX preset asset rebinding failed",error);
      window.dispatchEvent(new CustomEvent("fenix-preset-assets-rebind-error",{detail:{message:String(error?.message||error)}}));
    }finally{busy=false}
  }

  window.FenixPresetAssetRebinder=Object.freeze({rebindProject,hasPresetBindings});
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.activeProject||event.detail?.projects)queueMicrotask(maybeRebind)});
  queueMicrotask(maybeRebind);
})();

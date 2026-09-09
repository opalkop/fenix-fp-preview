"use strict";

(()=>{
  const VERSION=1;
  const now=()=>new Date().toISOString();
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const stripDataUrl=value=>typeof value==="string"&&/^data:/i.test(value)?"[omitted:data-url]":value;

  function sanitize(value,key=""){
    if(value==null)return value;
    if(typeof value==="string"){
      if(/^(dataUrl|imageData|solutionImageData|previewDataUrl|thumbnailDataUrl)$/i.test(key))return value?"[omitted:binary]":"";
      if(/^data:/i.test(value))return "[omitted:data-url]";
      return value;
    }
    if(Array.isArray(value))return value.map(item=>sanitize(item,key));
    if(typeof value!=="object")return value;
    const output={};
    for(const [childKey,childValue] of Object.entries(value))output[childKey]=sanitize(childValue,childKey);
    return output;
  }

  function assetMeta(asset={}){
    const clean=sanitize(clone(asset));
    if(Object.hasOwn(clean,"dataUrl"))clean.dataUrl=asset.dataUrl?"[omitted:binary]":"";
    if(Object.hasOwn(clean,"data"))clean.data=stripDataUrl(clean.data);
    return clean;
  }

  function pageMeta(page={}){
    const clean=sanitize(clone(page));
    if(clean.preview&&typeof clean.preview==="object"&&Object.hasOwn(clean.preview,"imageData"))clean.preview.imageData=page?.preview?.imageData?"[omitted:binary]":"";
    if(clean.solution&&typeof clean.solution==="object"&&Object.hasOwn(clean.solution,"imageData"))clean.solution.imageData=page?.solution?.imageData?"[omitted:binary]":"";
    return clean;
  }

  function countByModule(pages=[]){
    return pages.reduce((acc,page)=>{
      const module=String(page?.module||page?.source?.module||"unknown");
      acc[module]=(acc[module]||0)+1;
      return acc;
    },{});
  }

  function referencedAssetIds(project){
    const ids=new Set();
    const walk=value=>{
      if(value==null)return;
      if(Array.isArray(value)){value.forEach(walk);return;}
      if(typeof value!=="object")return;
      for(const [key,child] of Object.entries(value)){
        if(typeof child==="string"&&/(assetRef|assetId|decoAssetRefs|startAsset|goalAsset|checkpointAsset|hazardAsset)/i.test(key))ids.add(child);
        else if(Array.isArray(child)&&/(assetRefs|assetIds|decoAssetRefs|decoLibraryRefs)/i.test(key))child.forEach(item=>{if(typeof item==="string")ids.add(item)});
        walk(child);
      }
    };
    walk(project?.pages||[]);
    return [...ids].filter(Boolean).sort();
  }

  function buildPayload(){
    if(!window.FenixCore)throw new Error("FenixCore nie jest dostępny.");
    const project=FenixCore.getActiveProject();
    if(!project)throw new Error("Brak aktywnego projektu.");
    const pages=(project.pages||[]).map(pageMeta);
    const assets=Object.fromEntries(Object.entries(project.assets||{}).map(([id,asset])=>[id,assetMeta(asset)]));
    const libraryAssets=(FenixCore.listLibraryAssets?.()||[]).map(asset=>assetMeta(asset));
    const refs=referencedAssetIds(project);
    return{
      type:"FENIX_DIAGNOSTIC_PROJECT",
      version:VERSION,
      schemaVersion:window.FenixPageSchema?.VERSION||null,
      exportedAt:now(),
      purpose:"Lekki eksport diagnostyczny bez binarnych danych grafik. Zachowuje strukturę projektu, strony, ustawienia i referencje assetów.",
      summary:{
        projectId:project.id,
        projectName:project.name,
        pageCount:pages.length,
        pagesByModule:countByModule(pages),
        solutionAvailableCount:pages.filter(page=>Boolean(page?.solution?.available)).length,
        projectAssetCount:Object.keys(assets).length,
        projectAssetPacks:project.assetPacks||[],
        primaryAssetPack:project.primaryAssetPack||"",
        referencedAssetIds:refs,
        globalLibraryAssetCount:libraryAssets.length,
        globalLibraryPacks:FenixCore.listLibraryPacks?.()||[],
        storage:FenixCore.getStorageInfo?.()||null
      },
      project:{...sanitize(clone(project)),pages,assets},
      library:{packs:FenixCore.listLibraryPacks?.()||[],assets:libraryAssets}
    };
  }

  function safeName(name){return String(name||"projekt").toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi,"-").replace(/^-|-$/g,"")||"projekt"}
  function exportDiagnostic(){
    const payload=buildPayload();
    const filename=`${safeName(payload.summary.projectName)}-diagnostic-${new Date().toISOString().slice(0,10)}.json`;
    const text=JSON.stringify(payload,null,2);
    if(FenixCore.download)FenixCore.download(filename,text,"application/json");
    else{
      const anchor=document.createElement("a");
      anchor.href=URL.createObjectURL(new Blob([text],{type:"application/json"}));
      anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
    }
    return payload;
  }

  window.FenixDiagnosticExport=Object.freeze({VERSION,buildPayload,exportDiagnostic});

  function ensureButton(){
    let button=document.getElementById("exportDiagnosticProject");
    if(button)return button;
    const actions=document.querySelector("#pagesProject .cart-actions");
    if(!actions)return null;
    button=document.createElement("button");
    button.id="exportDiagnosticProject";
    button.type="button";
    button.className="btn";
    button.textContent="Eksport diagnostyczny";
    button.title="Pobierz lekki plik JSON z pełną strukturą projektu i referencjami assetów, bez ciężkich danych obrazów.";
    const fullExport=document.getElementById("exportProject");
    if(fullExport?.nextSibling)actions.insertBefore(button,fullExport.nextSibling);else actions.appendChild(button);
    return button;
  }

  const bind=()=>{
    const button=ensureButton();
    if(!button||button.dataset.boundDiagnosticExport)return;
    button.dataset.boundDiagnosticExport="true";
    button.addEventListener("click",()=>{
      try{exportDiagnostic()}catch(error){console.error("FENIX diagnostic export error",error);alert(error?.message||"Nie udało się wyeksportować diagnostyki projektu.")}
    });
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();

"use strict";

(()=>{
  let selected="light";try{selected=localStorage.getItem("fenix-ui-theme")||"light"}catch{}
  document.documentElement.dataset.theme=selected;
  const coreScript=[...document.scripts].find(script=>/\/core\/fenix-core\.js(?:\?|$)/.test(script.src));if(!coreScript)return;
  const addStyle=(name,file)=>{if(document.querySelector(`link[data-fenix-theme="${name}"]`))return;const link=document.createElement("link");link.rel="stylesheet";link.href=new URL(`../assets/${file}`,coreScript.src).href;link.dataset.fenixTheme=name;document.head.appendChild(link)};
  const addScript=(name,file)=>{if(document.querySelector(`script[data-fenix-helper="${name}"]`))return;const script=document.createElement("script");script.src=new URL(`../assets/${file}`,coreScript.src).href;script.dataset.fenixHelper=name;document.body.appendChild(script)};
  addStyle("v2","fenix-v2.css?v=0.18.0");addStyle("variants","fenix-theme-overrides.css?v=0.18.0");addStyle("studio-shell","studio-shell.css?v=0.18.0");document.documentElement.dataset.fenixTheme="v2";
  window.addEventListener("DOMContentLoaded",()=>{if(document.body?.dataset?.module||document.body?.dataset?.screen)addScript("studio-shell","studio-shell.js?v=0.18.0")},{once:true});
})();

const FenixCore=(()=>{
  const LEGACY_CART_KEY="fenix-cart-v1",PROJECTS_KEY="fenix-projects-v1",ACTIVE_PROJECT_KEY="fenix-active-project-v1";
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`,now=()=>new Date().toISOString();
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.error("FENIX storage error",error);throw new Error("Nie udało się zapisać projektu. Pamięć przeglądarki może być pełna.")}};
  const normalizeFormat=value=>String(value||"8.5x11").toLowerCase()==="a4"?"a4":value||"8.5x11";
  const normalizePage=page=>window.FenixPageSchema?.normalize?window.FenixPageSchema.normalize(page):{id:page?.id||uid(),createdAt:page?.createdAt||now(),...clone(page||{})};
  const normalizeTags=value=>[...new Set((Array.isArray(value)?value:[]).map(tag=>String(tag||"").trim().toLowerCase()).filter(Boolean))];
  function normalizeAsset(asset={},fallbackId=""){
    const meta=asset.meta&&typeof asset.meta==="object"&&!Array.isArray(asset.meta)?clone(asset.meta):{};
    const width=Number(asset.width??meta.width)||0,height=Number(asset.height??meta.height)||0,sizeBytes=Number(asset.sizeBytes??meta.sizeBytes)||0;
    const validation=asset.validation&&typeof asset.validation==="object"?clone(asset.validation):meta.validation&&typeof meta.validation==="object"?clone(meta.validation):{status:"warning",messages:["Asset nie był jeszcze walidowany."],metrics:{}};
    const createdAt=asset.createdAt||meta.addedAt||now();
    return{
      id:asset.id||fallbackId||uid(),
      name:String(asset.name||asset.filename||meta.filename||"Asset"),
      filename:String(asset.filename||meta.filename||asset.name||"Asset"),
      mime:String(asset.mime||asset.mimeType||meta.mimeType||"image/webp"),
      dataUrl:String(asset.dataUrl||asset.data||""),
      source:String(asset.source||meta.source||"imported"),
      width,height,sizeBytes,
      aspectRatio:asset.aspectRatio??meta.aspectRatio??(width&&height?Number((width/height).toFixed(4)):null),
      tags:normalizeTags(asset.tags||meta.tags),
      validation,
      meta,
      createdAt,
      updatedAt:asset.updatedAt||createdAt
    };
  }
  function normalizeAssets(value){const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{};return Object.fromEntries(Object.entries(source).map(([id,asset])=>{const normalized=normalizeAsset(asset,id);return[normalized.id,normalized]}))}
  let state=null,schemaMigrated=false;
  function normalizeProject(project={}){const createdAt=project.createdAt||now(),assets=normalizeAssets(project.assets);return{id:project.id||uid(),name:String(project.name||"Nowy projekt").trim()||"Nowy projekt",format:normalizeFormat(project.format),bleed:project.bleed||"no-bleed",ageGroup:project.ageGroup||"",topic:project.topic||"",createdAt,updatedAt:project.updatedAt||createdAt,pages:Array.isArray(project.pages)?project.pages:[],assets}}
  function persist(){write(PROJECTS_KEY,state.projects);localStorage.setItem(ACTIVE_PROJECT_KEY,state.activeId)}
  function loadState(){if(state)return state;let projects=read(PROJECTS_KEY,[]);if(!Array.isArray(projects)||!projects.length){const legacy=read(LEGACY_CART_KEY,[]);projects=[normalizeProject({name:Array.isArray(legacy)&&legacy.length?"Odzyskany projekt":"Mój pierwszy projekt",pages:Array.isArray(legacy)?legacy:[]})]}else projects=projects.map(normalizeProject);let activeId=localStorage.getItem(ACTIVE_PROJECT_KEY);if(!projects.some(project=>project.id===activeId))activeId=projects[0].id;state={projects,activeId};persist();return state}
  function ensureSchema(){const current=loadState();if(schemaMigrated||!window.FenixPageSchema?.normalize)return current;current.projects=current.projects.map(project=>({...project,pages:project.pages.map(normalizePage),assets:normalizeAssets(project.assets)}));schemaMigrated=true;persist();return current}
  function emit(changes={}){window.dispatchEvent(new CustomEvent("fenix-state-change",{detail:changes}));if(changes.projects||changes.activeProject)window.dispatchEvent(new Event("fenix-project-change"));if(changes.cart||changes.activeProject)window.dispatchEvent(new Event("fenix-cart-change"));if(changes.assets||changes.activeProject)window.dispatchEvent(new Event("fenix-assets-change"))}
  function commit(changes){persist();emit(changes)}
  const getProjects=()=>clone(ensureSchema().projects),getActiveProjectId=()=>ensureSchema().activeId;
  const getActiveProject=()=>{const current=ensureSchema();return clone(current.projects.find(project=>project.id===current.activeId)||current.projects[0])};
  function createProject(data={}){const current=ensureSchema(),project=normalizeProject(data);project.pages=project.pages.map(normalizePage);current.projects.unshift(project);current.activeId=project.id;commit({projects:true,activeProject:true,cart:true,assets:true});return clone(project)}
  function updateProject(id,patch={}){const current=ensureSchema(),index=current.projects.findIndex(project=>project.id===id);if(index<0)return false;const existing=current.projects[index],pages=Array.isArray(patch.pages)?patch.pages.map(normalizePage):existing.pages;current.projects[index]=normalizeProject({...existing,...patch,id:existing.id,createdAt:existing.createdAt,updatedAt:now(),pages});commit({projects:true,cart:Array.isArray(patch.pages),assets:Boolean(patch.assets)});return clone(current.projects[index])}
  function setActiveProject(id){const current=ensureSchema();if(!current.projects.some(project=>project.id===id))return false;current.activeId=id;commit({activeProject:true,cart:true,assets:true});return getActiveProject()}
  function deleteProject(id){const current=ensureSchema();if(current.projects.length===1||!current.projects.some(project=>project.id===id))return false;current.projects=current.projects.filter(project=>project.id!==id);if(current.activeId===id)current.activeId=current.projects[0].id;commit({projects:true,activeProject:true,cart:true,assets:true});return true}
  const getCart=()=>getActiveProject().pages;
  function setCart(items){const pages=Array.isArray(items)?items.map(normalizePage):[];updateProject(getActiveProjectId(),{pages});return clone(pages)}
  function addPage(page){const cart=getCart();cart.push(normalizePage(page));setCart(cart);return cart.length}
  function updatePage(id,patch){const cart=getCart(),index=cart.findIndex(item=>item.id===id);if(index<0)return false;cart[index]=normalizePage({...cart[index],...patch,id:cart[index].id,createdAt:cart[index].createdAt,updatedAt:now()});setCart(cart);return clone(cart[index])}
  const removePage=id=>setCart(getCart().filter(item=>item.id!==id)),clear=()=>setCart([]);
  function putAsset({id=null,name="Asset",filename="",mime="image/webp",mimeType="",dataUrl="",source="imported",width=0,height=0,sizeBytes=0,aspectRatio=null,tags=[],validation=null,meta={}}={}){
    if(!dataUrl)throw new Error("Brak danych assetu.");const current=ensureSchema(),project=current.projects.find(item=>item.id===current.activeId);if(!project)return false;const assetId=id||uid(),existing=project.assets[assetId]||{};
    project.assets[assetId]=normalizeAsset({...existing,id:assetId,name,filename:filename||existing.filename||name,mime:mimeType||mime||existing.mime,dataUrl,source,width:width||existing.width,height:height||existing.height,sizeBytes:sizeBytes||existing.sizeBytes,aspectRatio:aspectRatio??existing.aspectRatio,tags:Array.isArray(tags)&&tags.length?tags:existing.tags||[],validation:validation||existing.validation,meta:{...(existing.meta||{}),...(meta||{})},createdAt:existing.createdAt||now(),updatedAt:now()},assetId);
    project.updatedAt=now();commit({projects:true,assets:true});return clone(project.assets[assetId])
  }
  function getAsset(id,projectId=getActiveProjectId()){const project=ensureSchema().projects.find(item=>item.id===projectId);return clone(project?.assets?.[id]||null)}
  function listAssets(projectId=getActiveProjectId()){const project=ensureSchema().projects.find(item=>item.id===projectId);return Object.values(project?.assets||{}).map(normalizeAsset).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)))}
  function findAssets(filters={},projectId=getActiveProjectId()){
    const query=String(filters.query||"").trim().toLowerCase(),tag=String(filters.tag||"").trim().toLowerCase(),status=String(filters.status||"").trim().toLowerCase(),source=String(filters.source||"").trim().toLowerCase();
    const tags=normalizeTags(filters.tags);
    return listAssets(projectId).filter(asset=>{
      if(query&&!`${asset.name} ${asset.filename} ${(asset.tags||[]).join(" ")}`.toLowerCase().includes(query))return false;
      if(tag&&!(asset.tags||[]).includes(tag))return false;
      if(tags.length&&!tags.every(item=>(asset.tags||[]).includes(item)))return false;
      if(status&&String(asset.validation?.status||"").toLowerCase()!==status)return false;
      if(source&&String(asset.source||"").toLowerCase()!==source)return false;
      return true;
    });
  }
  function updateAsset(id,patch={}){const current=ensureSchema(),project=current.projects.find(item=>item.id===current.activeId),existing=project?.assets?.[id];if(!existing)return false;project.assets[id]=normalizeAsset({...existing,...clone(patch),id:existing.id,createdAt:existing.createdAt,updatedAt:now()},id);project.updatedAt=now();commit({projects:true,assets:true});return clone(project.assets[id])}
  function valueContainsAssetRef(value,id,seen=new Set()){
    if(value==null)return false;
    if(typeof value==="string")return value===id;
    if(typeof value!=="object")return false;
    if(seen.has(value))return false;seen.add(value);
    if(Array.isArray(value))return value.some(item=>valueContainsAssetRef(item,id,seen));
    if(value.assetRef===id||value.assetId===id)return true;
    return Object.values(value).some(item=>valueContainsAssetRef(item,id,seen));
  }
  function assetUsage(id,projectId=getActiveProjectId()){
    const project=ensureSchema().projects.find(item=>item.id===projectId);if(!project)return[];
    return project.pages.map(normalizePage).filter(page=>valueContainsAssetRef(page,id)).map(page=>({id:page.id,title:page.title||"Strona",module:page.module||page.recipe?.module||"unknown"}));
  }
  function makeAssetRef(id){return getAsset(id)?{type:"project-asset",id}:null}
  function resolveAssetRef(ref,projectId=getActiveProjectId()){
    const id=typeof ref==="string"?ref:ref&&typeof ref==="object"?(ref.id||ref.assetId||ref.assetRef):null;
    return id?getAsset(id,projectId):null;
  }
  function removeAsset(id,{force=false}={}){const current=ensureSchema(),project=current.projects.find(item=>item.id===current.activeId);if(!project?.assets?.[id])return false;const usage=assetUsage(id,project.id);if(usage.length&&!force)return{removed:false,reason:"in-use",usage};delete project.assets[id];project.updatedAt=now();commit({projects:true,assets:true});return{removed:true,usage}}
  function importProjectPayload(payload){if(!payload||typeof payload!=="object")throw new Error("Nieprawidłowy plik projektu.");let source;if(payload.type==="FENIX_PROJECT"&&payload.project)source=payload.project;else if(payload.type==="FENIX_PACK"&&payload.project){source={...payload.project,pages:Array.isArray(payload.pages)?payload.pages:[],assets:payload.assets||payload.project.assets||{}}}else if(payload.project&&Array.isArray(payload.project.pages))source=payload.project;else throw new Error("Plik nie jest projektem FENIX.");const project=normalizeProject({...source,id:uid(),name:`${source.name||"Importowany projekt"} — import`,createdAt:now(),updatedAt:now()});project.pages=project.pages.map(normalizePage);const current=ensureSchema();current.projects.unshift(project);current.activeId=project.id;commit({projects:true,activeProject:true,cart:true,assets:true});return clone(project)}
  const download=(name,text,type="application/json")=>{const anchor=document.createElement("a");anchor.href=URL.createObjectURL(new Blob([text],{type}));anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000)};
  const safeName=name=>String(name||"projekt").toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi,"-").replace(/^-|-$/g,"")||"projekt";
  function exportPack(){const project=getActiveProject();download(`${safeName(project.name)}-${new Date().toISOString().slice(0,10)}.fenixpack`,JSON.stringify({type:"FENIX_PACK",version:5,schemaVersion:window.FenixPageSchema?.VERSION||3,project:{...project,pages:undefined},pages:project.pages,assets:project.assets},null,2))}
  function exportProject(){const project=getActiveProject();download(`${safeName(project.name)}.fenixproject`,JSON.stringify({type:"FENIX_PROJECT",version:4,schemaVersion:window.FenixPageSchema?.VERSION||3,project},null,2))}
  const downloadCanvas=(canvas,name)=>canvas.toBlob(blob=>{if(!blob)return;const anchor=document.createElement("a");anchor.href=URL.createObjectURL(blob);anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000)},"image/png");
  loadState();
  return Object.freeze({getProjects,getActiveProjectId,getActiveProject,createProject,updateProject,setActiveProject,deleteProject,getCart,setCart,addPage,updatePage,removePage,clear,putAsset,getAsset,listAssets,findAssets,updateAsset,assetUsage,makeAssetRef,resolveAssetRef,removeAsset,importProjectPayload,exportPack,exportProject,download,downloadCanvas});
})();

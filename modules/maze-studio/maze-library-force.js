"use strict";
(()=>{
  if(typeof document==="undefined"||!window.FenixCore)return;
  const ROLE_IDS=["startAsset","goalAsset","checkpointAsset","hazardAsset"];
  let activePack="",applying=false,observer=null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const norm=v=>String(v||"").trim().toLowerCase();
  const refOf=a=>String(a?.libraryRef||a?.meta?.libraryRef||"").trim();
  const packOf=a=>String(a?.pack||a?.meta?.pack||"").trim();

  function libraryPacks(){
    const assets=FenixCore.listLibraryAssets?.()||[];
    return [...new Set(assets.map(a=>packOf(a)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pl"));
  }
  function libraryAssets(pack){
    return (FenixCore.listLibraryAssets?.({pack})||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pl"));
  }
  function localForLibrary(id){
    return (FenixCore.listAssets?.()||[]).find(a=>refOf(a)===id)||null;
  }
  function ensureLinked(pack){
    const globals=libraryAssets(pack);
    for(const asset of globals){
      if(!localForLibrary(asset.id))FenixCore.linkLibraryAsset?.(asset.id);
    }
    return globals;
  }
  function ensureUi(){
    let wrap=document.getElementById("mazeForcedLibraryWrap");
    if(wrap)return wrap;
    const grid=document.querySelector(".asset-maze-grid");
    if(!grid)return null;
    wrap=document.createElement("div");
    wrap.id="mazeForcedLibraryWrap";
    wrap.style.cssText="margin:0 0 14px;padding:12px 14px;border:2px solid #1877f2;border-radius:10px;background:#f8fbff";
    wrap.innerHTML='<label style="display:grid;gap:6px;font-weight:800">Biblioteka assetów<select id="mazeForcedLibrary" style="width:100%;padding:10px;border:1px solid #94a3b8;border-radius:8px;background:#fff"></select></label><small id="mazeForcedLibraryInfo" style="display:block;margin-top:6px;color:#475569">Wybierz bibliotekę. Lista START/META/CHECKPOINT/ZAGROŻENIE zostanie przełączona tylko na ten zestaw.</small>';
    grid.parentNode.insertBefore(wrap,grid);
    wrap.querySelector("select").addEventListener("change",e=>applyPack(e.target.value,true));
    return wrap;
  }
  function fillPackSelect(){
    ensureUi();
    const select=document.getElementById("mazeForcedLibrary");if(!select)return;
    const packs=libraryPacks();
    const current=activePack||select.value||packs[0]||"";
    select.innerHTML=packs.length?packs.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join(""):'<option value="">Brak bibliotek</option>';
    const matched=packs.find(p=>norm(p)===norm(current));
    activePack=matched||packs[0]||"";
    select.value=activePack;
  }
  function emptyLabel(id){return id==="startAsset"?"Bez assetu — znacznik S":id==="goalAsset"?"Bez assetu — znacznik M":"Bez assetu"}
  function rebuildRoles(){
    if(!activePack)return;
    const globals=ensureLinked(activePack);
    const locals=globals.map(g=>localForLibrary(g.id)).filter(Boolean);
    for(const id of ROLE_IDS){
      const select=document.getElementById(id);if(!select)continue;
      const before=select.value;
      select.innerHTML=`<option value="">${emptyLabel(id)}</option>`+locals.map(a=>`<option value="${esc(a.id)}">${esc(a.name||a.filename||a.id)}</option>`).join("");
      if(locals.some(a=>a.id===before))select.value=before;
    }
    const info=document.getElementById("mazeForcedLibraryInfo");if(info)info.textContent=`Aktywna biblioteka: ${activePack} · ${globals.length} assetów`;
    const legacy=document.getElementById("mazeAssetPackPicker");if(legacy)legacy.style.display="none";
    const legacy2=document.getElementById("mazeAssetPackWrap");if(legacy2)legacy2.style.display="none";
    const baseInfo=document.getElementById("assetInfo");if(baseInfo)baseInfo.textContent=`Biblioteka: ${activePack} · ${locals.length} assetów dostępnych do wyboru.`;
  }
  async function applyPack(pack,user=false){
    const name=String(pack||"").trim();if(!name||applying)return;
    applying=true;
    try{
      activePack=name;
      ensureLinked(name);
      FenixCore.selectLibraryPack?.(name);
      if(typeof FenixCore.flushStorage==="function")await FenixCore.flushStorage();
      fillPackSelect();
      rebuildRoles();
      if(user){
        for(const id of ROLE_IDS){const s=document.getElementById(id);if(s)s.value=""}
        const status=document.getElementById("status");if(status)status.textContent=`Wybrano bibliotekę assetów: ${name}`;
      }
    }finally{applying=false}
  }
  function startObserver(){
    if(observer)return;
    const root=document.querySelector(".asset-maze-grid");if(!root)return;
    observer=new MutationObserver(()=>{
      if(applying||!activePack)return;
      const expected=libraryAssets(activePack).length;
      const start=document.getElementById("startAsset");
      if(!start)return;
      const actual=Math.max(0,start.options.length-1);
      if(actual!==expected){applying=true;try{rebuildRoles()}finally{applying=false}}
    });
    observer.observe(root,{childList:true,subtree:true});
  }
  async function init(){
    await FenixCore.ready;
    ensureUi();fillPackSelect();
    const packs=libraryPacks();
    const project=FenixCore.getActiveProject?.();
    const preferred=packs.find(p=>norm(p)===norm(project?.primaryAssetPack))||packs.find(p=>norm(p)==="ocean fantasy")||packs[0]||"";
    if(preferred)await applyPack(preferred,false);
    startObserver();
    setTimeout(()=>{fillPackSelect();rebuildRoles();},250);
  }
  window.addEventListener("fenix-state-change",e=>{if(applying)return;if(e.detail?.library||e.detail?.assets||e.detail?.activeProject)setTimeout(()=>{fillPackSelect();rebuildRoles()},80)});
  init().catch(err=>console.error("Maze forced library selector",err));
})();

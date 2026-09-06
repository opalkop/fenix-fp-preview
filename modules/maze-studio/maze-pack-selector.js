"use strict";
(()=>{
  if(typeof document==="undefined"||!window.FenixCore)return;
  const ROLE_IDS=["startAsset","goalAsset","checkpointAsset","hazardAsset"];
  let currentPack="",busy=false,refreshTimer=null;
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[ch]));
  const norm=value=>String(value||"").trim().toLowerCase();
  const assetPack=asset=>String(asset?.pack||asset?.meta?.pack||"").trim();
  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();

  function libraryAssets(pack){
    return (FenixCore.listLibraryAssets?.({pack})||[]).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pl"));
  }

  function projectAssets(pack){
    const wanted=norm(pack);
    return (FenixCore.listAssets?.()||[]).filter(asset=>norm(assetPack(asset))===wanted).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pl"));
  }

  function ensurePackLinked(pack){
    if(!pack)return[];
    FenixCore.selectLibraryPack?.(pack);
    const globals=libraryAssets(pack);
    for(const asset of globals){
      const already=(FenixCore.listAssets?.()||[]).some(local=>libraryRefOf(local)===asset.id);
      if(!already)FenixCore.linkLibraryAsset?.(asset.id);
    }
    return projectAssets(pack);
  }

  function getSavedSettings(){
    const pageId=document.getElementById("pageSelect")?.value||new URLSearchParams(location.search).get("id");
    if(!pageId)return{};
    const raw=(FenixCore.getCart?.()||[]).find(page=>page.id===pageId);
    return raw?.recipe?.settings||raw?.settings||{};
  }

  function inferPack(){
    const settings=getSavedSettings();
    const refs=[settings.startAssetRef,settings.goalAssetRef,settings.checkpointAssetRef,settings.hazardAssetRef,...(Array.isArray(settings.decoAssetRefs)?settings.decoAssetRefs:[])].filter(Boolean);
    for(const id of refs){const pack=assetPack(FenixCore.getAsset?.(id));if(pack)return pack}
    const project=FenixCore.getActiveProject?.();
    if(project?.primaryAssetPack)return String(project.primaryAssetPack);
    const packs=FenixCore.getProjectAssetPacks?.()||project?.assetPacks||[];
    if(packs.length)return String(packs[packs.length-1]);
    return String(FenixCore.listLibraryPacks?.()[0]||"");
  }

  function ensureUi(){
    let select=document.getElementById("mazeAssetPack");
    if(select)return select;
    const grid=document.querySelector(".asset-maze-grid");
    if(!grid)return null;
    const wrap=document.createElement("div");
    wrap.id="mazeAssetPackWrap";
    wrap.style.cssText="margin:0 0 14px;padding:12px 14px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc";
    wrap.innerHTML='<label style="display:grid;gap:6px;font-weight:700">Zestaw assetów<select id="mazeAssetPack" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#fff"></select></label><small id="mazeAssetPackStatus" style="display:block;margin-top:6px;color:#64748b">Wybierz bibliotekę używaną przez START, META, CHECKPOINT, ZAGROŻENIA i DECO.</small>';
    grid.parentNode.insertBefore(wrap,grid);
    select=wrap.querySelector("select");
    select.addEventListener("change",async()=>{
      const pack=select.value;
      if(!pack||busy)return;
      busy=true;
      try{
        currentPack=pack;
        ensurePackLinked(pack);
        if(typeof FenixCore.flushStorage==="function")await FenixCore.flushStorage();
        populateRoleSelects(true);
        filterDeco();
        scheduleRefresh(120);
      }finally{busy=false}
    });
    return select;
  }

  function fillPackOptions(){
    const select=ensureUi();if(!select)return;
    const packs=FenixCore.listLibraryPacks?.()||[];
    const wanted=currentPack||inferPack();
    select.innerHTML=packs.length?packs.map(pack=>`<option value="${esc(pack)}">${esc(pack)}</option>`).join(""):'<option value="">Brak zestawów</option>';
    const matched=packs.find(pack=>norm(pack)===norm(wanted));
    if(matched){currentPack=matched;select.value=matched}else if(packs.length){currentPack=packs[0];select.value=packs[0]}
  }

  function populateRoleSelects(forceLink=false){
    if(!currentPack)return;
    const globals=libraryAssets(currentPack);
    let assets=projectAssets(currentPack);
    if(forceLink||assets.length<globals.length)assets=ensurePackLinked(currentPack);
    for(const id of ROLE_IDS){
      const select=document.getElementById(id);if(!select)continue;
      const previous=select.value;
      const emptyText=id==="startAsset"?"Bez assetu — znacznik S":id==="goalAsset"?"Bez assetu — znacznik M":"Bez assetu";
      select.innerHTML=`<option value="">${emptyText}</option>`+assets.map(asset=>`<option value="${esc(asset.id)}">${esc(asset.name||asset.id)}</option>`).join("");
      if(assets.some(asset=>asset.id===previous))select.value=previous;
    }
    const info=document.getElementById("assetInfo");
    if(info)info.textContent=`Zestaw: ${currentPack} · ${assets.length}/${globals.length} assetów dostępnych dla ról gameplay. Pokazywane są wszystkie assety z wybranego zestawu, niezależnie od tagów.`;
    const status=document.getElementById("mazeAssetPackStatus");
    if(status)status.textContent=`Aktywny zestaw: ${currentPack} · biblioteka ${globals.length} · projekt ${assets.length}`;
  }

  function filterDeco(){
    if(!currentPack)return;
    const host=document.getElementById("decoAssetChoices");if(!host)return;
    const wanted=norm(currentPack);
    host.querySelectorAll('input[type="checkbox"]').forEach(input=>{
      const card=input.closest("label")||input.parentElement;
      const asset=FenixCore.getAsset?.(input.value);
      if(card)card.hidden=norm(assetPack(asset))!==wanted;
    });
    const search=document.getElementById("mazeDecoSearch");
    if(search)search.placeholder=`Szukaj Deco w zestawie ${currentPack}`;
  }

  function refresh(){
    fillPackOptions();
    if(currentPack)ensurePackLinked(currentPack);
    populateRoleSelects(false);
    filterDeco();
  }

  function scheduleRefresh(delay=40){
    clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,delay);
  }

  document.getElementById("pageSelect")?.addEventListener("change",()=>{currentPack="";scheduleRefresh(40)});
  window.addEventListener("fenix-storage-ready",()=>scheduleRefresh(40));
  window.addEventListener("fenix-state-change",event=>{if(busy)return;if(event.detail?.assets||event.detail?.library||event.detail?.activeProject||event.detail?.storage){scheduleRefresh(90);setTimeout(()=>populateRoleSelects(false),220)}});
  Promise.resolve().then(async()=>{if(FenixCore.ready)await FenixCore.ready;currentPack=inferPack();refresh();setTimeout(refresh,180);setTimeout(()=>populateRoleSelects(false),420)});
})();

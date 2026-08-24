"use strict";
(()=>{
  const core=typeof FenixCore!=="undefined"?FenixCore:null;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback))};

  function mazeAssets(){
    try{
      const gameplay=core.findAssets({tag:"gameplay"})||[];
      if(gameplay.length)return gameplay;
      return core.listAssets?.()||[];
    }catch(error){
      console.error("Maze missions: asset lookup failed",error);
      try{return core.listAssets?.()||[]}catch{return[]}
    }
  }
  function fillSelect(id,selected="",placeholder="Bez assetu"){
    const select=$(id);if(!select)return;
    const assets=mazeAssets();
    select.innerHTML=`<option value="">${esc(placeholder)}</option>`+assets.map(asset=>`<option value="${esc(asset.id)}">${esc(asset.name)}</option>`).join("");
    select.value=assets.some(asset=>asset.id===selected)?selected:"";
  }
  function currentPage(){
    const id=$("pageSelect")?.value;
    return id?(core.getCart()||[]).find(page=>page.id===id&&page.module==="maze-studio")||null:null;
  }
  function stored(page){
    const s=page?.recipe?.settings||page?.settings||{};
    return{
      startAssetRef:s.startAssetRef||null,
      goalAssetRef:s.goalAssetRef||null,
      checkpointAssetRef:s.checkpointAssetRef||null,
      checkpointCount:clamp(s.checkpointCount,0,5,0),
      checkpointScale:clamp(s.checkpointScale,40,160,80),
      hazardAssetRef:s.hazardAssetRef||null,
      hazardCount:clamp(s.hazardCount,0,8,0),
      hazardScale:clamp(s.hazardScale,40,160,78)
    };
  }
  function refresh(preserve=true){
    const page=currentPage(),saved=page?stored(page):null;
    const selected=(id,key)=>saved?.[key]||(preserve?$(id)?.value:"")||"";
    fillSelect("startAsset",selected("startAsset","startAssetRef"),"Bez assetu — znacznik S");
    fillSelect("goalAsset",selected("goalAsset","goalAssetRef"),"Bez assetu — znacznik M");
    fillSelect("checkpointAsset",selected("checkpointAsset","checkpointAssetRef"),"Bez assetu");
    fillSelect("hazardAsset",selected("hazardAsset","hazardAssetRef"),"Bez assetu");
    if(saved){
      if($("checkpointCount"))$("checkpointCount").value=saved.checkpointCount;
      if($("checkpointScale"))$("checkpointScale").value=saved.checkpointScale;
      if($("hazardCount"))$("hazardCount").value=saved.hazardCount;
      if($("hazardScale"))$("hazardScale").value=saved.hazardScale;
    }
    const info=$("assetInfo"),assets=mazeAssets();
    if(info&&!core.findAssets({tag:"gameplay"}).length&&assets.length)info.textContent=`Biblioteka projektu: ${assets.length} assetów. Brak tagu Gameplay — Maze używa wszystkich assetów projektu jako listy awaryjnej.`;
  }
  function missionUi(){return{
    checkpointAssetRef:$("checkpointAsset")?.value||null,
    checkpointCount:clamp($("checkpointCount")?.value,0,5,0),
    checkpointScale:clamp($("checkpointScale")?.value,40,160,80),
    hazardAssetRef:$("hazardAsset")?.value||null,
    hazardCount:clamp($("hazardCount")?.value,0,8,0),
    hazardScale:clamp($("hazardScale")?.value,40,160,78)
  }}
  function persistExistingPage(){
    const page=currentPage();if(!page)return;
    const patch=typeof structuredClone==="function"?structuredClone(page):JSON.parse(JSON.stringify(page));
    const mission=missionUi();
    patch.settings={...(patch.settings||{}),...mission};
    patch.recipe=patch.recipe||{};
    patch.recipe.settings={...(patch.recipe.settings||patch.settings||{}),...mission};
    core.updatePage(page.id,patch);
  }
  function redraw(){
    const trigger=$("startAssetScale");
    if(trigger)trigger.dispatchEvent(new Event("input",{bubbles:true}));
  }

  ["checkpointAsset","checkpointCount","checkpointScale","hazardAsset","hazardCount","hazardScale"].forEach(id=>{
    const el=$(id);if(!el)return;
    el.addEventListener("change",redraw);
    el.addEventListener("input",redraw);
  });
  $("pageSelect")?.addEventListener("change",()=>setTimeout(()=>refresh(false),0));
  $("saveCart")?.addEventListener("click",()=>setTimeout(persistExistingPage,0));
  window.addEventListener("fenix-state-change",event=>{
    if(event.detail?.assets||event.detail?.activeProject)setTimeout(()=>refresh(true),0);
  });
  window.addEventListener("fenix-assets-change",()=>refresh(true));
  window.addEventListener("fenix-project-change",()=>refresh(false));

  refresh(true);
  setTimeout(()=>refresh(true),0);
})();

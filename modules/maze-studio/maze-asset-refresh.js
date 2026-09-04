"use strict";
(()=>{
  const VERSION="0.34.0";
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback))};
  const scaleForRole=(role,value)=>{
    const raw=clamp(value,40,180,role==="endpoint"?100:80);
    const factor=role==="endpoint"?1.7:1.55;
    return Math.round(raw*factor);
  };
  function enhanceSettings(source={}){
    const s={...source};
    if(s.startAssetRef)s.startAssetScale=scaleForRole("endpoint",s.startAssetScale??100);
    if(s.goalAssetRef)s.goalAssetScale=scaleForRole("endpoint",s.goalAssetScale??100);
    if(s.checkpointAssetRef)s.checkpointScale=scaleForRole("mission",s.checkpointScale??80);
    if(s.hazardAssetRef)s.hazardScale=scaleForRole("mission",s.hazardScale??78);
    return s;
  }
  function enhancePage(page){
    const next=clone(page||{}),recipe={...(next.recipe||{})};
    recipe.settings=enhanceSettings(recipe.settings||next.settings||{});
    next.recipe=recipe;
    if(next.settings)next.settings={...recipe.settings};
    return next;
  }
  window.FenixMazeEnhancements=Object.freeze({version:VERSION,scaleForRole,enhanceSettings,enhancePage});

  const base=window.FenixMaze;
  if(base?.render){
    const enhanced={...base,enhancementVersion:VERSION,render(page,opts={}){return base.render(enhancePage(page),opts)}};
    window.FenixMaze=Object.freeze(enhanced);
  }

  if(typeof document==="undefined"||!window.FenixCore)return;
  const pageId=()=>new URLSearchParams(location.search).get("id");
  const canvas=()=>document.getElementById("page");
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[ch]));
  const decoNameHint=/deco|corner|divider|coral|kelp|bubble|shell|sparkle|anemone|reef|crystal|ruin|pearl|wave/i;
  let running=false,lastRun=0,decoRefreshQueued=false;

  function assetTags(asset){
    const raw=asset?.tags;
    if(Array.isArray(raw))return raw.map(String);
    if(typeof raw==="string")return raw.split(/[;,\s]+/).filter(Boolean);
    return [];
  }
  function isRecommendedDeco(asset){return assetTags(asset).some(tag=>tag.toLowerCase()==="deco")||decoNameHint.test(String(asset?.name||""))}
  function currentSelectedDeco(){return [...document.querySelectorAll('#decoAssetChoices input[type="checkbox"]:checked')].map(input=>input.value)}
  function savedDecoRefs(){
    const select=document.getElementById("pageSelect"),id=select?.value||pageId();
    if(!id)return[];
    const raw=FenixCore.getCart?.().find(item=>item.id===id);
    const refs=raw?.recipe?.settings?.decoAssetRefs||raw?.settings?.decoAssetRefs;
    return Array.isArray(refs)?refs.filter(Boolean):[];
  }
  function updateDecoSummary(){
    const summary=document.getElementById("decoSummary"),count=document.getElementById("decoCount"),selected=currentSelectedDeco().length;
    if(summary)summary.textContent=`${selected} wybranych · ${Number(count?.value)||0} na stronie`;
  }
  function markMazeDirty(){
    const count=document.getElementById("decoCount");
    if(count){count.dispatchEvent(new Event("input",{bubbles:true}));count.dispatchEvent(new Event("change",{bubbles:true}))}
  }
  function injectDecoStyle(){
    if(document.getElementById("maze-deco-library-style"))return;
    const style=document.createElement("style");style.id="maze-deco-library-style";style.textContent=`
      .maze-deco-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.maze-deco-toolbar input{flex:1;min-width:220px;padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px}.maze-deco-toolbar small{color:#64748b}.maze-deco-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;max-height:430px;overflow:auto;padding:4px}.maze-deco-card{position:relative;display:grid!important;grid-template-rows:76px auto;gap:5px;padding:7px;border:1px solid #dbe3ee;border-radius:10px;background:#fff;cursor:pointer}.maze-deco-card:hover{border-color:#f08a2c}.maze-deco-card input{position:absolute;right:7px;top:7px;width:auto!important;z-index:2}.maze-deco-card img{width:100%;height:76px;object-fit:contain;background:#fff}.maze-deco-card strong{font-size:10px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.maze-deco-card.recommended{border-color:#d7b56d;background:#fffdf7}.maze-deco-card[hidden]{display:none!important}.maze-scale-behavior{margin-top:8px;padding:9px 11px;border-radius:9px;background:#eef7ff;color:#31506f;font-size:11px;line-height:1.4}`;
    document.head.appendChild(style);
  }
  function rebuildDecoLibrary(){
    const host=document.getElementById("decoAssetChoices");if(!host||!FenixCore.listAssets)return;
    injectDecoStyle();
    const selected=new Set([...currentSelectedDeco(),...savedDecoRefs()]);
    const assets=[...FenixCore.listAssets()].sort((a,b)=>Number(isRecommendedDeco(b))-Number(isRecommendedDeco(a))||String(a.name||"").localeCompare(String(b.name||"")));
    if(!assets.length){host.innerHTML='<div class="asset-empty">Brak assetów w bibliotece.</div>';return}
    host.innerHTML=`<div class="maze-deco-toolbar"><input id="mazeDecoSearch" type="search" placeholder="Szukaj Deco w bibliotece (${assets.length})"><small>Pokazuję całą bibliotekę; polecane Deco są wyróżnione.</small></div><div class="maze-deco-grid">${assets.map(asset=>{const full=FenixCore.getAsset?.(asset.id)||asset,src=full?.dataUrl||"",recommended=isRecommendedDeco(full);return `<label class="deco-choice maze-deco-card ${recommended?"recommended":""}" data-name="${esc(String(full.name||"").toLowerCase())}"><input type="checkbox" value="${esc(full.id)}" ${selected.has(full.id)?"checked":""}>${src?`<img src="${esc(src)}" alt="">`:'<div></div>'}<strong title="${esc(full.name||"")}">${esc(full.name||full.id)}</strong></label>`}).join("")}</div>`;
    const search=document.getElementById("mazeDecoSearch");
    search?.addEventListener("input",()=>{const q=search.value.trim().toLowerCase();host.querySelectorAll(".maze-deco-card").forEach(card=>card.hidden=!!q&&!card.dataset.name.includes(q))});
    host.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener("change",()=>{
      const count=document.getElementById("decoCount"),selectedCount=currentSelectedDeco().length;
      if(count&&selectedCount>0&&Number(count.value)===0)count.value=String(Math.min(3,selectedCount));
      if(count&&selectedCount===0)count.value="0";
      updateDecoSummary();markMazeDirty();
    }));
    updateDecoSummary();
    const info=document.getElementById("assetInfo");if(info)info.textContent=`Biblioteka projektu: Maze ${assets.length} · Deco do wyboru ${assets.length}. Skala assetu steruje też wielkością zarezerwowanej strefy.`;
    const section=host.closest("details");
    if(section&&!section.querySelector(".maze-scale-behavior")){const note=document.createElement("div");note.className="maze-scale-behavior";note.textContent="Deco są układane poza grywalnym obszarem labiryntu. START, META, checkpointy i zagrożenia rosną procentowo, a generator rezerwuje dla nich odpowiednio większą strefę bez ścian.";section.querySelector(".deco-compact")?.appendChild(note)}
  }
  function queueDecoRefresh(){if(decoRefreshQueued)return;decoRefreshQueued=true;setTimeout(()=>{decoRefreshQueued=false;rebuildDecoLibrary()},0)}

  async function rerenderSavedMaze(){
    const id=pageId();
    if(!id||running||!window.FenixCore||!window.FenixMaze||!window.FenixPageSchema)return;
    const now=Date.now();
    if(now-lastRun<120)return;
    running=true;lastRun=now;
    try{
      await FenixCore.ready;
      if(typeof FenixCore.flushStorage==="function")await FenixCore.flushStorage();
      const raw=FenixCore.getCart().find(item=>item.id===id&&FenixPageSchema.moduleOf(item)==="maze-studio");
      if(!raw)return;
      const page=FenixPageSchema.normalize(raw),s=page.recipe?.settings||{};
      const refs=[s.startAssetRef,s.goalAssetRef,s.checkpointAssetRef,s.hazardAssetRef,...(Array.isArray(s.decoAssetRefs)?s.decoAssetRefs:[])].filter(Boolean);
      if(!refs.length)return;
      const images=await FenixMaze.prepareAssets(page);
      if(!Object.keys(images).length)return;
      FenixMaze.render(page,{solution:!!s.showSolution,width:2550,height:3300,canvas:canvas(),assetImages:images});
      const status=document.getElementById("status");
      if(status)status.textContent="Wczytano zapisany labirynt z assetami";
    }catch(error){console.error("Maze asset refresh failed",error)}finally{running=false}
  }
  window.addEventListener("fenix-storage-ready",()=>{queueDecoRefresh();setTimeout(rerenderSavedMaze,0)});
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.storage){queueDecoRefresh();setTimeout(rerenderSavedMaze,0)}});
  document.getElementById("pageSelect")?.addEventListener("change",()=>setTimeout(queueDecoRefresh,0));
  Promise.resolve().then(async()=>{if(window.FenixCore?.ready)await FenixCore.ready;requestAnimationFrame(()=>requestAnimationFrame(()=>{rebuildDecoLibrary();rerenderSavedMaze()}))});
})();
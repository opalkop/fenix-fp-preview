"use strict";
(()=>{
  const VERSION="0.35.0";
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[ch]));
  const decoHint=/deco|corner|divider|coral|kelp|bubble|shell|sparkle|anemone|reef|crystal|ruin|pearl|wave|garden|branch|cluster|sprig|seaweed/i;
  const selectedRefs=()=>[...document.querySelectorAll('#decoAssetChoices input[type="checkbox"]:checked')].map(input=>input.value);
  const savedRefs=()=>{
    if(typeof FenixCore==="undefined")return[];
    const id=document.getElementById("pageSelect")?.value;
    if(!id)return[];
    const page=FenixCore.getCart?.().find(item=>item.id===id);
    const refs=page?.recipe?.settings?.decoAssetRefs||page?.settings?.decoAssetRefs;
    return Array.isArray(refs)?refs.filter(Boolean):[];
  };
  function markDirty(){
    const count=document.getElementById("decoCount");
    if(!count)return;
    count.dispatchEvent(new Event("input",{bubbles:true}));
    count.dispatchEvent(new Event("change",{bubbles:true}));
  }
  function syncSummary(){
    const summary=document.getElementById("decoSummary"),count=document.getElementById("decoCount");
    if(summary)summary.textContent=`${selectedRefs().length} wybranych · ${Number(count?.value)||0} na stronie`;
  }
  let rebuilding=false;
  function rebuildDeco(){
    if(rebuilding||typeof FenixCore==="undefined")return;
    const host=document.getElementById("decoAssetChoices");if(!host)return;
    rebuilding=true;
    try{
      const keep=new Set([...selectedRefs(),...savedRefs()]);
      const assets=[...FenixCore.listAssets()].sort((a,b)=>Number(decoHint.test(String(b.name||"")))-Number(decoHint.test(String(a.name||"")))||String(a.name||"").localeCompare(String(b.name||""),"pl"));
      host.innerHTML=assets.length?`<div class="maze-deco-toolbar"><input id="mazeDecoSearch" type="search" placeholder="Szukaj Deco w bibliotece (${assets.length})"><small>Pełna biblioteka projektu. Elementy dekoracyjne są pokazane jako pierwsze.</small></div><div class="maze-deco-grid">${assets.map(asset=>{const full=FenixCore.getAsset(asset.id)||asset,src=full.dataUrl||"",recommended=decoHint.test(String(full.name||""));return `<label class="maze-deco-card ${recommended?"recommended":""}" data-name="${esc(String(full.name||"").toLowerCase())}"><input type="checkbox" value="${esc(full.id)}" ${keep.has(full.id)?"checked":""}>${src?`<img src="${esc(src)}" alt="">`:'<div class="maze-deco-placeholder"></div>'}<strong title="${esc(full.name||full.id)}">${esc(full.name||full.id)}</strong></label>`}).join("")}</div>`:'<div class="asset-empty">Brak assetów w aktywnym projekcie.</div>';
      if(!document.getElementById("maze-production-fix-style")){
        const style=document.createElement("style");style.id="maze-production-fix-style";style.textContent=`.maze-deco-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.maze-deco-toolbar input{flex:1;min-width:220px;padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px}.maze-deco-toolbar small{color:#64748b}.maze-deco-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;max-height:440px;overflow:auto;padding:4px}.maze-deco-card{position:relative;display:grid;grid-template-rows:82px auto;gap:5px;padding:7px;border:1px solid #dbe3ee;border-radius:10px;background:#fff;cursor:pointer}.maze-deco-card.recommended{border-color:#e8b770;background:#fffdf8}.maze-deco-card input{position:absolute;right:7px;top:7px;z-index:2}.maze-deco-card img{width:100%;height:82px;object-fit:contain}.maze-deco-card strong{font-size:10px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.maze-deco-card[hidden]{display:none}.maze-deco-placeholder{height:82px}`;document.head.appendChild(style)
      }
      document.getElementById("mazeDecoSearch")?.addEventListener("input",event=>{const q=event.target.value.trim().toLowerCase();host.querySelectorAll(".maze-deco-card").forEach(card=>card.hidden=!!q&&!card.dataset.name.includes(q))});
      host.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener("change",()=>{const count=document.getElementById("decoCount"),n=selectedRefs().length;if(count&&n>0&&Number(count.value)===0)count.value=String(Math.min(3,n));if(count&&n===0)count.value="0";syncSummary();markDirty()}));
      syncSummary();
      const info=document.getElementById("assetInfo");if(info)info.textContent=`Biblioteka projektu: Maze ${assets.length} · Deco ${assets.length}. Deco korzysta z pełnej biblioteki, bez wymagania tagu „deco”.`;
    }finally{rebuilding=false}
  }
  function installDeco(){
    const host=document.getElementById("decoAssetChoices");if(!host)return;
    rebuildDeco();
    const observer=new MutationObserver(()=>{if(rebuilding)return;const text=host.textContent||"";if(/Brak assetów Deco|Brak assetów/.test(text)||!host.querySelector(".maze-deco-grid"))queueMicrotask(rebuildDeco)});
    observer.observe(host,{childList:true,subtree:true});
    window.addEventListener("fenix-assets-change",()=>setTimeout(rebuildDeco,0));
    window.addEventListener("fenix-library-change",()=>setTimeout(rebuildDeco,0));
    document.getElementById("pageSelect")?.addEventListener("change",()=>setTimeout(rebuildDeco,0));
  }

  function drawRoomAsset(ctx,image,rect){
    if(!image||!rect)return false;
    const iw=image.naturalWidth||image.width||1,ih=image.naturalHeight||image.height||1;
    const roomW=Math.max(1,rect.right-rect.left),roomH=Math.max(1,rect.bottom-rect.top);
    const maxW=roomW*.82,maxH=roomH*.82,ratio=Math.min(maxW/iw,maxH/ih);
    const w=iw*ratio,h=ih*ratio,x=(rect.left+rect.right)/2,y=(rect.top+rect.bottom)/2;
    ctx.save();ctx.translate(x,y);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();return true;
  }
  function installRenderSizing(){
    const base=window.FenixMaze;if(!base?.render)return;
    const fixed={...base,productionFixVersion:VERSION,render(page,opts={}){
      const result=base.render(page,opts);
      if(opts.solution||!result?.canvas||!Array.isArray(result.assetRoomRects))return result;
      const settings={...(page?.settings||{}),...(page?.recipe?.settings||{})},images=opts.assetImages||{},ctx=result.canvas.getContext("2d");
      const byRole=role=>result.assetRoomRects.filter(rect=>rect.role===role);
      const drawAll=(role,ref)=>{const image=images?.[ref];if(!image)return;for(const rect of byRole(role))drawRoomAsset(ctx,image,rect)};
      drawAll("start",settings.startAssetRef);drawAll("goal",settings.goalAssetRef);drawAll("checkpoint",settings.checkpointAssetRef);drawAll("hazard",settings.hazardAssetRef);
      return{...result,productionFixVersion:VERSION};
    }};
    window.FenixMaze=Object.freeze(fixed);
  }

  installRenderSizing();
  Promise.resolve().then(async()=>{if(typeof FenixCore!=="undefined"&&FenixCore.ready)await FenixCore.ready;requestAnimationFrame(()=>requestAnimationFrame(installDeco))});
})();

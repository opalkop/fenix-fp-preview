"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const normalize=value=>String(value||"").trim().toLowerCase();

  function activeGrid(){
    const libraryPane=$("libraryPane");
    return libraryPane&&!libraryPane.hidden?$("libraryGrid"):$("assetGrid");
  }

  function apply(){
    const input=$("matchingAssetSearch"),info=$("matchingAssetSearchInfo"),grid=activeGrid();
    if(!input||!grid)return;
    const query=normalize(input.value);
    const cards=[...grid.querySelectorAll(".asset-card")];
    let shown=0;
    for(const card of cards){
      const name=normalize(card.querySelector("strong")?.textContent||card.textContent||"");
      const visible=!query||name.includes(query);
      card.hidden=!visible;
      if(visible)shown++;
    }
    if(info)info.textContent=query?`${shown} z ${cards.length} pasujących`:`${cards.length} assetów`;
  }

  function init(){
    const tabs=document.querySelector(".source-tabs");
    if(!tabs||$("matchingAssetSearch"))return;
    const row=document.createElement("div");
    row.className="matching-asset-search";
    row.innerHTML='<label>Znajdź asset<input id="matchingAssetSearch" type="search" placeholder="Wpisz nazwę, np. moonfin, mosshell, 02-03"></label><span id="matchingAssetSearchInfo"></span>';
    tabs.insertAdjacentElement("afterend",row);
    $("matchingAssetSearch")?.addEventListener("input",apply);
    $("tabProject")?.addEventListener("click",()=>setTimeout(apply,0));
    $("tabLibrary")?.addEventListener("click",()=>setTimeout(apply,0));
    document.addEventListener("click",e=>{if(e.target?.closest?.(".asset-card,#clearAssets"))setTimeout(apply,0)});
    window.addEventListener("fenix-state-change",()=>setTimeout(apply,0));
    apply();
  }

  const style=document.createElement("style");
  style.textContent=`
    .matching-asset-search{display:flex;gap:12px;align-items:end;margin:12px 0;padding:10px 12px;border:1px solid #dbe2e8;border-radius:12px;background:#fff}
    .matching-asset-search label{display:flex;flex-direction:column;gap:6px;flex:1;max-width:520px;font-size:13px;font-weight:800;color:#56616c}
    .matching-asset-search input{width:100%;padding:10px 11px;border:1px solid #cbd4dc;border-radius:9px;background:#fff;font:inherit;color:#17202a}
    .matching-asset-search span{padding-bottom:10px;color:#6d7884;font-size:12px;white-space:nowrap}
    @media(max-width:720px){.matching-asset-search{align-items:stretch;flex-direction:column}.matching-asset-search span{padding-bottom:0}}
  `;
  document.head.appendChild(style);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const norm=s=>String(s||"").trim().toLowerCase();
  function projectRoleByName(name){
    const wanted=norm(name);
    for(const card of document.querySelectorAll("#assetGrid .asset-card")){
      const label=norm(card.querySelector("strong")?.textContent);
      if(label!==wanted)continue;
      if(card.classList.contains("target"))return "target";
      if(card.classList.contains("distractor"))return "distractor";
      return "none";
    }
    return "none";
  }
  function ensureLegend(){
    const pane=$("libraryPane");
    if(!pane||pane.querySelector(".library-role-legend"))return;
    const note=pane.querySelector(".note");
    const legend=document.createElement("div");
    legend.className="role-legend library-role-legend";
    legend.innerHTML='<strong>Rola assetu:</strong><span class="legend-chip target">CEL</span><span class="legend-chip distractor">DYSTRAKTOR</span><span class="legend-chip none">WYŁĄCZONY</span><small>1 klik = CEL · 2 klik = DYSTRAKTOR · 3 klik = WYŁĄCZONY.</small>';
    note?.insertAdjacentElement("afterend",legend);
  }
  function sync(){
    ensureLegend();
    document.querySelectorAll("#libraryGrid .asset-card").forEach(card=>{
      const name=card.querySelector("strong")?.textContent||"";
      const r=projectRoleByName(name);
      card.classList.remove("target","distractor","none");
      card.classList.add(r);
      let badge=card.querySelector(".role-state");
      if(!badge){badge=document.createElement("span");badge.className="role-state";card.prepend(badge)}
      badge.className=`role-state ${r}`;
      badge.textContent=r==="target"?"CEL":r==="distractor"?"DYSTRAKTOR":"WYŁĄCZONY";
      const small=card.querySelector("small");
      if(small)small.textContent=r==="none"?"Kliknij → CEL":r==="target"?"Kliknij → DYSTRAKTOR":"Kliknij → WYŁĄCZ";
    });
  }
  const later=()=>{setTimeout(sync,0);setTimeout(sync,180)};
  $("tabLibrary")?.addEventListener("click",later);
  $("libraryGrid")?.addEventListener("click",later,true);
  $("assetGrid")?.addEventListener("click",later,true);
  window.addEventListener("fenix-state-change",later);
  window.addEventListener("load",later);
  later();
})();
"use strict";
(()=>{
  const normalize=value=>String(value||"").toLowerCase().trim();
  const createSearch=(pane,gridId,label)=>{
    if(!pane||document.querySelector(`[data-fenix-hidden-search="${gridId}"]`))return;
    const grid=document.getElementById(gridId);
    if(!grid)return;
    const wrap=document.createElement("label");
    wrap.dataset.fenixHiddenSearch=gridId;
    wrap.style.display="block";
    wrap.style.margin="10px 0";
    wrap.innerHTML=`${label}<input type="search" placeholder="Wpisz nazwę assetu…" autocomplete="off" style="display:block;width:100%;margin-top:6px;box-sizing:border-box;">`;
    grid.insertAdjacentElement("beforebegin",wrap);
    const input=wrap.querySelector("input");
    const apply=()=>{
      const q=normalize(input.value);
      [...grid.children].forEach(card=>{
        const hay=normalize(card.textContent);
        card.hidden=!!q&&!hay.includes(q);
      });
    };
    input.addEventListener("input",apply);
    const observer=new MutationObserver(()=>apply());
    observer.observe(grid,{childList:true});
  };
  const init=()=>{
    createSearch(document.getElementById("projectPane"),"assetGrid","Szukaj assetu w projekcie");
    createSearch(document.getElementById("libraryPane"),"libraryGrid","Szukaj assetu w bibliotece");
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

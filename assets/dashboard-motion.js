"use strict";

(()=>{
  const root=document.documentElement;
  const body=document.body;
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const restore=()=>{
    body.classList.remove("motion-leaving");
    document.querySelectorAll(".motion-card-active").forEach(card=>card.classList.remove("motion-card-active"));
  };
  window.addEventListener("pageshow",restore);

  if(reduceMotion){
    root.classList.remove("fenix-motion");
    return;
  }

  const startFoundation=()=>requestAnimationFrame(()=>root.classList.add("fenix-motion-start"));

  const prepareCards=()=>{
    const grid=document.querySelector("#grid");
    if(!grid)return false;
    const cards=[...grid.querySelectorAll(".module")];
    if(!cards.length)return false;

    cards.forEach((card,index)=>{
      if(card.dataset.motionBound==="1")return;
      card.dataset.motionBound="1";
      card.style.setProperty("--motion-delay",`${330+index*55}ms`);
      card.classList.add("motion-card-in");
      card.addEventListener("animationend",()=>{
        card.classList.remove("motion-card-in");
        card.classList.add("motion-card-ready");
        card.style.removeProperty("--motion-delay");
      },{once:true});
    });
    return true;
  };

  const initialize=()=>{
    startFoundation();
    if(prepareCards())return;

    const grid=document.querySelector("#grid");
    if(!grid)return;
    const observer=new MutationObserver(()=>{
      if(prepareCards())observer.disconnect();
    });
    observer.observe(grid,{childList:true});
    window.setTimeout(()=>observer.disconnect(),3000);
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

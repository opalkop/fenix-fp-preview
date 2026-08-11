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
      card.style.setProperty("--motion-delay",`${460+index*130}ms`);
      card.classList.add("motion-card-in");
      card.addEventListener("animationend",()=>{
        card.classList.remove("motion-card-in");
        card.classList.add("motion-card-ready");
        card.style.removeProperty("--motion-delay");
      },{once:true});
    });
    return true;
  };

  const bindCardNavigation=()=>{
    const grid=document.querySelector("#grid");
    if(!grid||grid.dataset.motionNavigation==="1")return;
    grid.dataset.motionNavigation="1";
    grid.addEventListener("click",event=>{
      const link=event.target.closest("a.module-link");
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const card=link.closest(".module");
      if(!card||body.classList.contains("motion-leaving"))return;
      event.preventDefault();
      body.classList.add("motion-leaving");
      card.classList.add("motion-card-active");
      window.setTimeout(()=>{window.location.href=link.href},250);
    });
  };

  const initialize=()=>{
    startFoundation();
    bindCardNavigation();
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

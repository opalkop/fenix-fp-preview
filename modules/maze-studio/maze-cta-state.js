"use strict";
(()=>{
  const cta=document.getElementById("generateMaze");
  const state=document.getElementById("generationState");
  if(!cta||!state)return;

  const apply=()=>{
    const ready=state.classList.contains("ready");
    const dirty=state.classList.contains("dirty");
    if(ready){
      cta.dataset.state="ready";
      cta.classList.add("is-ready");
      cta.classList.remove("is-generating");
      cta.style.setProperty("background","#16a34a","important");
      cta.style.setProperty("background-color","#16a34a","important");
      cta.style.setProperty("color","#fff","important");
      cta.innerHTML='<span class="cta-icon">✓</span><span>LABIRYNT WYGENEROWANY</span>';
      return;
    }
    if(dirty){
      cta.dataset.state="idle";
      cta.classList.remove("is-ready","is-generating");
      cta.style.setProperty("background","#1877f2","important");
      cta.style.setProperty("background-color","#1877f2","important");
      cta.style.setProperty("color","#fff","important");
      cta.innerHTML='<span class="cta-icon">▶</span><span>GENERUJ LABIRYNT</span>';
    }
  };

  cta.addEventListener("pointerdown",()=>{
    cta.dataset.state="generating";
    cta.classList.remove("is-ready");
    cta.classList.add("is-generating");
    cta.style.setProperty("background","#111827","important");
    cta.style.setProperty("background-color","#111827","important");
    cta.style.setProperty("color","#fff","important");
  });

  new MutationObserver(apply).observe(state,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
  apply();
})();

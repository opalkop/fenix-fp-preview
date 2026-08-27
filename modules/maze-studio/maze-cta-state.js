"use strict";
(()=>{
  const cta=document.getElementById("generateMaze");
  const state=document.getElementById("generationState");
  if(!cta||!state)return;

  let watchdog=null;

  const setVisual=mode=>{
    cta.dataset.state=mode;
    cta.classList.toggle("is-ready",mode==="ready");
    cta.classList.toggle("is-generating",mode==="generating");

    if(mode==="ready"){
      cta.style.setProperty("background","#16a34a","important");
      cta.style.setProperty("background-color","#16a34a","important");
      cta.style.setProperty("border-color","#16a34a","important");
      cta.style.setProperty("color","#fff","important");
      cta.innerHTML='<span class="cta-icon">✓</span><span>LABIRYNT WYGENEROWANY</span>';
      return;
    }
    if(mode==="generating"){
      cta.style.setProperty("background","#111827","important");
      cta.style.setProperty("background-color","#111827","important");
      cta.style.setProperty("border-color","#111827","important");
      cta.style.setProperty("color","#fff","important");
      cta.innerHTML='<span class="cta-icon">…</span><span>GENERUJĘ LABIRYNT</span>';
      return;
    }

    cta.style.setProperty("background","#1877f2","important");
    cta.style.setProperty("background-color","#1877f2","important");
    cta.style.setProperty("border-color","#1877f2","important");
    cta.style.setProperty("color","#fff","important");
    cta.innerHTML='<span class="cta-icon">▶</span><span>GENERUJ LABIRYNT</span>';
  };

  const apply=()=>{
    if(state.classList.contains("ready")){
      if(watchdog){clearInterval(watchdog);watchdog=null;}
      setVisual("ready");
      return;
    }
    if(state.classList.contains("dirty")){
      if(watchdog){clearInterval(watchdog);watchdog=null;}
      setVisual("idle");
    }
  };

  const startWatchdog=()=>{
    if(watchdog)clearInterval(watchdog);
    setVisual("generating");
    watchdog=setInterval(()=>{
      if(state.classList.contains("ready")){
        clearInterval(watchdog);watchdog=null;setVisual("ready");
      }else if(state.classList.contains("dirty")){
        clearInterval(watchdog);watchdog=null;setVisual("idle");
      }
    },100);
  };

  cta.addEventListener("pointerdown",startWatchdog,{passive:true});
  new MutationObserver(apply).observe(state,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
  apply();
})();

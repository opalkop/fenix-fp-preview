"use strict";
(()=>{
 const btn=document.getElementById("generateMaze"),state=document.getElementById("generationState");
 if(!btn||!state)return;
 const set=(mode)=>{
   btn.classList.add("maze-generate-cta");
   btn.classList.toggle("is-ready",mode==="ready");
   btn.classList.toggle("is-generating",mode==="generating");
   if(mode==="ready")btn.innerHTML='<span class="cta-icon">✓</span><span>Labirynt wygenerowany</span>';
   else if(mode==="generating")btn.innerHTML='<span class="cta-icon">…</span><span>Generuję labirynt</span>';
   else btn.innerHTML='<span class="cta-icon">▶</span><span>Generuj labirynt</span>';
 };
 const sync=()=>{
   if(btn.disabled&&state.classList.contains("dirty"))set("generating");
   else if(state.classList.contains("ready"))set("ready");
   else set("idle");
 };
 const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const originalClick=btn.onclick;
 if(typeof originalClick==="function"){
   btn.onclick=async event=>{
     set("generating");
     await nextPaint();
     return originalClick.call(btn,event);
   };
 }
 btn.addEventListener("pointerdown",()=>{
   if(!btn.disabled)set("generating");
 });
 const observer=new MutationObserver(sync);
 observer.observe(state,{attributes:true,childList:true,subtree:true,characterData:true});
 const btnObserver=new MutationObserver(sync);
 btnObserver.observe(btn,{attributes:true,attributeFilter:["disabled"]});
 sync();
})();
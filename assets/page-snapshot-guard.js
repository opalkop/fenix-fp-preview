"use strict";
(()=>{
  if(window.__FenixPageSnapshotGuard)return;
  window.__FenixPageSnapshotGuard=true;
  if(typeof FenixCore==="undefined"||typeof FenixPageSchema==="undefined")return;
  const match=location.pathname.match(/\/modules\/([^/]+)\//),module=match?.[1]||document.body?.dataset?.module||"";
  if(!module||module==="book-builder")return;
  let pending=null,writing=false;
  const saveButton=el=>{
    const button=el?.closest?.("button");if(!button)return null;
    const id=String(button.id||""),text=String(button.textContent||"").toLowerCase();
    return ["cart","saveCart","savePage"].includes(id)||button.hasAttribute("data-save-page")||/dodaj.*projekt|zapisz.*projekt|zapisz.*stron|dodaj.*stron/.test(text)?button:null;
  };
  const visibleCanvas=()=>document.getElementById("page")||document.querySelector(".preview canvas,.workspace canvas,.hero canvas,canvas[data-fenix-page]");
  const solutionVisible=()=>{
    const select=document.getElementById("solution");
    if(select&&String(select.value).toLowerCase()==="yes")return true;
    const tab=document.getElementById("solutionTab");
    return Boolean(tab&&(tab.classList.contains("active")||tab.getAttribute("aria-selected")==="true"));
  };
  document.addEventListener("click",event=>{
    if(!saveButton(event.target))return;
    const canvas=visibleCanvas();if(!canvas||!canvas.width||!canvas.height)return;
    try{pending={module,imageData:canvas.toDataURL("image/png"),solution:solutionVisible(),capturedAt:Date.now()}}catch{pending=null}
  },true);
  window.addEventListener("fenix-cart-change",()=>{
    if(writing||!pending||pending.module!==module)return;
    const snap=pending;pending=null;
    setTimeout(()=>{
      if(writing)return;
      const pages=(FenixCore.getCart()||[]).map(FenixPageSchema.normalize).filter(page=>page.module===module);
      if(!pages.length)return;
      pages.sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
      const page=pages[0];
      writing=true;
      try{
        if(snap.solution){FenixCore.updatePage(page.id,{solution:{available:true,imageData:snap.imageData}})}
        else{FenixCore.updatePage(page.id,{preview:{imageData:snap.imageData}})}
      }finally{setTimeout(()=>{writing=false},0)}
    },0);
  });
})();

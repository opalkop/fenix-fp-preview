"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(standard&&Array.isArray(standard.modules)){
    const blocked=new Set(["hidden-objects-studio","tracing-studio","logic-studio"]);
    window.FenixStandardRenderers=Object.freeze({render:standard.render,modules:Object.freeze(standard.modules.filter(module=>!blocked.has(module)))});
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const ready=()=>typeof FenixCore!=="undefined"&&typeof FenixPageSchema!=="undefined"&&document.getElementById("reloadCart");
  const isLogic=page=>FenixPageSchema.moduleOf(page)==="logic-studio";
  const hasSnapshots=page=>{const p=FenixPageSchema.normalize(page);return Boolean(p.preview?.imageData&&p.solution?.imageData)};
  const requestId=()=>`logic-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function captureLogicPage(page){
    return new Promise((resolve,reject)=>{
      const id=requestId(),frame=document.createElement("iframe");
      let settled=false;
      const cleanup=()=>{window.removeEventListener("message",onMessage);clearTimeout(timer);frame.remove()};
      const finish=(fn,value)=>{if(settled)return;settled=true;cleanup();fn(value)};
      const onMessage=event=>{
        if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
        const data=event.data||{};if(data.requestId!==id)return;
        if(data.type==="fenix-logic-snapshot")finish(resolve,{taskImage:data.taskImage,solutionImage:data.solutionImage});
        else if(data.type==="fenix-logic-snapshot-error")finish(reject,new Error(data.message||"Logic Studio nie utworzyło snapshotu."));
      };
      const timer=setTimeout(()=>finish(reject,new Error("Timeout snapshotu Logic.")),15000);
      window.addEventListener("message",onMessage);
      frame.setAttribute("aria-hidden","true");
      frame.style.cssText="position:fixed;left:-12000px;top:-12000px;width:900px;height:1200px;opacity:0;pointer-events:none;border:0";
      frame.src=`../logic-studio/index.html?id=${encodeURIComponent(page.id)}&bookBuilderSnapshot=${encodeURIComponent(id)}&v=0.29.2`;
      document.body.appendChild(frame);
    });
  }

  async function migrateLogic(){
    for(let i=0;i<120&&!ready();i++)await wait(50);
    if(!ready())return;
    const summary=document.getElementById("cartSummary");
    const targets=FenixCore.getCart().filter(page=>isLogic(page)&&!hasSnapshots(page));
    if(!targets.length)return;
    let done=0,failed=0;
    for(const page of targets){
      try{
        if(summary)summary.textContent=`Odtwarzam strony Logic ze Studia: ${done+failed+1} / ${targets.length}…`;
        const snap=await captureLogicPage(page);
        if(!snap.taskImage?.startsWith("data:image/")||!snap.solutionImage?.startsWith("data:image/"))throw new Error("Nieprawidłowy snapshot Logic.");
        const updated=FenixCore.updatePage(page.id,{preview:{imageData:snap.taskImage},solution:{available:true,imageData:snap.solutionImage}});
        if(!updated)throw new Error("Nie zapisano snapshotu Logic do projektu.");
        done++;
      }catch(error){failed++;console.error("FENIX Logic snapshot migration",page.id,error)}
    }
    document.getElementById("reloadCart")?.click();
    if(summary)summary.textContent=failed?`Logic: zapisano ${done}/${targets.length} stron 1:1; błędy: ${failed}.`:`Logic: zapisano ${done} stron 1:1 ze Studia.`;
  }

  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",()=>setTimeout(migrateLogic,150),{once:true});
  else setTimeout(migrateLogic,150);
})();

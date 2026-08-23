"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(standard&&Array.isArray(standard.modules)){
    const blocked=new Set(["hidden-objects-studio","tracing-studio","logic-studio"]);
    window.FenixStandardRenderers=Object.freeze({
      render:standard.render,
      modules:Object.freeze(standard.modules.filter(module=>!blocked.has(module)))
    });
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const ready=()=>window.FenixCore&&window.FenixPageSchema&&document.getElementById("reloadCart");
  const isLogic=page=>window.FenixPageSchema?.moduleOf(page)==="logic-studio";
  const hasSnapshots=page=>Boolean(window.FenixPageSchema?.normalize(page)?.preview?.imageData&&window.FenixPageSchema?.normalize(page)?.solution?.imageData);

  async function captureLogicPage(page){
    const frame=document.createElement("iframe");
    frame.setAttribute("aria-hidden","true");
    frame.style.cssText="position:fixed;left:-10000px;top:-10000px;width:900px;height:1200px;opacity:0;pointer-events:none";
    frame.src=`../logic-studio/index.html?id=${encodeURIComponent(page.id)}&bookBuilderSnapshot=1&v=0.29.0`;
    document.body.appendChild(frame);
    try{
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Logic Studio nie odpowiedziało w czasie.")),12000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.onerror=()=>{clearTimeout(timer);reject(new Error("Nie udało się otworzyć Logic Studio."))}});
      const doc=frame.contentDocument,win=frame.contentWindow;
      if(!doc||!win)throw new Error("Brak dostępu do Logic Studio.");
      const canvas=doc.getElementById("page"),task=doc.getElementById("taskTab"),solution=doc.getElementById("solutionTab"),status=doc.getElementById("status");
      if(!canvas||!task||!solution)throw new Error("Logic Studio nie udostępniło podglądu.");
      let rendered=false;
      for(let i=0;i<80;i++){
        if((status?.textContent||"").includes("Wygenerowano")&&canvas.width&&canvas.height){rendered=true;break}
        await wait(75);
      }
      if(!rendered)await wait(500);
      task.click();await wait(160);const taskImage=canvas.toDataURL("image/png");
      solution.click();await wait(160);const solutionImage=canvas.toDataURL("image/png");
      if(!taskImage.startsWith("data:image/")||!solutionImage.startsWith("data:image/"))throw new Error("Nie udało się wykonać snapshotu Logic.");
      return{taskImage,solutionImage};
    }finally{frame.remove()}
  }

  async function migrateLogic(){
    for(let i=0;i<100&&!ready();i++)await wait(50);
    if(!ready())return;
    const cart=FenixCore.getCart(),targets=cart.filter(page=>isLogic(page)&&!hasSnapshots(page));
    if(!targets.length)return;
    const summary=document.getElementById("cartSummary");
    let done=0;
    for(const page of targets){
      try{
        if(summary)summary.textContent=`Odtwarzam zapisane strony Logic 1:1: ${done+1} / ${targets.length}…`;
        const snap=await captureLogicPage(page);
        FenixCore.updatePage(page.id,{preview:{imageData:snap.taskImage},solution:{available:true,imageData:snap.solutionImage}});
        done++;
      }catch(error){console.error("FENIX Logic snapshot migration",page.id,error)}
    }
    if(done){
      document.getElementById("reloadCart")?.click();
      if(summary)summary.textContent=`Logic: zapisano ${done} stron 1:1 ze Studia.`;
    }
  }

  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",()=>setTimeout(migrateLogic,100),{once:true});
  else setTimeout(migrateLogic,100);
})();

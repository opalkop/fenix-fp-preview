"use strict";
window.FenixBookProductionBridge=(()=>{
  const supported=new Set(["math-studio","matching-studio","dot-to-dot-studio"]);
  const cache=new Map();
  let lastPage=null;
  const moduleOf=page=>page?.module||page?.recipe?.module||"";
  const keyOf=(page,solution=false)=>`${page?.id||page?._builderId||"unknown"}|${solution?"solution":"page"}`;
  const cloneCanvas=(source,scale=1)=>{if(!source)return null;const c=document.createElement("canvas");c.width=850*scale;c.height=1100*scale;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0,c.width,c.height);return c};

  async function warmPage(page){
    const module=moduleOf(page);
    if(!supported.has(module)||!window.FenixBookProductionRenderers)return;
    try{
      const activity=await FenixBookProductionRenderers.render(page,{solution:false,quality:"preview"});
      if(activity)cache.set(keyOf(page,false),activity);
      if(page?.solution?.available){
        const solution=await FenixBookProductionRenderers.render(page,{solution:true,quality:"preview"});
        if(solution)cache.set(keyOf(page,true),solution);
      }
    }catch(error){console.error("Production bridge render failed",module,page?.id,error)}
  }

  async function warmAll(){
    const cart=FenixCore.getCart?.()||[];
    for(const page of cart)await warmPage(page);
  }

  function install(){
    if(!window.FenixPageSchema||!window.FenixStandardRenderers)return false;
    const originalNormalize=FenixPageSchema.normalize.bind(FenixPageSchema);
    const originalRender=FenixStandardRenderers.render.bind(FenixStandardRenderers);
    FenixPageSchema.normalize=page=>{
      const out=originalNormalize(page);
      if(supported.has(moduleOf(out)))lastPage=out;
      return out;
    };
    FenixStandardRenderers.render=(module,options,seed,pageNo,scale=1)=>{
      if(!supported.has(module))return originalRender(module,options,seed,pageNo,scale);
      const page=lastPage;
      if(!page||moduleOf(page)!==module)return originalRender(module,options,seed,pageNo,scale);
      const activity=cache.get(keyOf(page,false));
      const solution=cache.get(keyOf(page,true))||null;
      if(!activity)return originalRender(module,options,seed,pageNo,scale);
      return{pageCanvas:cloneCanvas(activity,scale),solutionCanvas:solution?cloneCanvas(solution,scale):null,hasSolution:!!solution};
    };
    return true;
  }

  const ready=(async()=>{
    try{
      if(window.FenixCore?.ready&&typeof FenixCore.ready.then==="function")await FenixCore.ready;
      await warmAll();
      install();
      setTimeout(()=>document.querySelector("#reloadCart")?.click(),50);
      return true;
    }catch(error){console.error("FenixBookProductionBridge failed",error);install();return false}
  })();

  return{ready,refresh:async()=>{cache.clear();await warmAll();document.querySelector("#reloadCart")?.click()}};
})();
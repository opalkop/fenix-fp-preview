"use strict";
(()=>{
  const base=window.FenixBookProductionRenderers;
  if(!base)return;

  const previewCanvas=raw=>{
    if(raw.width===850&&raw.height===1100)return raw;
    const c=document.createElement("canvas");
    c.width=850;c.height=1100;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);
    ctx.drawImage(raw,0,0,850,1100);
    return c;
  };

  async function renderDot(page,{solution=false,quality="preview"}={}){
    if(solution)return null;
    if(!window.FenixDotCore)throw new Error("Brak silnika Dot to Dot w Book Builderze.");
    const ref=page?.recipe?.content?.assetRef||page?.recipe?.settings?.assetRef;
    const asset=ref?(FenixCore.getAsset(ref)||FenixCore.getActiveProject()?.assets?.[ref]):null;
    if(!asset?.dataUrl)throw new Error(`Brak assetu Dot to Dot dla strony „${page?.title||"bez tytułu"}”.`);
    const raw=await FenixDotCore.render(asset,page?.recipe?.settings||{});
    if(!raw)throw new Error("Dot to Dot zwrócił pusty canvas.");
    return quality==="preview"?previewCanvas(raw):raw;
  }

  window.FenixBookProductionRenderers=Object.freeze({
    supports(module){return module==="dot-to-dot-studio"||base.supports(module)},
    async render(page,options={}){
      const module=page?.module||page?.recipe?.module;
      if(module==="dot-to-dot-studio"){
        const snapshot=page?.preview?.imageData||page?.imageData||page?.recipe?.content?.imageData;
        if(snapshot)return base.render(page,options);
        return renderDot(page,options);
      }
      return base.render(page,options);
    }
  });
})();

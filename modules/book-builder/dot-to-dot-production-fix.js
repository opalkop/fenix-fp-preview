"use strict";

(()=>{
  const base=window.FenixBookProductionRenderers;
  if(!base)return;

  const loadDot=async(page,quality)=>{
    if(!window.FenixDotCore)throw new Error("Brak silnika Dot to Dot w Book Builderze.");
    const settings={...(page?.recipe?.settings||page?.settings||{})};
    const content=page?.recipe?.content||page?.content||{};
    const assetRef=content.assetRef||settings.assetRef||null;
    if(!assetRef)throw new Error(`Strona Dot to Dot „${page?.title||"bez tytułu"}” nie ma przypisanego assetu.`);
    const asset=FenixCore.getAsset(assetRef)||FenixCore.getActiveProject()?.assets?.[assetRef];
    if(!asset?.dataUrl)throw new Error(`Nie znaleziono assetu Dot to Dot dla „${page?.title||"bez tytułu"}”.`);
    const raw=await FenixDotCore.render(asset,settings);
    if(!raw)throw new Error("Dot to Dot zwrócił pusty canvas.");
    if(quality!=="preview")return raw;
    if(raw.width===850&&raw.height===1100)return raw;
    const canvas=document.createElement("canvas");
    canvas.width=850;canvas.height=1100;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);
    ctx.drawImage(raw,0,0,850,1100);
    return canvas;
  };

  window.FenixBookProductionRenderers=Object.freeze({
    supports(module){return module==="dot-to-dot-studio"||base.supports(module)},
    async render(page,options={}){
      const module=page?.module||page?.recipe?.module;
      if(module!=="dot-to-dot-studio")return base.render(page,options);
      if(options.solution)return base.render(page,options);
      const stored=page?.preview?.imageData||page?.imageData||page?.recipe?.content?.imageData||null;
      if(stored)return base.render(page,options);
      return loadDot(page,options.quality||"preview");
    }
  });
})();

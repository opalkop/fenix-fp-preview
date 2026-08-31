"use strict";
(()=>{
  const base=window.FenixBookProductionRenderers;
  const SNAPSHOT_MODULES=new Set([
    "matching-studio","alphabet-studio","math-studio","dot-to-dot-studio",
    "hidden-objects-studio"
  ]);
  const loadImage=src=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error("Nie udało się wczytać zapisanego podglądu strony."));
    img.src=src;
  });
  async function snapshotCanvas(data,quality){
    if(!data)return null;
    const img=await loadImage(data);
    const scale=quality==="print"?3:1;
    const canvas=document.createElement("canvas");
    canvas.width=850*scale;
    canvas.height=1100*scale;
    const ctx=canvas.getContext("2d");
    if(scale!==1)ctx.scale(scale,scale);
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,850,1100);
    const ratio=Math.min(850/(img.naturalWidth||850),1100/(img.naturalHeight||1100));
    const w=(img.naturalWidth||850)*ratio,h=(img.naturalHeight||1100)*ratio;
    ctx.drawImage(img,(850-w)/2,(1100-h)/2,w,h);
    return canvas;
  }
  window.FenixBookProductionRenderers=Object.freeze({
    supports(module){return SNAPSHOT_MODULES.has(module)||!!base?.supports?.(module)},
    async render(page,opts={}){
      const module=page?.module||page?.recipe?.module;
      const solution=!!opts.solution;
      const quality=opts.quality||"preview";
      const exact=solution?page?.solution?.imageData:page?.preview?.imageData;
      if(exact)return snapshotCanvas(exact,quality);
      if(base?.supports?.(module))return base.render(page,opts);
      return null;
    }
  });
})();

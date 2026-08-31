"use strict";
(()=>{
  const base=window.FenixBookProductionRenderers;
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Nie udało się wczytać assetu Dot to Dot."));img.src=src});
  const activeAssets=()=>FenixCore.listAssets?.()||[];
  const allProjectAssets=()=>{
    const out=[];
    for(const project of FenixCore.getProjects?.()||[]){
      for(const asset of Object.values(project.assets||{}))out.push(asset);
    }
    return out;
  };
  const libraryAssets=()=>Object.values(FenixCore.getAssetLibrary?.()||{});
  function identity(page){
    const c=page?.recipe?.content||page?.content||{},s=page?.recipe?.settings||page?.settings||{},m=page?.recipe?.meta||{};
    return{
      ref:c.assetRef||s.assetRef||s.lockedAssetRef||null,
      libraryRef:c.assetLibraryRef||s.assetLibraryRef||m.assetLibraryRef||null,
      name:c.assetName||m.assetName||null,
      filename:c.assetFilename||m.assetFilename||null
    };
  }
  const usable=asset=>asset?.dataUrl&&(!window.FenixDotCore?.isSvg||FenixDotCore.isSvg(asset));
  function firstMatch(list,predicate){
    const matches=list.filter(asset=>usable(asset)&&predicate(asset));
    return matches.length===1?matches[0]:null;
  }
  function resolveAsset(page){
    const id=identity(page),groups=[activeAssets(),allProjectAssets(),libraryAssets()];
    if(id.ref){
      const direct=FenixCore.getAsset?.(id.ref);if(usable(direct))return direct;
      for(const list of groups){const hit=list.find(asset=>asset?.id===id.ref);if(usable(hit))return hit}
    }
    if(id.libraryRef){
      for(const list of groups){
        const hit=list.find(asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"")===String(id.libraryRef)||String(asset?.id||"")===`library-${id.libraryRef}`);
        if(usable(hit))return hit;
      }
    }
    if(id.filename){for(const list of groups){const hit=firstMatch(list,asset=>String(asset?.filename||"")===String(id.filename));if(hit)return hit}}
    if(id.name){for(const list of groups){const hit=firstMatch(list,asset=>String(asset?.name||"")===String(id.name));if(hit)return hit}}
    return null;
  }
  async function overlayReference(target,asset,o){
    if(o.referenceEnabled!=="yes")return target;
    const ctx=target.getContext("2d"),img=await loadImage(asset.dataUrl),box=Math.round(target.width*(Math.max(10,Math.min(35,Number(o.referenceSize)||18))/100)),pad=26,margin=110,top=500,bottom=target.height-box-margin,left=margin,right=target.width-box-margin,pos={"top-right":[right,top],"top-left":[left,top],"bottom-right":[right,bottom],"bottom-left":[left,bottom]}[o.referenceCorner]||[right,top],bx=pos[0],by=pos[1];
    ctx.save();ctx.fillStyle="rgba(255,255,255,.96)";ctx.strokeStyle="#cbd5df";ctx.lineWidth=4;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,box,box,24);else ctx.rect(bx,by,box,box);ctx.fill();ctx.stroke();ctx.fillStyle="#647383";ctx.font="700 26px Arial";ctx.textAlign="center";ctx.fillText("LOOK!",bx+box/2,by+34);
    const iw=img.naturalWidth||1,ih=img.naturalHeight||1,fit=Math.min((box-pad*2)/iw,(box-pad*2-28)/ih),dw=iw*fit,dh=ih*fit,dx=bx+(box-dw)/2,dy=by+46+(box-46-dh)/2;
    if(o.referenceStyle==="original"){ctx.globalAlpha=.95;ctx.drawImage(img,dx,dy,dw,dh)}else if(o.referenceStyle==="dots"){ctx.globalAlpha=.28;ctx.drawImage(img,dx,dy,dw,dh);ctx.globalAlpha=1;ctx.fillStyle="#111";for(let i=0;i<12;i++){const px=dx+dw*(.15+.7*((i%4)/3)),py=dy+dh*(.16+.68*(Math.floor(i/4)/2));ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill()}}else{ctx.globalAlpha=.72;ctx.filter="grayscale(1) contrast(1.8)";ctx.drawImage(img,dx,dy,dw,dh);ctx.filter="none"}
    ctx.restore();return target;
  }
  async function renderDot(page,{solution=false,quality="preview"}={}){
    if(solution)return null;
    const saved=page?.preview?.imageData||page?.imageData||page?.recipe?.content?.imageData;
    if(saved&&base?.render)return base.render(page,{solution:false,quality});
    if(!window.FenixDotCore)throw new Error("Brak silnika Dot to Dot w Book Builderze.");
    const asset=resolveAsset(page);
    if(!asset){const id=identity(page);throw new Error(`Nie znaleziono assetu Dot to Dot dla „${page?.title||"Connect the Dots!"}”${id.filename?` (${id.filename})`:id.name?` (${id.name})`:""}.`)}
    const settings={...(page?.settings||{}),...(page?.recipe?.settings||{})},raw=await FenixDotCore.render(asset,settings);
    if(!raw)throw new Error("Dot to Dot zwrócił pustą stronę.");
    await overlayReference(raw,asset,settings);return raw;
  }
  window.FenixBookProductionRenderers=Object.freeze({
    supports(module){return module==="dot-to-dot-studio"||!!base?.supports?.(module)},
    render(page,opts={}){const module=page?.module||page?.recipe?.module;return module==="dot-to-dot-studio"?renderDot(page,opts):base?.render?.(page,opts)??null}
  });
})();

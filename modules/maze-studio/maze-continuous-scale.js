"use strict";
(()=>{
  const VERSION="0.36.0";
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback))};
  const settingsOf=page=>({...(page?.settings||{}),...(page?.recipe?.settings||{})});
  const scaleForRole=(settings,role)=>role==="start"?clamp(settings.startAssetScale,40,180,100):role==="goal"?clamp(settings.goalAssetScale,40,180,100):role==="checkpoint"?clamp(settings.checkpointScale,40,160,80):clamp(settings.hazardScale,40,160,78);
  const refForRole=(settings,role)=>role==="start"?settings.startAssetRef:role==="goal"?settings.goalAssetRef:role==="checkpoint"?settings.checkpointAssetRef:settings.hazardAssetRef;
  const baseUnitsForRole=role=>(role==="start"||role==="goal")?1.12:.98;
  function drawContinuous(ctx,image,rect,pct,role){
    if(!ctx||!image||!rect)return false;
    const iw=image.naturalWidth||image.width||1,ih=image.naturalHeight||image.height||1;
    const roomW=Math.max(1,rect.right-rect.left),roomH=Math.max(1,rect.bottom-rect.top);
    const gridW=Math.max(1,Number(rect.grid?.w)||1),gridH=Math.max(1,Number(rect.grid?.h)||1);
    const cell=Math.min(roomW/gridW,roomH/gridH);
    const requested=Math.max(8,cell*baseUnitsForRole(role)*(pct/100));
    const fit=Math.min(roomW*.88,roomH*.88),target=Math.min(requested,fit);
    const ratio=Math.min(target/iw,target/ih),w=iw*ratio,h=ih*ratio;
    const x=(rect.left+rect.right)/2,y=(rect.top+rect.bottom)/2;
    const inset=Math.max(2,Math.min(roomW,roomH)*.045);
    ctx.save();
    ctx.fillStyle="#fff";
    ctx.fillRect(rect.left+inset,rect.top+inset,Math.max(1,roomW-inset*2),Math.max(1,roomH-inset*2));
    ctx.translate(x,y);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
    return true;
  }
  const base=window.FenixMaze;if(!base?.render)return;
  const fixed={...base,continuousScaleVersion:VERSION,render(page,opts={}){
    const result=base.render(page,opts);
    if(opts.solution||!result?.canvas||!Array.isArray(result.assetRoomRects))return result;
    const settings=settingsOf(page),images=opts.assetImages||{},ctx=result.canvas.getContext("2d");
    for(const role of ["start","goal","checkpoint","hazard"]){
      const ref=refForRole(settings,role),image=images?.[ref],pct=scaleForRole(settings,role);
      if(!ref||!image)continue;
      for(const rect of result.assetRoomRects.filter(item=>item.role===role))drawContinuous(ctx,image,rect,pct,role);
    }
    return{...result,continuousScaleVersion:VERSION};
  }};
  window.FenixMaze=Object.freeze(fixed);
  window.FenixMazeContinuousScale=Object.freeze({version:VERSION,scaleForRole,baseUnitsForRole});
})();

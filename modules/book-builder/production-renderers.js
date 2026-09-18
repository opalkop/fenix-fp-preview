"use strict";
window.FenixBookProductionRenderers=(()=>{
  const SUPPORTED=new Set(["math-studio","matching-studio","dot-to-dot-studio"]);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const seeded=seed=>{let x=0;for(const c of String(seed||"fenix"))x=(x*31+c.charCodeAt(0))>>>0;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)};
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Nie udało się wczytać obrazu zapisanej strony."));img.src=src});
  const makeCanvas=scale=>{const c=document.createElement("canvas");c.width=850*scale;c.height=1100*scale;const ctx=c.getContext("2d");if(scale!==1)ctx.scale(scale,scale);return c};
  const previewCanvas=raw=>{if(raw.width===850&&raw.height===1100)return raw;const c=document.createElement("canvas");c.width=850;c.height=1100;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);ctx.drawImage(raw,0,0,850,1100);return c};
  const projectAssets=()=>FenixCore.listAssets?.()||[];
  function assetFromIdentity(content={}){
    const assets=projectAssets(),ref=content.assetRef||content.lockedAssetRef||null;
    if(ref){const exact=FenixCore.getAsset(ref)||assets.find(asset=>asset.id===ref);if(exact?.dataUrl)return exact}
    const filename=content.assetFilename||null,name=content.assetName||null;
    if(filename){const matches=assets.filter(asset=>String(asset.filename||"")===String(filename));if(matches.length===1&&matches[0].dataUrl)return matches[0]}
    if(name){const matches=assets.filter(asset=>String(asset.name||"")===String(name));if(matches.length===1&&matches[0].dataUrl)return matches[0]}
    return null;
  }

  async function drawDeco(ctx,d){
    if(!d?.enabled||!d.assetId)return;
    const asset=FenixCore.getAsset(d.assetId)||FenixCore.getActiveProject()?.assets?.[d.assetId];
    if(!asset?.dataUrl)return;
    const img=await loadImage(asset.dataUrl),max=115*(Number(d.scale)||.8),ratio=(img.naturalWidth||1)/(img.naturalHeight||1);
    let w=max,h=max;if(ratio>1)h=w/ratio;else w=h*ratio;
    const pos={"top-left":[70,175],"top-right":[780-w,175],"bottom-left":[70,1015-h],"bottom-right":[780-w,1015-h]}[d.position]||[780-w,175];
    ctx.save();ctx.globalAlpha=Math.max(.15,Math.min(1,Number(d.opacity)||.8));ctx.drawImage(img,pos[0],pos[1],w,h);ctx.restore();
  }

  async function math(page,solution,quality){
    const s=page?.recipe?.settings||page?.settings||{},scale=quality==="print"?3:1,c=makeCanvas(scale),ctx=c.getContext("2d"),r=seeded(s.seed||page?.recipe?.seed||page?.seed||"fenix-math");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);ctx.strokeStyle="#111827";ctx.lineWidth=3;ctx.strokeRect(40,40,770,1020);ctx.fillStyle="#111827";ctx.textAlign="center";ctx.font="700 40px Arial";ctx.fillText(solution?"Solution":(s.title||page?.title||"Math Practice"),425,105);ctx.font="20px Arial";ctx.fillText(solution?"Correct answers.":(s.instructions||"Solve the addition problems."),425,145);ctx.textAlign="left";ctx.font="700 34px Arial";
    const n=Math.max(6,Math.min(12,Number(s.count)||12)),max=Math.max(5,Number(s.range)||20);
    for(let i=0;i<n;i++){
      let a=1+Math.floor(r()*Math.max(2,max/2)),b=1+Math.floor(r()*Math.max(2,max/2));
      if(s.difficulty==="easy"){a=Math.min(a,10);b=Math.min(b,10)}
      const x=115+(i%2)*385,y=250+Math.floor(i/2)*120;
      ctx.fillText(solution?`${a} + ${b} = ${a+b}`:`${a} + ${b} = ______`,x,y);
    }
    if(!solution)await drawDeco(ctx,s.deco);
    return c;
  }

  function matchingAssets(page){
    const content=page?.recipe?.content||{},refs=Array.isArray(content.assetRefs)?content.assetRefs:[],out=[];
    for(const id of refs){const a=FenixCore.getAsset(id)||FenixCore.getActiveProject()?.assets?.[id];if(a)out.push(a)}
    if(out.length)return out;
    for(const ident of content.assetIdentities||[]){
      const assets=FenixCore.listAssets?.()||[];let a=assets.find(x=>x.id===ident.id);
      if(!a&&ident.filename)a=assets.find(x=>String(x.filename||"")===String(ident.filename));
      if(!a&&ident.name)a=assets.find(x=>String(x.name||"")===String(ident.name));
      if(a&&!out.some(x=>x.id===a.id))out.push(a);
    }
    return out;
  }

  function matchingPairs(page){
    const o=page?.recipe?.settings||{},content=page?.recipe?.content||{},n=clamp(Number(o.pairCount)||5,1,8),assets=matchingAssets(page).slice(0,n),mode=o.mode||"alphabet";
    if(mode==="alphabet")return [...Array(n)].map((_,i)=>({left:{kind:"text",text:String.fromCharCode(65+i)},right:{kind:"text",text:String.fromCharCode(97+i)}}));
    if(mode==="number-quantity")return [...Array(n)].map((_,i)=>({left:{kind:"text",text:String(i+1)},right:{kind:"quantity",value:i+1}}));
    if(mode==="manual")return (content.manual||[]).slice(0,n).map(p=>({left:{kind:"text",text:p.left},right:{kind:"text",text:p.right}}));
    if(mode==="shadow"){
      const side=o.shadowSide==="random"?(()=>{let h=0;for(const c of String(o.seed||"fenix"))h=(h*31+c.charCodeAt(0))>>>0;return h%2?"left":"right"})():o.shadowSide;
      return assets.map(a=>{const original={kind:"image",dataUrl:a.dataUrl},silhouette={kind:"image",dataUrl:a.dataUrl,variant:"shadow"};return side==="right"?{left:silhouette,right:original}:{left:original,right:silhouette}});
    }
    return assets.map(a=>{const img={kind:"image",dataUrl:a.dataUrl};return mode==="word-image"?{left:{kind:"text",text:a.name||a.filename||"Asset"},right:img}:{left:img,right:{...img}}});
  }

  async function matching(page,solution,quality){
    if(!window.FenixMatchingCore)throw new Error("Brak silnika Matching w Book Builderze.");
    const o={...(page?.recipe?.settings||{})},pairs=matchingPairs(page);
    if(!pairs.length)throw new Error(`Strona Matching „${page?.title||"bez tytułu"}” nie ma zapisanych par.`);
    const raw=await FenixMatchingCore.render(pairs,o,solution);
    return quality==="preview"?previewCanvas(raw):raw;
  }

  async function dotReference(canvas,asset,o){
    if(o.referenceEnabled!=="yes")return;
    const ctx=canvas.getContext("2d"),img=await loadImage(asset.dataUrl),box=Math.round(canvas.width*(clamp(Number(o.referenceSize)||18,10,35)/100)),pad=26,margin=110,top=500,bottom=canvas.height-box-margin,left=margin,right=canvas.width-box-margin,pos={"top-right":[right,top],"top-left":[left,top],"bottom-right":[right,bottom],"bottom-left":[left,bottom]}[o.referenceCorner]||[right,top],bx=pos[0],by=pos[1];
    ctx.save();ctx.fillStyle="rgba(255,255,255,.96)";ctx.strokeStyle="#cbd5df";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(bx,by,box,box,24);ctx.fill();ctx.stroke();ctx.fillStyle="#647383";ctx.font="700 26px Arial";ctx.textAlign="center";ctx.fillText("LOOK!",bx+box/2,by+34);
    const iw=img.naturalWidth||1,ih=img.naturalHeight||1,fit=Math.min((box-pad*2)/iw,(box-pad*2-28)/ih),dw=iw*fit,dh=ih*fit,dx=bx+(box-dw)/2,dy=by+46+(box-46-dh)/2;
    if(o.referenceStyle==="original"){ctx.globalAlpha=.95;ctx.drawImage(img,dx,dy,dw,dh)}
    else if(o.referenceStyle==="dots"){ctx.globalAlpha=.28;ctx.drawImage(img,dx,dy,dw,dh);ctx.globalAlpha=1;ctx.fillStyle="#111";for(let i=0;i<12;i++){const px=dx+dw*(.15+.7*((i%4)/3)),py=dy+dh*(.16+.68*(Math.floor(i/4)/2));ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill()}}
    else{ctx.globalAlpha=.72;ctx.filter="grayscale(1) contrast(1.8)";ctx.drawImage(img,dx,dy,dw,dh);ctx.filter="none"}
    ctx.restore();
  }

  async function dotToDot(page,solution,quality){
    if(solution)return null;
    if(!window.FenixDotCore)throw new Error("Brak silnika Dot to Dot w Book Builderze.");
    const content=page?.recipe?.content||{},asset=assetFromIdentity(content);
    if(!asset)throw new Error(`Nie znaleziono przypisanego assetu Dot to Dot dla „${page?.title||"bez tytułu"}”.`);
    const options={...(page?.recipe?.settings||{})},raw=await window.FenixDotCore.render(asset,options);
    await dotReference(raw,asset,options);
    return quality==="preview"?previewCanvas(raw):raw;
  }

  async function render(page,{solution=false,quality="preview"}={}){
    const module=page?.module||page?.recipe?.module;
    if(module==="math-studio")return math(page,solution,quality);
    if(module==="matching-studio")return matching(page,solution,quality);
    if(module==="dot-to-dot-studio")return dotToDot(page,solution,quality);
    return null;
  }

  return Object.freeze({supports:module=>SUPPORTED.has(module),render});
})();

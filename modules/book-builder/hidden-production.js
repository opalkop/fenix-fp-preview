"use strict";
(()=>{
  const base=window.FenixBookProductionRenderers;
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Nie udało się wczytać assetu Hidden Objects."));img.src=src});
  const assetById=id=>FenixCore.getAsset(id)||FenixCore.getActiveProject()?.assets?.[id]||null;
  function seeded(seed){let h=2166136261;for(const c of String(seed||"fenix-hidden"))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>((h=Math.imul(h^h>>>15,2246822507)^Math.imul(h^h>>>13,3266489909))>>>0)/4294967296}
  function intersects(a,b,pad=12){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y)}
  async function renderHidden(page,{solution=false,quality="preview"}={}){
    const s=page?.recipe?.settings||{},content=page?.recipe?.content||{},targets=(content.targets||[]).map(item=>({item,asset:assetById(item.assetRef)})).filter(x=>x.asset?.dataUrl),distractors=(content.distractors||[]).map(item=>assetById(item.assetRef)).filter(a=>a?.dataUrl);
    if(!targets.length||!distractors.length)return null;
    const rand=seeded(s.seed||page?.recipe?.seed||"fenix-hidden"),distCount=s.density==="easy"?12:s.density==="hard"?32:22,items=[];
    for(const t of targets)for(let i=0;i<Math.max(1,Math.min(12,Number(t.item.count)||3));i++)items.push({asset:t.asset,target:true});
    for(let i=0;i<distCount;i++)items.push({asset:distractors[i%distractors.length],target:false});
    items.sort(()=>rand()-.5);
    const placed=[];
    for(const item of items){let ok=null;for(let t=0;t<500;t++){const scale=((Number(s.minSize)||70)+((Number(s.maxSize)||110)-(Number(s.minSize)||70))*rand())/100,w=105*scale,h=105*scale,x=70+rand()*(710-w),y=300+rand()*(700-h),box={...item,x,y,w,h,rot:(s.rotate||"yes")==="yes"?(rand()-.5)*.5:0};if(!placed.some(p=>intersects(box,p,8))){ok=box;break}}if(ok)placed.push(ok)}
    const unique=new Map();for(const p of placed)unique.set(p.asset.id,p.asset);for(const t of targets)unique.set(t.asset.id,t.asset);
    const images=new Map();await Promise.all([...unique.values()].map(async a=>images.set(a.id,await loadImage(a.dataUrl))));
    const scale=quality==="print"?3:1,canvas=document.createElement("canvas");canvas.width=850*scale;canvas.height=1100*scale;const ctx=canvas.getContext("2d");if(scale!==1)ctx.scale(scale,scale);
    ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);ctx.fillStyle="#111";ctx.textAlign="center";ctx.font=`800 ${Number(s.titleSize)||48}px Arial`;ctx.fillText(s.title||page?.title||"Find the Hidden Objects!",425,85);ctx.font=`500 ${Number(s.instructionSize)||24}px Arial`;ctx.fillText(s.instructions||"Find all the objects shown below.",425,135);
    let tx=90;for(const t of targets){const im=images.get(t.asset.id),count=Math.max(1,Math.min(12,Number(t.item.count)||3));ctx.drawImage(im,tx,170,58,58);ctx.font="700 22px Arial";ctx.textAlign="left";ctx.fillText(`× ${count}`,tx+62,205);tx+=145}
    for(const p of placed){const im=images.get(p.asset.id);ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot);ctx.drawImage(im,-p.w/2,-p.h/2,p.w,p.h);ctx.restore();if(solution&&p.target){ctx.strokeStyle="#111";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w*.62,p.h*.62,0,0,Math.PI*2);ctx.stroke()}}
    return canvas;
  }
  window.FenixBookProductionRenderers=Object.freeze({
    supports(module){return module==="hidden-objects-studio"||!!base?.supports?.(module)},
    render(page,opts={}){const module=page?.module||page?.recipe?.module;return module==="hidden-objects-studio"?renderHidden(page,opts):base?.render?.(page,opts)??null}
  });
})();
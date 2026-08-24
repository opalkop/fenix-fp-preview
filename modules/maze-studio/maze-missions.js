"use strict";

(()=>{
  const core=window.FenixCore,maze=window.FenixMaze;
  if(!core||!maze)return;

  const $=id=>document.getElementById(id);
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback))};
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  const random=seed=>{let s=Number(seed)||1;return()=>{let t=s+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};

  function ensureUi(){
    const grid=document.querySelector(".asset-maze-grid");
    if(!grid||$("checkpointAsset"))return;
    const deco=grid.querySelector(".asset-role-card-wide");
    const wrap=document.createElement("div");
    wrap.style.display="contents";
    wrap.innerHTML=`
      <div class="asset-role-card mission-role-card">
        <div><strong>CHECKPOINT</strong><span>Punkt pośredni umieszczany na poprawnej trasie START → META.</span></div>
        <label>Asset<select id="checkpointAsset"></select></label>
        <div class="form-grid compact">
          <label>Liczba<input id="checkpointCount" type="number" min="0" max="5" value="0"></label>
          <label>Skala (%)<input id="checkpointScale" type="number" min="40" max="160" value="80"></label>
        </div>
      </div>
      <div class="asset-role-card mission-role-card">
        <div><strong>ZAGROŻENIA</strong><span>Przeszkody umieszczane poza prawidłową trasą, preferencyjnie w ślepych odnogach.</span></div>
        <label>Asset<select id="hazardAsset"></select></label>
        <div class="form-grid compact">
          <label>Liczba<input id="hazardCount" type="number" min="0" max="8" value="0"></label>
          <label>Skala (%)<input id="hazardScale" type="number" min="40" max="160" value="78"></label>
        </div>
      </div>`;
    const nodes=[...wrap.children];
    nodes.forEach(node=>grid.insertBefore(node,deco||null));
    populateMissionAssets();
    bindUi();
    setTimeout(syncUiFromSelectedPage,0);
  }

  function assetLabel(asset){const mark=asset.validation?.status==="ok"?"✓":asset.validation?.status==="error"?"×":"!";return `${mark} ${asset.name}`}
  function setOptions(select,assets,selected){if(!select)return;const current=selected??select.value??"";select.innerHTML='<option value="">Bez assetu</option>'+assets.map(asset=>`<option value="${esc(asset.id)}">${esc(assetLabel(asset))}</option>`).join("");select.value=assets.some(asset=>asset.id===current)?current:""}
  function missionAssets(){return core.findAssets?.({tag:"gameplay"})||[]}
  function populateMissionAssets(){
    const assets=missionAssets();
    setOptions($("checkpointAsset"),assets,$("checkpointAsset")?.value);
    setOptions($("hazardAsset"),assets,$("hazardAsset")?.value);
  }

  function domSettings(){return{
    checkpointAssetRef:$("checkpointAsset")?.value||null,
    checkpointCount:clamp($("checkpointCount")?.value,0,5,0),
    checkpointScale:clamp($("checkpointScale")?.value,40,160,80),
    hazardAssetRef:$("hazardAsset")?.value||null,
    hazardCount:clamp($("hazardCount")?.value,0,8,0),
    hazardScale:clamp($("hazardScale")?.value,40,160,78)
  }}

  function storedSettings(page){return page?.recipe?.settings||page?.settings||{}}
  function missionSettings(page){
    const stored=storedSettings(page);
    const hasStored=["checkpointAssetRef","checkpointCount","checkpointScale","hazardAssetRef","hazardCount","hazardScale"].some(key=>stored[key]!==undefined);
    return hasStored?{
      checkpointAssetRef:stored.checkpointAssetRef||null,
      checkpointCount:clamp(stored.checkpointCount,0,5,0),
      checkpointScale:clamp(stored.checkpointScale,40,160,80),
      hazardAssetRef:stored.hazardAssetRef||null,
      hazardCount:clamp(stored.hazardCount,0,8,0),
      hazardScale:clamp(stored.hazardScale,40,160,78)
    }:domSettings()
  }

  function injectMissionSettings(page){
    if(!page||page.module!=="maze-studio")return page;
    const next=clone(page);
    next.recipe=next.recipe||{};
    next.recipe.settings={...(next.recipe.settings||{}),...domSettings()};
    return next;
  }

  const originalAdd=core.addPage?.bind(core);
  if(originalAdd)core.addPage=page=>originalAdd(injectMissionSettings(page));
  const originalUpdate=core.updatePage?.bind(core);
  if(originalUpdate)core.updatePage=(id,page)=>originalUpdate(id,injectMissionSettings(page));

  function selectedMazePage(){const id=$("pageSelect")?.value;if(!id)return null;return (core.getCart?.()||[]).find(page=>page.id===id&&page.module==="maze-studio")||null}
  function syncUiFromSelectedPage(){
    if(!$("checkpointAsset"))return;
    const page=selectedMazePage(),s=page?missionSettings(page):{checkpointAssetRef:null,checkpointCount:0,checkpointScale:80,hazardAssetRef:null,hazardCount:0,hazardScale:78};
    populateMissionAssets();
    $("checkpointAsset").value=s.checkpointAssetRef&&[...$("checkpointAsset").options].some(o=>o.value===s.checkpointAssetRef)?s.checkpointAssetRef:"";
    $("checkpointCount").value=String(s.checkpointCount);
    $("checkpointScale").value=String(s.checkpointScale);
    $("hazardAsset").value=s.hazardAssetRef&&[...$("hazardAsset").options].some(o=>o.value===s.hazardAssetRef)?s.hazardAssetRef:"";
    $("hazardCount").value=String(s.hazardCount);
    $("hazardScale").value=String(s.hazardScale);
  }

  function requestDraw(){const trigger=$("startAssetScale");if(trigger)trigger.dispatchEvent(new Event("input",{bubbles:true}))}
  function bindUi(){
    ["checkpointAsset","checkpointCount","checkpointScale","hazardAsset","hazardCount","hazardScale"].forEach(id=>$(id)?.addEventListener("input",requestDraw));
    $("pageSelect")?.addEventListener("change",()=>setTimeout(syncUiFromSelectedPage,0));
  }

  window.addEventListener("fenix-state-change",event=>{
    if(event.detail?.assets){populateMissionAssets();requestDraw()}
    if(event.detail?.cart||event.detail?.activeProject)setTimeout(syncUiFromSelectedPage,0);
  });

  function boundaryPoints(cols,rows){const points=[];for(let x=0;x<cols;x++)points.push({x,y:0,wall:0,side:"top"},{x,y:rows-1,wall:2,side:"bottom"});for(let y=0;y<rows;y++)points.push({x:0,y,wall:3,side:"left"},{x:cols-1,y,wall:1,side:"right"});return points}
  function sidePoint(side,cols,rows,index=.5){if(side==="left")return{x:0,y:Math.round((rows-1)*index),wall:3,side};if(side==="right")return{x:cols-1,y:Math.round((rows-1)*index),wall:1,side};if(side==="top")return{x:Math.round((cols-1)*index),y:0,wall:0,side};return{x:Math.round((cols-1)*index),y:rows-1,wall:2,side:"bottom"}}
  function chooseEndpoints(cols,rows,seed){const r=random((Number(seed)^0x9E3779B9)>>>0),points=boundaryPoints(cols,rows),start=points[Math.floor(r()*points.length)];let candidates=points.filter(point=>point.side!==start.side&&Math.abs(point.x-start.x)+Math.abs(point.y-start.y)>=Math.floor((cols+rows)/3));if(!candidates.length)candidates=points.filter(point=>point.side!==start.side);return{start,end:candidates[Math.floor(r()*candidates.length)]}}
  function endpointsForMode(mode,cols,rows,seed){const r=random((Number(seed)^0x51F15EED)>>>0),a=.18+r()*.64,b=.18+r()*.64;if(mode==="left-right")return{start:sidePoint("left",cols,rows,a),end:sidePoint("right",cols,rows,b)};if(mode==="top-bottom")return{start:sidePoint("top",cols,rows,a),end:sidePoint("bottom",cols,rows,b)};if(mode==="corners"){const pairs=[["top",.08,"bottom",.92],["left",.08,"right",.92],["top",.92,"bottom",.08],["left",.92,"right",.08]],p=pairs[Math.floor(r()*pairs.length)];return{start:sidePoint(p[0],cols,rows,p[1]),end:sidePoint(p[2],cols,rows,p[3])}}return chooseEndpoints(cols,rows,seed)}
  function build(cols,rows,seed,endpoints){const r=random(seed),cells=Array.from({length:rows},()=>Array.from({length:cols},()=>({v:false,w:[true,true,true,true]}))),ep=endpoints?.start&&endpoints?.end?clone(endpoints):chooseEndpoints(cols,rows,seed),stack=[[ep.start.x,ep.start.y]],dirs=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]];cells[ep.start.y][ep.start.x].v=true;while(stack.length){const[x,y]=stack[stack.length-1],choices=[];for(const[dx,dy,w,o]of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&!cells[ny][nx].v)choices.push([nx,ny,w,o])}if(!choices.length){stack.pop();continue}const[nx,ny,w,o]=choices[Math.floor(r()*choices.length)];cells[y][x].w[w]=false;cells[ny][nx].w[o]=false;cells[ny][nx].v=true;stack.push([nx,ny])}cells[ep.start.y][ep.start.x].w[ep.start.wall]=false;cells[ep.end.y][ep.end.x].w[ep.end.wall]=false;return{cols,rows,cells,start:ep.start,end:ep.end}}
  function solve(m){const q=[[m.start.x,m.start.y]],seen=new Set([`${m.start.x},${m.start.y}`]),prev=new Map(),dirs=[[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]];while(q.length){const[x,y]=q.shift();if(x===m.end.x&&y===m.end.y)break;for(const[dx,dy,w]of dirs){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(nx>=0&&ny>=0&&nx<m.cols&&ny<m.rows&&!m.cells[y][x].w[w]&&!seen.has(key)){seen.add(key);prev.set(key,[x,y]);q.push([nx,ny])}}}const path=[];let cur=[m.end.x,m.end.y];while(cur){path.push(cur);if(cur[0]===m.start.x&&cur[1]===m.start.y)break;cur=prev.get(`${cur[0]},${cur[1]}`)}return path.reverse()}
  function shuffle(items,r){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function missionCells(m,path,seed,s){
    const pathSet=new Set(path.map(([x,y])=>`${x},${y}`));
    const checkpointCount=s.checkpointAssetRef?Math.min(s.checkpointCount,Math.max(0,path.length-2)):0;
    const inner=path.length>6?path.slice(2,-2):path.slice(1,-1),checkpoints=[];
    for(let i=0;i<checkpointCount&&inner.length;i++){const index=Math.min(inner.length-1,Math.max(0,Math.round((i+1)*inner.length/(checkpointCount+1))));const cell=inner[index];if(cell&&!checkpoints.some(p=>p[0]===cell[0]&&p[1]===cell[1]))checkpoints.push(cell)}
    const all=[];for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++){if(pathSet.has(`${x},${y}`))continue;const degree=m.cells[y][x].w.reduce((n,wall)=>n+(wall?0:1),0);all.push({x,y,degree})}
    const r=random((Number(seed)^0xC0FFEE)>>>0),dead=shuffle(all.filter(c=>c.degree<=1),r),other=shuffle(all.filter(c=>c.degree>1),r),hazardCount=s.hazardAssetRef?Math.min(s.hazardCount,all.length):0,hazards=[...dead,...other].slice(0,hazardCount).map(c=>[c.x,c.y]);
    return{checkpoints,hazards}
  }
  function pageGeometry(page,opts){const s=page?.recipe?.settings||page?.settings||{},width=opts.canvas?.width||opts.width||850,height=opts.canvas?.height||opts.height||1100,cols=Math.max(6,Number(s.cols)||18),rows=Math.max(8,Number(s.rows)||24),scale=width/900,side=(opts.solutionKey?45:Number(s.sideMargin)||80)*scale,top=(opts.solutionKey?45:Number(s.topMargin)||170)*scale,bottom=(opts.solutionKey?45:Number(s.bottomMargin)||90)*scale,areaW=width-side*2,areaH=height-top-bottom,cell=Math.min(areaW/cols,areaH/rows)*(Number(s.mazeScale||100)/100),mw=cell*cols,mh=cell*rows,sx=(width-mw)/2,sy=top+(areaH-mh)/2;return{width,height,cols,rows,cell,sx,sy}}
  function drawImage(ctx,image,x,y,maxSize,scalePct){if(!image)return false;const iw=image.naturalWidth||image.width||1,ih=image.naturalHeight||image.height||1,base=maxSize*(scalePct/100),ratio=Math.min(base/iw,base/ih),w=iw*ratio,h=ih*ratio;ctx.drawImage(image,x-w/2,y-h/2,w,h);return true}
  function drawFallback(ctx,x,y,cell,type){ctx.save();ctx.fillStyle="#fff";ctx.strokeStyle="#111827";ctx.lineWidth=Math.max(2,cell*.05);if(type==="checkpoint"){ctx.beginPath();ctx.arc(x,y,cell*.27,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#111827";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`700 ${Math.round(cell*.35)}px Arial`;ctx.fillText("C",x,y)}else{ctx.beginPath();ctx.moveTo(x,y-cell*.31);ctx.lineTo(x+cell*.3,y+cell*.25);ctx.lineTo(x-cell*.3,y+cell*.25);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#111827";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`700 ${Math.round(cell*.35)}px Arial`;ctx.fillText("!",x,y+cell*.06)}ctx.restore()}

  const originalPrepare=maze.prepareAssets.bind(maze);
  maze.prepareAssets=async page=>{
    const images=await originalPrepare(page),s=missionSettings(page),refs=[s.checkpointAssetRef,s.hazardAssetRef].filter(Boolean);
    await Promise.all(refs.map(async id=>{if(images[id])return;const asset=core.getAsset?.(id);if(!asset?.dataUrl)return;images[id]=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=asset.dataUrl})}));
    return images;
  };

  const originalRender=maze.render.bind(maze);
  maze.render=(page,opts={})=>{
    const result=originalRender(page,opts),canvas=opts.canvas||result?.canvas;
    if(!canvas)return result;
    const s0=page?.recipe?.settings||page?.settings||{},s=missionSettings(page),seed=Number(page?.recipe?.seed??page?.seed??1)||1,g=pageGeometry(page,{...opts,canvas}),saved=s0.endpoints||page?.recipe?.meta?.renderState?.endpoints,ep=saved?.start&&saved?.end?saved:endpointsForMode(s0.endpointMode||"random",g.cols,g.rows,seed),m=build(g.cols,g.rows,seed,ep),path=solve(m),mission=missionCells(m,path,seed,s),ctx=canvas.getContext("2d"),images=opts.assetImages||{};
    const cpImage=images[s.checkpointAssetRef],hzImage=images[s.hazardAssetRef];
    for(const[x,y]of mission.checkpoints){const px=g.sx+(x+.5)*g.cell,py=g.sy+(y+.5)*g.cell;if(!drawImage(ctx,cpImage,px,py,g.cell*.72,s.checkpointScale))drawFallback(ctx,px,py,g.cell,"checkpoint")}
    for(const[x,y]of mission.hazards){const px=g.sx+(x+.5)*g.cell,py=g.sy+(y+.5)*g.cell;if(!drawImage(ctx,hzImage,px,py,g.cell*.68,s.hazardScale))drawFallback(ctx,px,py,g.cell,"hazard")}
    setTimeout(()=>{const status=$("status");if(status&&document.body?.dataset?.module==="maze-studio"&&!status.textContent.includes("checkpoint"))status.textContent+=` · checkpoint ${mission.checkpoints.length} · zagrożenia ${mission.hazards.length}`},0);
    return result&&typeof result==="object"?{...result,checkpoints:mission.checkpoints,hazards:mission.hazards}:result;
  };

  ensureUi();
})();

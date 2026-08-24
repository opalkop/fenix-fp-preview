"use strict";
(()=>{
  const core=typeof FenixCore!=="undefined"?FenixCore:null;
  const maze=window.FenixMaze;
  if(!core||!maze)return;
  const $=id=>document.getElementById(id);
  const clone=v=>v==null?v:typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
  const clamp=(v,min,max,fb)=>{const n=Number(v);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fb))};
  const esc=v=>String(v??"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));
  const random=seed=>{let s=Number(seed)||1;return()=>{let t=s+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};

  function ui(){return{
    checkpointAssetRef:$('checkpointAsset')?.value||null,
    checkpointCount:clamp($('checkpointCount')?.value,0,5,0),
    checkpointScale:clamp($('checkpointScale')?.value,40,160,80),
    hazardAssetRef:$('hazardAsset')?.value||null,
    hazardCount:clamp($('hazardCount')?.value,0,8,0),
    hazardScale:clamp($('hazardScale')?.value,40,160,78)
  }}
  function saved(page){const s=page?.recipe?.settings||page?.settings||{};const u=ui();return{
    checkpointAssetRef:s.checkpointAssetRef??u.checkpointAssetRef,
    checkpointCount:clamp(s.checkpointCount,0,5,u.checkpointCount),
    checkpointScale:clamp(s.checkpointScale,40,160,u.checkpointScale),
    hazardAssetRef:s.hazardAssetRef??u.hazardAssetRef,
    hazardCount:clamp(s.hazardCount,0,8,u.hazardCount),
    hazardScale:clamp(s.hazardScale,40,160,u.hazardScale)
  }}
  function gameplay(){return core.findAssets?.({tag:"gameplay"})||[]}
  function fillSelect(el,selected){if(!el)return;const items=gameplay();el.innerHTML='<option value="">Bez assetu</option>'+items.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');el.value=items.some(a=>a.id===selected)?selected:''}
  function selectedPage(){const id=$('pageSelect')?.value;return id?(core.getCart?.()||[]).find(p=>p.id===id&&p.module==="maze-studio")||null:null}
  function syncControls(){const page=selectedPage(),s=page?saved(page):{checkpointAssetRef:null,checkpointCount:0,checkpointScale:80,hazardAssetRef:null,hazardCount:0,hazardScale:78};fillSelect($('checkpointAsset'),s.checkpointAssetRef);fillSelect($('hazardAsset'),s.hazardAssetRef);if($('checkpointCount'))$('checkpointCount').value=s.checkpointCount;if($('checkpointScale'))$('checkpointScale').value=s.checkpointScale;if($('hazardCount'))$('hazardCount').value=s.hazardCount;if($('hazardScale'))$('hazardScale').value=s.hazardScale}
  function inject(page){if(!page||page.module!=="maze-studio")return page;const n=clone(page);n.settings={...(n.settings||{}),...ui()};n.recipe=n.recipe||{};n.recipe.settings={...(n.recipe.settings||n.settings||{}),...ui()};return n}

  const originalAdd=core.addPage?.bind(core);if(originalAdd)core.addPage=page=>originalAdd(inject(page));
  const originalUpdate=core.updatePage?.bind(core);if(originalUpdate)core.updatePage=(id,page)=>originalUpdate(id,inject(page));

  function redraw(){const trigger=$('startAssetScale');if(trigger)trigger.dispatchEvent(new Event('input',{bubbles:true}))}
  ['checkpointAsset','checkpointCount','checkpointScale','hazardAsset','hazardCount','hazardScale'].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener('input',redraw);el.addEventListener('change',redraw)});
  $('pageSelect')?.addEventListener('change',()=>setTimeout(syncControls,0));
  window.addEventListener('fenix-state-change',e=>{if(e.detail?.assets)syncControls();if(e.detail?.cart||e.detail?.activeProject)setTimeout(syncControls,0)});

  function sidePoint(side,cols,rows,i=.5){if(side==='left')return{x:0,y:Math.round((rows-1)*i),wall:3,side};if(side==='right')return{x:cols-1,y:Math.round((rows-1)*i),wall:1,side};if(side==='top')return{x:Math.round((cols-1)*i),y:0,wall:0,side};return{x:Math.round((cols-1)*i),y:rows-1,wall:2,side:'bottom'}}
  function boundaryPoints(cols,rows){const p=[];for(let x=0;x<cols;x++)p.push({x,y:0,wall:0,side:'top'},{x,y:rows-1,wall:2,side:'bottom'});for(let y=0;y<rows;y++)p.push({x:0,y,wall:3,side:'left'},{x:cols-1,y,wall:1,side:'right'});return p}
  function endpoints(mode,cols,rows,seed){const r=random((Number(seed)^0x51F15EED)>>>0),a=.18+r()*.64,b=.18+r()*.64;if(mode==='left-right')return{start:sidePoint('left',cols,rows,a),end:sidePoint('right',cols,rows,b)};if(mode==='top-bottom')return{start:sidePoint('top',cols,rows,a),end:sidePoint('bottom',cols,rows,b)};if(mode==='corners'){const pairs=[['top',.08,'bottom',.92],['left',.08,'right',.92],['top',.92,'bottom',.08],['left',.92,'right',.08]],p=pairs[Math.floor(r()*pairs.length)];return{start:sidePoint(p[0],cols,rows,p[1]),end:sidePoint(p[2],cols,rows,p[3])}}const pts=boundaryPoints(cols,rows),start=pts[Math.floor(r()*pts.length)],others=pts.filter(q=>q.side!==start.side);return{start,end:others[Math.floor(r()*others.length)]}}
  function build(cols,rows,seed,ep){const r=random(seed),cells=Array.from({length:rows},()=>Array.from({length:cols},()=>({v:false,w:[true,true,true,true]}))),stack=[[ep.start.x,ep.start.y]],dirs=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]];cells[ep.start.y][ep.start.x].v=true;while(stack.length){const[x,y]=stack[stack.length-1],choices=[];for(const[dx,dy,w,o]of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&!cells[ny][nx].v)choices.push([nx,ny,w,o])}if(!choices.length){stack.pop();continue}const[nx,ny,w,o]=choices[Math.floor(r()*choices.length)];cells[y][x].w[w]=false;cells[ny][nx].w[o]=false;cells[ny][nx].v=true;stack.push([nx,ny])}return{cols,rows,cells,start:ep.start,end:ep.end}}
  function solve(m){const q=[[m.start.x,m.start.y]],seen=new Set([`${m.start.x},${m.start.y}`]),prev=new Map(),dirs=[[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]];while(q.length){const[x,y]=q.shift();if(x===m.end.x&&y===m.end.y)break;for(const[dx,dy,w]of dirs){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx>=0&&ny>=0&&nx<m.cols&&ny<m.rows&&!m.cells[y][x].w[w]&&!seen.has(k)){seen.add(k);prev.set(k,[x,y]);q.push([nx,ny])}}}const path=[];let cur=[m.end.x,m.end.y];while(cur){path.push(cur);if(cur[0]===m.start.x&&cur[1]===m.start.y)break;cur=prev.get(`${cur[0]},${cur[1]}`)}return path.reverse()}
  function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function missionCells(m,path,seed,s){const route=new Set(path.map(([x,y])=>`${x},${y}`)),inner=path.length>6?path.slice(2,-2):path.slice(1,-1),checkpoints=[];const cc=Math.min(s.checkpointCount,inner.length);for(let i=0;i<cc;i++){const idx=Math.min(inner.length-1,Math.max(0,Math.round((i+1)*(inner.length-1)/(cc+1))));const c=inner[idx];if(c&&!checkpoints.some(p=>p[0]===c[0]&&p[1]===c[1]))checkpoints.push(c)}const outside=[];for(let y=0;y<m.rows;y++)for(let x=0;x<m.cols;x++){if(route.has(`${x},${y}`))continue;const degree=m.cells[y][x].w.reduce((n,w)=>n+(w?0:1),0);outside.push({x,y,degree})}const r=random((Number(seed)^0xC0FFEE)>>>0),dead=shuffle(outside.filter(c=>c.degree<=1),r),rest=shuffle(outside.filter(c=>c.degree>1),r);return{checkpoints,hazards:[...dead,...rest].slice(0,Math.min(s.hazardCount,outside.length)).map(c=>[c.x,c.y])}}
  function drawImage(ctx,img,x,y,max,scale){if(!img)return false;const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,k=Math.min(max*(scale/100)/iw,max*(scale/100)/ih);ctx.drawImage(img,x-iw*k/2,y-ih*k/2,iw*k,ih*k);return true}
  function fallback(ctx,x,y,cell,type){ctx.save();ctx.fillStyle='#fff';ctx.strokeStyle='#111827';ctx.lineWidth=Math.max(2,cell*.05);ctx.beginPath();if(type==='checkpoint')ctx.arc(x,y,cell*.28,0,Math.PI*2);else{ctx.moveTo(x,y-cell*.31);ctx.lineTo(x+cell*.3,y+cell*.25);ctx.lineTo(x-cell*.3,y+cell*.25);ctx.closePath()}ctx.fill();ctx.stroke();ctx.fillStyle='#111827';ctx.font=`700 ${Math.round(cell*.34)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(type==='checkpoint'?'C':'!',x,y);ctx.restore()}

  const originalPrepare=maze.prepareAssets.bind(maze);
  maze.prepareAssets=async page=>{const images=await originalPrepare(page),s=saved(page);for(const id of [s.checkpointAssetRef,s.hazardAssetRef].filter(Boolean)){if(images[id])continue;const asset=core.getAsset?.(id);if(!asset?.dataUrl)continue;images[id]=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=asset.dataUrl})}return images};
  const originalRender=maze.render.bind(maze);
  maze.render=(page,opts={})=>{const result=originalRender(page,opts),s=saved(page);if(!opts.canvas||(!s.checkpointCount&&!s.hazardCount))return result;const canvas=opts.canvas,ctx=canvas.getContext('2d'),width=canvas.width,height=canvas.height,raw=page?.recipe?.settings||page?.settings||{},cols=Math.max(6,Number(raw.cols)||18),rows=Math.max(8,Number(raw.rows)||24),seed=Number(page?.recipe?.seed??page?.seed??1)||1,ep=result?.endpoints?.start&&result?.endpoints?.end?result.endpoints:(raw.endpoints?.start&&raw.endpoints?.end?raw.endpoints:endpoints(raw.endpointMode||'random',cols,rows,seed)),m=build(cols,rows,seed,ep),path=solve(m),spots=missionCells(m,path,seed,s),scale=width/900,side=(opts.solutionKey?45:Number(raw.sideMargin)||80)*scale,top=(opts.solutionKey?45:Number(raw.topMargin)||170)*scale,bottom=(opts.solutionKey?45:Number(raw.bottomMargin)||90)*scale,areaW=width-side*2,areaH=height-top-bottom,cell=Math.min(areaW/cols,areaH/rows)*(Number(raw.mazeScale||100)/100),mw=cell*cols,mh=cell*rows,sx=(width-mw)/2,sy=top+(areaH-mh)/2,imgs=opts.assetImages||{};for(const[x,y]of spots.checkpoints){const px=sx+(x+.5)*cell,py=sy+(y+.5)*cell;if(!drawImage(ctx,imgs[s.checkpointAssetRef],px,py,cell*.82,s.checkpointScale))fallback(ctx,px,py,cell,'checkpoint')}for(const[x,y]of spots.hazards){const px=sx+(x+.5)*cell,py=sy+(y+.5)*cell;if(!drawImage(ctx,imgs[s.hazardAssetRef],px,py,cell*.82,s.hazardScale))fallback(ctx,px,py,cell,'hazard')}return{...result,checkpoints:spots.checkpoints,hazards:spots.hazards}};

  syncControls();
})();

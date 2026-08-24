"use strict";
(()=>{
 const base=window.FenixMaze;if(!base)return;
 const clone=v=>v==null?v:typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
 const clamp=(v,a,b,f)=>{v=Number(v);return Math.max(a,Math.min(b,Number.isFinite(v)?v:f))};
 function settingsOf(page){const raw=page?.recipe?.settings||page?.settings||{},live=window.FenixMazeDifficulty?.values?.()||{};return{...raw,...live}}
 function turns(path){let n=0;for(let i=2;i<path.length;i++){const a=path[i-2],b=path[i-1],c=path[i];if((b[0]-a[0])!==(c[0]-b[0])||(b[1]-a[1])!==(c[1]-b[1]))n++}return n}
 function deadEnds(maze){let n=0;for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++){const open=maze.cells[y][x].w.reduce((a,w)=>a+(w?0:1),0);if(open===1)n++}return n}
 function neighbors(maze,x,y){return[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]].map(([dx,dy,w,o])=>({nx:x+dx,ny:y+dy,w,o})).filter(p=>p.nx>=0&&p.ny>=0&&p.nx<maze.cols&&p.ny<maze.rows)}
 function rng(seed){let s=(Number(seed)||1)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
 function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function openWall(maze,x,y,p){maze.cells[y][x].w[p.w]=false;maze.cells[p.ny][p.nx].w[p.o]=false}
 function openedMaze(source,seed,wallOpenings,deadEndPct){const maze=clone(source),r=rng((Number(seed)^0x71a5b3c9)>>>0);
  let dead=[];for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++){const open=maze.cells[y][x].w.reduce((a,w)=>a+(w?0:1),0);if(open===1)dead.push({x,y})}
  dead=shuffle(dead,r);const remove=Math.round(dead.length*(1-clamp(deadEndPct,0,100,50)/100));
  for(const d of dead.slice(0,remove)){const opts=shuffle(neighbors(maze,d.x,d.y).filter(p=>maze.cells[d.y][d.x].w[p.w]),r);if(opts[0])openWall(maze,d.x,d.y,opts[0])}
  const closed=[];for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++){for(const p of neighbors(maze,x,y)){if((p.ny<y)||(p.ny===y&&p.nx<x))continue;if(maze.cells[y][x].w[p.w])closed.push({x,y,p})}}
  const maxExtra=Math.round(closed.length*.35),count=Math.round(maxExtra*clamp(wallOpenings,0,100,15)/100);
  for(const e of shuffle(closed,r).slice(0,count))if(maze.cells[e.y][e.x].w[e.p.w])openWall(maze,e.x,e.y,e.p);
  return maze}
 function pick(page){const s=settingsOf(page),cols=Math.max(6,Number(s.cols)||18),rows=Math.max(8,Number(s.rows)||24),baseSeed=Number(page?.recipe?.seed??page?.seed??1)||1,target=clamp(s.pathTarget,10,100,50),twist=clamp(s.twistiness,0,100,50),saved=s.endpoints||page?.recipe?.meta?.renderState?.endpoints,c=[];
  for(let i=0;i<20;i++){const seed=baseSeed+i*104729,ep=saved?.start&&saved?.end?saved:base.endpointsForMode(s.endpointMode||"random",cols,rows,seed),maze=base.build(cols,rows,seed,ep),path=base.solve(maze);c.push({seed,maze,path,len:path.length,turn:turns(path)})}
  const min=Math.min(...c.map(x=>x.len)),max=Math.max(...c.map(x=>x.len));for(const x of c){x.lenPct=max===min?50:10+90*(x.len-min)/(max-min);x.turnPct=x.path.length<3?0:100*x.turn/(x.path.length-2);x.score=Math.abs(x.lenPct-target)+.55*Math.abs(x.turnPct-twist)}
  c.sort((a,b)=>a.score-b.score);const best=c[0];best.opened=openedMaze(best.maze,best.seed,s.wallOpenings,s.deadEnds);best.stats={pathCells:best.path.length,pathPct:Math.round(best.lenPct),turns:best.turn,turnPct:Math.round(best.turnPct),deadEnds:deadEnds(best.opened)};return best}
 function geom(page,canvas){const s=settingsOf(page),width=canvas.width,height=canvas.height,cols=Math.max(6,Number(s.cols)||18),rows=Math.max(8,Number(s.rows)||24),scale=width/900,solutionKey=false,side=(solutionKey?45:Number(s.sideMargin)||80)*scale,top=(solutionKey?45:Number(s.topMargin)||170)*scale,bottom=(solutionKey?45:Number(s.bottomMargin)||90)*scale,areaW=width-side*2,areaH=height-top-bottom,cell=Math.min(areaW/cols,areaH/rows)*(Number(s.mazeScale||100)/100),mw=cell*cols,mh=cell*rows;return{sx:(width-mw)/2,sy:top+(areaH-mh)/2,cell,scale,s}}
 function eraseExtraWalls(ctx,original,opened,g){ctx.save();ctx.strokeStyle="#fff";ctx.lineCap="butt";ctx.lineWidth=Math.max(4,(Number(g.s.lineWidth)||5)*g.scale+5);for(let y=0;y<original.rows;y++)for(let x=0;x<original.cols;x++){const a=original.cells[y][x].w,b=opened.cells[y][x].w,px=g.sx+x*g.cell,py=g.sy+y*g.cell;if(a[0]&&!b[0]){ctx.beginPath();ctx.moveTo(px+g.cell*.2,py);ctx.lineTo(px+g.cell*.8,py);ctx.stroke()}if(a[1]&&!b[1]){ctx.beginPath();ctx.moveTo(px+g.cell,py+g.cell*.2);ctx.lineTo(px+g.cell,py+g.cell*.8);ctx.stroke()}if(a[2]&&!b[2]){ctx.beginPath();ctx.moveTo(px+g.cell*.2,py+g.cell);ctx.lineTo(px+g.cell*.8,py+g.cell);ctx.stroke()}if(a[3]&&!b[3]){ctx.beginPath();ctx.moveTo(px,py+g.cell*.2);ctx.lineTo(px,py+g.cell*.8);ctx.stroke()}}ctx.restore()}
 function drawRoute(ctx,path,g){if(path.length<2)return;ctx.save();ctx.strokeStyle="#6b7280";ctx.lineWidth=Math.max(3,g.cell*.105);ctx.lineCap="round";ctx.lineJoin="round";ctx.setLineDash([Math.max(7,g.cell*.32),Math.max(8,g.cell*.28)]);ctx.beginPath();path.forEach(([x,y],i)=>{const px=g.sx+(x+.5)*g.cell,py=g.sy+(y+.5)*g.cell;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();ctx.restore()}
 const advanced={...base,render(page,opts={}){const choice=pick(page),p=clone(page||{}),s=settingsOf(page);p.seed=choice.seed;p.recipe=p.recipe||{};p.recipe.seed=choice.seed;p.settings={...(p.settings||{}),...s};p.recipe.settings={...(p.recipe.settings||{}),...s};const wantsSolution=!!opts.solution;const result=base.render(p,{...opts,solution:false});const canvas=result.canvas,g=geom(p,canvas);eraseExtraWalls(canvas.getContext("2d"),result.maze,choice.opened,g);if(wantsSolution)drawRoute(canvas.getContext("2d"),choice.path,g);return{...result,maze:choice.opened,difficultyStats:choice.stats,effectiveSeed:choice.seed}}};
 window.FenixMaze=Object.freeze(advanced);
})();

"use strict";
(()=>{
 const base=window.FenixMaze;if(!base)return;
 const clone=v=>v==null?v:typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
 const clamp=(v,a,b,f)=>{v=Number(v);return Math.max(a,Math.min(b,Number.isFinite(v)?v:f))};
 function settingsOf(page){const raw=page?.recipe?.settings||page?.settings||{},live=window.FenixMazeDifficulty?.values?.()||{};return{...raw,...live}}
 function turns(path){let n=0;for(let i=2;i<path.length;i++){const a=path[i-2],b=path[i-1],c=path[i];if((b[0]-a[0])!==(c[0]-b[0])||(b[1]-a[1])!==(c[1]-b[1]))n++}return n}
 function degree(maze,x,y){return maze.cells[y][x].w.reduce((n,w)=>n+(w?0:1),0)}
 function deadEnds(maze){let n=0;for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++)if(degree(maze,x,y)===1)n++;return n}
 function fourWays(maze){let n=0;for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++)if(degree(maze,x,y)>=4)n++;return n}
 function neighbors(maze,x,y){return[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]].map(([dx,dy,w,o])=>({nx:x+dx,ny:y+dy,w,o})).filter(p=>p.nx>=0&&p.ny>=0&&p.nx<maze.cols&&p.ny<maze.rows)}
 function rng(seed){let s=(Number(seed)||1)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
 function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function openWall(maze,x,y,p){maze.cells[y][x].w[p.w]=false;maze.cells[p.ny][p.nx].w[p.o]=false}
 function safeToOpen(maze,x,y,p){const a=degree(maze,x,y),b=degree(maze,p.nx,p.ny);if(a>=3||b>=3)return false;let hot=0;for(const q of neighbors(maze,x,y))if(degree(maze,q.nx,q.ny)>=3)hot++;for(const q of neighbors(maze,p.nx,p.ny))if(degree(maze,q.nx,q.ny)>=3)hot++;return hot<=2}
 function topology(source,seed,wallOpenings,deadEndPct){const maze=clone(source),r=rng((Number(seed)^0x71a5b3c9)>>>0),cells=maze.cols*maze.rows;
  const initialDead=deadEnds(maze),keepRatio=.45+.55*(clamp(deadEndPct,0,100,50)/100),targetDead=Math.max(2,Math.round(initialDead*keepRatio));
  let guard=0;while(deadEnds(maze)>targetDead&&guard++<cells*2){const dead=[];for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++)if(degree(maze,x,y)===1)dead.push({x,y});let changed=false;for(const d of shuffle(dead,r)){const opts=shuffle(neighbors(maze,d.x,d.y).filter(p=>maze.cells[d.y][d.x].w[p.w]&&safeToOpen(maze,d.x,d.y,p)),r);if(opts[0]){openWall(maze,d.x,d.y,opts[0]);changed=true;break}}if(!changed)break}
  const intensity=clamp(wallOpenings,0,100,15)/100,maxExtra=Math.max(0,Math.round(cells*(.012+.048*intensity))),candidates=[];
  for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++)for(const p of neighbors(maze,x,y)){if(p.ny<y||(p.ny===y&&p.nx<x))continue;if(maze.cells[y][x].w[p.w])candidates.push({x,y,p})}
  let opened=0;for(const e of shuffle(candidates,r)){if(opened>=maxExtra)break;if(!maze.cells[e.y][e.x].w[e.p.w]||!safeToOpen(maze,e.x,e.y,e.p))continue;openWall(maze,e.x,e.y,e.p);opened++}
  return{maze,opened,dead:deadEnds(maze),four:fourWays(maze)}
 }
 function missionCells(maze,path,seed,s){const route=new Set(path.map(([x,y])=>`${x},${y}`)),inner=path.length>6?path.slice(2,-2):path.slice(1,-1),checkpoints=[],cc=Math.max(0,Math.min(5,Number(s.checkpointCount)||0));for(let i=0;i<Math.min(cc,inner.length);i++){const idx=Math.min(inner.length-1,Math.max(0,Math.round((i+1)*(inner.length-1)/(cc+1)))),cell=inner[idx];if(cell&&!checkpoints.some(([x,y])=>x===cell[0]&&y===cell[1]))checkpoints.push(cell)}const outside=[];for(let y=0;y<maze.rows;y++)for(let x=0;x<maze.cols;x++)if(!route.has(`${x},${y}`))outside.push({x,y,d:degree(maze,x,y)});const r=rng((Number(seed)^0xc0ffee)>>>0),ordered=[...shuffle(outside.filter(c=>c.d===1),r),...shuffle(outside.filter(c=>c.d>1),r)],hc=Math.max(0,Math.min(8,Number(s.hazardCount)||0));return{checkpoints,hazards:ordered.slice(0,hc).map(c=>[c.x,c.y])}}
 function pick(page){const s=settingsOf(page),cols=Math.max(6,Number(s.cols)||18),rows=Math.max(8,Number(s.rows)||24),baseSeed=Number(page?.recipe?.seed??page?.seed??1)||1,target=clamp(s.pathTarget,10,100,50),twist=clamp(s.twistiness,0,100,50),saved=s.endpoints||page?.recipe?.meta?.renderState?.endpoints,c=[];
  for(let i=0;i<36;i++){const seed=baseSeed+i*104729,ep=saved?.start&&saved?.end?saved:base.endpointsForMode(s.endpointMode||"random",cols,rows,seed),raw=base.build(cols,rows,seed,ep),t=topology(raw,seed,s.wallOpenings,s.deadEnds),maze=t.maze,path=base.solve(maze),turn=turns(path);c.push({seed,raw,maze,path,len:path.length,turn,dead:t.dead,four:t.four,opened:t.opened})}
  const min=Math.min(...c.map(x=>x.len)),max=Math.max(...c.map(x=>x.len));for(const x of c){x.lenPct=max===min?50:10+90*(x.len-min)/(max-min);x.turnPct=x.path.length<3?0:100*x.turn/(x.path.length-2);const structuralPenalty=x.four*12+(x.path.length<Math.max(4,(cols+rows)*.35)?30:0);x.score=Math.abs(x.lenPct-target)+.55*Math.abs(x.turnPct-twist)+structuralPenalty}
  c.sort((a,b)=>a.score-b.score);const best=c[0],missions=missionCells(best.maze,best.path,best.seed,s);best.checkpoints=missions.checkpoints;best.hazards=missions.hazards;best.stats={pathCells:best.path.length,pathPct:Math.round(best.lenPct),turns:best.turn,turnPct:Math.round(best.turnPct),deadEnds:best.dead,extraOpenings:best.opened,fourWayCells:best.four};return best
 }
 const advanced={...base,render(page,opts={}){const choice=pick(page),p=clone(page||{}),s=settingsOf(page);p.seed=choice.seed;p.recipe=p.recipe||{};p.recipe.seed=choice.seed;p.settings={...(p.settings||{}),...s};p.recipe.settings={...(p.recipe.settings||{}),...s};const result=base.render(p,{...opts,solution:false});return{...result,maze:choice.maze,checkpoints:choice.checkpoints,hazards:choice.hazards,difficultyStats:choice.stats,effectiveSeed:choice.seed}}};
 window.FenixMaze=Object.freeze(advanced);
})();

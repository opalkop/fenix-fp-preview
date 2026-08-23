"use strict";
(()=>{
  if(!window.FenixStandardRenderers||window.FenixLogicRuntimeInstalled)return;
  window.FenixLogicRuntimeInstalled=true;
  const original=window.FenixStandardRenderers.render.bind(window.FenixStandardRenderers);
  const SYMBOLS=["●","▲","■","◆","★","♥","☀","✿"];
  const seeded=seed=>{let h=2166136261;seed=String(seed||"fenix");for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
  const shuffle=(a,r)=>{const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
  const pick=(a,r)=>a[Math.floor(r()*a.length)];
  function makeCanvas(scale=1){const c=document.createElement("canvas");c.width=850*scale;c.height=1100*scale;const x=c.getContext("2d");if(scale!==1)x.scale(scale,scale);return c}
  function base(x,o){x.fillStyle="#fff";x.fillRect(0,0,850,1100);x.strokeStyle="#111827";x.lineWidth=3;x.strokeRect(36,36,778,1028);x.fillStyle="#111827";x.textAlign="center";x.font="700 38px Arial";x.fillText(String(o.title||"Logic Challenge").slice(0,60),425,92);x.font="20px Arial";x.fillText(String(o.instructions||"Complete the activity.").slice(0,95),425,132)}
  function solutionBase(x,o){x.fillStyle="#fff";x.fillRect(0,0,850,1100);x.strokeStyle="#111827";x.lineWidth=3;x.strokeRect(36,36,778,1028);x.fillStyle="#111827";x.textAlign="center";x.font="700 34px Arial";x.fillText(`Solution — ${String(o.title||"Logic Challenge").slice(0,50)}`,425,90)}
  function circle(x,cx,cy,r=25){x.save();x.strokeStyle="#111";x.lineWidth=4;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();x.restore()}
  function renderLogic(o,seed,scale){const r=seeded(seed),page=makeCanvas(scale),solution=makeCanvas(scale),p=page.getContext("2d"),s=solution.getContext("2d");base(p,o);solutionBase(s,o);p.fillStyle=s.fillStyle="#111";p.strokeStyle=s.strokeStyle="#111";p.textAlign=s.textAlign="center";
    if(o.type==="odd"){for(let row=0;row<6;row++){const n=o.difficulty==="hard"?7:o.difficulty==="easy"?4:5,common=pick(SYMBOLS,r),odd=pick(SYMBOLS.filter(x=>x!==common),r),pos=Math.floor(r()*n);p.font=s.font="46px Arial";for(let i=0;i<n;i++){const x=145+i*105,y=245+row*120,v=i===pos?odd:common;p.fillText(v,x,y);s.fillText(v,x,y);if(i===pos)circle(s,x,y-15,34)}}}
    else if(o.type==="sudoku"){const grid=[[0,1,2,3],[2,3,0,1],[1,0,3,2],[3,2,1,0]],blank=new Set(["0,0","1,2","2,1","3,3"]);p.font=s.font="46px Arial";for(let y=0;y<4;y++)for(let x=0;x<4;x++){const px=215+x*105,py=270+y*105,v=SYMBOLS[grid[y][x]];p.strokeRect(px,py,105,105);s.strokeRect(px,py,105,105);if(!blank.has(`${y},${x}`))p.fillText(v,px+52,py+68);s.fillText(v,px+52,py+68)}}
    else if(o.type==="matrix"){const arr=shuffle(SYMBOLS,r).slice(0,3);p.font=s.font="48px Arial";for(let y=0;y<3;y++)for(let x=0;x<3;x++){const px=245+x*120,py=280+y*120,v=arr[(x+y)%3],missing=x===2&&y===2;p.strokeRect(px,py,120,120);s.strokeRect(px,py,120,120);p.fillText(missing?"?":v,px+60,py+75);s.fillText(v,px+60,py+75)}}
    else if(o.type==="analogy"){const values=shuffle(SYMBOLS,r).slice(0,4),correct=values[3],choices=shuffle([correct,...SYMBOLS.filter(x=>!values.includes(x)).slice(0,2)],r);p.font=s.font="58px Arial";p.fillText(`${values[0]}  →  ${values[1]}`,425,310);p.fillText(`${values[2]}  →  ?`,425,440);s.fillText(`${values[0]}  →  ${values[1]}`,425,310);s.fillText(`${values[2]}  →  ${correct}`,425,440);choices.forEach((v,i)=>{const x=280+i*145;p.fillText(v,x,650);s.fillText(v,x,650);if(v===correct)circle(s,x,630,38)})}
    else {for(let row=0;row<6;row++){const pattern=shuffle(SYMBOLS,r).slice(0,3),n=o.difficulty==="hard"?9:7;p.font=s.font="48px Arial";for(let i=0;i<n;i++){const x=95+i*90,y=245+row*115,v=pattern[i%3];p.fillText(i===n-1?"?":v,x,y);s.fillText(v,x,y)}}}
    return{pageCanvas:page,solutionCanvas:solution,hasSolution:true};
  }
  window.FenixStandardRenderers.render=(module,options,seed,pageNo,scale)=>{
    if(module==="logic-studio") return renderLogic(options||{},seed,Number(scale)||1);
    return original(module,options,seed,pageNo,scale);
  };
})();

"use strict";
(()=>{
  const SYMBOLS=["●","▲","■","◆","★","♥","☀","✿"];
  const seeded=seed=>{let h=2166136261;seed=String(seed||"fenix");for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
  const shuffle=(a,r)=>{const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
  const pick=(a,r)=>a[Math.floor(r()*a.length)];
  const loadImage=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src});
  const make=()=>{const c=document.createElement("canvas");c.width=850;c.height=1100;return c};
  function base(x,o,solution){x.fillStyle="#fff";x.fillRect(0,0,850,1100);x.strokeStyle="#111827";x.lineWidth=3;x.strokeRect(36,36,778,1028);x.fillStyle="#111827";x.textAlign="center";x.font=solution?"700 34px Arial":"700 38px Arial";x.fillText(solution?`Solution — ${String(o.title).slice(0,50)}`:String(o.title).slice(0,60),425,solution?90:92);if(!solution){x.font="20px Arial";x.fillText(String(o.instructions||"").slice(0,95),425,132)}}
  function drawAsset(x,img,cx,cy,size=66){if(!img)return;const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,fit=Math.min(size/iw,size/ih),w=iw*fit,h=ih*fit;x.drawImage(img,cx-w/2,cy-h/2,w,h)}
  function circleMark(x,cx,cy,r=25){x.save();x.strokeStyle="#111";x.lineWidth=4;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();x.restore()}
  async function bundle(p,o,r){if(o.elementMode!=="assets")return null;const refs=p.recipe?.content?.assetRefs||[],assets=refs.map(id=>FenixCore.getAsset(id)).filter(Boolean);const min={sudoku:4,analogy:4,matrix:3,odd:2,sequence:2}[o.type]||2;if(assets.length<min)return null;const chosen=o.type==="sudoku"?assets.slice(0,4):shuffle(assets,r),images=new Map;await Promise.all(chosen.map(async a=>images.set(a.id,await loadImage(a.dataUrl))));const oddRef=p.recipe?.content?.oddRef;return{assets:chosen,images,odd:oddRef?FenixCore.getAsset(oddRef):null}}
  async function render(page,solution=false){
    const p=FenixPageSchema.normalize(page),s=p.recipe?.settings||{},o={type:s.type||"sequence",title:p.title||"Logic Challenge",instructions:s.instructions||"Complete the activity.",difficulty:s.difficulty||"medium",elementMode:s.elementMode||"symbols"},r=seeded(p.recipe?.seed||"fenix-logic"),c=make(),x=c.getContext("2d");base(x,o,solution);x.fillStyle=x.strokeStyle="#111";x.textAlign="center";const b=await bundle(p,o,r),use=Boolean(b);
    if(o.type==="odd"){
      if(use){const odd=b.odd&&b.assets.some(a=>a.id===b.odd.id)?b.odd:b.assets[b.assets.length-1],commons=b.assets.filter(a=>a.id!==odd.id);for(let row=0;row<6;row++){const n=o.difficulty==="hard"?7:o.difficulty==="easy"?4:5,common=pick(commons,r),pos=Math.floor(r()*n);for(let i=0;i<n;i++){const cx=145+i*105,cy=229+row*120,a=i===pos?odd:common;drawAsset(x,b.images.get(a.id),cx,cy,66);if(solution&&i===pos)circleMark(x,cx,cy,42)}}}
      else{for(let row=0;row<6;row++){const n=o.difficulty==="hard"?7:o.difficulty==="easy"?4:5,common=pick(SYMBOLS,r),odd=pick(SYMBOLS.filter(v=>v!==common),r),pos=Math.floor(r()*n);x.font="46px Arial";for(let i=0;i<n;i++){const cx=145+i*105,cy=245+row*120;x.fillText(i===pos?odd:common,cx,cy);if(solution&&i===pos)circleMark(x,cx,cy-15,34)}}}
    } else if(o.type==="sudoku"){
      const grid=[[0,1,2,3],[2,3,0,1],[1,0,3,2],[3,2,1,0]],blank=new Set(["0,0","1,2","2,1","3,3"]),arr=use?b.assets.slice(0,4):SYMBOLS.slice(0,4),top=use?330:270;if(use){x.fillStyle="#111827";x.font="700 17px Arial";x.fillText("PICTURE SET",425,178);arr.forEach((a,i)=>{drawAsset(x,b.images.get(a.id),290+i*90,225,58);x.strokeStyle="#c5ccd3";x.lineWidth=1;x.strokeRect(255+i*90,188,70,74)})}for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++){const px=215+xx*105,py=top+yy*105,val=arr[grid[yy][xx]];x.strokeStyle="#111";x.lineWidth=3;x.strokeRect(px,py,105,105);if(use){if(solution||!blank.has(`${yy},${xx}`))drawAsset(x,b.images.get(val.id),px+52,py+52,70)}else{x.font="46px Arial";if(solution||!blank.has(`${yy},${xx}`))x.fillText(val,px+52,py+68)}}
    } else if(o.type==="matrix"){
      const arr=use?b.assets.slice(0,3):shuffle(SYMBOLS,r).slice(0,3);for(let yy=0;yy<3;yy++)for(let xx=0;xx<3;xx++){const px=245+xx*120,py=280+yy*120,val=arr[(xx+yy)%3],missing=xx===2&&yy===2;x.strokeRect(px,py,120,120);if(use){if(missing&&!solution){x.font="50px Arial";x.fillText("?",px+60,py+78)}else drawAsset(x,b.images.get(val.id),px+60,py+60,78)}else{x.font="48px Arial";x.fillText(missing&&!solution?"?":val,px+60,py+75)}}
    } else if(o.type==="analogy"){
      if(use){const arr=b.assets.slice(0,4),correct=arr[3],extras=b.assets.slice(4),choices=shuffle([correct,...extras.slice(0,2)],r);while(choices.length<3)choices.push(arr[choices.length%3]);[[315,300],[535,300],[315,455]].forEach((pos,i)=>drawAsset(x,b.images.get(arr[i].id),pos[0],pos[1],90));x.font="48px Arial";x.fillText("→",425,315);x.fillText("→",425,470);if(solution)drawAsset(x,b.images.get(correct.id),535,455,90);else x.fillText("?",535,470);choices.slice(0,3).forEach((a,i)=>{const cx=280+i*145;drawAsset(x,b.images.get(a.id),cx,680,82);if(solution&&a.id===correct.id)circleMark(x,cx,680,52)})}
      else{const values=shuffle(SYMBOLS,r).slice(0,4),correct=values[3],choices=shuffle([correct,...SYMBOLS.filter(v=>!values.includes(v)).slice(0,2)],r);x.font="58px Arial";x.fillText(`${values[0]}  →  ${values[1]}`,425,310);x.fillText(`${values[2]}  →  ${solution?correct:"?"}`,425,440);choices.forEach((v,i)=>{const cx=280+i*145;x.fillText(v,cx,650);if(solution&&v===correct)circleMark(x,cx,630,38)})}
    } else {
      if(use){const pattern=b.assets.slice(0,Math.min(3,b.assets.length));for(let row=0;row<6;row++){const n=o.difficulty==="hard"?9:7;for(let i=0;i<n;i++){const cx=95+i*90,cy=227+row*115,a=pattern[i%pattern.length];if(i===n-1&&!solution){x.font="48px Arial";x.fillText("?",cx,cy+18)}else drawAsset(x,b.images.get(a.id),cx,cy,62)}}}
      else{for(let row=0;row<6;row++){const pattern=shuffle(SYMBOLS,r).slice(0,3),n=o.difficulty==="hard"?9:7;x.font="48px Arial";for(let i=0;i<n;i++){const cx=95+i*90,cy=245+row*115,val=pattern[i%3];x.fillText(i===n-1&&!solution?"?":val,cx,cy)}}}
    }
    return c;
  }
  window.FenixLogicFrozenRenderer=Object.freeze({render});
})();

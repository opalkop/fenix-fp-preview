"use strict";

window.FenixCompletePicture=(()=>{
  const ASSETS=Object.freeze(["butterfly","owl","rocket","robot","fish","flower","cat","ladybug","castle","dino","car","mushroom"]);
  const outlineCache=new WeakMap();
  function hash(value){let h=2166136261;for(const c of String(value||"fenix"))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
  function rng(seed){let h=hash(seed);return()=>((h=Math.imul(h^h>>>15,2246822507)^Math.imul(h^h>>>13,3266489909),((h^h>>>16)>>>0)/4294967296))}
  function createCanvas(scale=1){const c=document.createElement("canvas");c.width=Math.round(850*scale);c.height=Math.round(1100*scale);const ctx=c.getContext("2d");if(scale!==1)ctx.scale(scale,scale);return{canvas:c,ctx}}
  function helpers(ctx){const path=(points,close=true)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();ctx.stroke()},circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()},ellipse=(x,y,rx,ry,rot=0)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.stroke()},line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};return{path,circle,ellipse,line}}
  function drawBuiltIn(ctx,name,x,y,scale){const {path,circle,ellipse,line}=helpers(ctx);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineCap="round";ctx.lineJoin="round";
    if(name==="rocket"){ellipse(0,-15,72,150);path([[-72,55],[-125,120],[-65,105]]);path([[72,55],[125,120],[65,105]]);path([[-35,132],[0,195],[35,132]]);circle(0,-55,28);path([[-48,-120],[0,-180],[48,-120]],false)}
    else if(name==="butterfly"){ellipse(-65,-35,62,82,-.35);ellipse(65,-35,62,82,.35);ellipse(-55,55,48,58,.25);ellipse(55,55,48,58,-.25);ellipse(0,10,18,105);circle(0,-105,22);line(-8,-125,-38,-160);line(8,-125,38,-160)}
    else if(name==="flower"){for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipse(Math.cos(a)*75,Math.sin(a)*75,48,28,a)}circle(0,0,42);line(0,115,0,250);ellipse(-45,185,55,24,-.5);ellipse(45,220,55,24,.5)}
    else if(name==="fish"){ellipse(-10,0,145,85);path([[125,0],[210,-90],[200,0],[210,90]]);circle(-75,-25,10);path([[-5,-15],[55,-60],[45,0]]);line(-90,45,-35,45)}
    else if(name==="car"){ctx.strokeRect(-170,-20,340,110);path([[-100,-20],[-45,-100],[70,-100],[125,-20]],false);circle(-100,95,45);circle(105,95,45);ctx.strokeRect(-130,10,70,35);ctx.strokeRect(55,10,70,35)}
    else if(name==="castle"){ctx.strokeRect(-150,-30,300,210);ctx.strokeRect(-205,-100,85,280);ctx.strokeRect(120,-100,85,280);path([[-205,-100],[-205,-150],[-175,-125],[-145,-150],[-120,-100]]);path([[120,-100],[120,-150],[150,-125],[180,-150],[205,-100]]);ctx.strokeRect(-35,80,70,100)}
    else if(name==="robot"){ctx.strokeRect(-85,-90,170,150);ctx.strokeRect(-105,60,210,145);circle(-42,-35,14);circle(42,-35,14);line(-35,20,35,20);line(-105,90,-165,145);line(105,90,165,145);line(-55,205,-55,260);line(55,205,55,260)}
    else if(name==="owl"){ellipse(0,10,120,145);circle(-48,-38,38);circle(48,-38,38);circle(-48,-38,10);circle(48,-38,10);path([[0,-10],[-18,15],[18,15]]);path([[-80,90],[0,145],[80,90]],false)}
    else if(name==="cat"){circle(0,-40,110);path([[-90,-105],[-115,-190],[-35,-135]]);path([[90,-105],[115,-190],[35,-135]]);circle(-42,-55,10);circle(42,-55,10);path([[0,-15],[-12,0],[12,0]]);ellipse(0,145,95,120)}
    else if(name==="ladybug"){ellipse(0,25,110,145);circle(0,-120,58);line(0,-120,0,170);circle(-45,-35,14);circle(45,-5,14);circle(-55,55,14);circle(55,80,14)}
    else if(name==="dino"){ellipse(-20,30,145,95);circle(110,-70,62);line(65,-20,20,25);path([[-150,10],[-235,-55],[-170,65]]);line(-85,105,-95,190);line(45,105,55,190);circle(125,-85,8)}
    else{ellipse(0,-55,155,95);path([[-80,-10],[-55,180],[55,180],[80,-10]],false);circle(-65,-70,18);circle(25,-105,22);circle(75,-45,15)}
    ctx.restore()
  }
  function drawCustom(ctx,image,x,y,scale){if(!image)return;const maxW=430*scale,maxH=560*scale,ratio=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight),w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;ctx.save();ctx.filter="grayscale(1) contrast(1.12)";ctx.drawImage(image,x-w/2,y-h/2,w,h);ctx.restore()}
  const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  function dirIndex(dx,dy){return dirs.findIndex(d=>d[0]===dx&&d[1]===dy)}
  function getOuterOutline(image){
    if(outlineCache.has(image))return outlineCache.get(image);
    const s=420,c=document.createElement("canvas");c.width=s;c.height=s;const x=c.getContext("2d"),iw=image.naturalWidth||s,ih=image.naturalHeight||s,fit=Math.min(s/iw,s/ih)*.9,dw=iw*fit,dh=ih*fit,ox=(s-dw)/2,oy=(s-dh)/2;x.drawImage(image,ox,oy,dw,dh);
    const data=x.getImageData(0,0,s,s).data,ink=new Uint8Array(s*s);for(let i=0;i<ink.length;i++){const k=i*4,a=data[k+3],lum=(data[k]+data[k+1]+data[k+2])/3;if(a>16&&lum<248)ink[i]=1}
    let work=ink;for(let pass=0;pass<2;pass++){const next=work.slice();for(let yy=1;yy<s-1;yy++)for(let xx=1;xx<s-1;xx++){const i=yy*s+xx;if(work[i])continue;if(work[i-1]||work[i+1]||work[i-s]||work[i+s]||work[i-s-1]||work[i-s+1]||work[i+s-1]||work[i+s+1])next[i]=1}work=next}
    const outside=new Uint8Array(s*s),q=new Int32Array(s*s),push=i=>{if(i<0||i>=work.length||work[i]||outside[i])return;outside[i]=1;q[tail++]=i};let head=0,tail=0;for(let xx=0;xx<s;xx++){push(xx);push((s-1)*s+xx)}for(let yy=0;yy<s;yy++){push(yy*s);push(yy*s+s-1)}while(head<tail){const i=q[head++],xx=i%s,yy=(i/s)|0;if(xx>0)push(i-1);if(xx<s-1)push(i+1);if(yy>0)push(i-s);if(yy<s-1)push(i+s)}
    const solid=new Uint8Array(s*s);for(let i=0;i<solid.length;i++)if(work[i]||!outside[i])solid[i]=1;
    let start=null;for(let yy=1;yy<s-1&&!start;yy++)for(let xx=1;xx<s-1;xx++){const i=yy*s+xx;if(solid[i]&&!solid[i-s]){start={x:xx,y:yy};break}}
    if(!start){outlineCache.set(image,null);return null}
    let cur=start,back={x:start.x-1,y:start.y},firstNext=null;const path=[{...start}];for(let step=0;step<s*s*2;step++){let bi=dirIndex(back.x-cur.x,back.y-cur.y);if(bi<0)bi=4;let found=null,newBack=null;for(let k=1;k<=8;k++){const di=(bi+k)%8,nx=cur.x+dirs[di][0],ny=cur.y+dirs[di][1];if(nx<0||ny<0||nx>=s||ny>=s)continue;if(solid[ny*s+nx]){found={x:nx,y:ny};const pi=(di+7)%8;newBack={x:cur.x+dirs[pi][0],y:cur.y+dirs[pi][1]};break}}if(!found)break;if(!firstNext)firstNext={...found};else if(cur.x===start.x&&cur.y===start.y&&found.x===firstNext.x&&found.y===firstNext.y)break;back=newBack;cur=found;path.push({...cur});if(path.length>12&&cur.x===start.x&&cur.y===start.y)break}
    if(path.length<20){outlineCache.set(image,null);return null}
    const minX=Math.min(...path.map(p=>p.x)),maxX=Math.max(...path.map(p=>p.x)),minY=Math.min(...path.map(p=>p.y)),maxY=Math.max(...path.map(p=>p.y)),pw=maxX-minX||1,ph=maxY-minY||1;
    const normalized=path.filter((_,i)=>i%3===0).map(p=>({x:(p.x-minX)/pw,y:(p.y-minY)/ph}));outlineCache.set(image,normalized);return normalized
  }
  function drawCustomOutline(ctx,image,x,y,scale,alpha,lineWidth){const path=getOuterOutline(image);if(!path)return drawCustom(ctx,image,x,y,scale);const maxW=430*scale,maxH=560*scale,ratio=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight),w=image.naturalWidth*ratio,h=image.naturalHeight*ratio,left=x-w/2,top=y-h/2;ctx.save();ctx.strokeStyle=`rgba(70,70,70,${Math.max(.02,Math.min(.25,alpha))})`;ctx.lineWidth=Math.max(1,lineWidth);ctx.lineJoin="round";ctx.lineCap="round";ctx.beginPath();path.forEach((p,i)=>{const px=left+p.x*w,py=top+p.y*h;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.closePath();ctx.stroke();ctx.restore()}
  function grid(ctx,x,y,w,h,n=8){const {line}=helpers(ctx);ctx.save();ctx.strokeStyle="#c8cfd6";ctx.lineWidth=1;for(let i=0;i<=n;i++){line(x+i*w/n,y,x+i*w/n,y+h);line(x,y+i*h/n,x+w,y+i*h/n)}ctx.restore()}
  function base(ctx,o){ctx.clearRect(0,0,850,1100);ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.strokeRect(36,36,778,1028);ctx.fillStyle="#111";ctx.textAlign="center";ctx.font="700 39px Arial";ctx.fillText(String(o.title||"Complete the Picture").slice(0,60),425,92);ctx.font="20px Arial";ctx.fillText(String(o.instruction||"Complete the picture.").slice(0,95),425,132)}
  function render(options={},seed="fenix-ctp",pageNo=0,{solution=false,scale=1,customImage=null}={}){
    const {canvas,ctx}=createCanvas(scale),o={type:"half-vertical",assetSource:"built-in",asset:"butterfly",difficulty:"medium",scale:.94,lineWidth:4,shadow:.10,shadowScale:1.4,shadowAssetScale:1,guide:true,dots:false,grid:false,missingGuide:"none",missingGuideOpacity:.12,missingGuideScale:1,missingPartSize:.35,missingPartPosition:"random",title:"Complete the Picture",instruction:"Draw the missing half of the picture.",...options},random=rng(seed),cx=425,{line}=helpers(ctx);
    ctx.strokeStyle="#111";ctx.lineWidth=o.lineWidth;base(ctx,o);if(o.grid&&o.type!=="grid-copy")grid(ctx,115,210,620,650,8);
    const drawCurrent=(x,y,s,alpha=1)=>{ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,alpha));o.assetSource==="upload"?drawCustom(ctx,customImage,x,y,s):drawBuiltIn(ctx,o.asset,x,y,s);ctx.restore()};
    const drawGuide=(x,y,s,alpha)=>{if(o.assetSource==="upload")drawCustomOutline(ctx,customImage,x,y,s,alpha,Math.max(1,o.lineWidth*.45));else{ctx.save();ctx.globalAlpha=Math.max(.02,Math.min(.25,alpha));ctx.strokeStyle="#8c949c";ctx.lineWidth=Math.max(1,Math.min(2,o.lineWidth*.45));drawBuiltIn(ctx,o.asset,x,y,s);ctx.restore()}};
    const guideAlpha=o.missingGuide==="none"?0:Math.max(.02,Math.min(.25,o.missingGuideOpacity*(o.missingGuide==="very-faint"?.65:1)));
    if(o.type==="shadow-trace"){
      const areaScale=Math.max(.8,Math.min(1.9,o.shadowScale||1.4)),assetScale=o.scale*Math.max(.5,Math.min(1.6,o.shadowAssetScale||1)),areaW=430*areaScale,areaH=560*areaScale;
      ctx.save();ctx.beginPath();ctx.rect(cx-areaW/2,555-areaH/2,areaW,areaH);ctx.clip();solution?drawCurrent(cx,555,assetScale,1):drawGuide(cx,555,assetScale,Math.max(.03,Math.min(.25,o.shadow)));ctx.restore()
    }
    else if(o.type==="grid-copy"){grid(ctx,55,250,350,600,8);grid(ctx,445,250,350,600,8);ctx.save();ctx.beginPath();ctx.rect(55,250,350,600);ctx.clip();drawCurrent(230,545,o.scale*.66);ctx.restore();ctx.font="700 18px Arial";ctx.textAlign="center";ctx.fillText("COPY",620,885);if(solution)drawCurrent(620,545,o.scale*.66)}
    else if(o.type==="mirror-pair"){if(o.guide){ctx.setLineDash([10,10]);line(cx,205,cx,900);ctx.setLineDash([])}drawCurrent(245,555,o.scale*.55);if(solution||guideAlpha){ctx.save();ctx.translate(850,0);ctx.scale(-1,1);solution?drawCurrent(245,555,o.scale*.55,1):drawGuide(245,555,o.scale*.55,guideAlpha);ctx.restore()}}
    else if(o.type==="missing-part"){
      drawCurrent(cx,550,o.scale);
      if(!solution){
        const size=Math.max(.10,Math.min(.60,o.missingPartSize||.35)),r=45+size*180,offset=135,guideScale=o.scale*Math.max(.5,Math.min(1.6,o.missingGuideScale||1));
        let angle=random()*Math.PI*2;
        if(o.missingPartPosition==="top")angle=-Math.PI/2;else if(o.missingPartPosition==="bottom")angle=Math.PI/2;else if(o.missingPartPosition==="left")angle=Math.PI;else if(o.missingPartPosition==="right")angle=0;
        const mx=cx+Math.cos(angle)*offset,my=550+Math.sin(angle)*offset;
        ctx.save();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(mx,my,r,0,Math.PI*2);ctx.fill();ctx.restore();
        if(guideAlpha){ctx.save();ctx.beginPath();ctx.arc(mx,my,r,0,Math.PI*2);ctx.clip();drawGuide(cx,550,guideScale,guideAlpha);ctx.restore()}
        ctx.save();ctx.setLineDash([7,7]);ctx.strokeStyle="#b1b7bd";ctx.beginPath();ctx.arc(mx,my,r,0,Math.PI*2);ctx.stroke();ctx.restore()
      }}
    else{
      if(!solution&&guideAlpha)drawGuide(cx,550,o.scale,guideAlpha);
      ctx.save();if(!solution){ctx.beginPath();if(o.type==="half-horizontal")ctx.rect(80,180,690,375);else ctx.rect(80,180,345,760);ctx.clip()}drawCurrent(cx,550,o.scale);ctx.restore();if(o.guide){ctx.setLineDash([10,10]);o.type==="half-horizontal"?line(85,555,765,555):line(cx,190,cx,915);ctx.setLineDash([])}
    }
    if(o.dots&&!solution){ctx.fillStyle="#888";for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ctx.beginPath();ctx.arc(cx+Math.cos(a)*240,550+Math.sin(a)*300,3,0,7);ctx.fill()}}
    return canvas
  }
  function optionsFromPage(page){const p=window.FenixPageSchema?.normalize?FenixPageSchema.normalize(page):page||{},s=p.recipe?.settings||{};return{...s,title:p.title||p.recipe?.title,assetSource:s.assetSource||p.recipe?.content?.assetSource||"built-in",asset:s.asset||p.recipe?.content?.asset||"butterfly"}}
  return Object.freeze({ASSETS,render,optionsFromPage});
})();

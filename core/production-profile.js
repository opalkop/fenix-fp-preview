"use strict";

window.FenixProduction=(()=>{
  const DPI=300;
  const FORMATS=Object.freeze({
    "8.5x11":Object.freeze({label:"8.5 × 11 in",widthIn:8.5,heightIn:11}),
    "6x9":Object.freeze({label:"6 × 9 in",widthIn:6,heightIn:9}),
    a4:Object.freeze({label:"A4",widthIn:8.27,heightIn:11.69})
  });
  const normalizeFormat=value=>String(value||"8.5x11").toLowerCase()==="a4"?"a4":FORMATS[value]?value:"8.5x11";
  function profile(format="8.5x11",bleed="no-bleed"){
    const key=normalizeFormat(format),trim=FORMATS[key],hasBleed=bleed==="bleed",pageWidthIn=trim.widthIn+(hasBleed?.125:0),pageHeightIn=trim.heightIn+(hasBleed?.25:0);
    return Object.freeze({format:key,bleed:hasBleed?"bleed":"no-bleed",dpi:DPI,trimWidthIn:trim.widthIn,trimHeightIn:trim.heightIn,width:Math.round(pageWidthIn*DPI),height:Math.round(pageHeightIn*DPI),trimWidth:Math.round(trim.widthIn*DPI),trimHeight:Math.round(trim.heightIn*DPI),label:trim.label});
  }
  function fitCanvas(source,format="8.5x11",bleed="no-bleed"){
    if(!source?.width||!source?.height)throw new Error("Brak prawidłowego canvasa źródłowego.");
    const p=profile(format,bleed),target=document.createElement("canvas");target.width=p.width;target.height=p.height;const ctx=target.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,target.width,target.height);
    const trimX=(target.width-p.trimWidth)/2,trimY=(target.height-p.trimHeight)/2,scale=Math.min(p.trimWidth/source.width,p.trimHeight/source.height),drawW=Math.round(source.width*scale),drawH=Math.round(source.height*scale),x=Math.round(trimX+(p.trimWidth-drawW)/2),y=Math.round(trimY+(p.trimHeight-drawH)/2);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(source,x,y,drawW,drawH);return{canvas:target,profile:p,contentBox:{x,y,width:drawW,height:drawH}};
  }
  function validation(profileValue){const p=profile(profileValue?.format,profileValue?.bleed),messages=[];if(Number(profileValue?.width)!==p.width||Number(profileValue?.height)!==p.height)messages.push(`Oczekiwano ${p.width}×${p.height}px przy ${DPI} DPI.`);if(Number(profileValue?.dpi)!==DPI)messages.push(`Oczekiwano ${DPI} DPI.`);return{status:messages.length?"error":"ok",messages}}
  return Object.freeze({DPI,FORMATS,normalizeFormat,profile,fitCanvas,validation});
})();

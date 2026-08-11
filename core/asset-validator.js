"use strict";

const FenixAssetValidator=(()=>{
  const SUPPORTED=new Set(["image/png","image/jpeg","image/webp","image/svg+xml"]);
  const MAX_BYTES=8*1024*1024;
  const MIN_RECOMMENDED_SIDE=512;
  const result=(status,messages=[],metrics={})=>({status,messages,metrics});

  function validateMetadata(asset={}){
    const messages=[];
    let status="ok";
    const mime=String(asset.mime||asset.mimeType||"").toLowerCase();
    const width=Number(asset.width||asset.meta?.width)||0;
    const height=Number(asset.height||asset.meta?.height)||0;
    const sizeBytes=Number(asset.sizeBytes||asset.meta?.sizeBytes)||0;
    const warn=message=>{if(status==="ok")status="warning";messages.push(message)};
    const error=message=>{status="error";messages.push(message)};
    if(!SUPPORTED.has(mime))error("Nieobsługiwany format. Użyj PNG, JPG/JPEG, WEBP albo SVG.");
    if(!width||!height)warn("Nie udało się potwierdzić wymiarów assetu.");
    else if(Math.min(width,height)<MIN_RECOMMENDED_SIDE)warn(`Mały asset (${width}×${height}px). Przy dużym powiększeniu może stracić czytelność.`);
    if(sizeBytes>MAX_BYTES)warn(`Duży plik (${(sizeBytes/1048576).toFixed(1)} MB) może zwiększać rozmiar projektu.`);
    return result(status,messages,{width,height,sizeBytes,mime,aspectRatio:width&&height?Number((width/height).toFixed(4)):null});
  }

  function analyzeCanvas(canvas){
    try{
      const max=96,scale=Math.min(1,max/canvas.width,max/canvas.height),w=Math.max(1,Math.round(canvas.width*scale)),h=Math.max(1,Math.round(canvas.height*scale));
      const sample=document.createElement("canvas");sample.width=w;sample.height=h;
      const ctx=sample.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(canvas,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h).data;
      let visible=0,colored=0,midGray=0,dark=0;
      for(let i=0;i<data.length;i+=4){const a=data[i+3];if(a<24)continue;const r=data[i],g=data[i+1],b=data[i+2],maxC=Math.max(r,g,b),minC=Math.min(r,g,b),lum=(r+g+b)/3;visible++;if(maxC-minC>18)colored++;if(lum>35&&lum<220)midGray++;if(lum<90)dark++;}
      if(!visible)return result("warning",["Asset jest pusty lub całkowicie przezroczysty."],{visiblePixels:0});
      const colorRatio=colored/visible,grayRatio=midGray/visible,darkRatio=dark/visible;
      const messages=[];let status="ok";
      if(colorRatio>.02){status="warning";messages.push(`Wykryto kolor w około ${Math.round(colorRatio*100)}% analizowanych pikseli. Dla wnętrza KDP B&W warto użyć czerni/bieli.`)}
      if(grayRatio>.35){status="warning";messages.push(`Duży udział półtonów (${Math.round(grayRatio*100)}%). Sprawdź czy asset pozostaje czytelny w druku czarno-białym.`)}
      if(darkRatio<.01){status="warning";messages.push("Asset ma bardzo mało ciemnych linii; po zmniejszeniu może być słabo czytelny.")}
      if(!messages.length)messages.push("Wygląd assetu jest zgodny z podstawowym profilem B&W Feniksa.");
      return result(status,messages,{colorRatio,grayRatio,darkRatio,visiblePixels:visible});
    }catch(error){return result("warning",["Nie udało się automatycznie przeanalizować kolorów assetu."],{analysisError:String(error.message||error)})}
  }

  async function analyzeDataUrl(dataUrl){
    if(!dataUrl)return result("error",["Brak danych obrazu."]);
    return new Promise(resolve=>{const image=new Image();image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);resolve(analyzeCanvas(canvas))};image.onerror=()=>resolve(result("warning",["Nie udało się otworzyć assetu do analizy B&W."]));image.src=dataUrl});
  }

  function merge(metadataResult,visualResult){
    const rank={ok:0,warning:1,error:2},status=rank[metadataResult.status]>=rank[visualResult.status]?metadataResult.status:visualResult.status;
    return result(status,[...(metadataResult.messages||[]),...(visualResult.messages||[])],{...(metadataResult.metrics||{}),...(visualResult.metrics||{})});
  }

  async function validate(asset={}){return merge(validateMetadata(asset),await analyzeDataUrl(asset.dataUrl))}

  return Object.freeze({SUPPORTED:[...SUPPORTED],MAX_BYTES,MIN_RECOMMENDED_SIDE,validateMetadata,analyzeDataUrl,validate});
})();

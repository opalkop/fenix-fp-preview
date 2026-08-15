"use strict";

window.FenixColoring=(()=>{
  const DEFAULTS=Object.freeze({
    title:"Color the Picture!",
    instructions:"Use crayons or pencils to color the picture.",
    showTitle:true,
    showInstructions:true,
    titleSize:112,
    instructionSize:46,
    titleY:230,
    assetScale:82,
    assetY:56
  });
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||min));
  const bool=(value,fallback)=>value==null?fallback:value!==false&&value!=="false";
  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Nie udało się odczytać assetu kolorowanki."));image.src=src});

  function optionsFromPage(page={}){
    const settings=page.recipe?.settings||page.settings||{},content=page.recipe?.content||page.content||{};
    return{
      ...DEFAULTS,
      title:String(settings.title||page.title||DEFAULTS.title),
      instructions:String(settings.instructions??DEFAULTS.instructions),
      showTitle:bool(settings.showTitle,DEFAULTS.showTitle),
      showInstructions:bool(settings.showInstructions,DEFAULTS.showInstructions),
      titleSize:clamp(settings.titleSize??DEFAULTS.titleSize,64,180),
      instructionSize:clamp(settings.instructionSize??DEFAULTS.instructionSize,32,90),
      titleY:clamp(settings.titleY??DEFAULTS.titleY,140,420),
      assetScale:clamp(settings.assetScale??DEFAULTS.assetScale,35,96),
      assetY:clamp(settings.assetY??DEFAULTS.assetY,35,72),
      assetRef:content.assetRef||settings.assetRef||null
    };
  }

  async function prepareAsset(page){
    const options=optionsFromPage(page),asset=options.assetRef?FenixCore.getAsset(options.assetRef):null;
    if(!asset?.dataUrl)throw new Error(`Brak przypisanego assetu dla strony „${page.title||"Coloring"}”.`);
    return{asset,image:await loadImage(asset.dataUrl)};
  }

  function fitText(ctx,text,maxWidth,startSize,minSize=28){let size=startSize;while(size>minSize&&ctx.measureText(text).width>maxWidth){size-=2;ctx.font=`700 ${size}px Arial, sans-serif`}return size}
  function render(page,{width=850,height=1100,assetImage=null}={}){
    if(!assetImage)throw new Error("Renderer Coloring Studio nie otrzymał obrazu assetu.");
    const o=optionsFromPage(page),canvas=document.createElement("canvas"),scale=width/2550;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";
    if(o.showTitle&&o.title){ctx.font=`700 ${o.titleSize*scale}px Arial, sans-serif`;fitText(ctx,o.title,width-300*scale,o.titleSize*scale,48*scale);ctx.fillText(o.title,width/2,o.titleY*scale)}
    if(o.showInstructions&&o.instructions){ctx.font=`500 ${o.instructionSize*scale}px Arial, sans-serif`;const instructionY=(o.showTitle?o.titleY+105:210)*scale;fitText(ctx,o.instructions,width-340*scale,o.instructionSize*scale,26*scale);ctx.fillText(o.instructions,width/2,instructionY)}
    const top=(o.showTitle||o.showInstructions?430:170)*scale,bottom=3070*scale,side=210*scale,boxWidth=width-side*2,boxHeight=bottom-top;
    const naturalWidth=assetImage.naturalWidth||assetImage.width||1024,naturalHeight=assetImage.naturalHeight||assetImage.height||1024;
    const contain=Math.min(boxWidth/naturalWidth,boxHeight/naturalHeight),factor=o.assetScale/100,drawWidth=naturalWidth*contain*factor,drawHeight=naturalHeight*contain*factor;
    const centerY=clamp(o.assetY,35,72)/100*height,drawX=(width-drawWidth)/2,drawY=Math.max(top,Math.min(bottom-drawHeight,centerY-drawHeight/2));
    ctx.drawImage(assetImage,drawX,drawY,drawWidth,drawHeight);
    return canvas;
  }

  return Object.freeze({DEFAULTS,optionsFromPage,prepareAsset,render,loadImage});
})();

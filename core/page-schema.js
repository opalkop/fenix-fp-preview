"use strict";

window.FenixPageSchema=(()=>{
  const VERSION=3;
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now=()=>new Date().toISOString();
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  function normalizeKdp(value){const source=object(value),status=["ok","warning","error"].includes(source.status)?source.status:"unknown";return{status,messages:Array.isArray(source.messages)?source.messages.map(String):[]}}
  function normalizeProduction(value={}){const source=object(value);return{format:String(source.format||""),bleed:String(source.bleed||""),dpi:Number(source.dpi)||null,width:Number(source.width)||null,height:Number(source.height)||null}}
  function normalize(page={}){
    const mobile=object(page.mobilePage),recipe=object(page.recipe&&typeof page.recipe==="object"?page.recipe:mobile.recipe&&typeof mobile.recipe==="object"?mobile.recipe:page),module=String(page.module||recipe.module||mobile.module||"unknown-module"),createdAt=page.createdAt||mobile.createdAt||now(),settings=clone(page.settings||recipe.settings||mobile.settings||{}),validation=page.validation?.kdp||page.kdpValidation||recipe.meta?.kdpValidation||mobile.kdpValidation||mobile.recipe?.meta?.kdpValidation,sourceValue=page.source,sourceApp=typeof sourceValue==="object"&&sourceValue?sourceValue.app:(sourceValue||((mobile&&Object.keys(mobile).length)?"fenix-mobile":"fenix-desktop")),imageData=page.preview?.imageData||page.imageData||mobile.imageData||null,solutionImageData=page.solution?.imageData||page.solutionImageData||mobile.solutionImageData||null,solutionAvailable=Boolean(page.solution?.available||page.hasSolution||solutionImageData||module==="maze-studio"),production=normalizeProduction(page.production||recipe.meta?.production||mobile.production||{});
    return{id:page.id||uid(),schemaVersion:VERSION,module,title:String(page.title||recipe.title||mobile.title||module),createdAt,updatedAt:page.updatedAt||createdAt,recipe:{module,seed:page.seed??recipe.seed??mobile.seed??null,title:String(recipe.title||page.title||mobile.title||module),settings,content:clone(recipe.content||page.content||{}),meta:clone(recipe.meta||{}),renderState:clone(recipe.renderState||recipe.meta?.renderState||{})},preview:{imageData},solution:{available:solutionAvailable,imageData:solutionImageData},validation:{kdp:normalizeKdp(validation)},production,source:{app:String(sourceApp||"fenix-desktop"),version:String((typeof sourceValue==="object"&&sourceValue?.version)||page.mobileAppVersion||"unknown"),format:String((typeof sourceValue==="object"&&sourceValue?.format)||page.sourceFormat||"native"),originalId:(typeof sourceValue==="object"&&sourceValue?.originalId)||page.sourcePageId||mobile.id||null,projectName:(typeof sourceValue==="object"&&sourceValue?.projectName)||page.mobileProjectName||null}};
  }
  function toLegacy(page){const normalized=normalize(page);return{...clone(normalized),seed:normalized.recipe.seed,settings:clone(normalized.recipe.settings),imageData:normalized.preview.imageData,solutionImageData:normalized.solution.imageData,hasSolution:normalized.solution.available,kdpValidation:clone(normalized.validation.kdp)}}
  function moduleOf(page){return normalize(page).module}
  function hasSolution(page){return normalize(page).solution.available}
  function kdpStatus(page){return normalize(page).validation.kdp.status}
  function validate(page){const errors=[];if(!page||typeof page!=="object")errors.push("Strona nie jest obiektem.");else{if(!page.id)errors.push("Brak identyfikatora strony.");if(!page.module)errors.push("Brak identyfikatora modułu.");if(!page.recipe||typeof page.recipe!=="object")errors.push("Brak receptury strony.");if(Number(page.schemaVersion)!==VERSION)errors.push(`Nieobsługiwana wersja schematu: ${page.schemaVersion??"brak"}.`)}return{ok:errors.length===0,errors}}
  return Object.freeze({VERSION,normalize,toLegacy,moduleOf,hasSolution,kdpStatus,validate,clone});
})();

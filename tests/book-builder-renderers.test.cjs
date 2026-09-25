"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const builder=fs.readFileSync(path.join(root,"modules/book-builder/book-builder.js"),"utf8");
const html=fs.readFileSync(path.join(root,"modules/book-builder/index.html"),"utf8");

assert.match(builder,/async function init\(\)[\s\S]*await FenixCore\.ready;[\s\S]*loadCart\(\)/,"Book Builder musi czekać na odtworzenie assetów i snapshotów z IndexedDB.");
assert.match(builder,/if\(module==="tracing-studio"\)return tracingCanvas\(p,quality\)/,"Tracing w trybie print musi korzystać z renderera produkcyjnego.");
assert.match(builder,/if\(module==="complete-picture"\)return completeCanvas\(p,solution,quality\)/,"Complete Picture w trybie print musi korzystać z renderera produkcyjnego.");
assert.match(html,/dot-to-dot-studio\/dot-core\.js/,"Book Builder musi ładować produkcyjny core Dot to Dot.");
assert.match(builder,/BOOK BUILDER DIAGNOSTICS 2026-09-25 v5/,"Book Builder musi pokazywać jednoznaczny identyfikator diagnostyczny.");
assert.match(html,/book-builder\.js\?v=0\.33\.5-dedicated-core/,"Naprawiony Book Builder musi mieć nowy cache-busting.");
assert.match(html,/book-builder-core-v1\.js/,"Book Builder musi używać fizycznie oddzielnego rdzenia odpornego na stary cache Opery.");
assert.match(builder,/recoveryMode=storage\.mode==="recovery"/,"Book Builder musi obsługiwać tryb odzyskiwania bez ciężkich podglądów.");
assert.match(builder,/FenixCore\.setCart\(pages\.filter\(page=>!page\?\._autoParity\)\)/,"Automatyczne uporządkowanie musi trwale zapisywać kolejność bez technicznej strony parzystości.");
assert.match(builder,/function assetDiagnostics\(page\)/,"Book Builder musi raportować stan assetRef i payloadów.");
assert.match(builder,/function showFailureReport\(failures\)/,"Book Builder musi wyświetlać zbiorczy raport błędów renderowania.");

const calls=[];
const context={
  fillStyle:"",strokeStyle:"",font:"",textAlign:"",globalAlpha:1,filter:"none",lineWidth:1,
  scale(){},fillRect(){},drawImage(){},save(){},restore(){},beginPath(){},roundRect(){},fill(){},stroke(){},fillText(){},arc(){}
};
const document={createElement(name){assert.equal(name,"canvas");return{width:0,height:0,getContext:()=>context}}};
const asset={id:"dot-asset",name:"Whale",filename:"whale.svg",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,%3Csvg/%3E"};
const window={FenixDotCore:{async render(received,options){calls.push({received,options});return{width:2550,height:3300,getContext:()=>context}}}};
const sandbox={window,document,Image:class{},console,FenixCore:{getAsset:id=>id===asset.id?asset:null,listAssets:()=>[asset],getActiveProject:()=>({assets:{[asset.id]:asset}})}};
vm.runInNewContext(fs.readFileSync(path.join(root,"modules/book-builder/production-renderers.js"),"utf8"),sandbox,{filename:"production-renderers.js"});

(async()=>{
  const page={module:"dot-to-dot-studio",title:"Connect the Whale",recipe:{settings:{dotCount:36,referenceEnabled:"no"},content:{assetRef:asset.id,assetName:asset.name,assetFilename:asset.filename}}};
  const print=await window.FenixBookProductionRenderers.render(page,{quality:"print"});
  assert.equal(print.width,2550);
  assert.equal(print.height,3300);
  assert.equal(calls.length,1);
  assert.equal(calls[0].received.id,asset.id);
  assert.equal(calls[0].options.dotCount,36);
  const preview=await window.FenixBookProductionRenderers.render(page,{quality:"preview"});
  assert.equal(preview.width,850);
  assert.equal(preview.height,1100);
  console.log("PASS book-builder-renderers: storage readiness, production paths and Dot to Dot recipe renderer.");
})().catch(error=>{console.error(error);process.exitCode=1});

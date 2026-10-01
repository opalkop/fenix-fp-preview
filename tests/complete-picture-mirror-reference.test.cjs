"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const source=fs.readFileSync(path.join(__dirname,"..","modules","complete-picture","complete-picture-core.js"),"utf8");
const contexts=[];

function makeContext(){
  const calls={roundRect:0,translate:[],scale:[]};
  const ctx={calls};
  for(const name of ["save","restore","clearRect","fillRect","strokeRect","fillText","beginPath","closePath","stroke","fill","moveTo","lineTo","arc","ellipse","rect","clip","setLineDash","drawImage"]){
    ctx[name]=()=>{};
  }
  ctx.roundRect=()=>{calls.roundRect++};
  ctx.translate=(...args)=>{calls.translate.push(args)};
  ctx.scale=(...args)=>{calls.scale.push(args)};
  return ctx;
}

const document={
  createElement(tag){
    assert.equal(tag,"canvas");
    const ctx=makeContext();
    contexts.push(ctx);
    return{width:0,height:0,getContext:()=>ctx};
  }
};
const FenixPageSchema={normalize:page=>page};
const window={FenixPageSchema};
vm.runInNewContext(source,{window,document,FenixPageSchema,console,Uint8Array,Int32Array,WeakMap,Math,Object,String,Number},
  {filename:"complete-picture-core.js"});

function render(type,{solution=false}={}){
  const before=contexts.length;
  const canvas=window.FenixCompletePicture.render({type,asset:"robot",assetSource:"built-in"},"regression",0,{solution});
  assert.equal(contexts.length,before+1);
  assert.equal(canvas.width,850);
  assert.equal(canvas.height,1100);
  return contexts.at(-1).calls;
}

const mirrorTask=render("mirror-pair");
assert.equal(mirrorTask.roundRect,0,"mirror-pair nie powinien renderować ramki reference preview");

for(const type of ["half-vertical","half-horizontal","grid-copy","missing-part","shadow-trace"]){
  assert.equal(render(type).roundRect,1,`${type} powinien nadal renderować reference preview`);
}

const mirrorSolution=render("mirror-pair",{solution:true});
assert.equal(mirrorSolution.roundRect,0,"Solution mirror-pair także nie powinno dodawać reference preview");
assert.ok(mirrorSolution.translate.some(([x,y])=>x===245&&y===555),"Solution powinno renderować lewy asset");
assert.ok(mirrorSolution.translate.some(([x,y])=>x===605&&y===555),"Solution powinno renderować prawy asset");
assert.ok(mirrorSolution.scale.some(([x,y])=>x===-1&&y===1),"Prawy asset Solution powinien pozostać odbiciem lustrzanym");

const legacyPage={
  title:"Legacy mirror page",
  recipe:{
    title:"Legacy title",
    settings:{type:"mirror-pair",scale:.88,guide:true},
    content:{assetSource:"built-in",asset:"owl"}
  }
};
const restored=window.FenixCompletePicture.optionsFromPage(legacyPage);
assert.equal(restored.type,"mirror-pair");
assert.equal(restored.scale,.88);
assert.equal(restored.assetSource,"built-in");
assert.equal(restored.asset,"owl");
assert.equal(restored.title,"Legacy mirror page");
assert.doesNotThrow(()=>window.FenixCompletePicture.render(restored,"legacy",0,{solution:false}));

console.log("PASS Complete Picture: mirror-pair bez miniatury, pozostałe tryby bez zmian, Solution i stare strony działają.");

"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const layoutSource=fs.readFileSync(path.join(root,"modules","hidden-objects-studio","hidden-layout.js"),"utf8");
const productionSource=fs.readFileSync(path.join(root,"modules","book-builder","hidden-production.js"),"utf8");
const studioSource=fs.readFileSync(path.join(root,"modules","hidden-objects-studio","hidden.js"),"utf8");
const bookIndex=fs.readFileSync(path.join(root,"modules","book-builder","index.html"),"utf8");
const studioIndex=fs.readFileSync(path.join(root,"modules","hidden-objects-studio","index.html"),"utf8");
const loaderSource=fs.readFileSync(path.join(root,"modules","hidden-objects-studio","hidden-loader.js"),"utf8");

const layoutWindow={};
vm.runInNewContext(layoutSource,{window:layoutWindow,Object,Array,Math,Number},{filename:"hidden-layout.js"});
const layout=layoutWindow.FenixHiddenLayout;
const expected=new Map([[1,[1]],[3,[3]],[5,[5]],[6,[3,3]],[7,[4,3]],[8,[4,4]],[9,[5,4]],[10,[5,5]]]);
let oneRowSceneTop=null;
for(const [count,rows] of expected){
  const geometry=layout.compute(count,{instructionSize:24});
  assert.deepEqual(Array.from(geometry.rowCounts),rows,`${count} celów powinno mieć układ ${rows.join("+")}`);
  assert.equal(geometry.targetItems.length,count);
  assert.equal(new Set(geometry.targetItems.map(item=>item.row)).size,rows.length);
  for(const item of geometry.targetItems){
    assert.ok(item.bounds.x>=geometry.targetArea.left,"target nie może wyjść poza lewy margines");
    assert.ok(item.bounds.x+item.bounds.w<=geometry.targetArea.right,"target ani × N nie może wyjść poza prawy margines");
    assert.ok(item.image.x>=item.bounds.x&&item.image.x+item.image.w<=item.bounds.x+item.bounds.w,"miniatura musi mieścić się w slocie");
    assert.ok(item.count.x>=item.bounds.x&&item.count.x+item.count.maxWidth<=item.bounds.x+item.bounds.w,"oznaczenie × N musi mieścić się w slocie");
  }
  assert.ok(geometry.scene.top>geometry.targetArea.bottom,"scena musi zaczynać się pod listą celów");
  assert.ok(geometry.scene.bottom<=1000&&geometry.scene.left>=70&&geometry.scene.right<=780,"scena musi mieścić się w bezpiecznym obszarze");
  if(count<=5){oneRowSceneTop??=geometry.scene.top;assert.equal(geometry.scene.top,oneRowSceneTop,"układ 1–5 powinien zachować wspólną geometrię sceny")}
  else assert.ok(geometry.scene.top>oneRowSceneTop,"drugi rząd musi przesunąć scenę niżej");
}

assert.match(studioSource,/FenixHiddenLayout\.compute\(targets\.length,s\)/,"Studio powinno używać wspólnej geometrii");
assert.match(productionSource,/FenixHiddenLayout\.compute\(targets\.length,s\)/,"Book Builder powinien używać wspólnej geometrii");
assert.match(studioIndex,/hidden-layout\.js\?v=1\.0\.0/);
assert.match(studioIndex,/hidden-loader\.js\?v=0\.15\.0/);
assert.match(loaderSource,/hidden\.js\?v=0\.15\.0/);
assert.match(bookIndex,/hidden-layout\.js\?v=1\.0\.0/);
assert.match(bookIndex,/hidden-production\.js\?v=1\.1\.0/);

const assets=new Map();
for(let i=1;i<=6;i++)assets.set(`target-${i}`,{id:`target-${i}`,dataUrl:`data:target-${i}`});
assets.set("distractor",{id:"distractor",dataUrl:"data:distractor"});
const contexts=[];
function makeContext(){
  const calls={drawImage:[],translate:[],ellipse:[]},ctx={calls};
  for(const name of ["save","restore","scale","fillRect","fillText","rotate","stroke","beginPath"]){ctx[name]=()=>{}};
  ctx.drawImage=(...args)=>calls.drawImage.push(args);
  ctx.translate=(...args)=>calls.translate.push(args);
  ctx.ellipse=(...args)=>calls.ellipse.push(args);
  return ctx;
}
const document={createElement(tag){assert.equal(tag,"canvas");const ctx=makeContext();contexts.push(ctx);return{width:0,height:0,getContext:()=>ctx}}};
class ImageMock{
  constructor(){this.naturalWidth=100;this.naturalHeight=100}
  set src(value){this._src=value;queueMicrotask(()=>this.onload?.())}
  get src(){return this._src}
}
const base={supports:()=>false,render:()=>null};
const renderWindow={FenixBookProductionRenderers:base,FenixHiddenLayout:layout};
const FenixCore={getAsset:id=>assets.get(id)||null,getActiveProject:()=>({assets:{}})};
vm.runInNewContext(productionSource,{window:renderWindow,document,Image:ImageMock,FenixCore,FenixHiddenLayout:layout,Object,Array,Math,Number,String,Map,Promise,Error,console,queueMicrotask},{filename:"hidden-production.js"});

const page={module:"hidden-objects-studio",title:"Robot X1",recipe:{module:"hidden-objects-studio",seed:"robot-x1",settings:{density:"easy",minSize:45,maxSize:45,rotate:"yes",instructionSize:24},content:{targets:Array.from({length:6},(_,i)=>({assetRef:`target-${i+1}`,count:1})),distractors:[{assetRef:"distractor"}]}}};
async function render(solution){
  const before=contexts.length,canvas=await renderWindow.FenixBookProductionRenderers.render(page,{solution,quality:"preview"});
  assert.equal(contexts.length,before+1);assert.equal(canvas.width,850);assert.equal(canvas.height,1100);return contexts.at(-1).calls;
}
function sceneBoxes(calls,targetCount){
  return calls.translate.map((center,index)=>{const draw=calls.drawImage[targetCount+index],w=draw[3],h=draw[4];return{x:center[0]-w/2,y:center[1]-h/2,w,h}});
}
function intersects(a,b,pad=8){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y)}

(async()=>{
  const geometry=layout.compute(6,{instructionSize:24}),task=await render(false),solution=await render(true);
  assert.deepEqual(task.drawImage.slice(0,6).map(call=>call.slice(1)),Array.from(geometry.targetItems,slot=>[slot.image.x,slot.image.y,slot.image.w,slot.image.h]),"6 celów powinno korzystać z układu 3+3");
  const taskBoxes=sceneBoxes(task,6),solutionBoxes=sceneBoxes(solution,6);
  assert.deepEqual(solutionBoxes,taskBoxes,"Task i Solution muszą mieć identyczną geometrię sceny");
  assert.ok(solution.ellipse.length>0,"Solution powinno nadal zaznaczać odnalezione cele");
  for(const [index,box] of taskBoxes.entries()){
    assert.ok(box.x>=geometry.scene.left&&box.x+box.w<=geometry.scene.right,`obiekt ${index} musi mieścić się poziomo w scenie`);
    assert.ok(box.y>=geometry.scene.top&&box.y+box.h<=geometry.scene.bottom,`obiekt ${index} nie może wejść w listę celów`);
    for(let other=0;other<index;other++)assert.equal(intersects(box,taskBoxes[other]),false,"obiekty sceny nie mogą na siebie nachodzić");
  }
  const legacy={module:"hidden-objects-studio",title:"Legacy",recipe:{seed:"legacy",settings:{},content:{targets:[{assetRef:"target-1",count:1}],distractors:[{assetRef:"distractor"}]}}};
  await assert.doesNotReject(()=>renderWindow.FenixBookProductionRenderers.render(legacy,{solution:false,quality:"preview"}),"starsza strona powinna nadal się renderować");
  console.log("PASS Hidden Objects: 1–5 jeden rząd, 6–10 dwa rzędy, bez przycinania, scena bez kolizji, Task/Solution i legacy zgodne.");
})().catch(error=>{console.error(error);process.exitCode=1});

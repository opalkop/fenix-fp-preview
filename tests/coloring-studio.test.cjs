"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const calls=[];
const context={fillStyle:"",font:"",textAlign:"",textBaseline:"",fillRect(...args){calls.push(["fillRect",...args])},fillText(...args){calls.push(["fillText",...args])},drawImage(...args){calls.push(["drawImage",...args])},measureText(text){return{width:String(text).length*42}}};
const document={createElement(name){assert.equal(name,"canvas");return{width:0,height:0,getContext:()=>context}}};
const sandbox={window:{},document,Image:class{},console};
const source=fs.readFileSync(path.join(__dirname,"../modules/coloring-studio/coloring-core.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"coloring-core.js"});

const Coloring=sandbox.window.FenixColoring;
assert(Coloring,"Brak FenixColoring");
const page={title:"Color the Whale!",recipe:{settings:{titleSize:112,instructionSize:46,assetScale:82,assetY:56},content:{assetRef:"ocean-whale"}}};
const options=Coloring.optionsFromPage(page);
assert.equal(options.assetRef,"ocean-whale");
assert.equal(options.titleSize,112);
assert.equal(options.assetScale,82);
const canvas=Coloring.render(page,{width:2550,height:3300,assetImage:{naturalWidth:1024,naturalHeight:1024}});
assert.equal(canvas.width,2550);
assert.equal(canvas.height,3300);
assert(calls.some(call=>call[0]==="drawImage"),"Asset nie został narysowany");
assert(calls.some(call=>call[0]==="fillText"&&call[1]==="Color the Whale!"),"Tytuł nie został narysowany");

console.log("PASS coloring-studio: receptura assetu, typografia i renderer 2550 × 3300.");

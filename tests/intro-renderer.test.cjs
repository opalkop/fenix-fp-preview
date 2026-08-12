"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

function fakeContext(){
  return{font:"",fillStyle:"",strokeStyle:"",lineWidth:0,textAlign:"",textBaseline:"",save(){},restore(){},fillRect(){},beginPath(){},roundRect(){},stroke(){},arc(){},moveTo(){},lineTo(){},fillText(){},measureText(text){return{width:String(text).length*28}}};
}
function fakeCanvas(){const context=fakeContext();return{width:0,height:0,getContext:()=>context,context}}

const sandbox={window:{},document:{createElement:()=>fakeCanvas()},console};
const source=fs.readFileSync(path.join(__dirname,"../modules/intro-studio/intro-renderer.js"),"utf8");
vm.runInNewContext(source,sandbox,{filename:"intro-renderer.js"});
const renderer=sandbox.window.FenixIntroRenderer;

assert.equal(renderer.PAGE_TYPES.length,6,"Intro Studio powinno mieć sześć podstawowych paneli stron.");
assert.equal(renderer.PAGE_TYPES[2].id,"mission-tracker","Mission Tracker powinien znajdować się po Your Mission.");
assert.match(renderer.defaults("welcome",{topic:"space"}).title,/Space Adventure/,"Welcome powinno korzystać z tematu projektu.");
const canvas=fakeCanvas(),page={title:"Custom title",recipe:{settings:{pageType:"mission",title:"Custom title",body:"This exact text goes to PDF.",footer:"Start now!",alignment:"left",style:"framed"}}};
assert.equal(renderer.render(page,{canvas,width:2550,height:3300}),canvas,"Renderer powinien użyć przekazanego canvasu.");
assert.equal(canvas.width,2550);assert.equal(canvas.height,3300);
assert.equal(renderer.fromPage(page).body,"This exact text goes to PDF.","Treść receptury musi zostać zachowana bez zamiany.");
const trackerDefaults=renderer.defaults("mission-tracker",{pages:[{module:"maze-studio"},{module:"word-search-studio"},{module:"intro-studio"},{module:"blank-page"}]});
assert.equal(trackerDefaults.trackerCount,2,"Automatyczny tracker powinien liczyć wyłącznie strony aktywności.");
const tracker={title:"MISSION TRACKER",recipe:{settings:{pageType:"mission-tracker",title:"MISSION TRACKER",body:"Color one star after each completed activity!",footer:"Great work!",trackerCount:35,trackerColumns:7,markerShape:"star"}}};
assert.equal(renderer.render(tracker,{canvas:fakeCanvas(),width:2550,height:3300}).width,2550,"Tracker powinien renderować stronę 300 DPI.");
const autoTracker={...tracker,recipe:{settings:{...tracker.recipe.settings,countMode:"auto",trackerCount:35}}},prepared=renderer.prepare(autoTracker,{pages:[{module:"maze-studio"},{module:"maze-studio"},{module:"intro-studio"}]});
assert.equal(prepared.recipe.settings.trackerCount,2,"Book Builder powinien odświeżyć automatyczny licznik Trackera.");

console.log("PASS intro-renderer: typy stron, temat projektu, receptura i canvas 300 DPI.");

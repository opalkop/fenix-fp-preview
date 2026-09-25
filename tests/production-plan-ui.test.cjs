"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"modules/book-builder/production-plan-ui.js"),"utf8");
const html=fs.readFileSync(path.join(root,"modules/book-builder/index.html"),"utf8");

assert.doesNotMatch(source,/window\.FenixCore/,"Kontroler planu nie może wymagać window.FenixCore, bo rdzeń jest globalnym const.");
assert.match(html,/production-plan-ui\.js\?v=0\.34\.2/,"Book Builder musi wymuszać pobranie poprawionej wersji kontrolera planu.");

const handlers={};
const elements={
  "#productionPlanPreset":{value:"ocean-fantasy-50"},
  "#applyProductionPlan":{disabled:false,addEventListener:(name,handler)=>{handlers[`apply:${name}`]=handler}},
  "#clearProductionPlan":{disabled:false,addEventListener:(name,handler)=>{handlers[`clear:${name}`]=handler}},
  "#productionPlanStatus":{textContent:""},
  "#pageList":null
};
const original=[{id:"activity-1",module:"maze-studio",recipe:{meta:{}}}];
const planned=[{...original[0],recipe:{meta:{productionPlan:{slot:2}}}}];
let saved=null,reloads=0,flushed=0;
const storage=new Map();
const FenixCore={getCart:()=>original,setCart:pages=>{saved=pages},flushStorage:async()=>{flushed++}};
const sandbox={
  window:{FenixProductionPlan:{
    applyPreset:(pages,presetId)=>{
      assert.equal(pages,original);
      assert.equal(presetId,"ocean-fantasy-50");
      return{pages:planned,assignedCount:1,missingCount:49,overflowCount:0,preset:{slots:Array(50)}};
    },
    describePage:()=>null
  }},
  FenixCore,
  document:{querySelector:selector=>elements[selector]??null,querySelectorAll:()=>[],createElement:()=>({})},
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  location:{reload:()=>{reloads++}},
  alert:message=>{throw new Error(`Nieoczekiwany alert: ${message}`)},
  console,
  Object
};

vm.runInNewContext(source,sandbox,{filename:"production-plan-ui.js"});
assert.equal(typeof handlers["apply:click"],"function","Przycisk zastosowania planu musi otrzymać handler kliknięcia.");
assert.equal(typeof handlers["clear:click"],"function","Przycisk usunięcia przypisań musi otrzymać handler kliknięcia.");

handlers["apply:click"]().then(()=>{
  assert.equal(saved,planned,"Kliknięcie musi zapisać strony uporządkowane przez plan.");
  assert.equal(flushed,1,"Kontroler musi zaczekać na pełny zapis IndexedDB przed przeładowaniem.");
  assert.equal(reloads,1,"Po zapisaniu planu Book Builder musi przeładować widok.");
  assert.match(storage.get("fenix-production-plan-message"),/Przypisano 1\/50/);
  console.log("PASS production-plan-ui: global const core binds controls and flushes storage before reload.");
}).catch(error=>{console.error(error);process.exitCode=1});

"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

function createCore(initialProjects){
  const storage=new Map([["fenix-projects-v1",JSON.stringify(initialProjects)],["fenix-active-project-v1",initialProjects[0].id]]);
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const normalizePage=page=>({...page,id:page.id||`page-${Math.random()}`,module:page.module||page.recipe?.module||"unknown",createdAt:page.createdAt||new Date().toISOString(),recipe:page.recipe||{module:page.module||"unknown",settings:{}},source:page.source||{app:"test"},solution:page.solution||{available:false},validation:page.validation||{kdp:{status:"unknown"}}});
  const window={FenixPageSchema:{normalize:normalizePage,moduleOf:page=>page.module||page.recipe?.module||"",VERSION:3},addEventListener(){},dispatchEvent(){}};
  const document={scripts:[],documentElement:{dataset:{}},body:{appendChild(){}},createElement:()=>({click(){},set rel(value){},set href(value){this._href=value},get href(){return this._href}})};
  const sandbox={window,document,localStorage,console,structuredClone,crypto:{randomUUID:()=>`id-${Math.random()}`},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Event:class{constructor(type){this.type=type}},Blob:class{},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},setTimeout};
  const source=fs.readFileSync(path.join(__dirname,"../core/fenix-core.js"),"utf8");
  vm.runInNewContext(`${source}\nglobalThis.__FenixCore=FenixCore;`,sandbox,{filename:"fenix-core.js"});
  return{core:sandbox.__FenixCore,storage};
}

const legacy={id:"legacy",name:"Starszy projekt",format:"8.5x11",bleed:"no-bleed",pages:[],assets:{},contentPlan:{version:2,scope:"intro",selectedModules:["maze-studio"]},createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"};
const{core,storage}=createCore([legacy]);
assert.equal(core.getActiveProject().contentPlan,undefined,"Błędny ręczny plan Intro powinien zostać usunięty podczas migracji.");
assert.equal(JSON.parse(storage.get("fenix-projects-v1"))[0].contentPlan,undefined,"Stary plan nie powinien wracać po odświeżeniu.");

const intro={id:"intro-welcome",module:"intro-studio",title:"Welcome",recipe:{module:"intro-studio",settings:{pageType:"welcome",title:"Welcome",body:"Exact PDF text"}}};
core.addPage(intro);
assert.equal(core.getCart().length,1,"Intro powinno dodać jedną stronę projektu.");
core.updatePage("intro-welcome",{...intro,title:"Welcome updated",recipe:{...intro.recipe,settings:{...intro.recipe.settings,title:"Welcome updated"}}});
assert.equal(core.getCart().length,1,"Aktualizacja panelu Intro nie może tworzyć duplikatu.");
assert.equal(core.getCart()[0].recipe.settings.body,"Exact PDF text","Treść receptury musi pozostać zachowana.");

console.log("PASS project-pages: migracja starego planu, dodanie i aktualizacja strony Intro bez duplikatu.");

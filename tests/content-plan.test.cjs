"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

function createCore(initialProjects){
  const storage=new Map();
  storage.set("fenix-projects-v1",JSON.stringify(initialProjects));
  storage.set("fenix-active-project-v1",initialProjects[0].id);
  const localStorage={
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  };
  const normalizePage=page=>({
    ...page,
    id:page.id||`page-${Math.random()}`,
    module:page.module||page.recipe?.module||"unknown",
    createdAt:page.createdAt||new Date().toISOString(),
    recipe:page.recipe||{module:page.module||"unknown"},
    source:page.source||{app:"test"},
    solution:page.solution||{available:false},
    validation:page.validation||{kdp:{status:"unknown"}}
  });
  const window={
    FenixPageSchema:{normalize:normalizePage,moduleOf:page=>page.module||page.recipe?.module||"",VERSION:3},
    addEventListener(){},dispatchEvent(){}
  };
  const document={
    scripts:[],documentElement:{dataset:{}},body:{appendChild(){}},
    createElement:()=>({click(){},set rel(value){},set href(value){this._href=value},get href(){return this._href}})
  };
  const sandbox={
    window,document,localStorage,console,structuredClone,
    crypto:{randomUUID:()=>`id-${Math.random()}`},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
    Event:class{constructor(type){this.type=type}},
    Blob:class{},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},setTimeout,
  };
  const source=fs.readFileSync(path.join(__dirname,"../core/fenix-core.js"),"utf8");
  vm.runInNewContext(`${source}\nglobalThis.__FenixCore=FenixCore;`,sandbox,{filename:"fenix-core.js"});
  return{core:sandbox.__FenixCore,storage};
}

const legacy={id:"legacy",name:"Starszy projekt",format:"8.5x11",bleed:"no-bleed",pages:[],assets:{},createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"};
const{core,storage}=createCore([legacy]);

assert.deepEqual(core.getContentPlan(),{version:1,selectedModules:[]},"Starszy projekt powinien dostać pusty plan v1.");
assert.deepEqual(JSON.parse(storage.get("fenix-projects-v1"))[0].contentPlan,{version:1,selectedModules:[]},"Migracja planu powinna zostać zapisana.");

core.setModulePlanned("intro-studio",true);
assert.equal(core.isModulePlanned("intro-studio"),true,"Studio powinno zostać dodane do planu.");

core.addPage({id:"maze-1",module:"maze-studio",title:"Maze"});
assert.equal(core.isModulePlanned("maze-studio"),true,"Dodanie pierwszej strony powinno automatycznie dodać Studio do planu.");

core.removePage("maze-1");
assert.equal(core.isModulePlanned("maze-studio"),true,"Usunięcie ostatniej strony nie może usuwać Studia z planu.");

core.addPage({id:"maze-2",module:"maze-studio",title:"Maze 2"});
core.setModulePlanned("maze-studio",false);
assert.equal(core.isModulePlanned("maze-studio"),false,"Studio powinno dać się usunąć z planu.");
assert.equal(core.getCart().length,1,"Usunięcie Studia z planu nie może usuwać jego stron.");

const imported=core.importProjectPayload({type:"FENIX_PROJECT",version:4,project:{...legacy,id:"source",name:"Import",contentPlan:{version:1,selectedModules:["word-search-studio","intro-studio"]}}});
assert.deepEqual(imported.contentPlan,{version:1,selectedModules:["word-search-studio","intro-studio"]},"Import powinien zachować plan zawartości.");

console.log("PASS content-plan: migracja, wybór, automatyczne dopisanie, zachowanie stron i import.");

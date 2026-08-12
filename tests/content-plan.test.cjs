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

assert.deepEqual(core.getIntroPlan(),{version:2,scope:"intro",selectedModules:[]},"Starszy projekt powinien dostać pustą konfigurację Intro v2.");
assert.deepEqual(JSON.parse(storage.get("fenix-projects-v1"))[0].contentPlan,{version:2,scope:"intro",selectedModules:[]},"Migracja konfiguracji Intro powinna zostać zapisana.");

core.setIntroModules(["maze-studio","word-search-studio","maze-studio","NIE POPRAWNE"]);
assert.deepEqual(core.getIntroPlan(),{version:2,scope:"intro",selectedModules:["maze-studio","word-search-studio"]},"Intro powinno zapisać wyłącznie prawidłowe, unikalne identyfikatory Studiów.");

core.addPage({id:"color-1",module:"coloring-studio",title:"Coloring"});
assert.deepEqual(core.getIntroPlan().selectedModules,["maze-studio","word-search-studio"],"Dodanie strony nie może samoczynnie zmieniać treści Intro.");
core.removePage("color-1");
assert.deepEqual(core.getIntroPlan().selectedModules,["maze-studio","word-search-studio"],"Usunięcie strony nie może zmieniać treści Intro.");

const imported=core.importProjectPayload({type:"FENIX_PROJECT",version:4,project:{...legacy,id:"source",name:"Import",contentPlan:{version:2,scope:"intro",selectedModules:["word-search-studio","certificate-studio"]}}});
assert.deepEqual(imported.contentPlan,{version:2,scope:"intro",selectedModules:["word-search-studio","certificate-studio"]},"Import powinien zachować konfigurację Intro.");

console.log("PASS intro-plan: migracja, wybór, niezależność od stron i import.");

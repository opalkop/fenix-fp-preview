"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

function createCore(initialProjects,initialLibrary={}){
  const storage=new Map([
    ["fenix-projects-v1",JSON.stringify(initialProjects)],
    ["fenix-active-project-v1",initialProjects[0].id],
    ["fenix-asset-library-v1",JSON.stringify(initialLibrary)]
  ]);
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const normalizePage=page=>({...page,id:page.id||`page-${Math.random()}`,module:page.module||page.recipe?.module||"unknown",createdAt:page.createdAt||new Date().toISOString(),recipe:page.recipe||{module:page.module||"unknown",settings:{}},source:page.source||{app:"test"},solution:page.solution||{available:false},validation:page.validation||{kdp:{status:"unknown"}}});
  const window={FenixPageSchema:{normalize:normalizePage,moduleOf:page=>page.module||page.recipe?.module||"",VERSION:3},addEventListener(){},dispatchEvent(){}};
  const document={scripts:[],documentElement:{dataset:{}},body:{appendChild(){}},createElement:()=>({click(){},set rel(value){},set href(value){this._href=value},get href(){return this._href}})};
  const sandbox={window,document,localStorage,console,structuredClone,crypto:{randomUUID:()=>`id-${Math.random()}`},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Event:class{constructor(type){this.type=type}},Blob:class{},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},setTimeout};
  const source=fs.readFileSync(path.join(__dirname,"../core/fenix-core.js"),"utf8");
  vm.runInNewContext(`${source}\nglobalThis.__FenixCore=FenixCore;`,sandbox,{filename:"fenix-core.js"});
  return{core:sandbox.__FenixCore,storage};
}

const project={id:"ocean-book",name:"Ocean Book",format:"8.5x11",bleed:"no-bleed",pages:[],assets:{},createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"};
const{core}=createCore([project]);

core.putLibraryAsset({id:"dolphin",name:"Magic Dolphin",filename:"dolphin.svg",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,dolphin",pack:"Ocean Fantasy"});
core.putLibraryAsset({id:"pearl",name:"Magic Pearl",filename:"pearl.svg",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,pearl",pack:"Ocean Fantasy"});

const activation=core.activateLibraryPack("Ocean Fantasy");
assert.equal(activation.activated,true);
assert.equal(activation.added,2);
assert.deepEqual([...core.getProjectAssetPacks()],["Ocean Fantasy"]);
assert.equal(core.listAssets().length,2,"Aktywacja biblioteki powinna podłączyć wszystkie jej assety.");

core.putLibraryAsset({id:"coral-gate",name:"Coral Gate",filename:"coral-gate.svg",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,gate",pack:"Ocean Fantasy"});
assert.equal(core.listAssets().length,3,"Nowy asset powinien automatycznie trafić do projektu korzystającego z biblioteki.");

const renamed=core.renameLibraryPack("Ocean Fantasy","Fantasy Ocean");
assert.equal(renamed.renamed,true);
assert.deepEqual([...core.getProjectAssetPacks()],["Fantasy Ocean"]);
assert.ok(core.listAssets().every(asset=>asset.pack==="Fantasy Ocean"),"Zmiana nazwy musi objąć kopie podłączone do projektu.");
assert.ok(core.listLibraryAssets().every(asset=>asset.pack==="Fantasy Ocean"),"Zmiana nazwy musi objąć całą bibliotekę globalną.");

const deactivation=core.deactivateLibraryPack("Fantasy Ocean");
assert.equal(deactivation.deactivated,true);
assert.equal(deactivation.removed,3);
assert.equal(core.listAssets().length,0);
assert.deepEqual([...core.getProjectAssetPacks()],[]);

const legacyAsset={id:"legacy-local",name:"Legacy Shell",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,shell",source:"fenix-library",pack:"Ocean Fantasy",libraryRef:"legacy-shell",meta:{libraryRef:"legacy-shell",pack:"Ocean Fantasy"}};
const legacyLibrary={"legacy-shell":{id:"legacy-shell",name:"Legacy Shell",mime:"image/svg+xml",dataUrl:"data:image/svg+xml,shell",source:"fenix-library",pack:"Ocean Fantasy"}};
const legacyProject={...project,id:"legacy-project",assets:{"legacy-local":legacyAsset}};
const{core:legacyCore}=createCore([legacyProject],legacyLibrary);
assert.deepEqual([...legacyCore.getProjectAssetPacks()],["Ocean Fantasy"],"Starsze projekty powinny odzyskać bibliotekę z istniejących referencji.");

console.log("PASS asset-libraries: aktywacja, automatyczne podpinanie, zmiana nazwy, odłączanie i migracja.");

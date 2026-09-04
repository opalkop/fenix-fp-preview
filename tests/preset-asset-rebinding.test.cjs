"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"..","core","preset-asset-rebinder-v2.js"),"utf8");

const project={id:"project-1",name:"Preset test",assetPacks:["Ocean Fantasy"],assets:{},pages:[{id:"page-1",module:"maze-studio",recipe:{settings:{startAssetName:"01-01-moonfin-dolphin",goalAssetName:"01-03-magic-pearl"},content:{assetName:"17-01-crystalhorn-coloring",assetNames:["13-01-magic-bubble-cluster","13-04-ocean-crystal"]},meta:{assetBindingMode:"name-filename",assetNames:["01-01-moonfin-dolphin"]}}}]};
const library=[
{id:"lib-moonfin",name:"01-01-moonfin-dolphin.png",filename:"01-01-moonfin-dolphin.png",pack:"Ocean Fantasy"},
{id:"lib-pearl",name:"01-03-magic-pearl",filename:"01-03-magic-pearl.svg",pack:"Ocean Fantasy"},
{id:"lib-color",name:"17-01-crystalhorn-coloring",filename:"17-01-crystalhorn-coloring.png",pack:"Ocean Fantasy"},
{id:"lib-bubble",name:"13-01-magic-bubble-cluster",filename:"13-01-magic-bubble-cluster.png",pack:"Ocean Fantasy"},
{id:"lib-crystal",name:"13-04-ocean-crystal",filename:"13-04-ocean-crystal.png",pack:"Ocean Fantasy"}
];
const linked=asset=>({...asset,id:`library-${asset.id}`,libraryRef:asset.id,meta:{libraryRef:asset.id,pack:asset.pack}});
const FenixCore={
  ready:Promise.resolve(),
  getActiveProjectId:()=>project.id,
  getActiveProject:()=>structuredClone(project),
  getProjects:()=>[structuredClone(project)],
  listLibraryAssets:({pack}={})=>library.filter(asset=>!pack||asset.pack===pack).map(asset=>structuredClone(asset)),
  activateLibraryPack(pack,projectId){assert.equal(pack,"Ocean Fantasy");assert.equal(projectId,project.id);let added=0;for(const asset of library){const local=linked(asset);if(!project.assets[local.id]){project.assets[local.id]=local;added++}}return{activated:true,added,total:library.length}},
  linkLibraryAsset(id,projectId){assert.equal(projectId,project.id);const asset=library.find(item=>item.id===id);if(!asset)return false;const local=linked(asset);project.assets[local.id]=local;return structuredClone(local)},
  listAssets:()=>Object.values(project.assets).map(asset=>structuredClone(asset)),
  updateProject(projectId,patch){assert.equal(projectId,project.id);project.pages=structuredClone(patch.pages);return structuredClone(project)},
  flushStorage:async()=>true
};
const listeners={};
const context={FenixCore,structuredClone,setTimeout,clearTimeout,console:{info(){},error(){},warn(){}},CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},document:{addEventListener(){}},window:{FenixCore,addEventListener(type,fn){listeners[type]=fn},dispatchEvent(){}}};
context.window.window=context.window;
vm.runInNewContext(source,context,{filename:"preset-asset-rebinder-v2.js"});

(async()=>{
  assert.ok(context.window.FenixPresetAssetRebinderV2,"rebinder API should be exposed");
  const result=await context.window.FenixPresetAssetRebinderV2.rebindProject(project.id);
  assert.equal(result.ok,true);assert.equal(result.activated,5);assert.equal(result.unresolved.length,0);assert.equal(Object.keys(project.assets).length,5);
  const recipe=project.pages[0].recipe;
  assert.equal(recipe.settings.startAssetRef,"library-lib-moonfin");assert.equal(recipe.settings.startAssetLibraryRef,"lib-moonfin");
  assert.equal(recipe.settings.goalAssetRef,"library-lib-pearl");assert.equal(recipe.content.assetRef,"library-lib-color");assert.equal(recipe.content.assetLibraryRef,"lib-color");
  assert.deepEqual(recipe.content.assetRefs,["library-lib-bubble","library-lib-crystal"]);assert.deepEqual(recipe.content.assetLibraryRefs,["lib-bubble","lib-crystal"]);
  console.log("preset asset rebinding: PASS");
})().catch(error=>{console.error(error);process.exitCode=1});

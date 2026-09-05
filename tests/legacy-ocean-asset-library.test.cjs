const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('core/asset-library-legacy-compat.js','utf8');

const projects=[{
  id:'p1',name:'Legacy project',pages:[{id:'page1',recipe:{content:{assetRef:'library-ocean-1'}}}],
  assets:{'library-ocean-1':{id:'library-ocean-1',name:'Dolphin',filename:'dolphin.png',mime:'image/png',dataUrl:'data:image/png;base64,AAA',libraryRef:'ocean-1',pack:'Ocean',meta:{libraryRef:'ocean-1',pack:'Ocean'}}}
}];
let library={
  'ocean-1':{id:'ocean-1',name:'Dolphin',filename:'dolphin.png',mime:'image/png',dataUrl:'data:image/png;base64,AAA',pack:'Ocean',source:'legacy',meta:{pack:'Ocean'}}
};

const FenixCore={
  ready:Promise.resolve(),
  listLibraryAssets:({pack})=>Object.values(library).filter(a=>a.pack===pack),
  updateLibraryAsset:(id,patch)=>{if(!library[id])return false;library[id]={...library[id],...patch,meta:{...(library[id].meta||{}),...(patch.meta||{})}};return library[id]},
  flushStorage:async()=>true,
  getAssetLibrary:()=>JSON.parse(JSON.stringify(library)),
  getProjects:()=>JSON.parse(JSON.stringify(projects)),
  updateProject:(id,patch)=>{const p=projects.find(x=>x.id===id);if(!p)return false;Object.assign(p,patch);return JSON.parse(JSON.stringify(p))},
  libraryPageUsage:id=>id==='ocean-1'?[{projectId:'p1',assetId:'library-ocean-1',id:'page1'}]:[],
  removeLibraryAsset:(id,{force}={})=>{if(!library[id])return false;assert.strictEqual(force,true);for(const p of projects){for(const [assetId,a] of Object.entries(p.assets||{})){if((a.libraryRef||a.meta?.libraryRef)===id)delete p.assets[assetId]}}delete library[id];return{removed:true}}
};

const context={
  console,
  structuredClone:global.structuredClone,
  FenixCore,
  CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},
  window:{dispatchEvent:()=>{}},
  setTimeout,
  clearTimeout
};
context.window.window=context.window;
context.window.FenixCore=FenixCore;
vm.createContext(context);
vm.runInContext(source,context,{filename:'asset-library-legacy-compat.js'});

(async()=>{
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(library['ocean-1'].source,'fenix-library');
  assert.strictEqual(library['ocean-1'].meta.legacyMigrated,true);

  const result=await context.window.FenixAssetLibraryCompat.removeLibraryAssetSafely('ocean-1');
  assert.strictEqual(result.removed,true);
  assert.strictEqual(result.preserved.materialized,1);
  assert.strictEqual(library['ocean-1'],undefined);
  assert.ok(projects[0].assets['library-ocean-1']);
  assert.strictEqual(projects[0].assets['library-ocean-1'].libraryRef,'');
  assert.strictEqual(projects[0].assets['library-ocean-1'].source,'project-local');
  assert.strictEqual(projects[0].assets['library-ocean-1'].dataUrl,'data:image/png;base64,AAA');
  assert.strictEqual(projects[0].pages[0].recipe.content.assetRef,'library-ocean-1');
  console.log('legacy-ocean-asset-library: ok');
})().catch(err=>{console.error(err);process.exit(1)});

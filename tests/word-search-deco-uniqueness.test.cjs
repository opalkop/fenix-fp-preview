"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("modules/word-search-studio/word-search-core.js","utf8");

class FakeImage{}
const sandbox={
  window:{},
  structuredClone:value=>JSON.parse(JSON.stringify(value)),
  console,
  Image:FakeImage,
  document:{createElement(){return{width:0,height:0,getContext(){return null}}}}
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:"word-search-core.js"});

const core=sandbox.window.FenixWordSearch;
assert.ok(core,"FenixWordSearch should initialize");

const refs=["asset-a","asset-b","asset-c"];
const options={seed:3,decoAssetRefs:refs,decoCount:3,decoScale:100};
const images=Object.fromEntries(refs.map(id=>[id,{naturalWidth:100,naturalHeight:100}]));
const calls=[];
const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(image){calls.push(image)}};
const bounds={left:500,top:500,right:2000,bottom:2500};

const result=core.drawDecoForTest(ctx,options,images,2550,3300,bounds,1);
assert.equal(result.length,3,"should render three decorations");
assert.equal(new Set(result.map(item=>item.assetRef)).size,3,"three selected refs should be used once each before repeating");
assert.deepEqual(new Set(result.map(item=>item.assetRef)),new Set(refs));

console.log("word-search deco uniqueness OK");

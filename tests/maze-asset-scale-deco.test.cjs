"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");

let renderedOpts=null;
const base={
  render(page,opts){renderedOpts=opts;return{ok:true}},
  prepareAssets(){return Promise.resolve({})}
};
const sandbox={window:{FenixMaze:base},console,structuredClone};
vm.runInNewContext(fs.readFileSync(path.join(root,"modules/maze-studio/maze-asset-refresh.js"),"utf8"),sandbox,{filename:"maze-asset-refresh.js"});

const helper=sandbox.window.FenixMazeEnhancements;
assert.ok(helper,"Maze enhancements helper powinien być dostępny.");
assert.equal(helper.version,"0.34.2");
assert.equal(helper.scaleForRole("endpoint",100),100,"100% powinno pozostać rzeczywistym 100%.");
assert.equal(helper.scaleForRole("endpoint",180),180,"180% powinno pozostać rzeczywistym 180%.");
assert.equal(helper.scaleForRole("mission",80),80,"Checkpoint/Hazard powinny zachować skalę z UI.");
assert.equal(typeof helper.cropTransparent,"function","Skalowanie ma korzystać z widocznych granic assetu.");
assert.equal(typeof helper.cropImages,"function","Renderer ma umieć przyciąć przezroczyste marginesy assetów.");

sandbox.window.FenixMaze.render({module:"maze-studio"},{assetImages:{}});
assert.ok(renderedOpts,"Renderer bazowy powinien zostać wywołany.");

const source=fs.readFileSync(path.join(root,"modules/maze-studio/maze-asset-refresh.js"),"utf8");
assert.match(source,/FenixCore\.listAssets\(\)/,"Deco powinno korzystać z pełnej biblioteki assetów.");
assert.match(source,/mazeDecoSearch/,"Deco powinno mieć wyszukiwarkę biblioteki.");
assert.match(source,/getImageData/,"Skalowanie powinno wykrywać realny obrys widocznego assetu.");
const html=fs.readFileSync(path.join(root,"modules/maze-studio/index.html"),"utf8");
assert.match(html,/maze-asset-refresh\.js\?v=0\.34\.2/,"Maze Studio musi wymuszać pobranie bieżącej poprawki zamiast starego cache.");
assert.match(html,/<details open><summary>4\. DECO/,"Warstwa Deco ma być od razu widoczna w Studio.");

console.log("PASS maze-asset-scale-deco: visible-bounds scaling, cache bust and full-library Deco picker.");
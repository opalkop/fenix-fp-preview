"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");

let renderedPage=null;
const base={
  render(page){renderedPage=page;return{ok:true}},
  prepareAssets(){return Promise.resolve({})}
};
const sandbox={window:{FenixMaze:base},console,structuredClone};
vm.runInNewContext(fs.readFileSync(path.join(root,"modules/maze-studio/maze-asset-refresh.js"),"utf8"),sandbox,{filename:"maze-asset-refresh.js"});

const helper=sandbox.window.FenixMazeEnhancements;
assert.ok(helper,"Maze enhancements helper powinien być dostępny.");
assert.equal(helper.version,"0.34.0");
assert.equal(helper.scaleForRole("endpoint",100),170,"100% START/META ma dawać wyraźnie większy asset.");
assert.equal(helper.scaleForRole("endpoint",180),306,"180% START/META ma zachować pełny zakres wizualny.");
assert.equal(helper.scaleForRole("mission",80),124,"Checkpoint/Hazard ma również realnie reagować na procent.");

const page={module:"maze-studio",recipe:{settings:{
  startAssetRef:"start",goalAssetRef:"goal",checkpointAssetRef:"cp",hazardAssetRef:"hz",
  startAssetScale:100,goalAssetScale:180,checkpointScale:80,hazardScale:100
}}};
sandbox.window.FenixMaze.render(page,{});
assert.ok(renderedPage,"Renderer bazowy powinien zostać wywołany.");
assert.equal(renderedPage.recipe.settings.startAssetScale,170);
assert.equal(renderedPage.recipe.settings.goalAssetScale,306);
assert.equal(renderedPage.recipe.settings.checkpointScale,124);
assert.equal(renderedPage.recipe.settings.hazardScale,155);
assert.equal(page.recipe.settings.startAssetScale,100,"Wrapper nie może mutować zapisanej receptury użytkownika.");
assert.equal(page.recipe.settings.goalAssetScale,180,"Wartości zapisane w projekcie pozostają procentami z UI.");

const source=fs.readFileSync(path.join(root,"modules/maze-studio/maze-asset-refresh.js"),"utf8");
assert.match(source,/FenixCore\.listAssets\(\)/,"Deco powinno korzystać z pełnej biblioteki assetów, nie wyłącznie z tagu deco.");
assert.match(source,/mazeDecoSearch/,"Deco powinno mieć wyszukiwarkę biblioteki.");
assert.match(source,/decoCount/,"Wybranie Deco powinno aktywować liczbę dekoracji.");

console.log("PASS maze-asset-scale-deco: real scale mapping, immutable recipes and full-library Deco picker.");
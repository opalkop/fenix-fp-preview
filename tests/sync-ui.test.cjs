"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../core/sync-ui.js"),"utf8");

for(const text of ["Synchronizuj projekt","Pobierz projekt","Wyślij projekt","Biblioteka assetów","Pobierz assety","Wyślij assety","Globalna biblioteka assetów nie jest częścią tego pliku."]){
  assert.ok(source.includes(text),`Brak wymaganego tekstu UI: ${text}`);
}
assert.ok(source.includes('FenixSync.pullAssets()'));
assert.ok(source.includes('FenixSync.pushAssets()'));
assert.ok(source.includes('pullAssets({allowEmptyReplacement:true})'));
assert.ok(source.includes('remote-empty-local-nonempty'));
assert.ok(source.includes('window.confirm('));
assert.ok(source.includes('if(out.reloadRequired)'));
assert.ok(source.includes('queuePush'));
assert.ok(source.includes('execute("push",{silent:true})'));
assert.equal(source.includes('out.stats?.library'),false,"Project Sync UI nie może pokazywać statystyk globalnej biblioteki.");
assert.equal(source.includes('syncAssets('),false,"UI nie może używać automatycznego Asset Sync pull→push.");

console.log("PASS sync-ui: project and global asset sync are explicitly separated in the UI.");

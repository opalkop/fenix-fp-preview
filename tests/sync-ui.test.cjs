"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../core/sync-ui.js"),"utf8");

for(const text of ["Synchronizuj projekt","Pobierz projekt","Wyślij projekt","Biblioteka assetów","Pobierz assety","Wyślij assety"]){
  assert.ok(source.includes(text),`Brakuje jawnego elementu UI: ${text}`);
}
assert.ok(source.includes('FenixSync.pullAssets()'),"Asset pull musi wywoływać wyłącznie Asset Sync API.");
assert.ok(source.includes('FenixSync.pushAssets()'),"Asset push musi wywoływać wyłącznie Asset Sync API.");
assert.ok(source.includes('pullAssets({allowEmptyReplacement:true})'),"Pusta biblioteka musi wymagać jawnego potwierdzenia przed destrukcyjnym pull.");
assert.ok(source.includes('remote-empty-local-nonempty'),"UI musi rozpoznawać ochronę empty-remote.");
assert.ok(source.includes('window.confirm('),"Destrukcyjne wyczyszczenie biblioteki musi wymagać potwierdzenia użytkownika.");
assert.ok(source.includes('if(out.reloadRequired)'),"Reload po Asset Pull może nastąpić dopiero po udanej wymianie storage.");
assert.ok(!source.includes('out.stats?.library'),"Project Sync UI nie może raportować statystyk globalnej biblioteki.");
assert.ok(source.includes('Globalna biblioteka assetów nie jest częścią tego pliku.'),"Opis .fenixsync musi jasno wykluczać globalną bibliotekę.");

const queueStart=source.indexOf("function queuePush");
const queueEnd=source.indexOf("async function refreshFromRemote",queueStart);
const queueSource=source.slice(queueStart,queueEnd);
assert.ok(queueSource.includes('execute("push"'),"Auto-sync ma używać wyłącznie projektowego push.");
assert.ok(!queueSource.includes("Assets"),"Auto-sync nie może być podłączony do Asset Sync.");

console.log("PASS sync-ui: project and asset sync controls remain explicitly separated.");

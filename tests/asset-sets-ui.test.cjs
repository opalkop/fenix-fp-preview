"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const script=fs.readFileSync(path.join(root,"assets/project-assets.js"),"utf8");

for(const id of ["assetSetList","assetSetCreate","assetSetWorkspace","assetSetAddFiles","assetSetRename","assetSetPreviewDetails","assetSetAssetGrid"]){
  assert.match(html,new RegExp(`id=["']${id}["']`),`Brakuje elementu interfejsu: ${id}`);
}

for(const removed of ["projectAssetTagFilter","projectAssetStatusFilter","projectAssetValidateAll","projectAssetsBulk","Dodaj tylko do projektu"]){
  assert.doesNotMatch(html,new RegExp(removed),`Stary, przeładowany element nadal jest widoczny: ${removed}`);
}

assert.match(script,/putLibraryAsset\(\{\.\.\.base,validation\}\)/,"Import powinien zapisywać pliki we wspólnej bibliotece.");
assert.match(script,/pack,?/i,"Import powinien wskazywać otwarty zestaw.");
assert.match(script,/data-delete-asset/,"Każda miniatura powinna mieć przycisk usuwania.");
assert.match(script,/removeLibraryAsset\(asset\.id\)/,"Usuwanie powinno dotyczyć pojedynczego assetu biblioteki.");

console.log("PASS asset-sets-ui: prosty wybór zestawu, jednoznaczny import i zwijany podgląd.");

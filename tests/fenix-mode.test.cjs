"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const dashboard=read("index.html");
const core=read("core/fenix-core.js");
const shell=read("assets/studio-shell.js");

assert.doesNotMatch(shell,/<option value="fenix">Fenix Mode<\/option>/,"Studios nie powinny wystawiać starego Fenix Mode");
assert.match(shell,/localStorage\.setItem\("fenix-ui-theme","light"\)/,"Studio shell powinien utrwalać tryb jasny");
assert.match(shell,/document\.documentElement\.dataset\.theme="light"/,"Studia powinny wymuszać tryb jasny");
assert.match(shell,/querySelectorAll\('link\[data-fenix-theme="fenix-mode"\]'\)\.forEach\(link=>link\.remove\(\)\)/,"Studio shell powinien usuwać odziedziczony arkusz Fenix Mode");
assert.doesNotMatch(core,/addStyle\("fenix-mode"/,"Core nie powinien już ładować martwego arkusza Fenix Mode");
assert.doesNotMatch(core,/appendChild\(fenixModeStyle\)/,"Core nie powinien przepinać martwego arkusza Fenix Mode");
assert.ok(dashboard.length>0,"Dashboard powinien istnieć");
console.log("PASS fenix-mode: light-only Studio UX without dead Fenix Mode runtime layer.");

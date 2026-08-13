"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const dashboard=read("index.html");
const core=read("core/fenix-core.js");
const shell=read("assets/studio-shell.js");
const css=read("assets/fenix-mode.css");

assert.match(dashboard,/<option value="fenix">Fenix Mode<\/option>/,"dashboard exposes Fenix Mode");
assert.match(shell,/<option value="fenix">Fenix Mode<\/option>/,"Studios expose Fenix Mode");
assert.match(core,/addStyle\("fenix-mode","fenix-mode\.css\?v=0\.22\.7"\)/,"core loads the shared Fenix Mode layer");
assert.match(css,/:root\[data-theme="fenix"\]/,"theme tokens are scoped");
assert.match(css,/body\.dashboard-v2:before/,"dashboard has the mountain layer");
assert.match(css,/body\.fenix-studio-shell/,"Studios share the visual theme");
assert.doesNotMatch(css,/data-theme="light"|data-theme="dark"|data-theme="system"/,"existing themes are not overridden");
console.log("PASS fenix-mode");

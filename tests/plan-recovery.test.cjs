"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../modules/book-builder/plan-recovery.html"),"utf8");
assert.match(html,/PLAN RECOVERY 2026-09-25 v1/);
assert.match(html,/FenixProductionPlan\.applyPreset\(project\.pages,"ocean-fantasy-50"\)/);
assert.match(html,/localStorage\.setItem\(PROJECTS_KEY,JSON\.stringify\(projects\)\)/);
assert.doesNotMatch(html,/fenix-core\.js|book-builder\.js|IndexedDB\.open|indexedDB\.open/i);
console.log("PASS plan-recovery: metadata-only production plan repair page.");

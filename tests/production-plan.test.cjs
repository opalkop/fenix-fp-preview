"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");

const sandbox={window:{},console,Object};
vm.runInNewContext(fs.readFileSync(path.join(root,"core/production-plan.js"),"utf8"),sandbox,{filename:"core/production-plan.js"});
const planner=sandbox.window.FenixProductionPlan;
const preset=planner.PRESETS["ocean-fantasy-50"];
assert.equal(preset.slots.length,50,"Ocean Fantasy musi mieć dokładnie 50 slotów.");
assert.equal(preset.slots[0].zoneName,"Coral Reef");
assert.equal(preset.slots[10].zoneName,"Turtle Bay");
assert.equal(preset.slots[20].zoneName,"Sunken Treasure");
assert.equal(preset.slots[30].zoneName,"Mystic Deep");
assert.equal(preset.slots[40].zoneName,"Fantasy Kingdom");

const counts={};
preset.slots.forEach(slot=>{counts[slot.module]=(counts[slot.module]||0)+1});
assert.deepEqual(counts,{
  "coloring-studio":10,
  "maze-studio":10,
  "matching-studio":5,
  "dot-to-dot-studio":6,
  "hidden-objects-studio":6,
  "complete-picture":4,
  "word-search-studio":5,
  "logic-studio":4
});

// Symulujemy realny workflow: użytkownik produkuje całe Studia seriami,
// a nie w kolejności docelowych stron książki.
const intro={id:"intro",module:"intro-studio",recipe:{meta:{}}};
const closing={id:"cert",module:"certificate-studio",recipe:{meta:{}}};
const grouped=[];
Object.entries(counts).forEach(([module,count])=>{
  for(let i=1;i<=count;i++)grouped.push({id:`${module}-${i}`,module,recipe:{module,meta:{}}});
});
const result=planner.applyPreset([intro,...grouped,closing],"ocean-fantasy-50");
assert.equal(result.assignedCount,50);
assert.equal(result.missingCount,0);
assert.equal(result.overflowCount,0);
const activities=result.pages.filter(planner.isActivity);
assert.deepEqual(Array.from(activities,page=>planner.moduleOf(page)),Array.from(preset.slots,slot=>slot.module),"Plan musi przeplatać Studia według 50-slotowej mapy.");
activities.forEach((page,index)=>{
  const meta=planner.describePage(page);
  assert.equal(meta.slot,index+1);
  assert.equal(meta.zoneName,preset.slots[index].zoneName);
  assert.equal(meta.activityInZone,preset.slots[index].activityInZone);
});
assert.equal(result.pages[0].id,"intro","Plan nie może ruszać Intro.");
assert.equal(result.pages.at(-1).id,"cert","Plan nie może ruszać zakończenia.");

// Plan ma działać także częściowo: np. po wykonaniu tylko wszystkich Maze.
const mazes=Array.from({length:10},(_,i)=>({id:`maze-${i+1}`,module:"maze-studio",recipe:{module:"maze-studio",meta:{}}}));
const partial=planner.applyPreset(mazes,"ocean-fantasy-50");
assert.equal(partial.assignedCount,10);
assert.equal(partial.missingCount,40);
assert.deepEqual(Array.from(partial.pages,page=>planner.describePage(page).slot),[2,7,12,17,22,26,31,36,42,46]);

// Ponowne zastosowanie planu po dodaniu innych Studiów musi zachować wcześniejsze sloty Maze.
const recolored=[...partial.pages,{id:"color-1",module:"coloring-studio",recipe:{module:"coloring-studio",meta:{}}}];
const rerun=planner.applyPreset(recolored,"ocean-fantasy-50");
assert.deepEqual(Array.from(rerun.pages.filter(page=>planner.moduleOf(page)==="maze-studio"),page=>planner.describePage(page).slot),[2,7,12,17,22,26,31,36,42,46]);
assert.equal(planner.describePage(rerun.pages.find(page=>page.id==="color-1")).slot,1);

console.log("PASS production-plan: Ocean Fantasy 5x10 auto-mix, partial workflow and stable slot metadata.");

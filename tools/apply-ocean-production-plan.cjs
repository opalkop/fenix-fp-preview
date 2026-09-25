"use strict";

const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const file=process.argv[2];
if(!file)throw new Error("Usage: node apply-ocean-production-plan.cjs <fenix-sync/projects.json>");

const root=path.join(__dirname,"..");
const sandbox={window:{}};
vm.createContext(sandbox);
for(const source of ["core/production-plan.js","core/book-order.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,source),"utf8"),sandbox,{filename:source});
}

const bundle=JSON.parse(fs.readFileSync(file,"utf8"));
const project=bundle.projects?.find(item=>item.name==="Ocean Fantasy Adventure #3");
if(!project)throw new Error("Ocean Fantasy Adventure #3 was not found.");
if(project.pages?.length!==59)throw new Error(`Expected 59 project pages, found ${project.pages?.length||0}.`);

const planner=sandbox.window.FenixProductionPlan;
const order=sandbox.window.FenixBookOrder;
const withoutPlan=page=>{
  const copy=structuredClone(page);
  if(copy.recipe?.meta)delete copy.recipe.meta.productionPlan;
  delete copy.productionPlan;
  return copy;
};
const contentHash=pages=>crypto.createHash("sha256").update(JSON.stringify(pages.map(withoutPlan).sort((a,b)=>String(a.id).localeCompare(String(b.id))))).digest("hex");
const beforeHash=contentHash(project.pages);
const result=planner.applyPreset(project.pages,"ocean-fantasy-50");
if(result.assignedCount!==50||result.missingCount!==0||result.overflowCount!==0){
  throw new Error(`Plan is incomplete: assigned=${result.assignedCount}, missing=${result.missingCount}, overflow=${result.overflowCount}.`);
}

const pages=order.sort(result.pages);
const activities=pages.filter(planner.isActivity);
const actualSlots=activities.map(page=>planner.describePage(page)?.slot||0);
if(actualSlots.some((slot,index)=>slot!==index+1))throw new Error(`Invalid activity slot order: ${actualSlots.join(",")}`);
const afterHash=contentHash(pages);
if(beforeHash!==afterHash)throw new Error("Page content changed while applying metadata-only production plan.");

const stamp=new Date().toISOString();
project.pages=pages;
project.updatedAt=stamp;
bundle.updatedAt=stamp;
fs.writeFileSync(file,JSON.stringify(bundle));
console.log(JSON.stringify({
  project:project.name,
  pages:pages.length,
  activities:activities.length,
  assigned:result.assignedCount,
  missing:result.missingCount,
  overflow:result.overflowCount,
  slots:actualSlots,
  pageContentUnchanged:beforeHash===afterHash
},null,2));

"use strict";

window.FenixModuleContracts=(()=>{
  const SCHEMA_VERSION=3;
  const contracts=Object.freeze({
    "maze-studio":{version:1,capabilities:["seeded-layout","assets","solution"]},
    "word-search-studio":{version:1,capabilities:["seeded-grid","solution"]},
    "coloring-studio":{version:2,capabilities:["project-assets","edit-by-id"]},
    "complete-picture":{version:2,capabilities:["project-assets","edit-by-id"]},
    "tracing-studio":{version:2,capabilities:["project-assets","edit-by-id"]},
    "matching-studio":{version:2,capabilities:["project-assets","solution","edit-by-id"]},
    "dot-to-dot-studio":{version:2,capabilities:["svg-contour","seeded-points","solution","edit-by-id"]},
    "hidden-objects-studio":{version:2,capabilities:["targets","distractors","seeded-layout","solution","edit-by-id"]},
    "logic-studio":{version:5,capabilities:["project-assets","sequence","odd","matrix","sudoku-4x4","analogy","sudoku-four-assets","balanced-sudoku-missing","solution","edit-by-id"]}
  });
  const key=value=>String(value||"").trim().toLowerCase();
  function get(module){return contracts[key(module)]||null}
  function version(module){return get(module)?.version||0}
  function stamp(page={}){const module=key(page.module||page.recipe?.module),contract=get(module);if(!contract)return page;const recipe={...(page.recipe||{}),meta:{...(page.recipe?.meta||{}),moduleVersion:contract.version,capabilities:[...contract.capabilities]}};return{...page,schemaVersion:SCHEMA_VERSION,module,recipe}}
  function check(page={}){const module=key(page.module||page.recipe?.module),contract=get(module),incoming=Number(page.recipe?.meta?.moduleVersion||page.moduleVersion||0);if(!contract)return{ok:false,module,reason:"unknown-module",supportedVersion:0,incomingVersion:incoming};if(incoming>contract.version)return{ok:false,module,reason:"newer-module-version",supportedVersion:contract.version,incomingVersion:incoming};return{ok:true,module,reason:incoming<contract.version?"upgrade-compatible":"compatible",supportedVersion:contract.version,incomingVersion:incoming}}
  return Object.freeze({SCHEMA_VERSION,contracts,get,version,stamp,check});
})();

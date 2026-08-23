"use strict";
(()=>{
  const r=window.FenixStandardRenderers;
  if(!r||!Array.isArray(r.modules))return;
  const snapshotModules=new Set(["tracing-studio","logic-studio"]);
  const modules=r.modules.filter(module=>!snapshotModules.has(module));
  try{
    r.modules.splice(0,r.modules.length,...modules);
  }catch{
    window.FenixStandardRenderers=Object.freeze({...r,modules:Object.freeze(modules)});
  }
})();

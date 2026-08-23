"use strict";
(()=>{
  const r=window.FenixStandardRenderers;
  if(!r||!Array.isArray(r.modules))return;
  const modules=r.modules.filter(module=>module!=="tracing-studio");
  try{
    r.modules.splice(0,r.modules.length,...modules);
  }catch{
    window.FenixStandardRenderers=Object.freeze({...r,modules});
  }
})();

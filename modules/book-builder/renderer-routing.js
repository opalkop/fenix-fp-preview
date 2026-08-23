"use strict";
(()=>{
  const r=window.FenixStandardRenderers;
  if(!r||!Array.isArray(r.modules))return;
  const blocked=new Set(["logic-studio","tracing-studio"]);
  const modules=r.modules.filter(module=>!blocked.has(module));
  window.FenixStandardRenderers=Object.freeze({
    render:r.render,
    modules:Object.freeze(modules)
  });
})();

"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(!standard||!Array.isArray(standard.modules))return;
  const blocked=new Set(["hidden-objects-studio","tracing-studio","logic-studio"]);
  window.FenixStandardRenderers=Object.freeze({
    render:standard.render,
    modules:Object.freeze(standard.modules.filter(module=>!blocked.has(module)))
  });
})();

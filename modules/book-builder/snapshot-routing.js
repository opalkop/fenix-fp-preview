"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(!standard||!Array.isArray(standard.modules))return;
  const snapshotModules=new Set(["logic-studio","tracing-studio"]);
  window.FenixStandardRenderers=Object.freeze({
    render:standard.render.bind(standard),
    modules:Object.freeze(standard.modules.filter(module=>!snapshotModules.has(module)))
  });
})();

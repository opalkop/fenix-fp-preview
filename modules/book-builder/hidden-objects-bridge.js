"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(!standard||!Array.isArray(standard.modules)||!standard.modules.includes("hidden-objects-studio"))return;
  window.FenixStandardRenderers=Object.freeze({
    render:standard.render,
    modules:Object.freeze(standard.modules.filter(module=>module!=="hidden-objects-studio"))
  });
})();

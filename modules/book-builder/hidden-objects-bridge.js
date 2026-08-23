"use strict";
(()=>{
  const standard=window.FenixStandardRenderers;
  if(!standard||!Array.isArray(standard.modules))return;

  // These studios must be rendered from the exact page snapshots saved by
  // their studios. Re-generating them through StandardRenderers recreates
  // default/initial data (e.g. tracing patterns and Logic without project
  // assets), so Book Builder must fall through to preview.imageData /
  // solution.imageData instead.
  const snapshotModules=new Set([
    "hidden-objects-studio",
    "logic-studio",
    "tracing-studio"
  ]);

  window.FenixStandardRenderers=Object.freeze({
    render:standard.render,
    modules:Object.freeze(standard.modules.filter(module=>!snapshotModules.has(module)))
  });
})();

"use strict";

(()=>{
  const current=[...document.scripts].find(script=>/\/core\/preset-asset-rebinder\.js(?:\?|$)/.test(script.src));
  if(window.FenixPresetAssetRebinderV2){window.FenixPresetAssetRebinder=window.FenixPresetAssetRebinderV2;return}
  const script=document.createElement("script");
  script.src=new URL("preset-asset-rebinder-v2.js?v=0.34.1",current?.src||location.href).href;
  script.onload=()=>{window.FenixPresetAssetRebinder=window.FenixPresetAssetRebinderV2;};
  script.onerror=()=>console.error("FENIX: nie udało się załadować preset-asset-rebinder-v2.js");
  document.head.appendChild(script);
})();

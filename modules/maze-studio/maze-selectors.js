"use strict";
(()=>{
  const core=typeof FenixCore!=="undefined"?FenixCore:null;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  function gameplayAssets(){
    try{return core.findAssets({tag:"gameplay"})||[]}catch(error){console.error("Maze selectors: asset lookup failed",error);return[]}
  }
  function fill(id){
    const select=$(id);if(!select)return;
    const selected=select.value||"",assets=gameplayAssets();
    select.innerHTML='<option value="">Bez assetu</option>'+assets.map(asset=>`<option value="${esc(asset.id)}">${esc(asset.name)}</option>`).join('');
    if(assets.some(asset=>asset.id===selected))select.value=selected;
  }
  function refresh(){fill("checkpointAsset");fill("hazardAsset")}
  refresh();
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.activeProject)refresh()});
  window.addEventListener("fenix-assets-change",refresh);
  window.addEventListener("fenix-project-change",refresh);
  setTimeout(refresh,0);
})();

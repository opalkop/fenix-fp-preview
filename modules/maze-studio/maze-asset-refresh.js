"use strict";
(()=>{
  const pageId=()=>new URLSearchParams(location.search).get("id");
  const canvas=()=>document.getElementById("page");
  let running=false,lastRun=0;
  async function rerenderSavedMaze(){
    const id=pageId();
    if(!id||running||!window.FenixCore||!window.FenixMaze||!window.FenixPageSchema)return;
    const now=Date.now();
    if(now-lastRun<120)return;
    running=true;lastRun=now;
    try{
      await FenixCore.ready;
      if(typeof FenixCore.flushStorage==="function")await FenixCore.flushStorage();
      const raw=FenixCore.getCart().find(item=>item.id===id&&FenixPageSchema.moduleOf(item)==="maze-studio");
      if(!raw)return;
      const page=FenixPageSchema.normalize(raw),s=page.recipe?.settings||{};
      const refs=[s.startAssetRef,s.goalAssetRef,s.checkpointAssetRef,s.hazardAssetRef,...(Array.isArray(s.decoAssetRefs)?s.decoAssetRefs:[])].filter(Boolean);
      if(!refs.length)return;
      const images=await FenixMaze.prepareAssets(page);
      if(!Object.keys(images).length)return;
      FenixMaze.render(page,{solution:!!s.showSolution,width:2550,height:3300,canvas:canvas(),assetImages:images});
      const status=document.getElementById("status");
      if(status)status.textContent="Wczytano zapisany labirynt z assetami";
    }catch(error){console.error("Maze asset refresh failed",error)}finally{running=false}
  }
  window.addEventListener("fenix-storage-ready",()=>setTimeout(rerenderSavedMaze,0));
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.storage)setTimeout(rerenderSavedMaze,0)});
  Promise.resolve().then(async()=>{if(window.FenixCore?.ready)await FenixCore.ready;requestAnimationFrame(()=>requestAnimationFrame(rerenderSavedMaze))});
})();
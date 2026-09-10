"use strict";

(()=>{
  const SAVE_DELAY=80;
  let saveTimer=null;
  let storageReloadDone=false;

  const pageList=()=>document.querySelector("#pageList");
  const reloadButton=()=>document.querySelector("#reloadCart");
  const summary=()=>document.querySelector("#cartSummary");

  function domPageIds(){
    return [...document.querySelectorAll("#pageList .page-card[data-page-id]")]
      .map(card=>String(card.dataset.pageId||"").trim())
      .filter(Boolean);
  }

  function persistDomOrder(){
    if(!window.FenixCore)return false;
    const ids=domPageIds();
    if(!ids.length)return false;
    const current=FenixCore.getCart();
    if(!Array.isArray(current)||!current.length)return false;
    const byId=new Map(current.map(page=>[String(page?.id||""),page]));
    if(ids.some(id=>!byId.has(id)))return false;
    const listed=new Set(ids),ordered=ids.map(id=>byId.get(id));
    for(const page of current)if(!listed.has(String(page?.id||"")))ordered.push(page);
    const before=current.map(page=>String(page?.id||""));
    const after=ordered.map(page=>String(page?.id||""));
    if(before.length===after.length&&before.every((id,index)=>id===after[index]))return false;
    FenixCore.setCart(ordered);
    const node=summary();
    if(node)node.textContent=`Zapisano kolejność ${ordered.length} stron w projekcie.`;
    return true;
  }

  function queueSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      try{persistDomOrder()}catch(error){console.error("Book Builder order persistence failed",error)}
    },SAVE_DELAY);
  }

  function installOrderPersistence(){
    const list=pageList();
    if(!list||list.dataset.persistOrderInstalled==="1")return;
    list.dataset.persistOrderInstalled="1";
    list.addEventListener("click",event=>{
      if(event.target?.closest?.("[data-up],[data-down],[data-remove]"))queueSave();
    },true);
    list.addEventListener("drop",()=>queueSave(),true);
    list.addEventListener("dragend",()=>queueSave(),true);
  }

  async function refreshAfterStorageReady(){
    if(storageReloadDone)return;
    storageReloadDone=true;
    try{
      if(window.FenixCore?.ready)await FenixCore.ready;
      await new Promise(resolve=>setTimeout(resolve,120));
      reloadButton()?.click();
      installOrderPersistence();
    }catch(error){console.error("Book Builder storage refresh failed",error)}
  }

  window.addEventListener("fenix-storage-ready",()=>{
    storageReloadDone=false;
    void refreshAfterStorageReady();
  });
  window.addEventListener("fenix-state-change",()=>installOrderPersistence());

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>void refreshAfterStorageReady(),{once:true});
  }else{
    void refreshAfterStorageReady();
  }

  window.FenixBookBuilderStabilizer=Object.freeze({persistDomOrder,refreshAfterStorageReady});
})();

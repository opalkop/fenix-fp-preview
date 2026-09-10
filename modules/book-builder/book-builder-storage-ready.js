"use strict";
(()=>{
  let refreshed=false;

  async function refreshWhenStorageReady(){
    if(refreshed)return;
    try{
      if(window.FenixCore?.ready)await FenixCore.ready;
      refreshed=true;
      const reload=document.querySelector("#reloadCart");
      if(reload)reload.click();
    }catch(error){
      console.error("Book Builder storage-ready refresh failed",error);
    }
  }

  if(document.readyState==="loading"){
    window.addEventListener("DOMContentLoaded",refreshWhenStorageReady,{once:true});
  }else{
    refreshWhenStorageReady();
  }

  window.addEventListener("fenix-storage-ready",refreshWhenStorageReady,{once:true});
})();

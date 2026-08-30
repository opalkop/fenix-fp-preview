"use strict";
(async()=>{
  try{
    await FenixCore.ready;
    const load=src=>new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=src;
      s.onload=resolve;
      s.onerror=reject;
      document.body.appendChild(s);
    });
    await load("hidden.js?v=0.14.1");
    await load("hidden-pages.js?v=0.12.1");
  }catch(error){
    console.error("Hidden Objects init",error);
    const status=document.getElementById("status");
    if(status){status.textContent=`Błąd inicjalizacji: ${error?.message||error}`;status.dataset.type="error";}
  }
})();

"use strict";
(async()=>{
  try{
    await FenixCore.ready;
    const load=src=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
    await load("ctp.js?v=0.37.0");
    await load("ctp-pages.js?v=0.37.0");
  }catch(error){console.error("Complete Picture init",error);const status=document.getElementById("status");if(status){status.textContent=`Błąd inicjalizacji: ${error?.message||error}`;status.dataset.type="error"}}
})();
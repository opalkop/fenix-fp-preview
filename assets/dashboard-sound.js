"use strict";
(()=>{
  const ownScriptSrc=document.currentScript?.src||new URL("assets/dashboard-sound.js",location.href).href;
  try{localStorage.setItem("fenix-dashboard-sound","off")}catch{}
  const removeToggle=()=>document.getElementById("dashboardSoundToggle")?.remove();
  const loadDiagnosticExport=()=>{
    if(window.FenixDiagnosticExport||document.querySelector('script[data-fenix-diagnostic-export]'))return;
    const script=document.createElement("script");
    script.src=new URL("../core/diagnostic-export.js?v=1.0.2",ownScriptSrc).href;
    script.dataset.fenixDiagnosticExport="true";
    script.onload=()=>console.info("FENIX: eksport diagnostyczny gotowy");
    script.onerror=()=>console.error("FENIX: nie udało się załadować eksportu diagnostycznego");
    document.head.appendChild(script);
  };
  window.FenixDashboardSound=Object.freeze({
    play:async()=>false,
    isEnabled:()=>false,
    isUnlocked:()=>false,
    setEnabled:()=>false
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{removeToggle();loadDiagnosticExport()},{once:true});
  else{removeToggle();loadDiagnosticExport()}
})();

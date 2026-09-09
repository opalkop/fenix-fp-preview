"use strict";
(()=>{
  try{localStorage.setItem("fenix-dashboard-sound","off")}catch{}
  const removeToggle=()=>document.getElementById("dashboardSoundToggle")?.remove();
  const loadDiagnosticExport=()=>{
    if(window.FenixDiagnosticExport||document.querySelector('script[data-fenix-diagnostic-export]'))return;
    const script=document.createElement("script");
    script.src=new URL("../core/diagnostic-export.js?v=1.0.0",document.currentScript?.src||location.href).href;
    script.dataset.fenixDiagnosticExport="true";
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

"use strict";
(()=>{
  try{localStorage.setItem("fenix-dashboard-sound","off")}catch{}
  const removeToggle=()=>document.getElementById("dashboardSoundToggle")?.remove();
  window.FenixDashboardSound=Object.freeze({
    play:async()=>false,
    isEnabled:()=>false,
    isUnlocked:()=>false,
    setEnabled:()=>false
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",removeToggle,{once:true});
  else removeToggle();
})();

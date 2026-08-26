"use strict";
(()=>{
 function load(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
 (async()=>{try{await load("maze-engine.js?v=0.30.0");await load("maze-render-fix.js?v=0.30.0");await load("maze-difficulty.js?v=0.30.0");const trigger=document.getElementById("startAssetScale");if(trigger)trigger.dispatchEvent(new Event("input",{bubbles:true}))}catch(error){console.error("Maze advanced engine bootstrap failed",error)}})();
})();

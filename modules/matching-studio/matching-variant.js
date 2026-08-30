"use strict";
(()=>{
  const button=document.getElementById("newPage"),seed=document.getElementById("seed");
  if(!button||!seed)return;
  const original=button.onclick;
  button.onclick=function(event){
    seed.value=`fenix-match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    seed.dispatchEvent(new Event("input",{bubbles:true}));
    if(typeof original==="function")return original.call(this,event);
  };
})();
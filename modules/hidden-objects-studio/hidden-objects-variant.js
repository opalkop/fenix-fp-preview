"use strict";
(()=>{
  const generate=document.getElementById('generate'),seed=document.getElementById('seed');
  if(!generate||!seed)return;
  generate.textContent='Nowy układ';
  generate.onclick=()=>{
    const base=String(seed.value||'fenix-hidden').replace(/-v[0-9a-z]+$/i,'');
    seed.value=`${base}-v${Date.now().toString(36)}`;
    seed.dispatchEvent(new Event('input',{bubbles:true}));
  };
})();
"use strict";
(()=>{
  function install(paneId,gridId,placeholder){
    const pane=document.getElementById(paneId),grid=document.getElementById(gridId);
    if(!pane||!grid||pane.querySelector('.logic-asset-search'))return false;
    const input=document.createElement('input');
    input.type='search';
    input.className='logic-asset-search';
    input.placeholder=placeholder;
    input.autocomplete='off';
    input.style.cssText='width:100%;box-sizing:border-box;margin:8px 0 10px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;background:#fff;color:#111;';
    grid.insertAdjacentElement('beforebegin',input);
    const filter=()=>{
      const q=input.value.trim().toLocaleLowerCase('pl');
      grid.querySelectorAll('.logic-asset').forEach(card=>{
        const name=(card.querySelector('strong')?.textContent||card.textContent||'').toLocaleLowerCase('pl');
        card.hidden=!!q&&!name.includes(q);
      });
    };
    input.addEventListener('input',filter);
    input.addEventListener('search',filter);
    return true;
  }
  function boot(){
    install('projectPane','assetGrid','Szukaj assetu projektu…');
    install('libraryPane','libraryGrid','Szukaj w Bibliotece Feniksa…');
  }
  boot();
  let tries=0;const timer=setInterval(()=>{boot();if(++tries>=12)clearInterval(timer)},180);
  window.addEventListener('fenix-state-change',()=>setTimeout(boot,0));
})();

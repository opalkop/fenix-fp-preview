"use strict";
(()=>{
  const tabs=document.querySelector('.source-tabs');
  if(!tabs||document.getElementById('tracingAssetSearch'))return;

  const row=document.createElement('div');
  row.className='tracing-asset-search-row';
  row.innerHTML='<label for="tracingAssetSearch">Znajdź asset</label><input id="tracingAssetSearch" type="search" placeholder="Wpisz nazwę, np. moonfin, mosshell, 01-01" autocomplete="off"><span id="tracingAssetSearchInfo" class="note"></span>';
  tabs.insertAdjacentElement('afterend',row);

  const input=document.getElementById('tracingAssetSearch');
  const info=document.getElementById('tracingAssetSearchInfo');

  const activeGrid=()=>document.getElementById('librarySourcePane')?.hidden===false
    ? document.getElementById('libraryGrid')
    : document.getElementById('assetGrid');

  function apply(){
    const grid=activeGrid();
    if(!grid)return;
    const cards=[...grid.children].filter(el=>el.nodeType===1);
    const q=(input.value||'').trim().toLowerCase();
    let shown=0;
    for(const card of cards){
      const text=(card.innerText||card.textContent||'').toLowerCase();
      const match=!q||text.includes(q);
      card.hidden=!match;
      if(match)shown++;
    }
    info.textContent=q?`${shown} z ${cards.length} pasujących`:`${cards.length} assetów`;
  }

  input.addEventListener('input',apply);
  document.getElementById('tabProject')?.addEventListener('click',()=>setTimeout(apply,0));
  document.getElementById('tabLibrary')?.addEventListener('click',()=>setTimeout(apply,0));
  document.getElementById('importAsset')?.addEventListener('click',()=>setTimeout(apply,250));
  document.getElementById('assetGrid')?.addEventListener('click',()=>setTimeout(apply,0));
  document.getElementById('libraryGrid')?.addEventListener('click',()=>setTimeout(apply,0));

  const style=document.createElement('style');
  style.textContent='.tracing-asset-search-row{display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px;align-items:center;margin:10px 0 12px}.tracing-asset-search-row label{font-weight:700}.tracing-asset-search-row input{width:100%;min-width:0;padding:10px 12px;border:1px solid #cbd5df;border-radius:8px;background:#fff;color:#17202a}.tracing-asset-search-row .note{white-space:nowrap}@media(max-width:720px){.tracing-asset-search-row{grid-template-columns:1fr}.tracing-asset-search-row .note{white-space:normal}}';
  document.head.appendChild(style);

  setTimeout(apply,0);
})();
"use strict";
(()=>{
 const tabs=document.querySelector('.source-tabs');
 if(!tabs)return;
 const row=document.createElement('div');
 row.className='dot-asset-search';
 row.innerHTML='<label>Znajdź asset<input id="dotAssetSearch" type="search" placeholder="Wpisz nazwę, np. moonfin, starglow, 01-01" autocomplete="off"></label><span id="dotAssetSearchInfo" class="note"></span>';
 tabs.insertAdjacentElement('afterend',row);
 const input=document.getElementById('dotAssetSearch'),info=document.getElementById('dotAssetSearchInfo');
 function cards(){const library=!document.getElementById('libraryPane')?.hidden;return [...document.querySelectorAll(library?'#libraryGrid .library-card':'#assetGrid .asset-card')];}
 function apply(){const q=input.value.trim().toLowerCase(),list=cards();let shown=0;for(const card of list){const text=(card.querySelector('strong')?.textContent||card.textContent||'').toLowerCase();const ok=!q||text.includes(q);card.hidden=!ok;if(ok)shown++;}info.textContent=q?`${shown} z ${list.length} pasujących`:`${list.length} assetów`;}
 input.addEventListener('input',apply);
 document.getElementById('tabProject')?.addEventListener('click',()=>setTimeout(apply,0));
 document.getElementById('tabLibrary')?.addEventListener('click',()=>setTimeout(apply,0));
 document.addEventListener('click',e=>{if(e.target.closest('.asset-card,.library-card'))setTimeout(apply,0)});
 window.addEventListener('fenix-state-change',()=>setTimeout(apply,0));
 const style=document.createElement('style');style.textContent='.dot-asset-search{display:flex;gap:12px;align-items:end;margin:12px 0}.dot-asset-search label{display:flex;flex-direction:column;gap:6px;flex:1;font-weight:700}.dot-asset-search input{width:100%;padding:10px 12px;border:1px solid #cbd5df;border-radius:8px;background:#fff;color:#111}.dot-asset-search .note{white-space:nowrap;padding-bottom:10px}';document.head.appendChild(style);
 setTimeout(apply,0);
})();
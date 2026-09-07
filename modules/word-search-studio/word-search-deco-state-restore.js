"use strict";
(()=>{
  if(typeof document==="undefined"||typeof FenixCore==="undefined")return;
  let token=0;
  const allLibrary=()=>FenixCore.listLibraryAssets?.()||[];
  const libraryRefOfLocal=id=>{const asset=FenixCore.getAsset?.(id);return String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim()};
  const refsFromSettings=settings=>{const direct=Array.isArray(settings?.decoLibraryRefs)?settings.decoLibraryRefs:[];if(direct.length)return[...new Set(direct.map(String).filter(Boolean))];const local=Array.isArray(settings?.decoAssetRefs)?settings.decoAssetRefs:[];return[...new Set(local.map(id=>libraryRefOfLocal(id)||String(id||"")).filter(Boolean))]};
  const packForRefs=refs=>{const library=allLibrary();for(const ref of refs){const asset=library.find(item=>item.id===ref),pack=String(asset?.pack||asset?.meta?.pack||"").trim();if(pack)return pack}return""};
  const wait=(ms=30)=>new Promise(resolve=>setTimeout(resolve,ms));
  async function restore(settings){const myToken=++token,refs=refsFromSettings(settings);if(!refs.length)return;for(let tries=0;tries<20&&myToken===token;tries++){const select=document.getElementById("wsDecoAssetPack"),host=document.getElementById("decoAssetChoices");if(select&&host){const pack=packForRefs(refs);if(pack&&select.value!==pack){select.value=pack;select.dispatchEvent(new Event("change",{bubbles:true}));await wait(60)}for(const ref of refs){if(myToken!==token)return;for(let i=0;i<12;i++){const input=host.querySelector(`input[data-library-id="${CSS.escape(ref)}"]`);if(input){if(!input.checked){input.checked=true;input.dispatchEvent(new Event("change",{bubbles:true}))}break}await wait(35)}}document.getElementById("decoCount")?.dispatchEvent(new Event("input",{bubbles:true}));return}await wait(40)}}
  window.addEventListener("fenix-word-search-page-loaded",event=>restore(event.detail?.settings||{}));
})();

"use strict";
(()=>{
  if(typeof document==="undefined"||!window.FenixCore)return;
  const ROLE_IDS=["startAsset","goalAsset","checkpointAsset","hazardAsset"];
  const PREFIX="__fenix_library__:";
  let busy=false,timer=null,observer=null;
  const esc=value=>String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[ch]));
  const refOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  const packOf=asset=>String(asset?.pack||asset?.meta?.pack||"Bez pakietu").trim()||"Bez pakietu";
  const libraryAssets=()=>FenixCore.listLibraryAssets?.()||[];
  const projectAssets=()=>FenixCore.listAssets?.()||[];
  function linkedLocalId(libraryId){const found=projectAssets().find(asset=>refOf(asset)===libraryId);return found?.id||""}
  function emptyText(id){return id==="startAsset"?"Bez assetu — znacznik S":id==="goalAsset"?"Bez assetu — znacznik M":"Bez assetu"}
  function expectedCount(){return libraryAssets().length+1}
  function rebuildOne(id,preferred=""){
    const select=document.getElementById(id);if(!select)return;
    const current=preferred||select.value||"";
    const globals=libraryAssets().slice().sort((a,b)=>packOf(a).localeCompare(packOf(b),"pl")||String(a.name||"").localeCompare(String(b.name||""),"pl"));
    const groups=new Map();
    for(const asset of globals){const pack=packOf(asset);if(!groups.has(pack))groups.set(pack,[]);groups.get(pack).push(asset)}
    let html=`<option value="">${emptyText(id)}</option>`;
    for(const [pack,assets] of groups){html+=`<optgroup label="${esc(pack)}">`;for(const asset of assets){const localId=linkedLocalId(asset.id),value=localId||`${PREFIX}${asset.id}`;html+=`<option value="${esc(value)}">${esc(asset.name||asset.filename||asset.id)}</option>`}html+='</optgroup>'}
    busy=true;
    select.innerHTML=html;
    if([...select.options].some(option=>option.value===current))select.value=current;
    else if(current){const local=FenixCore.getAsset?.(current),libRef=refOf(local);if(libRef){const fallback=linkedLocalId(libRef)||`${PREFIX}${libRef}`;if([...select.options].some(option=>option.value===fallback))select.value=fallback}}
    busy=false;
  }
  function rebuildAll(){
    for(const id of ROLE_IDS)rebuildOne(id);
    const info=document.getElementById("assetInfo"),packs=FenixCore.listLibraryPacks?.()||[],count=libraryAssets().length;
    if(info)info.textContent=`GLOBALNA BIBLIOTEKA: ${count} assetów · ${packs.length} zestawów (${packs.join(" / ")||"brak"}). START, META, CHECKPOINT i ZAGROŻENIE pokazują pełną bibliotekę.`;
  }
  function schedule(delay=25){clearTimeout(timer);timer=setTimeout(()=>{if(!busy){bind();rebuildAll()}},delay)}
  function onRoleChange(event){
    const select=event.currentTarget,value=String(select.value||"");
    if(!value.startsWith(PREFIX)||busy)return;
    const libraryId=value.slice(PREFIX.length);
    busy=true;
    try{
      const linked=FenixCore.linkLibraryAsset?.(libraryId);
      const localId=linked?.id||linkedLocalId(libraryId);
      busy=false;
      rebuildOne(select.id,localId||"");
      if(localId){select.value=localId;select.dispatchEvent(new Event("input",{bubbles:true}));select.dispatchEvent(new Event("change",{bubbles:true}))}
    }finally{busy=false}
    schedule(20);
  }
  function bind(){
    for(const id of ROLE_IDS){
      const select=document.getElementById(id);if(!select)continue;
      if(!select.dataset.globalLibraryPicker){select.dataset.globalLibraryPicker="1";select.addEventListener("change",onRoleChange)}
    }
    if(!observer){
      const host=document.querySelector(".asset-maze-grid");
      if(host){observer=new MutationObserver(()=>{if(busy)return;for(const id of ROLE_IDS){const select=document.getElementById(id);if(select&&select.options.length<expectedCount())return schedule(0)}});observer.observe(host,{childList:true,subtree:true})}
    }
  }
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.library||event.detail?.activeProject||event.detail?.storage)schedule(20)});
  window.addEventListener("fenix-storage-ready",()=>schedule(0));
  window.addEventListener("fenix-library-change",()=>schedule(0));
  window.addEventListener("fenix-assets-change",()=>schedule(0));
  Promise.resolve().then(async()=>{if(FenixCore.ready)await FenixCore.ready;bind();rebuildAll();setTimeout(schedule,100);setTimeout(schedule,500);setTimeout(schedule,1500)});
})();

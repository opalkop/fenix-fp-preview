"use strict";
(()=>{
  if(typeof document==="undefined"||typeof FenixCore==="undefined")return;

  const PACK_ID="wsDecoAssetPack";
  const CHOICES_ID="decoAssetChoices";
  let busy=false,timer=null;
  let selectedLibraryIds=new Set();

  const esc=value=>String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[ch]));
  const refOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();
  const packOf=asset=>String(asset?.pack||asset?.meta?.pack||"").trim();
  const tagsOf=asset=>Array.isArray(asset?.tags)?asset.tags.map(tag=>String(tag||"").trim().toLowerCase()):[];
  const libraryPacks=()=>FenixCore.listLibraryPacks?.()||[];
  const libraryAssets=pack=>FenixCore.listLibraryAssets?.({pack:pack||""})||[];
  const projectAssets=()=>FenixCore.listAssets?.()||[];

  function linkedLocalId(libraryId){
    const found=projectAssets().find(asset=>refOf(asset)===libraryId);
    return found?.id||"";
  }

  function libraryIdFromValue(value){
    const local=FenixCore.getAsset?.(value);
    return refOf(local)||"";
  }

  function captureSelectionsFromDom(){
    const host=document.getElementById(CHOICES_ID);if(!host)return;
    const next=new Set();
    host.querySelectorAll('input[type="checkbox"]:checked').forEach(input=>{
      const explicit=String(input.dataset.libraryId||"").trim();
      const linked=libraryIdFromValue(input.value);
      const candidate=explicit||linked;
      if(candidate)next.add(candidate);
    });
    selectedLibraryIds=next;
  }

  function selectedPackFromAssets(){
    for(const libraryId of selectedLibraryIds){
      const asset=FenixCore.listLibraryAssets?.().find(item=>item.id===libraryId);
      const pack=packOf(asset);
      if(pack)return pack;
    }
    return"";
  }

  function ensureStyle(){
    if(document.getElementById("ws-global-deco-style"))return;
    const style=document.createElement("style");
    style.id="ws-global-deco-style";
    style.textContent='.ws-deco-pack-label{display:grid;gap:5px;margin:10px 0 12px}.ws-deco-pack-label select{width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#fff}.ws-deco-pack-label small{font-size:11px;color:#64748b}';
    document.head.appendChild(style);
  }

  function ensurePackSelect(){
    const choices=document.getElementById(CHOICES_ID);if(!choices)return null;
    let select=document.getElementById(PACK_ID);if(select)return select;
    ensureStyle();
    const block=choices.closest(".deco-block")||choices.parentElement;
    const label=document.createElement("label");
    label.className="ws-deco-pack-label";
    label.innerHTML=`Zestaw assetów DECO<select id="${PACK_ID}"></select><small>Wybierz bibliotekę, z której Word Search ma pobierać dekoracje.</small>`;
    block.insertBefore(label,choices);
    select=label.querySelector("select");
    select.addEventListener("change",()=>{if(busy)return;selectedLibraryIds.clear();rebuildChoices(true);triggerDraw()});
    return select;
  }

  function preferredPack(current=""){
    const packs=libraryPacks();
    const selected=selectedPackFromAssets();
    const project=FenixCore.getActiveProject?.();
    const primary=String(project?.primaryAssetPack||"").trim();
    const candidates=[current,selected,primary];
    for(const candidate of candidates){
      const match=packs.find(pack=>pack.toLowerCase()===String(candidate||"").toLowerCase());
      if(match)return match;
    }
    return"";
  }

  function fillPackOptions(){
    const select=ensurePackSelect();if(!select)return"";
    const packs=libraryPacks();
    const current=preferredPack(select.value);
    busy=true;
    select.innerHTML='<option value="">— wybierz zestaw assetów —</option>'+packs.map(pack=>`<option value="${esc(pack)}">${esc(pack)}</option>`).join("");
    select.value=current;
    busy=false;
    return current;
  }

  function candidateAssets(pack){
    const all=libraryAssets(pack).slice().sort((a,b)=>String(a.name||a.filename||"").localeCompare(String(b.name||b.filename||""),"pl"));
    const tagged=all.filter(asset=>tagsOf(asset).includes("deco"));
    return tagged.length?tagged:all;
  }

  function triggerDraw(){
    document.getElementById("decoCount")?.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function rebuildChoices(packChanged=false){
    const choices=document.getElementById(CHOICES_ID);if(!choices)return;
    if(!packChanged)captureSelectionsFromDom();
    const pack=fillPackOptions();
    const assets=pack?candidateAssets(pack):[];
    busy=true;
    choices.innerHTML=assets.length?assets.map(asset=>{
      const localId=linkedLocalId(asset.id);
      const checked=selectedLibraryIds.has(asset.id);
      const status=asset.validation?.status==="ok"?"✓ B&W OK":"! sprawdź B&W";
      return`<label class="deco-choice"><input type="checkbox" value="${esc(localId||asset.id)}" data-library-id="${esc(asset.id)}" ${checked?"checked":""}><span><strong>${esc(asset.name||asset.filename||asset.id)}</strong><small>${esc(status)}</small></span></label>`;
    }).join(""):(pack?'<div class="asset-empty">Brak assetów w wybranym zestawie.</div>':'<div class="asset-empty">Najpierw wybierz zestaw assetów.</div>');
    const info=document.getElementById("assetInfo");
    if(info)info.textContent=pack?`Word Search pobiera dekoracje z zestawu „${pack}”. Jeśli zestaw ma assety oznaczone tagiem Deco, pokazuje tylko je; w przeciwnym razie udostępnia cały zestaw.`:`Wybierz zestaw assetów DECO. Sama siatka pozostaje czysta i czarno-biała.`;
    busy=false;
  }

  function onChoiceChange(event){
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=="checkbox"||!input.closest(`#${CHOICES_ID}`)||busy)return;
    const libraryId=String(input.dataset.libraryId||"").trim();
    if(!libraryId)return;
    event.stopImmediatePropagation();
    if(input.checked){
      selectedLibraryIds.add(libraryId);
      let localId=linkedLocalId(libraryId);
      if(!localId){
        busy=true;
        try{
          const linked=FenixCore.linkLibraryAsset?.(libraryId);
          localId=linked?.id||linkedLocalId(libraryId);
        }finally{busy=false}
      }
      if(localId)input.value=localId;
    }else selectedLibraryIds.delete(libraryId);
    rebuildChoices(false);
    triggerDraw();
  }

  function bind(){
    const choices=document.getElementById(CHOICES_ID);if(!choices)return;
    ensurePackSelect();
    if(!choices.dataset.wsGlobalDecoPicker){
      choices.dataset.wsGlobalDecoPicker="1";
      choices.addEventListener("change",onChoiceChange,true);
    }
  }

  function schedule(delay=25){
    clearTimeout(timer);
    timer=setTimeout(()=>{if(busy)return;bind();rebuildChoices(false)},delay);
  }

  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.library||event.detail?.activeProject||event.detail?.storage)schedule(35)});
  window.addEventListener("fenix-storage-ready",()=>schedule(0));
  window.addEventListener("fenix-library-change",()=>schedule(0));
  window.addEventListener("fenix-assets-change",()=>schedule(0));
  document.getElementById("pageSelect")?.addEventListener("change",()=>setTimeout(()=>{selectedLibraryIds.clear();schedule(0)},0));

  bind();
  schedule(0);
  setTimeout(schedule,150);
  setTimeout(schedule,600);
})();

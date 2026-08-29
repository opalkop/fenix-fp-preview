"use strict";

(()=>{
  const $=selector=>document.querySelector(selector),canvas=$("#page"),ctx=canvas.getContext("2d");
  const requestedId=new URLSearchParams(location.search).get("id");
  const state={assets:[],selectedAssetId:null,lockedAssetId:null,pages:[],editingId:requestedId||null};let refreshTimer=null,restoreTimer=null;
  const val=(id,fallback="")=>$("#"+id)?.value??fallback;
  const checked=id=>Boolean($("#"+id)?.checked);
  const number=(id,fallback)=>Number(val(id,fallback))||fallback;
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

  function setStatus(text,error=false){const el=$("#status");el.textContent=text;el.dataset.type=error?"error":"ok"}
  function currentOptions(){return{title:val("title",FenixColoring.DEFAULTS.title),instructions:val("instructions",FenixColoring.DEFAULTS.instructions),showTitle:checked("showTitle"),showInstructions:checked("showInstructions"),titleSize:number("titleSize",112),instructionSize:number("instructionSize",46),titleY:number("titleY",230),assetScale:number("assetScale",82),assetY:number("assetY",56)}}
  function eligibleAssets(){return FenixCore.listAssets().sort((a,b)=>{const ac=(a.tags||[]).includes("content")?0:1,bc=(b.tags||[]).includes("content")?0:1;return ac-bc||String(a.name).localeCompare(String(b.name),"pl")})}
  function libraryRefOf(asset){return String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim()}
  function chosenAsset(){const id=state.lockedAssetId||state.selectedAssetId;return id?state.assets.find(asset=>asset.id===id)||FenixCore.getAsset(id):null}
  function identityFromPage(page){const content=page?.recipe?.content||page?.content||{},settings=page?.recipe?.settings||page?.settings||{},meta=page?.recipe?.meta||{};return{assetRef:content.assetRef||settings.assetRef||settings.lockedAssetRef||null,libraryRef:content.assetLibraryRef||settings.assetLibraryRef||meta.assetLibraryRef||null,name:content.assetName||meta.assetName||null,filename:content.assetFilename||meta.assetFilename||null}}
  function resolveSavedAsset(page){
    const ident=identityFromPage(page),assets=state.assets.length?state.assets:eligibleAssets();
    if(ident.assetRef){const exact=assets.find(asset=>asset.id===ident.assetRef)||FenixCore.getAsset(ident.assetRef);if(exact)return exact}
    let lib=String(ident.libraryRef||"").trim();if(!lib&&String(ident.assetRef||"").startsWith("library-"))lib=String(ident.assetRef).slice(8);
    if(lib){const linked=assets.find(asset=>libraryRefOf(asset)===lib||asset.id===`library-${lib}`);if(linked)return linked}
    if(ident.filename){const byFile=assets.filter(asset=>String(asset.filename||"")===String(ident.filename));if(byFile.length===1)return byFile[0]}
    if(ident.name){const byName=assets.filter(asset=>String(asset.name||"")===String(ident.name));if(byName.length===1)return byName[0]}
    return null
  }
  function assetWithPayload(asset){if(!asset)return null;const fresh=FenixCore.getAsset(asset.id)||asset;if(fresh.dataUrl)return fresh;const ref=libraryRefOf(fresh),library=FenixCore.getAssetLibrary?.(),source=ref&&library?library[ref]:null;return source?.dataUrl?{...fresh,dataUrl:source.dataUrl,mime:source.mime||fresh.mime}:fresh}
  function renderPicker(){
    state.assets=eligibleAssets();const select=$("#assetSelect"),empty=$("#assetEmpty"),locked=Boolean(state.lockedAssetId),activeId=state.lockedAssetId||state.selectedAssetId||"";
    empty.hidden=state.assets.length>0;select.innerHTML='<option value="">— wybierz asset —</option>'+state.assets.map(asset=>`<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.name||asset.filename||"Asset")}</option>`).join("");select.value=state.assets.some(asset=>asset.id===activeId)?activeId:"";select.disabled=locked||!state.assets.length;updateChosenPanel()
  }
  function updateChosenPanel(){
    const panel=$("#chosenAsset"),name=$("#chosenAssetName"),image=$("#chosenAssetImage"),badge=$("#chosenAssetBadge"),meta=$("#chosenAssetMeta"),change=$("#changeAsset"),asset=chosenAsset();
    if(!asset){panel.dataset.active="false";name.textContent="Nie wybrano assetu";image.removeAttribute("src");image.alt="";badge.textContent="BRAK ASSETU";meta.textContent="Wybierz asset z listy powyżej.";change.disabled=true;return}
    const resolved=assetWithPayload(asset);panel.dataset.active="true";name.textContent=asset.name||"Asset";image.src=resolved?.dataUrl||"";image.alt=asset.name||"Asset";badge.textContent=state.lockedAssetId?"🔒 ASSET PRZYPISANY DO STRONY":"WYBRANY";meta.textContent=state.lockedAssetId?"Ten asset zostanie zapisany i odtworzony razem z tą stroną.":"Zatwierdź wybór, aby przypisać asset.";change.disabled=false
  }
  async function loadAssetImage(asset){
    const resolved=assetWithPayload(asset);if(!resolved?.dataUrl)throw new Error(`Asset „${asset?.name||"Coloring"}” nie ma dostępnych danych obrazu.`);
    const preview=$("#chosenAssetImage");if(preview?.src&&preview.complete&&preview.naturalWidth>0&&chosenAsset()?.id===asset.id)return preview;
    return FenixColoring.loadImage(resolved.dataUrl)
  }
  async function makePage(asset,original=null){
    const o=currentOptions(),resolved=assetWithPayload(asset);if(!resolved)throw new Error("Nie znaleziono wybranego assetu.");const image=await loadAssetImage(resolved),libRef=libraryRefOf(resolved);
    const page=FenixPageSchema.normalize({id:original?.id,createdAt:original?.createdAt,module:"coloring-studio",title:o.title,recipe:{module:"coloring-studio",seed:null,title:o.title,settings:{...o,pageIndex:0,lockedAssetRef:resolved.id,assetLibraryRef:libRef||null},content:{assetRef:resolved.id,assetLibraryRef:libRef||null,assetName:resolved.name||null,assetFilename:resolved.filename||null},meta:{...(original?.recipe?.meta||{}),createdWith:"FENIX PC",moduleVersion:7,assetLibraryRef:libRef||null,assetName:resolved.name||null,assetFilename:resolved.filename||null}},preview:{imageData:null},solution:{available:false,imageData:null},validation:{kdp:resolved.validation||{status:"unknown",messages:[]}},source:{app:"fenix-desktop",version:"0.30.0",format:"native"}});
    return{page,asset:resolved,image,canvas:FenixColoring.render(page,{width:850,height:1100,assetImage:image})}
  }
  async function build(){
    clearTimeout(refreshTimer);const token=Date.now();build.token=token;try{const asset=chosenAsset();if(!asset){state.pages=[];show();return setStatus("Wybierz jeden asset dla tej strony.",true)}setStatus("Przygotowuję stronę z przypisanym assetem…");const original=state.editingId?FenixCore.getCart().find(page=>page.id===state.editingId):null,item=await makePage(asset,original?FenixPageSchema.normalize(original):null);if(build.token!==token)return;state.pages=[item];show();setStatus(state.editingId?"Podgląd zapisanej strony odtworzony z przypisanego assetu.":"Gotowe — asset jest przypisany do tej strony.")}catch(error){console.error(error);state.pages=[];show();setStatus(`Błąd: ${error.message}`,true)}}
  function scheduleBuild(){if(!state.lockedAssetId)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void build(),140)}
  function show(){const current=state.pages[0];canvas.width=850;canvas.height=1100;ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);if(current)ctx.drawImage(current.canvas,0,0);$("#pageCounter").textContent=current?"1 / 1":"0 / 0";$("#prev").disabled=true;$("#next").disabled=true}
  function lockSelectedAsset(){const id=$("#assetSelect").value;if(!id)return;const asset=state.assets.find(item=>item.id===id);if(!asset)return setStatus("Nie znaleziono wybranego assetu.",true);state.selectedAssetId=id;state.lockedAssetId=id;renderPicker();void build()}
  function saveToProject(){
    if(!state.lockedAssetId)return setStatus("Najpierw wybierz asset — musi być przypisany do strony.",true);if(!state.pages.length)return setStatus("Podgląd strony nie jest gotowy.",true);
    const item=state.pages[0],savedRef=item.page.recipe?.content?.assetRef;if(savedRef!==state.lockedAssetId)return setStatus("Zatrzymano zapis: asset strony nie zgadza się z przypisanym assetem.",true);
    if(state.editingId){FenixCore.updatePage(state.editingId,item.page);setStatus(`Zapisano stronę z assetem „${item.asset.name}”. Asset pozostaje przypisany.`);return}
    FenixCore.addPage(item.page);state.editingId=FenixCore.getCart().at(-1)?.id||null;if(state.editingId)history.replaceState(null,"",`${location.pathname}?id=${encodeURIComponent(state.editingId)}`);$("#cart").textContent="Zapisz zmiany strony";projectInfo();renderPicker();setStatus(`Dodano stronę z assetem „${item.asset.name}”. Asset pozostaje przypisany do tej strony.`)
  }
  async function exportPng(){const current=state.pages[0];if(!current)return;const high=FenixColoring.render(current.page,{width:2550,height:3300,assetImage:current.image}),project=FenixCore.getActiveProject(),fitted=FenixProduction.fitCanvas(high,project.format,project.bleed);FenixCore.downloadCanvas(fitted.canvas,`coloring-${String(current.asset.name).replace(/[^a-z0-9_-]+/gi,"-")}.png`)}
  function projectInfo(){const project=FenixCore.getActiveProject(),profile=FenixProduction.profile(project.format,project.bleed);$("#projectInfo").textContent=`Aktywny projekt: ${project.name} · ${project.format==="a4"?"A4":project.format} · ${profile.width}×${profile.height}px${state.editingId?" · TRYB EDYCJI":""}`}
  function applyPageOptions(page){const o=FenixColoring.optionsFromPage(page);$("#title").value=o.title;$("#instructions").value=o.instructions;$("#showTitle").checked=o.showTitle;$("#showInstructions").checked=o.showInstructions;$("#titleSize").value=o.titleSize;$("#instructionSize").value=o.instructionSize;$("#titleY").value=o.titleY;$("#assetScale").value=o.assetScale;$("#assetY").value=o.assetY}
  function loadSavedPage(){
    if(!state.editingId)return false;const raw=FenixCore.getCart().find(page=>page.id===state.editingId);if(!raw||FenixPageSchema.moduleOf(raw)!=="coloring-studio"){state.editingId=null;return false}
    const page=FenixPageSchema.normalize(raw),asset=resolveSavedAsset(page);applyPageOptions(page);state.selectedAssetId=asset?.id||null;state.lockedAssetId=asset?.id||null;$("#cart").textContent="Zapisz zmiany strony";return Boolean(asset)
  }
  async function restoreEditedPage(){if(!state.editingId)return;await FenixCore.ready;projectInfo();state.assets=eligibleAssets();const restored=loadSavedPage();renderPicker();if(restored&&state.lockedAssetId)await build();else{state.pages=[];show();setStatus("Nie udało się jednoznacznie odnaleźć assetu przypisanego do tej zapisanej strony. Nie wybrano losowego zamiennika.",true)}}
  function scheduleRestore(){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>void restoreEditedPage(),20)}
  function startNewPage(){state.editingId=null;state.selectedAssetId=null;state.lockedAssetId=null;state.pages=[];history.replaceState(null,"",location.pathname);$("#cart").textContent="Dodaj stronę do projektu";projectInfo();renderPicker();show();setStatus("Nowa strona — wybierz jeden asset z listy.")}
  function unlockAsset(){if(!state.lockedAssetId)return;state.selectedAssetId=null;state.lockedAssetId=null;state.pages=[];renderPicker();show();setStatus("Asset odblokowany. Wybierz nowy asset z listy.")}

  $("#assetSelect").addEventListener("change",lockSelectedAsset);$("#generate").onclick=()=>void build();$("#cart").onclick=saveToProject;$("#png").onclick=exportPng;$("#prev").disabled=true;$("#next").disabled=true;$("#newPage")?.addEventListener("click",startNewPage);$("#changeAsset")?.addEventListener("click",unlockAsset);
  ["title","instructions","titleSize","instructionSize","titleY","assetScale","assetY"].forEach(id=>$("#"+id)?.addEventListener("input",scheduleBuild));["showTitle","showInstructions"].forEach(id=>$("#"+id)?.addEventListener("change",scheduleBuild));
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.activeProject){projectInfo();if(state.editingId){scheduleRestore();return}renderPicker();if(state.lockedAssetId)void build();else show()}});
  window.addEventListener("fenix-storage-ready",()=>{if(state.editingId){scheduleRestore();return}renderPicker();if(state.lockedAssetId)void build();else show()});
  async function init(){projectInfo();setStatus("Wczytuję projekt i assety…");await FenixCore.ready;state.assets=eligibleAssets();if(state.editingId){await restoreEditedPage();return}renderPicker();show();setStatus("Wybierz jeden asset z listy. Po wyborze zostanie przypisany do strony.")}
  void init();
})();

"use strict";

(()=>{
  const $=selector=>document.querySelector(selector);
  const panel=$("#projectAssets");
  if(!panel||typeof FenixCore==="undefined")return;

  const fileInput=$("#projectAssetFile"),grid=$("#projectAssetsGrid"),empty=$("#projectAssetsEmpty"),status=$("#projectAssetsStatus"),count=$("#projectAssetsCount"),search=$("#projectAssetSearch"),tagFilter=$("#projectAssetTagFilter"),statusFilter=$("#projectAssetStatusFilter"),sort=$("#projectAssetSort"),visibleCount=$("#projectAssetsVisibleCount"),selectedCount=$("#projectAssetsSelectedCount"),selectVisibleButton=$("#projectAssetSelectVisible"),clearSelectionButton=$("#projectAssetClearSelection"),clearRolesButton=$("#projectAssetClearRoles"),bulkPanel=$("#projectAssetsBulk");
  const selectedIds=new Set();
  const ROLE_LABELS={gameplay:"Gra",content:"Treść",deco:"Dekoracja"};
  const ROLE_TITLES={gameplay:"Element zadania lub interakcji",content:"Główny obiekt na stronie",deco:"Ozdoba lub element tła"};
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const fmtBytes=value=>{const bytes=Number(value)||0;if(!bytes)return "—";if(bytes<1024)return `${bytes} B`;if(bytes<1048576)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1048576).toFixed(1)} MB`};
  const statusLabel=value=>value==="error"?"BŁĄD":value==="warning"?"UWAGA":"OK";
  const sourceLabel=value=>({imported:"PC",generated:"AI","fenix-library":"FENIX"}[value]||String(value||"PC").toUpperCase());
  const roleLabel=tag=>ROLE_LABELS[tag]||tag;
  const readDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error||new Error("Nie udało się odczytać pliku."));reader.readAsDataURL(file)});
  const readDimensions=dataUrl=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth||image.width,height:image.naturalHeight||image.height});image.onerror=()=>reject(new Error("Nie udało się odczytać wymiarów obrazu."));image.src=dataUrl});

  function setStatus(message,type="neutral"){if(!status)return;status.textContent=message;status.dataset.status=type}
  function currentProjectName(){return FenixCore.getActiveProject()?.name||"aktywny projekt"}
  function duplicateOf(file){return FenixCore.listAssets().find(asset=>asset.filename===file.name&&Number(asset.sizeBytes)===Number(file.size)&&asset.mime===file.type)||null}
  function assetTags(asset){return new Set(asset.tags||asset.meta?.tags||[])}

  async function importFiles(files){const list=[...(files||[])];if(!list.length)return;setStatus(`Wczytuję ${list.length} assetów…`);let added=0,failed=0,duplicates=0;
    for(const file of list){try{
      if(duplicateOf(file)){duplicates++;continue}
      if(!FenixAssetValidator.SUPPORTED.includes(file.type))throw new Error("Nieobsługiwany format");
      const dataUrl=await readDataUrl(file),dimensions=await readDimensions(dataUrl);
      const base={name:file.name.replace(/\.[^.]+$/,"")||"Asset",mime:file.type,dataUrl,source:"imported",filename:file.name,sizeBytes:file.size,width:dimensions.width,height:dimensions.height,aspectRatio:dimensions.width&&dimensions.height?Number((dimensions.width/dimensions.height).toFixed(4)):null,tags:[]};
      const validation=await FenixAssetValidator.validate(base);FenixCore.putAsset({...base,validation});added++;
    }catch(error){console.error(error);failed++}}
    render();
    const notes=[];if(added)notes.push(`dodano ${added}`);if(duplicates)notes.push(`pominięto duplikaty: ${duplicates}`);if(failed)notes.push(`błędy: ${failed}`);
    setStatus(`${notes.join(" · ")||"Nie dodano nowych assetów"}. Projekt: „${currentProjectName()}”.`,failed?"warning":"ok");
  }

  function toggleTag(asset,tag){const tags=assetTags(asset),wasActive=tags.has(tag);wasActive?tags.delete(tag):tags.add(tag);FenixCore.updateAsset(asset.id,{tags:[...tags]});setStatus(`${wasActive?"Usunięto":"Przypisano"} rolę „${roleLabel(tag)}” dla „${asset.name}”.`,"ok")}
  function rename(asset){const next=prompt("Nazwa assetu:",asset.name||"");if(next==null)return;const name=next.trim();if(!name)return;FenixCore.updateAsset(asset.id,{name})}
  function remove(asset){const usage=FenixCore.assetUsage(asset.id);if(usage.length){setStatus(`Nie usunięto „${asset.name}”. Asset jest używany przez ${usage.length} ${usage.length===1?"stronę":"strony"} projektu.`,"warning");return}
    if(!confirm(`Usunąć asset „${asset.name||asset.filename||"Asset"}” z tego projektu?`))return;
    const result=FenixCore.removeAsset(asset.id);if(result?.removed){selectedIds.delete(asset.id);setStatus("Asset został usunięty.","ok")}else setStatus("Nie udało się usunąć assetu.","error")
  }
  async function revalidate(asset){setStatus(`Sprawdzam „${asset.name}”…`);const validation=await FenixAssetValidator.validate(asset);FenixCore.updateAsset(asset.id,{validation});setStatus(`Walidacja zakończona: ${statusLabel(validation.status)}.`,validation.status)}
  async function revalidateAll(){const assets=FenixCore.listAssets();if(!assets.length)return setStatus("Brak assetów do sprawdzenia.","warning");setStatus(`Sprawdzam ${assets.length} assetów…`);let errors=0,warnings=0;for(const asset of assets){const validation=await FenixAssetValidator.validate(asset);if(validation.status==="error")errors++;else if(validation.status==="warning")warnings++;FenixCore.updateAsset(asset.id,{validation})}setStatus(`Kontrola zakończona: ${assets.length-errors-warnings} OK · ${warnings} uwag · ${errors} błędów.`,errors?"error":warnings?"warning":"ok")}
  function filteredAssets(){let assets=FenixCore.findAssets({query:search?.value||"",tag:tagFilter?.value||"",status:statusFilter?.value||""});const mode=sort?.value||"newest";assets=[...assets].sort((a,b)=>mode==="name"?a.name.localeCompare(b.name,"pl",{sensitivity:"base"}):mode==="oldest"?String(a.createdAt).localeCompare(String(b.createdAt)):String(b.createdAt).localeCompare(String(a.createdAt)));return assets}

  function tagButton(tag,tags){const active=tags.has(tag);return `<button type="button" data-tag="${tag}" class="${active?"active":""}" aria-pressed="${active}" title="${ROLE_TITLES[tag]}"><span>${active?"✓ ":""}${roleLabel(tag)}</span><small>${ROLE_TITLES[tag]}</small></button>`}
  function selectedAssets(){return FenixCore.listAssets().filter(asset=>selectedIds.has(asset.id))}
  function updateSelectionControls(visibleAssets){
    const allIds=new Set(FenixCore.listAssets().map(asset=>asset.id));
    [...selectedIds].forEach(id=>{if(!allIds.has(id))selectedIds.delete(id)});
    const selected=selectedAssets(),visibleSelected=visibleAssets.filter(asset=>selectedIds.has(asset.id));
    if(selectedCount)selectedCount.textContent=String(selected.length);
    if(bulkPanel){bulkPanel.dataset.active=selected.length?"true":"false";bulkPanel.setAttribute("aria-disabled",selected.length?"false":"true")}
    if(selectVisibleButton){const allVisibleSelected=visibleAssets.length>0&&visibleSelected.length===visibleAssets.length;selectVisibleButton.textContent=allVisibleSelected?"Odznacz widoczne":"Zaznacz widoczne";selectVisibleButton.disabled=!visibleAssets.length}
    if(clearSelectionButton)clearSelectionButton.disabled=!selected.length;
    if(clearRolesButton)clearRolesButton.disabled=!selected.length;
    panel.querySelectorAll("[data-bulk-tag]").forEach(button=>{const active=selected.length>0&&selected.every(asset=>assetTags(asset).has(button.dataset.bulkTag));button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));button.disabled=!selected.length});
  }
  function toggleSelection(assetId){selectedIds.has(assetId)?selectedIds.delete(assetId):selectedIds.add(assetId);render()}
  function toggleVisibleSelection(){const visible=filteredAssets(),allSelected=visible.length>0&&visible.every(asset=>selectedIds.has(asset.id));visible.forEach(asset=>allSelected?selectedIds.delete(asset.id):selectedIds.add(asset.id));render()}
  function clearSelection(){selectedIds.clear();render()}
  function toggleBulkTag(tag){const assets=selectedAssets();if(!assets.length)return;const removeRole=assets.every(asset=>assetTags(asset).has(tag));assets.forEach(asset=>{const tags=assetTags(asset);removeRole?tags.delete(tag):tags.add(tag);FenixCore.updateAsset(asset.id,{tags:[...tags]})});setStatus(`${removeRole?"Usunięto":"Przypisano"} rolę „${roleLabel(tag)}” dla ${assets.length} ${assets.length===1?"assetu":"assetów"}.`,"ok");render()}
  function clearBulkRoles(){const assets=selectedAssets();if(!assets.length)return;assets.forEach(asset=>FenixCore.updateAsset(asset.id,{tags:[]}));setStatus(`Usunięto wszystkie role dla ${assets.length} ${assets.length===1?"assetu":"assetów"}.`,"ok");render()}

  function render(){const all=FenixCore.listAssets(),assets=filteredAssets();if(count)count.textContent=`${all.length} ${all.length===1?"asset":"assetów"}`;if(visibleCount)visibleCount.textContent=all.length===assets.length?"":`Widoczne: ${assets.length} z ${all.length}`;if(empty){empty.hidden=all.length>0;const noMatches=$("#projectAssetsNoMatches");if(noMatches)noMatches.hidden=all.length===0||assets.length>0}if(!grid)return;grid.innerHTML="";
    assets.forEach(asset=>{const card=document.createElement("article");const isSelected=selectedIds.has(asset.id);card.className=`project-asset-card${isSelected?" selected":""}`;card.dataset.assetId=asset.id;const tags=assetTags(asset),validation=asset.validation||asset.meta?.validation||{status:"warning",messages:["Asset nie był jeszcze walidowany."]};const dims=asset.width&&asset.height?`${asset.width}×${asset.height}px`:"wymiary —",ratio=asset.aspectRatio?String(asset.aspectRatio):"—",usage=FenixCore.assetUsage(asset.id);card.innerHTML=`<div class="project-asset-thumb"><img src="${asset.dataUrl}" alt="${escapeHtml(asset.name||"Asset")}"><span class="asset-source">${escapeHtml(sourceLabel(asset.source))}</span><button class="asset-select" type="button" aria-pressed="${isSelected}" aria-label="${isSelected?"Odznacz":"Zaznacz"} asset ${escapeHtml(asset.name||"Asset")}"><span aria-hidden="true">${isSelected?"✓":""}</span>${isSelected?"Zaznaczony":"Zaznacz"}</button></div><div class="project-asset-info"><div class="project-asset-title"><strong title="${escapeHtml(asset.name||"Asset")}">${escapeHtml(asset.name||"Asset")}</strong><span class="asset-validation ${escapeHtml(validation.status||"warning")}">${statusLabel(validation.status)}</span></div><details class="asset-technical"><summary>Szczegóły pliku</summary><small>${escapeHtml(asset.filename||asset.mime||"asset")} · ${dims} · ${fmtBytes(asset.sizeBytes)}</small><small>Proporcje: ${escapeHtml(ratio)} · użycia na stronach: ${usage.length}</small></details><div class="asset-role-heading"><strong>Przeznaczenie</strong><span>Możesz wybrać kilka</span></div><div class="asset-tags" aria-label="Przeznaczenie assetu">${tagButton("content",tags)}${tagButton("gameplay",tags)}${tagButton("deco",tags)}</div><p class="asset-message">${escapeHtml((validation.messages||[])[0]||"Gotowy do użycia w projekcie.")}</p><div class="asset-actions"><button data-action="rename">Zmień nazwę</button><button data-action="validate">Sprawdź B&W</button><button data-action="remove" class="danger" ${usage.length?"disabled title=\"Asset jest używany przez strony projektu\"":""}>Usuń</button></div></div>`;
      card.querySelector(".asset-select").onclick=()=>toggleSelection(asset.id);card.querySelectorAll("[data-tag]").forEach(button=>button.onclick=()=>toggleTag(asset,button.dataset.tag));card.querySelector('[data-action="rename"]').onclick=()=>rename(asset);card.querySelector('[data-action="validate"]').onclick=()=>revalidate(asset);card.querySelector('[data-action="remove"]').onclick=()=>remove(asset);grid.appendChild(card)});
    updateSelectionControls(assets);
  }

  $("#projectAssetImport")?.addEventListener("click",()=>fileInput?.click());fileInput?.addEventListener("change",()=>{importFiles(fileInput.files);fileInput.value=""});
  $("#projectAssetValidateAll")?.addEventListener("click",revalidateAll);
  selectVisibleButton?.addEventListener("click",toggleVisibleSelection);clearSelectionButton?.addEventListener("click",clearSelection);clearRolesButton?.addEventListener("click",clearBulkRoles);
  panel.querySelectorAll("[data-bulk-tag]").forEach(button=>button.addEventListener("click",()=>toggleBulkTag(button.dataset.bulkTag)));
  [search,tagFilter,statusFilter,sort].forEach(control=>control?.addEventListener(control===search?"input":"change",render));
  $("#projectAssetGenerate")?.addEventListener("click",()=>setStatus("Generator AI ma przygotowane miejsce, ale nie jest jeszcze podłączony do konkretnego API.","warning"));
  $("#projectAssetLibrary")?.addEventListener("click",()=>setStatus("Biblioteka Feniksa zostanie podłączona po uporządkowaniu odzyskanych paczek assetów.","warning"));
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.activeProject||event.detail?.projects)render()});
  render();
})();

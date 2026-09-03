"use strict";

(()=>{
  const $=selector=>document.querySelector(selector);
  const panel=$("#projectAssets");
  if(!panel||typeof FenixCore==="undefined")return;

  const setList=$("#assetSetList");
  const workspace=$("#assetSetWorkspace");
  const empty=$("#assetSetEmpty");
  const count=$("#projectAssetsCount");
  const currentName=$("#assetSetCurrentName");
  const assetCount=$("#assetSetAssetCount");
  const previewCount=$("#assetSetPreviewCount");
  const assetGrid=$("#assetSetAssetGrid");
  const status=$("#assetSetStatus");
  const fileInput=$("#assetSetFile");
  let openPack="";
  let activeProjectId="";

  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const assetWord=value=>Number(value)===1?"asset":Number(value)>1&&Number(value)<5?"assety":"assetów";
  const setWord=value=>Number(value)===1?"zestaw":Number(value)>1&&Number(value)<5?"zestawy":"zestawów";
  const readDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error||new Error("Nie udało się odczytać pliku."));reader.readAsDataURL(file)});
  const readDimensions=dataUrl=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth||image.width,height:image.naturalHeight||image.height});image.onerror=()=>reject(new Error("Nie udało się odczytać obrazu."));image.src=dataUrl});

  function setStatus(message,type="neutral"){
    if(!status)return;
    status.textContent=message;
    status.dataset.status=type;
  }

  function packAssets(pack){
    return FenixCore.listLibraryAssets({pack});
  }

  function chooseInitialPack(){
    const project=FenixCore.getActiveProject();
    const packs=FenixCore.listLibraryPacks();
    activeProjectId=project?.id||"";
    openPack=(project?.primaryAssetPack&&packs.includes(project.primaryAssetPack)?project.primaryAssetPack:packs[0])||"";
  }

  function openSet(pack,{announce=true}={}){
    const result=FenixCore.selectLibraryPack(pack);
    if(!result?.selected)return;
    openPack=result.pack;
    render();
    if(announce)setStatus(`Otwarty zestaw: „${result.pack}”. Nowe pliki trafią właśnie tutaj.`,"ok");
  }

  function renderSetList(packs,primary){
    setList.innerHTML=packs.map(pack=>{
      const total=packAssets(pack).length;
      const selected=pack===openPack;
      const used=pack===primary;
      return `<button class="asset-set-card${selected?" selected":""}" type="button" data-pack="${escapeHtml(pack)}" aria-pressed="${selected}"><span class="asset-set-folder" aria-hidden="true">▰</span><span><strong>${escapeHtml(pack)}</strong><small>${total} ${assetWord(total)}${used?" · używany w projekcie":""}</small></span><b>${selected?"Otwarty":"Otwórz"}</b></button>`;
    }).join("");
    setList.querySelectorAll("[data-pack]").forEach(button=>button.addEventListener("click",()=>openSet(button.dataset.pack)));
  }

  function renderPreview(assets){
    if(!assets.length){
      assetGrid.innerHTML='<div class="asset-set-grid-empty">Ten zestaw jest pusty. Dodaj pierwsze pliki SVG lub PNG.</div>';
      return;
    }
    assetGrid.innerHTML=assets.map(asset=>`<article class="asset-set-thumb"><div><img src="${asset.dataUrl}" alt="${escapeHtml(asset.name||"Asset")}"><button type="button" data-delete-asset="${escapeHtml(asset.id)}" aria-label="Usuń asset ${escapeHtml(asset.name||"Asset")}" title="Usuń asset">×</button></div><strong title="${escapeHtml(asset.name||asset.filename||"Asset")}">${escapeHtml(asset.name||asset.filename||"Asset")}</strong></article>`).join("");
    assetGrid.querySelectorAll("[data-delete-asset]").forEach(button=>button.addEventListener("click",()=>removeAsset(button.dataset.deleteAsset)));
  }

  function removeAsset(assetId){
    const asset=packAssets(openPack).find(item=>item.id===assetId);
    if(!asset)return;
    if(!confirm(`Usunąć asset „${asset.name||asset.filename||"Asset"}” z zestawu „${openPack}”?`))return;
    const result=FenixCore.removeLibraryAsset(asset.id);
    if(result?.reason==="in-use"){
      setStatus(`Nie usunięto „${asset.name}”. Asset jest używany na ${result.usage.length} ${result.usage.length===1?"stronie":"stronach"} książki.`,"warning");
      return;
    }
    if(!result?.removed){setStatus("Nie udało się usunąć assetu.","error");return}
    render();
    setStatus(`Usunięto asset „${asset.name}” z zestawu „${openPack}”.`,"ok");
  }

  function render(){
    const project=FenixCore.getActiveProject();
    const packs=FenixCore.listLibraryPacks();
    if(project?.id!==activeProjectId)chooseInitialPack();
    if(openPack&&!packs.includes(openPack))openPack=(project?.primaryAssetPack&&packs.includes(project.primaryAssetPack)?project.primaryAssetPack:packs[0])||"";
    count.textContent=`${packs.length} ${setWord(packs.length)}`;
    empty.hidden=packs.length>0;
    workspace.hidden=!openPack;
    renderSetList(packs,project?.primaryAssetPack||"");
    if(!openPack)return;
    const assets=packAssets(openPack);
    currentName.textContent=openPack;
    assetCount.textContent=`${assets.length} ${assetWord(assets.length)}`;
    previewCount.textContent=String(assets.length);
    renderPreview(assets);
  }

  async function importFiles(files){
    const pack=openPack;
    const list=[...(files||[])];
    if(!pack||!list.length)return;
    FenixCore.selectLibraryPack(pack);
    setStatus(`Dodaję ${list.length} plików do zestawu „${pack}”…`);
    let added=0,duplicates=0,failed=0;
    for(const file of list){
      try{
        const duplicate=packAssets(pack).some(asset=>asset.filename===file.name&&Number(asset.sizeBytes)===Number(file.size)&&asset.mime===file.type);
        if(duplicate){duplicates++;continue}
        if(typeof FenixAssetValidator==="undefined"||!FenixAssetValidator.SUPPORTED.includes(file.type))throw new Error("Nieobsługiwany format");
        const dataUrl=await readDataUrl(file);
        const dimensions=await readDimensions(dataUrl);
        const base={name:file.name.replace(/\.[^.]+$/g,"")||"Asset",filename:file.name,mime:file.type,dataUrl,source:"fenix-library",pack,sizeBytes:file.size,width:dimensions.width,height:dimensions.height,aspectRatio:dimensions.width&&dimensions.height?Number((dimensions.width/dimensions.height).toFixed(4)):null,tags:[]};
        const validation=await FenixAssetValidator.validate(base);
        FenixCore.putLibraryAsset({...base,validation});
        added++;
      }catch(error){
        console.error("FENIX asset set import",file?.name,error);
        failed++;
      }
    }
    await FenixCore.flushStorage();
    render();
    const notes=[];
    if(added)notes.push(`dodano ${added}`);
    if(duplicates)notes.push(`duplikaty ${duplicates}`);
    if(failed)notes.push(`błędy ${failed}`);
    setStatus(`Zestaw „${pack}”: ${notes.join(" · ")||"bez nowych plików"}.`,failed?"warning":"ok");
  }

  function createSet(){
    const answer=prompt("Nazwa nowego zestawu assetów:","Ocean Fantasy");
    if(answer==null)return;
    const name=String(answer).trim();
    if(!name){setStatus("Podaj nazwę zestawu, np. Ocean Fantasy.","warning");return}
    const result=FenixCore.createLibraryPack(name);
    openPack=result.pack||name;
    render();
    setStatus(result.created?`Utworzono i otwarto zestaw „${openPack}”.`:`Zestaw „${openPack}” już istniał — został otwarty.`,"ok");
  }

  function renameSet(){
    if(!openPack)return;
    const answer=prompt("Nowa nazwa zestawu:",openPack);
    if(answer==null)return;
    const name=String(answer).trim();
    if(!name)return setStatus("Nazwa zestawu nie może być pusta.","warning");
    const result=FenixCore.renameLibraryPack(openPack,name);
    if(!result?.renamed)return setStatus(result?.reason==="exists"?"Zestaw o tej nazwie już istnieje.":"Nie udało się zmienić nazwy zestawu.","warning");
    openPack=result.to;
    render();
    setStatus(`Zmieniono nazwę zestawu na „${result.to}”.`,"ok");
  }

  $("#assetSetCreate")?.addEventListener("click",createSet);
  $("#assetSetRename")?.addEventListener("click",renameSet);
  $("#assetSetAddFiles")?.addEventListener("click",()=>fileInput?.click());
  fileInput?.addEventListener("change",()=>{importFiles(fileInput.files);fileInput.value=""});
  window.addEventListener("fenix-state-change",event=>{if(event.detail?.assets||event.detail?.activeProject||event.detail?.projects||event.detail?.library)render()});

  FenixCore.ready.then(()=>{chooseInitialPack();render()});
})();

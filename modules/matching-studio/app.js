"use strict";

(()=>{
  const $=id=>document.getElementById(id),canvas=$("page"),requestedId=new URLSearchParams(location.search).get("id");
  const state={
    assets:[],library:[],selected:new Set(),assetPairs:[],activePairSlot:null,
    manual:[{left:"A",right:"a"},{left:"B",right:"b"},{left:"C",right:"c"},{left:"D",right:"d"},{left:"E",right:"e"}],
    task:null,solution:null,view:"task",assetSource:"project",editingId:requestedId||null
  };
  let timer=null,restoring=false;
  const val=(id,f="")=>$(id)?.value??f,num=(id,f)=>Number(val(id,f))||f,safe=s=>String(s||"").replace(/[&<>"']/g,"");
  const opts=()=>({mode:val("mode","alphabet"),pairCount:num("pairCount",5),seed:val("seed","fenix-match"),shuffle:val("shuffle","yes"),textSize:num("textSize",66),assetSize:num("assetSize",100),rowGap:num("rowGap",220),autoSpacing:val("autoSpacing","yes"),quantitySize:num("quantitySize",38),quantityGap:num("quantityGap",58),anchors:val("anchors","dots"),frames:val("frames","none"),solutionStyle:val("solutionStyle","lines"),shadowStyle:val("shadowStyle","solid"),shadowOpacity:num("shadowOpacity",55),shadowStroke:num("shadowStroke",5),shadowSide:val("shadowSide","left"),title:val("title","Match the Pairs!"),instructions:val("instructions","Draw a line to match each pair."),titleSize:num("titleSize",110),instructionSize:num("instructionSize",44)});
  const modeLabels={alphabet:"Litery",identical:"Identyczne obrazki",shadow:"Obrazek → cień","word-image":"Słowo → obrazek","number-quantity":"Liczba → ilość",manual:"Pary ręczne","asset-pairs":"Obrazek → obrazek (pary)"};
  const isSvg=a=>String(a?.mime||"").includes("svg")||String(a?.dataUrl||"").startsWith("data:image/svg+xml");
  const pairCount=()=>Math.max(3,Math.min(8,num("pairCount",5)));
  const blankAssetPair=()=>({leftAssetRef:"",rightAssetRef:"",leftAssetIdentity:null,rightAssetIdentity:null});

  function status(text,error=false){$("status").textContent=text;$("status").dataset.type=error?"error":"ok"}
  function allLibrary(){const active=FenixCore.getActiveProjectId(),seen=new Set(),out=[];for(const p of FenixCore.getProjects())for(const a of Object.values(p.assets||{})){const key=a.dataUrl||`${a.filename}|${a.sizeBytes}`;if(seen.has(key))continue;seen.add(key);out.push({...a,_projectId:p.id,_projectName:p.name,_active:p.id===active})}return out}
  function assetAllowed(asset){return val("mode","alphabet")!=="shadow"||isSvg(asset)}
  function selectedAssets(){return state.assets.filter(asset=>state.selected.has(asset.id))}
  function assetByRef(ref){return ref?state.assets.find(asset=>asset.id===ref)||null:null}
  function identityForAsset(asset){return asset?{id:asset.id,name:asset.name||null,filename:asset.filename||null}:null}
  function resolveAsset(ref,identity){
    let hit=assetByRef(ref||identity?.id);
    if(!hit&&identity?.filename){const matches=state.assets.filter(asset=>String(asset.filename||"")===String(identity.filename));if(matches.length===1)hit=matches[0]}
    if(!hit&&identity?.name){const matches=state.assets.filter(asset=>String(asset.name||"")===String(identity.name));if(matches.length===1)hit=matches[0]}
    return hit||null;
  }
  function syncAssetPairCount(){
    const count=pairCount();
    if(state.assetPairs.length>count)state.assetPairs.length=count;
    while(state.assetPairs.length<count)state.assetPairs.push(blankAssetPair());
    if(state.activePairSlot&&state.activePairSlot.index>=count)state.activePairSlot=null;
  }
  function rebindAssetPairs(){
    let changed=false;
    for(const pair of state.assetPairs)for(const side of ["left","right"]){
      const refKey=`${side}AssetRef`,identityKey=`${side}AssetIdentity`;
      if(assetByRef(pair[refKey]))continue;
      const hit=resolveAsset(pair[refKey],pair[identityKey]);
      if(hit){pair[refKey]=hit.id;pair[identityKey]=identityForAsset(hit);changed=true}
    }
    return changed;
  }
  function pairSlotRefs(){syncAssetPairCount();return state.assetPairs.flatMap(pair=>[pair.leftAssetRef,pair.rightAssetRef]).filter(Boolean)}
  function completeAssetPairs(){syncAssetPairCount();return state.assetPairs.filter(pair=>assetByRef(pair.leftAssetRef)&&assetByRef(pair.rightAssetRef))}

  function updateSummary(){
    const o=opts(),explicit=o.mode==="asset-pairs",assets=explicit?pairSlotRefs().map(assetByRef).filter(Boolean):selectedAssets(),complete=explicit?completeAssetPairs().length:0;
    $("summaryMode").textContent=modeLabels[o.mode]||o.mode;
    $("summaryAssets").textContent=String(assets.length);
    $("summaryPairs").textContent=explicit?`${complete}/${pairCount()}`:String(Math.min(o.pairCount,["alphabet","number-quantity","manual"].includes(o.mode)?o.pairCount:assets.length));
    $("previewInfo").textContent=state.editingId?`Edytujesz zapisaną stronę · ${o.title}`:`Nowa strona · ${o.title}`;
    const count=$("selectedAssetsCount"),strip=$("selectedAssetStrip");
    if(count)count.textContent=explicit?`${assets.length} przypisanych pól`:`${assets.length} ${assets.length===1?"wybrany":"wybranych"}`;
    if(strip)strip.innerHTML=assets.length?assets.map(asset=>`<img src="${asset.dataUrl}" alt="${safe(asset.name)}" title="${safe(asset.name)}">`).join(""):"";
  }

  function slotMarkup(index,side,label){
    const pair=state.assetPairs[index],ref=pair?.[`${side}AssetRef`],asset=assetByRef(ref),active=state.activePairSlot?.index===index&&state.activePairSlot?.side===side;
    return `<div class="asset-pair-choice"><span>${label}</span><button type="button" class="asset-pair-slot${active?" active":""}${asset?" filled":""}" data-pair-index="${index}" data-pair-side="${side}">${asset?`<img src="${asset.dataUrl}" alt=""><span><strong>${safe(asset.name||asset.filename||"Asset")}</strong><small>${safe(asset.filename||asset.id)}</small></span>`:`<span><strong>Wybierz ${side==="left"?"lewy":"prawy"} asset</strong><small>Kliknij, a potem wybierz obrazek poniżej</small></span>`}</button><button type="button" class="asset-pair-clear" data-pair-clear="${index}:${side}" title="Wyczyść ${label}">×</button></div>`;
  }
  function renderAssetPairs(){
    const box=$("assetPairsList");if(!box)return;
    syncAssetPairCount();rebindAssetPairs();
    box.innerHTML=state.assetPairs.map((_,index)=>`<article class="asset-pair-row" data-pair-row="${index}"><strong>PARA ${index+1}</strong>${slotMarkup(index,"left","LEFT ASSET")}<span class="asset-pair-arrow">↔</span>${slotMarkup(index,"right","RIGHT ASSET")}</article>`).join("");
    box.querySelectorAll("[data-pair-index]").forEach(button=>button.onclick=()=>{
      state.activePairSlot={index:Number(button.dataset.pairIndex),side:button.dataset.pairSide};
      renderAssetPairs();renderAssets();renderLibrary();
      status(`Wybierz ${button.dataset.pairSide==="left"?"lewy":"prawy"} asset dla pary ${Number(button.dataset.pairIndex)+1}.`);
    });
    box.querySelectorAll("[data-pair-clear]").forEach(button=>button.onclick=event=>{
      event.stopPropagation();const [rawIndex,side]=button.dataset.pairClear.split(":"),index=Number(rawIndex),pair=state.assetPairs[index];
      pair[`${side}AssetRef`]="";pair[`${side}AssetIdentity`]=null;state.activePairSlot={index,side};
      renderAssetPairs();renderAssets();renderLibrary();updateSummary();schedule();
    });
  }
  function assignPairAsset(assetId){
    if(!state.activePairSlot)return status("Najpierw kliknij pole LEFT ASSET lub RIGHT ASSET w konkretnej parze.",true);
    const {index,side}=state.activePairSlot,asset=assetByRef(assetId);if(!asset)return status("Nie znaleziono wybranego assetu w projekcie.",true);
    const pair=state.assetPairs[index]||blankAssetPair();state.assetPairs[index]=pair;
    pair[`${side}AssetRef`]=asset.id;pair[`${side}AssetIdentity`]=identityForAsset(asset);state.selected.add(asset.id);
    if(side==="left")state.activePairSlot={index,side:"right"};else if(index+1<pairCount())state.activePairSlot={index:index+1,side:"left"};else state.activePairSlot=null;
    renderAssetPairs();renderAssets();renderLibrary();updateSummary();schedule();
  }

  function renderAssets(){
    state.assets=FenixCore.listAssets();rebindAssetPairs();
    for(const id of [...state.selected])if(!state.assets.some(asset=>asset.id===id))state.selected.delete(id);
    const explicit=val("mode")==="asset-pairs",used=new Set(pairSlotRefs()),grid=$("assetGrid");grid.innerHTML="";
    for(const asset of state.assets){
      const allowed=assetAllowed(asset),selected=explicit?used.has(asset.id):state.selected.has(asset.id),button=document.createElement("button");
      button.type="button";button.disabled=!allowed;button.dataset.assetId=asset.id;
      button.className=`asset-card${!explicit&&selected?" selected":""}${explicit&&selected?" pair-used":""}${explicit&&state.activePairSlot?" pair-active-target":""}${allowed?"":" disabled"}`;
      button.innerHTML=`<img src="${asset.dataUrl}" alt=""><strong>${safe(asset.name||asset.filename||"Asset")}</strong>${!allowed?'<span class="check">SVG ONLY</span>':selected?`<span class="check">${explicit?"W PARZE":"WYBRANY"}</span>`:""}`;
      button.onclick=()=>{if(!allowed)return;if(explicit)return assignPairAsset(asset.id);state.selected.has(asset.id)?state.selected.delete(asset.id):state.selected.add(asset.id);renderAssets();schedule()};
      grid.appendChild(button);
    }
    renderAssetPairs();updateSummary();
  }
  function renderLibrary(){
    state.library=allLibrary();const explicit=val("mode")==="asset-pairs",used=new Set(pairSlotRefs()),grid=$("libraryGrid");grid.innerHTML="";
    for(const asset of state.library){
      const allowed=assetAllowed(asset),selected=asset._active&&(explicit?used.has(asset.id):state.selected.has(asset.id)),button=document.createElement("button");
      button.type="button";button.disabled=!allowed;button.dataset.assetId=asset.id;button.className=`asset-card${!explicit&&selected?" selected":""}${explicit&&selected?" pair-used":""}${explicit&&state.activePairSlot?" pair-active-target":""}${allowed?"":" disabled"}`;
      button.innerHTML=`<img src="${asset.dataUrl}" alt=""><strong>${safe(asset.name||asset.filename||"Asset")}</strong><small>${safe(asset._projectName||"")}</small>${!allowed?'<span class="check">SVG ONLY</span>':selected?`<span class="check">${explicit?"W PARZE":"WYBRANY"}</span>`:""}`;
      button.onclick=()=>{
        if(!allowed)return;
        if(asset._active){if(explicit)return assignPairAsset(asset.id);state.selected.add(asset.id);renderAssets();renderLibrary();schedule();return}
        const existing=state.assets.find(item=>item.dataUrl===asset.dataUrl);
        if(existing){if(explicit)assignPairAsset(existing.id);else{state.selected.add(existing.id);showSource("project");renderAssets();renderLibrary();schedule()}return}
        const copy=FenixCore.putAsset({name:asset.name,filename:asset.filename,mime:asset.mime,dataUrl:asset.dataUrl,source:"fenix-library",width:asset.width,height:asset.height,sizeBytes:asset.sizeBytes,tags:asset.tags||["content"],meta:{...(asset.meta||{}),librarySourceProject:asset._projectName}});
        state.assets=FenixCore.listAssets();
        if(explicit)assignPairAsset(copy.id);else{state.selected.add(copy.id);showSource("project");renderAssets();renderLibrary();schedule()}
      };
      grid.appendChild(button);
    }
  }
  function showSource(which){state.assetSource=which;$("projectPane").hidden=which!=="project";$("libraryPane").hidden=which!=="library";$("tabProject").classList.toggle("active",which==="project");$("tabLibrary").classList.toggle("active",which==="library");if(which==="library")renderLibrary()}
  function renderManual(){const box=$("manualPairs");box.innerHTML="";state.manual.forEach((pair,index)=>{const row=document.createElement("div");row.className="pair-row";row.innerHTML=`<input data-i="${index}" data-k="left" value="${safe(pair.left)}"><span>↔</span><input data-i="${index}" data-k="right" value="${safe(pair.right)}"><button type="button" data-remove="${index}">×</button>`;box.appendChild(row)});box.querySelectorAll("input").forEach(input=>input.oninput=()=>{state.manual[Number(input.dataset.i)][input.dataset.k]=input.value;schedule()});box.querySelectorAll("[data-remove]").forEach(button=>button.onclick=()=>{state.manual.splice(Number(button.dataset.remove),1);renderManual();schedule()})}
  function renumberSections(){let n=1;document.querySelectorAll("[data-section]").forEach(section=>{if(section.hidden)return;const summary=section.querySelector("summary[data-label]");if(summary)summary.textContent=`${n++}. ${summary.dataset.label}`});$("previewSectionNumber").textContent=`${n}.`}
  function updateShadowUI(){const style=val("shadowStyle","solid");$("shadowOpacityWrap").hidden=style==="solid";$("shadowStrokeWrap").hidden=style!=="outline"}
  function updateModeUI(resetText=true){
    const mode=val("mode","alphabet"),explicit=mode==="asset-pairs",needsAssets=["identical","shadow","word-image","asset-pairs"].includes(mode),manual=mode==="manual",quantity=mode==="number-quantity",shadow=mode==="shadow";
    $("assetSection").hidden=!needsAssets;$("assetPairsSection").hidden=!explicit;$("shadowSection").hidden=!shadow;$("manualSection").hidden=!manual;$("assetSizeWrap").hidden=!needsAssets;$("autoSpacingWrap").hidden=!needsAssets;$("quantitySizeWrap").hidden=!quantity;$("quantityGapWrap").hidden=!quantity;
    $("assetSectionSummary").dataset.label=explicit?"Wybór assetów do par":"Assety";$("assetPickerNote").textContent=explicit?"Najpierw kliknij konkretne pole LEFT/RIGHT powyżej, następnie wybierz asset z projektu lub biblioteki.":"Wybierz obrazki używane na tej konkretnej stronie. Matching zapamięta ich przypisanie.";$("clearAssets").textContent=explicit?"Wyczyść wszystkie pary":"Wyczyść wybór";
    if(explicit){syncAssetPairCount();if(!state.activePairSlot)state.activePairSlot={index:0,side:"left"}}
    if(shadow)for(const id of [...state.selected]){const asset=state.assets.find(item=>item.id===id);if(asset&&!isSvg(asset))state.selected.delete(id)}
    if(resetText){const copy={alphabet:["Match Uppercase and Lowercase","Draw a line to match each uppercase letter with its lowercase letter."],shadow:["Match the Shadows!","Draw a line to match each picture with its silhouette."],identical:["Match the Pictures!","Draw a line to match the identical pictures."],"word-image":["Match Words and Pictures!","Draw a line to match each word with the correct picture."],"number-quantity":["Match Number and Quantity","Draw a line to match each number with the correct amount."],manual:["Match the Pairs!","Draw a line to match each pair."],"asset-pairs":["Match the Robot Parts!","Draw a line to match each item with its partner."]}[mode];if(copy){$("title").value=copy[0];$("instructions").value=copy[1]}}
    updateShadowUI();renderAssetPairs();renderAssets();renderLibrary();renumberSections();updateSummary();schedule();
  }
  function seededSide(seed){let hash=0;for(const char of String(seed||"fenix"))hash=(hash*31+char.charCodeAt(0))>>>0;return hash%2?"left":"right"}
  function pairsForMode(){
    const o=opts(),n=pairCount();
    if(o.mode==="alphabet")return [...Array(n)].map((_,index)=>({left:{kind:"text",text:String.fromCharCode(65+index)},right:{kind:"text",text:String.fromCharCode(97+index)}}));
    if(o.mode==="number-quantity")return [...Array(n)].map((_,index)=>({left:{kind:"text",text:String(index+1)},right:{kind:"quantity",value:index+1}}));
    if(o.mode==="manual")return state.manual.slice(0,n).map(pair=>({left:{kind:"text",text:pair.left},right:{kind:"text",text:pair.right}}));
    if(o.mode==="asset-pairs"){
      syncAssetPairCount();const explicit=state.assetPairs.slice(0,n).map((pair,index)=>({id:`asset-pair-${index+1}`,leftAsset:assetByRef(pair.leftAssetRef),rightAsset:assetByRef(pair.rightAssetRef)}));
      if(explicit.some(pair=>!pair.leftAsset||!pair.rightAsset))return [];
      return explicit.map(pair=>({id:pair.id,left:{kind:"image",dataUrl:pair.leftAsset.dataUrl,assetRef:pair.leftAsset.id},right:{kind:"image",dataUrl:pair.rightAsset.dataUrl,assetRef:pair.rightAsset.id}}));
    }
    const assets=selectedAssets().slice(0,n);if(!assets.length)return[];
    if(o.mode==="shadow"){const side=o.shadowSide==="random"?seededSide(o.seed):o.shadowSide;return assets.filter(isSvg).map(asset=>{const original={kind:"image",dataUrl:asset.dataUrl},silhouette={kind:"image",dataUrl:asset.dataUrl,variant:"shadow"};return side==="right"?{left:silhouette,right:original}:{left:original,right:silhouette}})}
    return assets.map(asset=>{const image={kind:"image",dataUrl:asset.dataUrl};return o.mode==="word-image"?{left:{kind:"text",text:asset.name||asset.filename||"Asset"},right:image}:{left:image,right:{...image}}});
  }
  async function render(){
    try{
      const pairs=pairsForMode();updateSummary();
      if(!pairs.length){canvas.width=850;canvas.height=1100;const context=canvas.getContext("2d");context.fillStyle="#fff";context.fillRect(0,0,850,1100);context.fillStyle="#66717d";context.textAlign="center";context.font="700 30px Arial";context.fillText(val("mode")==="asset-pairs"?"Uzupełnij wszystkie pola LEFT i RIGHT":["alphabet","number-quantity","manual"].includes(val("mode"))?"Przygotuj ustawienia strony":"Wybierz assety do tego trybu",425,540);state.task=state.solution=null;return status(val("mode")==="asset-pairs"?`Uzupełnij wszystkie ${pairCount()} jawnych par assetów.`:"Przygotuj treść lub wybierz assety dla tej strony.",true)}
      const o=opts(),effectiveGap=await FenixMatchingCore.requiredGap(pairs,o);[state.task,state.solution]=await Promise.all([FenixMatchingCore.render(pairs,o,false),FenixMatchingCore.render(pairs,o,true)]);showCanvas();status(o.autoSpacing==="yes"&&effectiveGap>Number(o.rowGap)?`Podgląd gotowy · Fenix zwiększył odstęp do ${Math.round(effectiveGap)} px.`:`Podgląd gotowy · ${pairs.length} par.`)
    }catch(error){console.error(error);state.task=state.solution=null;status(error.message||"Błąd renderowania",true)}
  }
  function showCanvas(){const source=state.view==="solution"?state.solution:state.task;if(!source)return;canvas.width=source.width;canvas.height=source.height;const context=canvas.getContext("2d");context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0)}
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void render(),120)};
  function matchingPages(){return FenixCore.getCart().filter(page=>(page.module||page.recipe?.module)==="matching-studio")}
  function pageThumb(page){const refs=page.recipe?.content?.assetRefs||[],first=refs.map(id=>FenixCore.getAsset(id)).find(Boolean);if(first?.dataUrl)return`<div class="studio-page-thumb"><img src="${first.dataUrl}" alt=""></div>`;const mode=page.recipe?.settings?.mode||"matching";return`<div class="studio-page-thumb"><span>${mode==="alphabet"?"Aa":mode==="number-quantity"?"123":"↔"}</span></div>`}
  function renderPageList(){const pages=matchingPages(),box=$("studioPagesList");$("studioPagesCount").textContent=`${pages.length} ${pages.length===1?"strona":"stron"}`;if(!pages.length){box.innerHTML='<div class="studio-pages-empty">Nie zapisano jeszcze żadnej strony Matching.</div>';return}box.innerHTML=pages.map((page,index)=>`<article class="studio-page${page.id===state.editingId?" current":""}">${pageThumb(page)}<div class="studio-page-copy"><strong>Matching #${String(index+1).padStart(2,"0")} · ${safe(page.title||"Match the Pairs!")}</strong><small>${safe(modeLabels[page.recipe?.settings?.mode]||page.recipe?.settings?.mode||"")}${page.id===state.editingId?" · EDYCJA":""}</small></div><div class="studio-page-actions"><button data-edit="${page.id}" type="button">Edytuj</button><button data-delete="${page.id}" class="delete" type="button">Usuń</button></div></article>`).join("");box.querySelectorAll("[data-edit]").forEach(button=>button.onclick=()=>void loadPage(button.dataset.edit));box.querySelectorAll("[data-delete]").forEach(button=>button.onclick=()=>deletePage(button.dataset.delete))}

  function restoreAssets(page){
    state.selected.clear();const content=page.recipe?.content||{},refs=content.assetRefs||[];
    for(const id of refs)if(state.assets.some(asset=>asset.id===id))state.selected.add(id);
    if(!state.selected.size&&Array.isArray(content.assetIdentities))for(const identity of content.assetIdentities){const hit=resolveAsset(identity.id,identity);if(hit)state.selected.add(hit.id)}
    if(!state.selected.size){const urls=[];for(const pair of content.pairs||[])for(const side of [pair.left,pair.right])if(side?.kind==="image"&&side.dataUrl)urls.push(side.dataUrl);for(const asset of state.assets)if(urls.includes(asset.dataUrl))state.selected.add(asset.id)}
  }
  function restoreAssetPairs(page){
    const content=page.recipe?.content||{},n=pairCount(),saved=Array.isArray(content.assetPairs)?content.assetPairs:[];
    state.assetPairs=[];
    if(saved.length){
      for(let index=0;index<n;index++){
        const source=saved[index]||{},pair=blankAssetPair();
        for(const side of ["left","right"]){const ref=source[`${side}AssetRef`]||"",identity=source[`${side}AssetIdentity`]||null,hit=resolveAsset(ref,identity);pair[`${side}AssetRef`]=hit?.id||ref;pair[`${side}AssetIdentity`]=hit?identityForAsset(hit):identity}
        state.assetPairs.push(pair);
      }
    }else if((page.recipe?.settings?.mode||"")==="asset-pairs"){
      const refs=Array.isArray(content.assetRefs)?content.assetRefs:[],identities=Array.isArray(content.assetIdentities)?content.assetIdentities:[];
      for(let index=0;index<n;index++){
        const pair=blankAssetPair();
        for(const [offset,side] of [[0,"left"],[1,"right"]]){const position=index*2+offset,ref=refs[position]||"",identity=identities[position]||null,hit=resolveAsset(ref,identity);pair[`${side}AssetRef`]=hit?.id||ref;pair[`${side}AssetIdentity`]=hit?identityForAsset(hit):identity}
        state.assetPairs.push(pair);
      }
    }
    syncAssetPairCount();for(const ref of pairSlotRefs())state.selected.add(ref);state.activePairSlot=null;
  }
  function applySettings(settings={}){for(const [key,value] of Object.entries(settings)){const element=$(key);if(element&&value!=null)element.value=String(value)}}
  async function loadPage(id){const page=FenixCore.getCart().find(item=>item.id===id);if(!page||(page.module||page.recipe?.module)!=="matching-studio")return status("Nie znaleziono strony Matching.",true);state.editingId=id;applySettings(page.recipe?.settings||{});state.manual=Array.isArray(page.recipe?.content?.manual)?page.recipe.content.manual.map(item=>({...item})):state.manual;renderManual();state.assets=FenixCore.listAssets();restoreAssets(page);restoreAssetPairs(page);updateModeUI(false);history.replaceState(null,"",`${location.pathname}?id=${encodeURIComponent(id)}`);$("cart").textContent="Zapisz zmiany + Solution";projectInfo();renderAssets();renderPageList();updateSummary();await render()}
  function pageData(){
    const o=opts(),explicit=o.mode==="asset-pairs",n=pairCount();let used=[],assetPairs=[];
    if(explicit){syncAssetPairCount();assetPairs=state.assetPairs.slice(0,n).map(pair=>({leftAssetRef:pair.leftAssetRef,rightAssetRef:pair.rightAssetRef,leftAssetIdentity:pair.leftAssetIdentity||identityForAsset(assetByRef(pair.leftAssetRef)),rightAssetIdentity:pair.rightAssetIdentity||identityForAsset(assetByRef(pair.rightAssetRef))}));const seen=new Set();used=pairSlotRefs().map(assetByRef).filter(asset=>asset&&!seen.has(asset.id)&&seen.add(asset.id))}
    else used=selectedAssets().slice(0,n);
    return{module:"matching-studio",title:o.title,recipe:{module:"matching-studio",title:o.title,settings:o,content:{assetRefs:used.map(asset=>asset.id),assetIdentities:used.map(identityForAsset),assetPairs,manual:state.manual.map(item=>({...item}))},meta:{createdWith:"FENIX PC",moduleVersion:11}},preview:{imageData:null},solution:{available:true,imageData:null},source:{app:"fenix-desktop",version:"0.13.0",format:"native"}};
  }
  function save(){try{const pairs=pairsForMode();if(!state.task||!state.solution||!pairs.length)return status("Najpierw przygotuj poprawny podgląd.",true);const data=pageData();if(state.editingId){const updated=FenixCore.updatePage(state.editingId,data);if(!updated)throw new Error("Nie udało się odnaleźć strony do aktualizacji.");status("Zapisano zmiany strony Matching wraz z jawnymi parami i recepturą Solution.")}else{const before=new Set(FenixCore.getCart().map(page=>page.id));FenixCore.addPage(data);const added=matchingPages().find(page=>!before.has(page.id));if(!added)throw new Error("Strona nie pojawiła się w projekcie po zapisie.");state.editingId=added.id;history.replaceState(null,"",`${location.pathname}?id=${encodeURIComponent(state.editingId)}`);$("cart").textContent="Zapisz zmiany + Solution";status("Dodano stronę Matching do projektu.")}projectInfo();renderPageList();updateSummary()}catch(error){console.error(error);status(`Błąd zapisu: ${error.message}`,true)}}
  function startNew(){state.editingId=null;state.selected.clear();state.assetPairs=[];state.activePairSlot=val("mode")==="asset-pairs"?{index:0,side:"left"}:null;syncAssetPairCount();state.task=state.solution=null;history.replaceState(null,"",location.pathname);$("cart").textContent="Dodaj stronę + Solution";projectInfo();renderAssetPairs();renderAssets();renderPageList();updateSummary();void render()}
  function deletePage(id){const page=FenixCore.getCart().find(item=>item.id===id);if(!page)return;if(!confirm(`Usunąć stronę „${page.title||"Matching"}” z projektu?`))return;FenixCore.removePage(id);if(state.editingId===id)startNew();else renderPageList();status("Usunięto stronę Matching z projektu.")}
  function projectInfo(){const project=FenixCore.getActiveProject();$("projectInfo").textContent=`Aktywny projekt: ${project.name} · ${project.format}${state.editingId?" · TRYB EDYCJI":""}`}

  $("tabProject").onclick=()=>showSource("project");$("tabLibrary").onclick=()=>showSource("library");
  $("clearAssets").onclick=()=>{if(val("mode")==="asset-pairs"){state.assetPairs=Array.from({length:pairCount()},blankAssetPair);state.activePairSlot={index:0,side:"left"};renderAssetPairs()}else state.selected.clear();renderAssets();renderLibrary();updateSummary();schedule()};
  $("addPair").onclick=()=>{state.manual.push({left:"",right:""});renderManual()};
  $("autoAlphabet").onclick=()=>{state.manual=[...Array(26)].map((_,index)=>({left:String.fromCharCode(65+index),right:String.fromCharCode(97+index)}));$("pairCount").value=8;renderManual();schedule()};
  $("generate").onclick=()=>void render();$("cart").onclick=save;$("newPage").onclick=startNew;
  $("png").onclick=()=>{const source=state.view==="solution"?state.solution:state.task;if(source)FenixCore.downloadCanvas(source,`matching-${state.view}-${Date.now()}.png`)};
  $("taskTab").onclick=()=>{state.view="task";$("taskTab").classList.add("active");$("solutionTab").classList.remove("active");showCanvas()};
  $("solutionTab").onclick=()=>{state.view="solution";$("solutionTab").classList.add("active");$("taskTab").classList.remove("active");showCanvas()};
  ["seed","shuffle","textSize","assetSize","rowGap","autoSpacing","quantitySize","quantityGap","anchors","frames","solutionStyle","shadowOpacity","shadowStroke","shadowSide","title","instructions","titleSize","instructionSize"].forEach(id=>$(id)?.addEventListener($(id).tagName==="SELECT"?"change":"input",()=>{updateSummary();schedule()}));
  $("pairCount").addEventListener("input",()=>{syncAssetPairCount();renderAssetPairs();renderAssets();renderLibrary();updateSummary();schedule()});
  $("shadowStyle").addEventListener("change",()=>{updateShadowUI();schedule()});$("mode").addEventListener("change",()=>updateModeUI(true));
  window.addEventListener("fenix-state-change",()=>{if(restoring)return;renderAssets();renderLibrary();renderPageList();updateSummary()});
  async function init(){projectInfo();status("Wczytuję projekt i assety…");await FenixCore.ready;renderManual();state.assets=FenixCore.listAssets();syncAssetPairCount();renderAssets();renderLibrary();showSource("project");renderPageList();if(state.editingId){restoring=true;await loadPage(state.editingId);restoring=false}else{updateModeUI(true);await render()}updateSummary()}
  void init();
})();

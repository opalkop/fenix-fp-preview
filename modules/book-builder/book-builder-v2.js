"use strict";
(()=>{
  const $=s=>document.querySelector(s);
  const list=$("#pageList"),empty=$("#emptyState"),printBook=$("#printBook"),validationSummary=$("#validationSummary");
  let pages=[],dragIndex=null,renderToken=0;

  const normalize=page=>FenixPageSchema.normalize(page);
  const moduleOf=page=>FenixPageSchema.moduleOf(page);
  const isMaze=page=>moduleOf(page)==="maze-studio";
  const isWordSearch=page=>moduleOf(page)==="word-search-studio";
  const isColoring=page=>moduleOf(page)==="coloring-studio";
  const isTracing=page=>moduleOf(page)==="tracing-studio";
  const isComplete=page=>moduleOf(page)==="complete-picture";
  const isIntro=page=>moduleOf(page)==="intro-studio";
  const isEnding=page=>Boolean(window.FenixEndingRenderers?.modules?.includes(moduleOf(page)));
  const isStandard=page=>Boolean(window.FenixStandardRenderers?.modules?.includes(moduleOf(page)));
  const hasSolution=page=>FenixPageSchema.hasSolution(page);

  const MODULE_NAMES={"intro-studio":"Intro","maze-studio":"Maze","word-search-studio":"Word Search","coloring-studio":"Coloring","tracing-studio":"Tracing","matching-studio":"Matching","alphabet-studio":"Alphabet","math-studio":"Math","dot-to-dot-studio":"Dot to Dot","hidden-objects-studio":"Hidden Objects","logic-studio":"Logic","complete-picture":"Complete the Picture","congratulations-studio":"Congratulations","qr-studio":"QR","certificate-studio":"Certificate","blank-page":"Puste strony"};
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Nie udało się odczytać obrazu strony/assetu."));img.src=src});
  const currentProject=()=>FenixCore.getActiveProject();
  const targetFormat=()=>$("#format")?.value||currentProject().format;
  const targetProfile=()=>{const project=currentProject();return FenixProduction.profile(targetFormat(),project.bleed)};

  function standardOptions(page){const p=normalize(page),s=p.recipe.settings||{};return{type:s.type||"",title:p.title||p.recipe.title,instructions:s.instructions||"Complete the activity.",difficulty:s.difficulty||"medium",age:s.age||"5-7",language:s.language||"en",range:Number(s.range)||20,extra:s.extra||"A"}}

  async function storedImageCanvas(data,quality){
    if(!data)return null;const img=await loadImage(data);
    if(quality==="preview"){const c=document.createElement("canvas");c.width=850;c.height=1100;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);const scale=Math.min(850/img.naturalWidth,1100/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(850-w)/2,(1100-h)/2,w,h);return c}
    const p=targetProfile(),c=document.createElement("canvas");c.width=p.width;c.height=p.height;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);const scale=Math.min(c.width/img.naturalWidth,c.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(c.width-w)/2,(c.height-h)/2,w,h);return c;
  }

  async function completeCanvas(page,solution,quality){
    const p=normalize(page),options=FenixCompletePicture.optionsFromPage(p),assetRef=p.recipe.content?.assetRef;let customImage=null;
    if(options.assetSource==="upload"){const asset=assetRef?FenixCore.getAsset(assetRef):null;if(!asset?.dataUrl)throw new Error(`Brak assetu „${p.title}” w bibliotece projektu.`);customImage=await loadImage(asset.dataUrl)}
    const raw=FenixCompletePicture.render(options,p.recipe.seed,Number(p.recipe.settings?.pageIndex)||0,{solution,scale:quality==="print"?3:1,customImage});if(quality==="preview")return raw;const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas;
  }

  async function tracingCanvas(page,quality){
    const p=normalize(page),settings={...(p.recipe?.settings||{})},assetRef=p.recipe?.content?.assetRef||settings.assetRef;
    const asset=assetRef?FenixCore.getAsset(assetRef):null;
    if(!asset?.dataUrl){const fallback=await storedImageCanvas(p.preview?.imageData,quality);if(fallback)return fallback;throw new Error(`Brak zapisanego assetu dla strony Tracing „${p.title||"Trace the Picture!"}”.`)}
    if(!window.FenixTracingCore?.render)throw new Error("Nie załadowano renderera Tracing Studio.");
    const raw=await FenixTracingCore.render(asset,settings);
    if(quality==="preview"){const c=document.createElement("canvas");c.width=850;c.height=1100;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,850,1100);ctx.drawImage(raw,0,0,850,1100);return c}
    const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas;
  }

  async function renderCanvas(page,solution=false,quality="preview",renderOptions={}){
    const p=normalize(page),module=p.module;
    if(page?._blank||module==="blank-page"){
      const profile=quality==="print"?targetProfile():{width:850,height:1100},c=document.createElement("canvas");c.width=profile.width;c.height=profile.height;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
      if(page?._autoParity&&renderOptions.solutionsDivider){const scale=c.width/2550,cx=c.width/2,cy=c.height*.46;ctx.fillStyle="#111";ctx.strokeStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`900 ${120*scale}px Arial, sans-serif`;ctx.fillText("SOLUTIONS",cx,cy);ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(cx-340*scale,cy+105*scale);ctx.lineTo(cx+340*scale,cy+105*scale);ctx.stroke();ctx.font=`500 ${44*scale}px Arial, sans-serif`;ctx.fillText("Answer Key",cx,cy+190*scale)}return c;
    }
    if(isMaze(p)){const assetImages=await FenixMaze.prepareAssets(p);if(quality==="preview")return FenixMaze.render(p,{solution,...renderOptions,width:850,height:1100,assetImages}).canvas;const raw=FenixMaze.render(p,{solution,...renderOptions,width:2550,height:3300,assetImages}).canvas,project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    if(isWordSearch(p)){const assetImages=await FenixWordSearch.prepareAssets(p),raw=FenixWordSearch.render(p,{solution,...renderOptions,width:quality==="print"?2550:850,height:quality==="print"?3300:1100,assetImages}).canvas;if(quality==="preview")return raw;const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    if(isColoring(p)){const prepared=await FenixColoring.prepareAsset(p),raw=FenixColoring.render(p,{width:quality==="print"?2550:850,height:quality==="print"?3300:1100,assetImage:prepared.image});if(quality==="preview")return raw;const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    if(isTracing(p))return tracingCanvas(p,quality);
    if(isStandard(p)){const rendered=FenixStandardRenderers.render(module,standardOptions(p),p.recipe.seed,Number(p.recipe.settings?.pageIndex)||0,quality==="print"?3:1),raw=solution?rendered.solutionCanvas:rendered.pageCanvas;if(!raw)return null;if(quality==="preview")return raw;const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    if(isComplete(p))return completeCanvas(p,solution,quality);
    if(isIntro(p)){const project=currentProject(),prepared=FenixIntroRenderer.prepare(p,{...project,pages});const raw=FenixIntroRenderer.render(prepared,{width:quality==="print"?2550:850,height:quality==="print"?3300:1100});if(quality==="preview")return raw;return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    if(isEnding(p)){let qrAssetImage=null,creatorMarkImage=null;if(module==="qr-studio"){const assetRef=p.recipe.content?.assetRef||p.recipe.settings?.qrAssetRef,asset=assetRef?FenixCore.getAsset(assetRef):null;if(!asset?.dataUrl)throw new Error("Strona QR nie ma przypisanego assetu kodu QR.");qrAssetImage=await loadImage(asset.dataUrl)}if(module==="certificate-studio"){const assetRef=p.recipe.content?.creatorMarkAssetRef||p.recipe.settings?.creatorMarkAssetRef||p.recipe.content?.signatureAssetRef||p.recipe.settings?.signatureAssetRef,asset=assetRef?FenixCore.getAsset(assetRef):null;if(asset?.dataUrl)creatorMarkImage=await loadImage(asset.dataUrl)}const raw=FenixEndingRenderers.render(p,{width:quality==="print"?2550:850,height:quality==="print"?3300:1100,qrAssetImage,creatorMarkImage});if(quality==="preview")return raw;const project=currentProject();return FenixProduction.fitCanvas(raw,targetFormat(),project.bleed).canvas}
    return storedImageCanvas(solution?p.solution?.imageData:p.preview?.imageData,quality);
  }

  async function imageUrl(page,solution=false,quality="preview",renderOptions={}){const canvas=await renderCanvas(page,solution,quality,renderOptions);return canvas?canvas.toDataURL("image/png"):null}
  function drawPageNumber(canvas,number){if($("#pageNumbers").value!=="yes")return canvas;const ctx=canvas.getContext("2d"),fontSize=Math.max(28,Math.round(canvas.width/61));ctx.save();ctx.fillStyle="#444";ctx.font=`${fontSize}px Arial, sans-serif`;ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillText(String(number),canvas.width/2,canvas.height-Math.round(canvas.height*.018));ctx.restore();return canvas}
  async function canvasToJpegBytes(canvas,quality=.94,label="strony"){if(!canvas||typeof canvas.toBlob!=="function")throw new Error(`Nie udało się wyrenderować ${label}. Sprawdź tę stronę w jej Studio.`);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));if(!blob)throw new Error(`Przeglądarka nie utworzyła obrazu ${label}.`);return new Uint8Array(await blob.arrayBuffer())}
  function fitInto(ctx,source,x,y,width,height,monochrome=false){const scale=Math.min(width/source.width,height/source.height),drawWidth=source.width*scale,drawHeight=source.height*scale;ctx.save();if(monochrome)ctx.filter="grayscale(1)";ctx.drawImage(source,x+(width-drawWidth)/2,y+(height-drawHeight)/2,drawWidth,drawHeight);ctx.restore()}

  function solutionEntries(source=pages){const counters={};return source.map((page,index)=>({page,pageNumber:index+1})).filter(item=>hasSolution(item.page)).map(item=>{const module=moduleOf(item.page),activityNumber=(counters[module]||0)+1;counters[module]=activityNumber;return{...item,module,activityNumber,label:`${MODULE_NAMES[module]||"Activity"} ${activityNumber} — Activity Page ${item.pageNumber}`}})}

  async function solutionSheet(items,per,{showSectionTitle=true,quality="print"}={}){
    const profile=quality==="print"?targetProfile():{width:850,height:1100},canvas=document.createElement("canvas");canvas.width=profile.width;canvas.height=profile.height;
    const ctx=canvas.getContext("2d"),pad=Math.round(profile.width*.045),titleHeight=Math.round(profile.height*(showSectionTitle ? .075 : .035)),gap=Math.round(profile.width*.025),cols=per===4?2:1,rows=per===1?1:2,cellWidth=(profile.width-pad*2-gap*(cols-1))/cols,cellHeight=(profile.height-pad*2-titleHeight-gap*(rows-1))/rows;
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";if(showSectionTitle){ctx.font=`700 ${Math.max(quality==="print"?44:18,Math.round(profile.width*.026))}px Arial, sans-serif`;ctx.fillText("Solutions",canvas.width/2,pad+titleHeight*.34)}
    for(let offset=0;offset<items.length;offset++){const item=items[offset],source=await renderCanvas(item.page,true,quality,{solutionKey:true});if(!source)continue;const col=offset%cols,row=Math.floor(offset/cols),x=pad+col*(cellWidth+gap),y=pad+titleHeight+row*(cellHeight+gap),heading=Math.max(quality==="print"?38:16,Math.round(cellHeight*.075));ctx.fillStyle="#222";ctx.font=`700 ${Math.max(quality==="print"?28:12,Math.round(profile.width*.016))}px Arial, sans-serif`;ctx.fillText(item.label,x+cellWidth/2,y+heading*.45);fitInto(ctx,source,x,y+heading,cellWidth,cellHeight-heading,true)}return canvas;
  }

  function orderedPages(source,solutionPageCount=0){return window.FenixBookOrder?.compose?FenixBookOrder.compose(source,{solutionPageCount}):window.FenixBookOrder?FenixBookOrder.sort(source):source}
  function productionSequence(source=pages){const include=$("#includeSolutions").checked,per=Number($("#solutionLayout").value)||1,clean=source.filter(page=>!page?._autoParity),sorted=window.FenixBookOrder?.sort?FenixBookOrder.sort(clean):clean,previewSolutions=include?solutionEntries(sorted):[],solutionPageCount=Math.ceil(previewSolutions.length/per),ordered=orderedPages(source,solutionPageCount),closingTest=page=>window.FenixBookOrder?.isClosing?FenixBookOrder.isClosing(page):["congratulations-studio","qr-studio","certificate-studio"].includes(moduleOf(page)),body=ordered.filter(page=>!closingTest(page)),closing=ordered.filter(closingTest),solved=include?solutionEntries(body):[],hasSolutionsDivider=solutionPageCount>0&&body.some(page=>page?._autoParity);return{body,closing,solved,per,solutionPageCount,hasSolutionsDivider}}

  async function buildPdfFile(){if(!window.FenixPdf)throw new Error("Nie załadowano lokalnego silnika PDF.");const project=currentProject(),profile=targetProfile(),pdfPages=[],sequence=productionSequence(pages),total=sequence.body.length+sequence.solutionPageCount+sequence.closing.length;let number=1,done=0;const append=async(canvas,label)=>{if(!canvas)throw new Error(`Nie udało się wyrenderować ${label}. Sprawdź tę stronę w jej Studio.`);drawPageNumber(canvas,number++);pdfPages.push({jpegBytes:await canvasToJpegBytes(canvas,.94,label),pixelWidth:canvas.width,pixelHeight:canvas.height,widthPt:profile.width/profile.dpi*72,heightPt:profile.height/profile.dpi*72});done++;$("#cartSummary").textContent=`Generuję finalny PDF: ${done} / ${total} stron…`;await new Promise(resolve=>requestAnimationFrame(resolve))};for(let index=0;index<sequence.body.length;index++){const page=sequence.body[index];await append(await renderCanvas(page,false,"print",{solutionsDivider:sequence.hasSolutionsDivider}),`strony ${index+1} „${page.title||MODULE_NAMES[moduleOf(page)]||"bez tytułu"}”`)}for(let index=0;index<sequence.solved.length;index+=sequence.per)await append(await solutionSheet(sequence.solved.slice(index,index+sequence.per),sequence.per,{showSectionTitle:!sequence.hasSolutionsDivider,quality:"print"}),`arkusza rozwiązań ${Math.floor(index/sequence.per)+1}`);for(let index=0;index<sequence.closing.length;index++){const page=sequence.closing[index];await append(await renderCanvas(page,false,"print"),`strony końcowej „${page.title||MODULE_NAMES[moduleOf(page)]||"bez tytułu"}”`)}const bytes=FenixPdf.build({pages:pdfPages,title:$("#bookTitle").value||project.name}),result=FenixPdf.download(bytes,$("#bookTitle").value||project.name);return{...result,pageCount:pdfPages.length}}

  function validateProject(){if(!validationSummary)return;const project=currentProject(),result=FenixProjectValidator.validate({...project,format:targetFormat(),pages});const icon=status=>status==="ok"?"✓":status==="warning"?"!":"×";validationSummary.innerHTML=`<strong>Gotowość: ${result.score}%</strong><br>${result.checks.map(check=>`${icon(check.status)} ${check.label}: ${check.message}`).join("<br>")}`;validationSummary.dataset.status=result.status}

  function loadCart(){pages=orderedPages(FenixCore.getCart().map((page,index)=>({...normalize(page),_builderId:page.id||`page-${index}`})));const project=currentProject();$("#bookTitle").value=project.name;$("#format").value=String(project.format).toLowerCase()==="a4"?"a4":project.format;render()}

  function renderContentSummary(){const counts=pages.reduce((result,page)=>{const module=moduleOf(page);result[module]=(result[module]||0)+1;return result},{}),sequence=productionSequence(pages),entries=Object.entries(counts);let html=entries.length?entries.map(([module,count])=>`<div><span>${MODULE_NAMES[module]||module}</span><strong>${count} str.</strong></div>`).join(""):'<div class="empty-content">Studia pojawią się tutaj automatycznie po dodaniu stron.</div>';if(sequence.solutionPageCount)html+=`<div><span>Solutions</span><strong>${sequence.solutionPageCount} str.</strong></div>`;$("#contentSummary").innerHTML=html}

  function addSectionHeading(name){const heading=document.createElement("h3");heading.className="page-section-heading";heading.textContent=name;list.appendChild(heading)}

  function sourceCard(page,index,token){
    const card=document.createElement("article");card.className="page-card";card.draggable=true;const module=page.module||"strona";
    card.innerHTML=`<span class="page-index">${index+1}</span><div class="page-thumb"><div class="blank-thumb">…</div></div><div class="page-meta"><strong>${page.title||module||"Strona"}</strong><small>${page._blank?"Pusta strona":hasSolution(page)?`${module} · rozwiązanie dostępne`:module}</small><div class="card-actions"><button data-up="${index}">↑</button><button data-down="${index}">↓</button><button class="danger" data-remove="${index}">Usuń</button></div></div>`;
    card.ondragstart=()=>{dragIndex=index;card.classList.add("dragging")};card.ondragend=()=>card.classList.remove("dragging");card.ondragover=event=>event.preventDefault();card.ondrop=event=>{event.preventDefault();if(dragIndex===null||dragIndex===index)return;const[moved]=pages.splice(dragIndex,1);pages.splice(index,0,moved);dragIndex=null;render()};list.appendChild(card);
    imageUrl(page,false,"preview").then(src=>{if(token!==renderToken||!card.isConnected)return;card.querySelector(".page-thumb").innerHTML=src?`<img src="${src}" alt="Podgląd strony">`:`<div class="blank-thumb">${page._blank?"□":"?"}</div>`}).catch(error=>{console.error(error);if(card.isConnected)card.querySelector(".page-thumb").innerHTML=`<div class="blank-thumb" title="${String(error.message).replace(/"/g,'&quot;')}">!</div>`});
  }

  function solutionCard(items,sheetNo,per,token,hasDivider){
    const card=document.createElement("article");card.className="page-card solution-preview-card";card.draggable=false;const labels=items.map(i=>i.label).join(" / ");
    card.innerHTML=`<span class="page-index">S${sheetNo}</span><div class="page-thumb"><div class="blank-thumb">…</div></div><div class="page-meta"><strong>${per===1?items[0].label:`Solutions ${sheetNo}`}</strong><small>${per===1?"Strona rozwiązania":`${items.length} rozwiązania na stronie`}</small></div>`;list.appendChild(card);
    solutionSheet(items,per,{showSectionTitle:!hasDivider,quality:"preview"}).then(canvas=>{if(token!==renderToken||!card.isConnected)return;card.querySelector(".page-thumb").innerHTML=`<img src="${canvas.toDataURL("image/png")}" alt="${labels}">`}).catch(error=>{console.error(error);if(card.isConnected)card.querySelector(".page-thumb").innerHTML=`<div class="blank-thumb" title="${String(error.message).replace(/"/g,'&quot;')}">!</div>`});
  }

  function render(){
    const token=++renderToken;list.innerHTML="";empty.hidden=pages.length>0;const solutions=pages.filter(hasSolution).length,sequence=productionSequence(pages),finalCount=sequence.body.length+sequence.solutionPageCount+sequence.closing.length;
    $("#pageCount").textContent=`${finalCount} stron finalnych`;
    $("#cartSummary").textContent=`W projekcie: ${pages.length} stron · rozwiązania: ${solutions} · finalnie: ${finalCount} stron.`;
    renderContentSummary();
    let lastSection="";const closingIds=new Set(sequence.closing.map(p=>p._builderId||p.id));
    pages.forEach((page,index)=>{if(closingIds.has(page._builderId||page.id))return;const section=window.FenixBookOrder?FenixBookOrder.section(page):"Strony książki";if(section!==lastSection){addSectionHeading(section);lastSection=section}sourceCard(page,index,token)});
    if(sequence.solutionPageCount){addSectionHeading("ROZWIĄZANIA");for(let i=0,sheet=1;i<sequence.solved.length;i+=sequence.per,sheet++)solutionCard(sequence.solved.slice(i,i+sequence.per),sheet,sequence.per,token,sequence.hasSolutionsDivider)}
    if(sequence.closing.length){addSectionHeading("ZAKOŃCZENIE");for(const page of sequence.closing){const index=pages.indexOf(page);sourceCard(page,index,token)}}
    document.querySelectorAll("[data-remove]").forEach(button=>button.onclick=()=>{pages.splice(Number(button.dataset.remove),1);render()});document.querySelectorAll("[data-up]").forEach(button=>button.onclick=()=>move(Number(button.dataset.up),-1));document.querySelectorAll("[data-down]").forEach(button=>button.onclick=()=>move(Number(button.dataset.down),1));validateProject();
  }

  function move(index,direction){const target=index+direction;if(target<0||target>=pages.length)return;[pages[index],pages[target]]=[pages[target],pages[index]];render()}
  function addPrintPage(imageData,index){const element=document.createElement("article");element.className="print-page";if(imageData){const image=document.createElement("img");image.src=imageData;element.appendChild(image)}if($("#pageNumbers").value==="yes"){const number=document.createElement("div");number.className="page-number-print";number.textContent=index;element.appendChild(number)}printBook.appendChild(element)}

  async function buildPrintBook(){const project=currentProject(),sequence=productionSequence(pages);printBook.innerHTML="";printBook.dataset.format=targetFormat();printBook.dataset.bleed=project.bleed==="bleed"?"bleed":"no-bleed";let number=1;for(const page of sequence.body)addPrintPage(await imageUrl(page,false,"print",{solutionsDivider:sequence.hasSolutionsDivider}),number++);for(let index=0;index<sequence.solved.length;index+=sequence.per){const sheet=document.createElement("article");sheet.className="print-page";const canvas=await solutionSheet(sequence.solved.slice(index,index+sequence.per),sequence.per,{showSectionTitle:!sequence.hasSolutionsDivider,quality:"print"});const image=document.createElement("img");image.src=canvas.toDataURL("image/png");sheet.appendChild(image);if($("#pageNumbers").value==="yes"){const n=document.createElement("div");n.className="page-number-print";n.textContent=number;sheet.appendChild(n)}number++;printBook.appendChild(sheet)}for(const page of sequence.closing)addPrintPage(await imageUrl(page,false,"print"),number++);return printBook.children.length}

  function setBusy(busy,text="Przygotowuję skład…"){[$("#previewBook"),$("#exportPdf")].forEach(button=>button.disabled=busy);if(busy)$("#cartSummary").textContent=text;else{const sequence=productionSequence(pages),finalCount=sequence.body.length+sequence.solutionPageCount+sequence.closing.length;$("#cartSummary").textContent=`W projekcie: ${pages.length} stron · rozwiązania: ${pages.filter(hasSolution).length} · finalnie: ${finalCount} stron.`}}

  $("#reloadCart").onclick=loadCart;
  $("#autoOrder").onclick=()=>{const include=$("#includeSolutions").checked,per=Number($("#solutionLayout").value)||1,solutionPageCount=include?Math.ceil(solutionEntries(pages).length/per):0;pages=orderedPages(pages,solutionPageCount);render();const sequence=productionSequence(pages),finalCount=sequence.body.length+sequence.solutionPageCount+sequence.closing.length;$("#cartSummary").textContent=`Uporządkowano projekt: ${pages.length} stron · finalny skład: ${finalCount} stron.`};
  $("#addBlank").onclick=()=>{const stamp=Date.now();pages.push({_builderId:`blank-${stamp}`,_blank:true,id:`blank-${stamp}`,schemaVersion:3,title:"Pusta strona",module:"blank-page",recipe:{module:"blank-page",seed:null,title:"Pusta strona",settings:{},content:{},meta:{},renderState:{}},preview:{imageData:null},solution:{available:false,imageData:null},validation:{kdp:{status:"ok",messages:[]}},production:targetProfile(),source:{app:"book-builder",version:"0.29.0",format:"native"}});render()};
  $("#previewBook").onclick=async()=>{if(!pages.length)return alert("Projekt nie zawiera jeszcze stron.");setBusy(true);try{const count=await buildPrintBook();alert(`Podgląd przygotowany: ${count} stron.`)}catch(error){console.error(error);alert(`Nie udało się przygotować podglądu: ${error.message}`)}finally{setBusy(false)}};
  $("#exportPdf").onclick=async()=>{if(!pages.length)return alert("Projekt nie zawiera jeszcze stron.");setBusy(true,"Renderuję finalny PDF 300 DPI…");try{const result=await buildPdfFile();alert(`Gotowy PDF: ${result.fileName}\nStrony: ${result.pageCount}\nRozmiar: ${(result.size/1024/1024).toFixed(1)} MB\n\nPlik został pobrany na komputer.`)}catch(error){console.error(error);alert(`Nie udało się wygenerować PDF: ${error.message}`)}finally{setBusy(false)}};
  ["format","pageNumbers","includeSolutions","solutionLayout"].forEach(id=>$("#"+id)?.addEventListener("change",()=>{if(id==="format"||id==="includeSolutions"||id==="solutionLayout")render();else validateProject()}));
  loadCart();
})();

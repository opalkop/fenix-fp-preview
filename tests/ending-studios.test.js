"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm"),root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

{
  const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read("core/book-order.js"),sandbox);
  const order=sandbox.window.FenixBookOrder;
  for(let activities=0;activities<10;activities++)for(let solutionPageCount=0;solutionPageCount<5;solutionPageCount++){
    const pages=Array.from({length:activities},(_,index)=>({id:String(index),module:"maze-studio"}));
    pages.push({module:"certificate-studio"},{module:"qr-studio"},{module:"congratulations-studio"});
    const composed=order.compose(pages,{solutionPageCount}),modules=composed.map(page=>page.module),body=composed.filter(page=>!order.isClosing(page)),closing=composed.filter(page=>order.isClosing(page)),certificatePage=body.length+solutionPageCount+closing.findIndex(page=>page.module==="certificate-studio")+1;
    assert(certificatePage%2===0,"Certyfikat musi znajdować się na stronie parzystej po doliczeniu rozwiązań.");
    assert(modules.indexOf("congratulations-studio")<modules.indexOf("qr-studio"));
    assert(modules.indexOf("qr-studio")<modules.indexOf("certificate-studio"));
    const automaticBlank=composed.findIndex(page=>page._autoParity);
    if(automaticBlank>=0)assert(automaticBlank<modules.indexOf("congratulations-studio"),"Automatyczna pusta strona musi poprzedzać rozwiązania i zakończenie.");
  }
}

{
  const methods=["fillRect","strokeRect","beginPath","arc","stroke","fillText","moveTo","lineTo","clearRect","drawImage","setLineDash","save","restore"];
  const context=()=>{const value={measureText:text=>({width:String(text).length*25})};methods.forEach(method=>value[method]=()=>{});return value};
  const document={createElement:tag=>{assert.equal(tag,"canvas");const ctx=context();return{width:0,height:0,getContext:()=>ctx}}};
  const sandbox={window:{},document,TextEncoder,FenixPageSchema:{normalize:value=>value}};vm.createContext(sandbox);vm.runInContext(read("modules/shared/ending-renderers.js"),sandbox);
  const renderers=sandbox.window.FenixEndingRenderers;
  assert.deepEqual([...renderers.modules],["congratulations-studio","certificate-studio","qr-studio"]);
  const congratulations=renderers.DEFINITIONS["congratulations-studio"];
  assert.equal(congratulations.groups.length,4);
  assert.equal(congratulations.defaults.showActivityCount,true);
  assert.equal(congratulations.defaults.showQrTransition,true);
  assert.equal(congratulations.defaults.style,"framed");
  const qrDefinition=renderers.DEFINITIONS["qr-studio"];
  assert.equal(qrDefinition.groups.length,3);
  assert(qrDefinition.groups[0].fields.some(field=>field[0]==="qrAssetRef"&&field[2]==="asset"));
  assert(!qrDefinition.groups.flatMap(group=>group.fields).some(field=>field[0]==="url"));
  const certificate=renderers.DEFINITIONS["certificate-studio"];
  assert.equal(certificate.groups.length,5);
  assert.equal(certificate.defaults.bookTitleMode,"auto");
  assert.equal(certificate.defaults.countMode,"auto");
  assert.equal(certificate.defaults.showAchievementMark,true);
  assert(certificate.groups.flatMap(group=>group.fields).some(field=>field[0]==="showCutGuide"));
  assert(certificate.groups.flatMap(group=>group.fields).some(field=>field[0]==="creatorMarkAssetRef"&&field[2]==="creator-asset"));
  assert(certificate.groups.some(group=>group.title.includes("Creator Mark")));
  const certificatePage=renderers.page("certificate-studio",{...certificate.defaults,creatorMarkAssetRef:"asset-creator-1"});
  assert.equal(certificatePage.recipe.content.creatorMarkAssetRef,"asset-creator-1");
  assert.equal(renderers.fromPage(certificatePage,"certificate-studio").creatorMarkAssetRef,"asset-creator-1");
  const markedCanvas=renderers.render(certificatePage,{creatorMarkImage:{width:800,height:220}});assert.equal(markedCanvas.width,2550);
  renderers.modules.forEach(module=>{const canvas=renderers.render({module,recipe:{settings:renderers.DEFINITIONS[module].defaults}});assert.equal(canvas.width,2550);assert.equal(canvas.height,3300)});
  const qr=renderers.qrMatrix("https://example.com/fenix-test");assert.equal(qr.length,57);qr.forEach(row=>assert.equal(row.length,57));
}

for(const slug of ["congratulations-studio","certificate-studio","qr-studio"]){
  const html=read(`modules/${slug}/index.html`);
  assert(html.includes(`data-module="${slug}"`));
  assert(html.includes('id="endingSections"'));
  assert(html.indexOf("ending-controls")<html.indexOf("preview-section"),"Kontrolki muszą być nad podglądem.");
  assert(html.includes('id="page"'));
}

{
  const controller=read("modules/shared/ending-studio.js"),styles=read("modules/shared/ending-studio.css");
  assert(controller.includes("Ta strona nie jest jeszcze częścią książki."));
  assert(controller.includes("Masz niezapisane zmiany"));
  assert(controller.includes('id="savePage" type="button" class="primary"'));
  assert(controller.includes('type==="checkbox"'));
  assert(controller.includes('type==="asset"'));
  assert(controller.includes('tags:["qr","content"]'));
  assert(controller.includes('tags:["creator-mark","content"]'));
  assert(controller.includes("importCreatorMark"));
  assert(controller.includes("refreshCreatorMarkAssets"));
  assert(controller.includes("FenixCore.putAsset"));
  assert(controller.includes("Najpierw dodaj lub wybierz asset kodu QR"));
  assert(controller.includes('data-control="${name}"'));
  assert(controller.includes('data-section="${index+1}"'));
  assert(controller.includes("definition.groups.length+1"));
  assert(controller.includes("detectedActivityCount"));
  assert(controller.includes("syncCertificateFields"));
  assert(controller.includes("Nazwa pobrana z aktywnego projektu"));
  assert(styles.includes(".control-sections .save-section"));
  assert(styles.includes(".option-toggle"));
  assert(styles.includes("flex:0 0 21px!important"));
  assert(styles.includes('[data-control="activityCountText"]'));
  assert(styles.includes('details[data-section="2"] .ending-grid'));
  assert(styles.includes('details[data-section="3"] .ending-grid'));
  assert(styles.includes("overflow-wrap:anywhere"));
  assert(styles.includes("label.qr-asset-upload"));
  assert(styles.includes("label.creator-asset-upload"));
  assert(styles.includes("-webkit-text-fill-color:#fff!important"));
  assert(styles.includes(".save-explainer"));
  assert(styles.includes(".ending-status.unsaved"));
  assert(styles.includes("var(--fenix-ui-surface-2"));
}

{
  const registry=read("config/module-registry.js"),launcher=read("assets/launcher.js"),builder=read("modules/book-builder/book-builder.js"),builderHtml=read("modules/book-builder/index.html");
  assert(registry.includes('slug:"qr-studio"'));
  assert(!registry.includes('slug:"solutions-studio"'));
  assert(registry.includes('slug:"congratulations-studio"'));
  assert(registry.includes('dashboardOrder:800,dashboardStatus:"ready"'));
  assert(registry.includes('dashboardOrder:810,dashboardStatus:"ready"'));
  assert(registry.includes('dashboardOrder:820,dashboardStatus:"ready"'));
  assert(launcher.includes("module.dashboardStatus||"));
  assert(launcher.includes("a.dashboardOrder-b.dashboardOrder"));
  assert(builder.includes("FenixEndingRenderers.render"));
  assert(builder.includes('module==="qr-studio"'));
  assert(builder.includes("qrAssetImage=await loadImage"));
  assert(builder.includes("creatorMarkImage=await loadImage"));
  assert(builder.includes("function productionSequence"));
  assert(builder.includes("sequence.body"));
  assert(builder.includes("sequence.solved"));
  assert(builder.includes("sequence.closing"));
  assert(builder.includes("wprowadzenie → ćwiczenia → rozwiązania → Congratulations → QR → Certificate"));
  assert(builderHtml.includes("../shared/ending-renderers.js"));
  assert(builderHtml.includes("Dodaj dostępne rozwiązania przed zakończeniem książki"));
}

{
  const maze=read("modules/maze-studio/maze-core.js"),wordSearch=read("modules/word-search-studio/word-search-core.js");
  assert(maze.includes("function drawSolutionRoute"));
  assert(maze.includes("ctx.setLineDash"));
  assert(maze.includes("items=solution?[]:pageDecorations"),"Rozwiązanie Maze nie może zawierać dekoracji.");
  assert(wordSearch.includes("function drawSolutionHighlights"));
  assert(!wordSearch.includes("CIRCLE = START   SQUARE = END"));
  assert(!wordSearch.includes('fillStyle="#ededed"'));
  assert(wordSearch.includes('fillStyle="#d9d9d9"'),"Rozwiązania WS powinny używać szarych, wypełnionych kapsułek.");
  assert(!wordSearch.includes("String(index+1)"),"Rozwiązania WS nie powinny zawierać numeracji słów.");
  assert(wordSearch.includes("result.placements.map(placement=>placement.word)"));
}

console.log("ending-studios.test.js: OK");

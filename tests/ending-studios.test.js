"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm"),root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

{
  const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read("core/book-order.js"),sandbox);
  const order=sandbox.window.FenixBookOrder;
  for(let activities=0;activities<10;activities++){
    const pages=Array.from({length:activities},(_,index)=>({id:String(index),module:"maze-studio"}));
    pages.push({module:"certificate-studio"},{module:"qr-studio"},{module:"congratulations-studio"});
    const composed=order.compose(pages),modules=composed.map(page=>page.module),certificatePage=modules.indexOf("certificate-studio")+1;
    assert(certificatePage%2===0,"Certyfikat musi znajdować się na stronie parzystej.");
    assert(modules.indexOf("congratulations-studio")<modules.indexOf("qr-studio"));
    assert(modules.indexOf("qr-studio")<modules.indexOf("certificate-studio"));
  }
}

{
  const methods=["fillRect","strokeRect","beginPath","arc","stroke","fillText","moveTo","lineTo","clearRect","drawImage"];
  const context=()=>{const value={measureText:text=>({width:String(text).length*25})};methods.forEach(method=>value[method]=()=>{});return value};
  const document={createElement:tag=>{assert.equal(tag,"canvas");const ctx=context();return{width:0,height:0,getContext:()=>ctx}}};
  const sandbox={window:{},document,TextEncoder};vm.createContext(sandbox);vm.runInContext(read("modules/shared/ending-renderers.js"),sandbox);
  const renderers=sandbox.window.FenixEndingRenderers;
  assert.deepEqual([...renderers.modules],["congratulations-studio","certificate-studio","qr-studio"]);
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
  assert(styles.includes(".control-sections .save-section"));
  assert(styles.includes(".save-explainer"));
  assert(styles.includes(".ending-status.unsaved"));
  assert(styles.includes("var(--fenix-ui-surface-2"));
}

{
  const registry=read("config/module-registry.js"),builder=read("modules/book-builder/book-builder.js"),builderHtml=read("modules/book-builder/index.html");
  assert(registry.includes('slug:"qr-studio"'));
  assert(!registry.includes('slug:"solutions-studio"'));
  assert(builder.includes("FenixEndingRenderers.render"));
  assert(builderHtml.includes("../shared/ending-renderers.js"));
}

console.log("ending-studios.test.js: OK");

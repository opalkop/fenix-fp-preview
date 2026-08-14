"use strict";
(()=>{
  const $=selector=>document.querySelector(selector),module=document.body.dataset.module,definition=FenixEndingRenderers.DEFINITIONS[module],canvas=$("#page"),sections=$("#endingSections"),status=$("#status"),saveStatus=$("#saveStatus");
  const escape=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const pages=()=>FenixCore.getCart(),requestedId=new URLSearchParams(location.search).get("id");
  const existing=()=>pages().find(page=>page.id===requestedId&&FenixPageSchema.moduleOf(page)===module)||pages().find(page=>FenixPageSchema.moduleOf(page)===module)||null;
  const field=name=>sections.querySelector(`[data-field="${name}"]`);
  function inputHtml(spec){
    const [name,label,type,option]=spec;if(type==="textarea")return `<label>${escape(label)}<textarea data-field="${name}" rows="5" maxlength="${option}"></textarea></label>`;
    if(type==="select")return `<label>${escape(label)}<select data-field="${name}">${option.map(([value,text])=>`<option value="${escape(value)}">${escape(text)}</option>`).join("")}</select></label>`;
    return `<label>${escape(label)}<input data-field="${name}" type="${type}" maxlength="${option}"></label>`;
  }
  function build(){
    sections.innerHTML=definition.groups.map((group,index)=>`<details ${index===0?"open":""}><summary><span><strong>${escape(group.title)}</strong><small>${escape(group.hint)}</small></span></summary><div class="ending-panel-body ${group.fields.length>2?"ending-grid":""}">${group.fields.map(inputHtml).join("")}</div></details>`).join("")+`<details open class="save-section"><summary><span><strong>3. Projekt i zapis</strong><small>Dodaj lub aktualizuj tę stronę w aktywnym projekcie</small></span><em id="pageState">NIE DODANO</em></summary><div class="ending-panel-body"><label class="include-page"><input id="includePage" type="checkbox"><span><strong>Uwzględnij tę stronę w książce</strong><small>Book Builder ustawi ją automatycznie we właściwym miejscu.</small></span></label><div class="panel-actions"><button id="resetPage" type="button" class="ghost">Przywróć propozycję</button><button id="savePage" type="button">Dodaj do Stron projektu</button></div></div></details>`;
  }
  function values(){const result={};definition.groups.flatMap(group=>group.fields).forEach(([name])=>result[name]=field(name).value.trim());return result}
  function fill(settings){definition.groups.flatMap(group=>group.fields).forEach(([name])=>{field(name).value=settings[name]??definition.defaults[name]??""})}
  function render(){status.textContent="Aktualizuję…";try{const page=FenixEndingRenderers.page(module,values(),existing());const rendered=FenixEndingRenderers.render(page,{width:2550,height:3300}),ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(rendered,0,0);status.textContent="Podgląd aktualny"}catch(error){status.textContent=error.message}}
  let timer;const queue=()=>{clearTimeout(timer);timer=setTimeout(render,100)};
  function state(){const page=existing(),included=Boolean(page);$("#includePage").checked=included;$("#pageState").textContent=included?"✓ W PROJEKCIE":"NIE DODANO";$("#savePage").textContent=included?"Aktualizuj stronę":"Dodaj do Stron projektu"}
  function save(){const original=existing(),page=FenixEndingRenderers.page(module,values(),original);if(original)FenixCore.updatePage(original.id,page);else FenixCore.addPage(page);state();saveStatus.textContent=original?`✓ Zaktualizowano „${page.title}”.`:`✓ Dodano „${page.title}” do projektu.`;saveStatus.classList.add("saved");setTimeout(()=>saveStatus.classList.remove("saved"),1800)}
  build();fill(FenixEndingRenderers.fromPage(existing(),module));state();render();
  sections.querySelectorAll("input:not(#includePage),textarea,select").forEach(input=>input.addEventListener("input",queue));
  $("#savePage").onclick=save;$("#resetPage").onclick=()=>{fill(definition.defaults);render();saveStatus.textContent="Przywrócono propozycję. Zapisz, aby zaktualizować projekt."};
  $("#includePage").onchange=event=>{const page=existing();if(event.target.checked){save();return}if(page&&confirm(`Usunąć stronę „${page.title}” z projektu?`)){FenixCore.removePage(page.id);state();saveStatus.textContent="Usunięto stronę z projektu."}else state()};
  $("#downloadPng").onclick=()=>{render();FenixCore.downloadCanvas(canvas,`${definition.file}-300dpi.png`)};
})();

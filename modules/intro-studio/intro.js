"use strict";

(()=>{
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  const PAGE_TYPES=FenixIntroRenderer.PAGE_TYPES;
  const panels=$("#introPanels"),canvas=$("#page"),status=$("#status"),saveStatus=$("#saveStatus");
  let activeType=PAGE_TYPES[0].id,renderTimer=null;

  function introPages(){return FenixCore.getCart().filter(page=>FenixPageSchema.moduleOf(page)==="intro-studio")}
  function existingPage(type){return introPages().find(page=>page.recipe?.settings?.pageType===type)||null}
  function defaultsFor(type){return FenixIntroRenderer.defaults(type,FenixCore.getActiveProject())}
  function field(type,name){return panels.querySelector(`[data-page-type="${type}"] [data-field="${name}"]`)}
  function values(type){
    const defaults=defaultsFor(type);
    return{
      pageType:type,
      title:field(type,"title")?.value.trim()||defaults.title,
      body:field(type,"body")?.value.trim()||defaults.body,
      footer:field(type,"footer")?.value.trim()||"",
      alignment:field(type,"alignment")?.value||"center",
      style:field(type,"style")?.value||"clean"
    };
  }
  function pageFromPanel(type,original=null){
    const settings=values(type),definition=PAGE_TYPES.find(item=>item.id===type),stamp=new Date().toISOString();
    return FenixPageSchema.normalize({
      id:original?.id,
      createdAt:original?.createdAt||stamp,
      updatedAt:stamp,
      module:"intro-studio",
      title:settings.title||definition.label,
      recipe:{module:"intro-studio",seed:null,title:settings.title||definition.label,settings,content:{},meta:{renderer:"intro-v1"},renderState:{}},
      solution:{available:false,imageData:null},
      validation:{kdp:{status:"ok",messages:[]}},
      production:{format:"8.5x11",bleed:"no-bleed",dpi:300,width:2550,height:3300},
      source:{app:"intro-studio",version:"0.20.0",format:"native"}
    });
  }
  function renderPreview(){
    const page=pageFromPanel(activeType,existingPage(activeType));
    FenixIntroRenderer.render(page,{canvas,width:2550,height:3300});
    const definition=PAGE_TYPES.find(item=>item.id===activeType);
    $("#previewLabel").textContent=definition.label;
    status.textContent="Podgląd aktualny";
  }
  function queuePreview(){status.textContent="Aktualizuję…";clearTimeout(renderTimer);renderTimer=setTimeout(renderPreview,120)}
  function setActive(type){
    activeType=type;
    panels.querySelectorAll("details").forEach(panel=>panel.classList.toggle("is-active",panel.dataset.pageType===type));
    queuePreview();
  }
  function applyPage(type,page){
    const defaults=defaultsFor(type),settings=page?.recipe?.settings||{};
    ["title","body","footer"].forEach(name=>{field(type,name).value=settings[name]??defaults[name]??""});
    field(type,"alignment").value=settings.alignment||"center";
    field(type,"style").value=settings.style||"clean";
  }
  function updatePanelState(type){
    const page=existingPage(type),panel=panels.querySelector(`[data-page-type="${type}"]`),button=panel.querySelector("[data-save-page]");
    panel.classList.toggle("is-in-project",Boolean(page));
    panel.querySelector("[data-page-state]").textContent=page?"✓ W PROJEKCIE":"NIE DODANO";
    button.textContent=page?"Aktualizuj stronę":"Dodaj do Stron projektu";
  }
  function savePage(type){
    const original=existingPage(type),page=pageFromPanel(type,original);
    if(original)FenixCore.updatePage(original.id,page);else FenixCore.addPage(page);
    updatePanelState(type);
    saveStatus.textContent=original?`✓ Zaktualizowano stronę „${page.title}”.`:`✓ Dodano stronę „${page.title}” do projektu.`;
    saveStatus.classList.add("saved");
    setTimeout(()=>saveStatus.classList.remove("saved"),1800);
  }
  function renderPanels(){
    panels.innerHTML=PAGE_TYPES.map((definition,index)=>`<details data-page-type="${definition.id}" ${index===0?"open":""}>
      <summary><span><strong>${escapeHtml(definition.label)}</strong><small>${escapeHtml(definition.description)}</small></span><em data-page-state>NIE DODANO</em></summary>
      <div class="intro-panel-body">
        <label>Tytuł strony<input data-field="title" maxlength="120"></label>
        <label>Treść strony<textarea data-field="body" rows="9" maxlength="1800"></textarea><small>To jest pełna treść, która pojawi się na finalnej stronie PDF.</small></label>
        <div class="form-grid">
          <label>Krótka stopka<input data-field="footer" maxlength="140" placeholder="Opcjonalnie"></label>
          <label>Wyrównanie treści<select data-field="alignment"><option value="center">Do środka</option><option value="left">Do lewej</option></select></label>
          <label>Styl strony<select data-field="style"><option value="clean">Czysty</option><option value="framed">Delikatna ramka</option><option value="playful">Zabawny</option></select></label>
        </div>
        <div class="panel-actions"><button type="button" data-reset-page class="ghost">Przywróć propozycję</button><button type="button" data-save-page>Dodaj do Stron projektu</button></div>
      </div>
    </details>`).join("");

    PAGE_TYPES.forEach(definition=>{
      const type=definition.id,page=existingPage(type),panel=panels.querySelector(`[data-page-type="${type}"]`);
      applyPage(type,page);
      updatePanelState(type);
      panel.addEventListener("toggle",()=>{if(panel.open)setActive(type)});
      panel.querySelectorAll("input,textarea,select").forEach(input=>input.addEventListener("input",()=>{activeType=type;queuePreview()}));
      panel.querySelector("[data-save-page]").addEventListener("click",()=>savePage(type));
      panel.querySelector("[data-reset-page]").addEventListener("click",()=>{applyPage(type,null);activeType=type;renderPreview();saveStatus.textContent="Przywrócono propozycję. Zapisz stronę, aby dodać ją do projektu."});
    });
  }
  function downloadPng(){renderPreview();FenixCore.downloadCanvas(canvas,`intro-${activeType}-300dpi.png`)}

  const project=FenixCore.getActiveProject();
  $("#projectInfo").textContent=`Aktywny projekt: ${project.name} · ${project.pages.length} stron`;
  renderPanels();
  renderPreview();
  $("#downloadPng").addEventListener("click",downloadPng);
})();

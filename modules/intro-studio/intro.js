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
    const settings={
      pageType:type,
      title:field(type,"title")?.value.trim()||defaults.title,
      body:field(type,"body")?.value.trim()||defaults.body,
      footer:field(type,"footer")?.value.trim()||"",
      alignment:field(type,"alignment")?.value||"center",
      style:field(type,"style")?.value||"clean",
      typographyVersion:2,
      titleSize:Math.max(72,Math.min(160,Number(field(type,"titleSize")?.value)||defaults.titleSize||112)),
      bodySize:Math.max(36,Math.min(90,Number(field(type,"bodySize")?.value)||defaults.bodySize||56)),
      footerSize:Math.max(28,Math.min(72,Number(field(type,"footerSize")?.value)||defaults.footerSize||44))
    };
    if(type==="mission-tracker"){
      settings.countMode=field(type,"countMode")?.value||"auto";
      settings.trackerCount=settings.countMode==="auto"?defaults.trackerCount:Math.max(1,Math.min(120,Number(field(type,"trackerCount")?.value)||defaults.trackerCount));
      settings.trackerColumns=Math.max(3,Math.min(12,Number(field(type,"trackerColumns")?.value)||defaults.trackerColumns));
      settings.markerShape=field(type,"markerShape")?.value||"star";
    }
    return settings;
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
      source:{app:"intro-studio",version:"0.27.6",format:"native"}
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
    ["title","body","footer"].forEach(name=>{field(type,name).value=settings[name]??defaults[name]??""});["titleSize","bodySize","footerSize"].forEach(name=>{field(type,name).value=settings[name]??defaults[name]});
    field(type,"alignment").value=settings.alignment||"center";
    field(type,"style").value=settings.style||"clean";
    if(type==="mission-tracker"){
      field(type,"countMode").value=settings.countMode||defaults.countMode;
      field(type,"trackerCount").value=settings.countMode==="manual"?(settings.trackerCount||defaults.trackerCount):defaults.trackerCount;
      field(type,"trackerColumns").value=settings.trackerColumns||defaults.trackerColumns;
      field(type,"markerShape").value=settings.markerShape||defaults.markerShape;
      updateTrackerControls();
    }
  }
  function updateTrackerControls(){
    const countMode=field("mission-tracker","countMode"),count=field("mission-tracker","trackerCount"),note=panels.querySelector('[data-page-type="mission-tracker"] [data-tracker-note]');if(!countMode||!count)return;
    const automatic=countMode.value==="auto",project=FenixCore.getActiveProject(),detected=FenixIntroRenderer.activityCount(project),effective=defaultsFor("mission-tracker").trackerCount;count.disabled=automatic;if(automatic)count.value=effective;
    note.textContent=automatic?(detected?`Fenix wykrył ${detected} stron aktywności. Strony Intro i techniczne nie są liczone.`:`Nie wykryto jeszcze stron aktywności — Fenix używa wartości startowej ${effective}.`):"Ręczna liczba pól zastępuje wynik automatyczny.";
  }
  function updatePanelState(type){
    const page=existingPage(type),panel=panels.querySelector(`[data-page-type="${type}"]`),button=panel.querySelector("[data-save-page]");
    panel.classList.toggle("is-in-project",Boolean(page));
    panel.querySelector("[data-page-state]").textContent=page?"✓ W PROJEKCIE":"NIE DODANO";
    panel.querySelector("[data-include-page]").checked=Boolean(page);
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
  function setIncluded(type,included,checkbox){
    const page=existingPage(type);
    if(included){savePage(type);return}
    if(!page){updatePanelState(type);return}
    if(!confirm(`Usunąć stronę „${page.title}” z książki? Jej panel pozostanie dostępny w Intro Studio.`)){checkbox.checked=true;return}
    FenixCore.removePage(page.id);
    updatePanelState(type);
    saveStatus.textContent=`Usunięto stronę „${page.title}” z projektu.`;
    saveStatus.classList.add("saved");
    setTimeout(()=>saveStatus.classList.remove("saved"),1800);
  }
  function renderPanels(){
    panels.innerHTML=PAGE_TYPES.map((definition,index)=>{const tracker=definition.id==="mission-tracker";return`<details data-page-type="${definition.id}" ${index===0?"open":""}>
      <summary><span><strong>${escapeHtml(definition.label)}</strong><small>${escapeHtml(definition.description)}</small></span><em data-page-state>NIE DODANO</em></summary>
      <div class="intro-panel-body">
        <label class="include-page"><input type="checkbox" data-include-page><span><strong>Uwzględnij tę stronę w książce</strong><small>Zaznaczenie dodaje stronę do projektu, a odznaczenie ją usuwa.</small></span></label>
        <label>Tytuł strony<input data-field="title" maxlength="120"></label>
        <label>${tracker?"Instrukcja nad trackerem":"Treść strony"}<textarea data-field="body" rows="${tracker?3:9}" maxlength="1800"></textarea><small>To jest pełna treść, która pojawi się na finalnej stronie PDF.</small></label>
        ${tracker?`<div class="tracker-options form-grid"><label>Liczba pól<select data-field="countMode"><option value="auto">Automatycznie z projektu</option><option value="manual">Ustaw ręcznie</option></select></label><label>Pola / aktywności<input data-field="trackerCount" type="number" min="1" max="120"></label><label>Kolumny<input data-field="trackerColumns" type="number" min="3" max="12"></label><label>Symbol<select data-field="markerShape"><option value="star">Gwiazda</option><option value="circle">Koło</option><option value="square">Kwadrat</option></select></label><p data-tracker-note class="tracker-note"></p></div>`:""}
        <div class="form-grid">
          <label>Krótka stopka<input data-field="footer" maxlength="140" placeholder="Opcjonalnie"></label>
          <label>Wyrównanie treści<select data-field="alignment"><option value="center">Do środka</option><option value="left">Do lewej</option></select></label>
          <label>Styl strony<select data-field="style"><option value="clean">Czysty</option><option value="framed">Delikatna ramka</option><option value="playful">Zabawny</option></select></label>
        </div>
        <div class="section-title">Typografia</div>
        <div class="form-grid">
          <label>Wielkość tytułu<input data-field="titleSize" type="number" min="72" max="160"></label>
          <label>Wielkość treści / instrukcji<input data-field="bodySize" type="number" min="36" max="90"></label>
          <label>Wielkość stopki<input data-field="footerSize" type="number" min="28" max="72"></label>
        </div>
        <div class="panel-actions"><button type="button" data-reset-page class="ghost">Przywróć propozycję</button><button type="button" data-save-page>Dodaj do Stron projektu</button></div>
      </div>
    </details>`}).join("");

    PAGE_TYPES.forEach(definition=>{
      const type=definition.id,page=existingPage(type),panel=panels.querySelector(`[data-page-type="${type}"]`);
      applyPage(type,page);
      updatePanelState(type);
      panel.addEventListener("toggle",()=>{if(panel.open)setActive(type)});
      panel.querySelectorAll("input:not([data-include-page]),textarea,select").forEach(input=>input.addEventListener("input",()=>{activeType=type;queuePreview()}));
      if(type==="mission-tracker")field(type,"countMode").addEventListener("change",()=>{updateTrackerControls();activeType=type;queuePreview()});
      panel.querySelector("[data-include-page]").addEventListener("change",event=>{activeType=type;setIncluded(type,event.target.checked,event.target);queuePreview()});
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

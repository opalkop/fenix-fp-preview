"use strict";

(async()=>{
  const currentScript=[...document.scripts].find(script=>/\/assets\/launcher\.js(?:\?|$)/.test(script.src));
  const load=(relative,test)=>new Promise((resolve,reject)=>{if(test())return resolve();const script=document.createElement("script");script.src=new URL(relative,currentScript?.src||location.href).href;script.onload=resolve;script.onerror=()=>reject(new Error(`Nie udało się załadować ${relative}`));document.head.appendChild(script)});
  await load("../config/module-registry.js",()=>Boolean(window.FenixModuleRegistry));
  await load("../core/page-schema.js",()=>Boolean(window.FenixPageSchema));
  await load("../core/project-validator.js",()=>Boolean(window.FenixProjectValidator));

  const READY_MODULES=new Set(["maze-studio","word-search-studio","intro-studio"]);
  const STATUS_ORDER=Object.freeze({ready:0,development:1,planned:2});
  const rawDashboardModules=FenixModuleRegistry.dashboard();
  const dashboardModules=rawDashboardModules.map((module,index)=>({
    ...module,
    dashboardStatus:module.planned?"planned":READY_MODULES.has(module.slug)?"ready":"development",
    dashboardOrder:index
  })).sort((a,b)=>STATUS_ORDER[a.dashboardStatus]-STATUS_ORDER[b.dashboardStatus]||a.dashboardOrder-b.dashboardOrder);
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  const formatLabel=value=>({"8.5x11":"8,5 × 11 cala","6x9":"6 × 9 cala",a4:"A4",A4:"A4"}[value]||value),bleedLabel=value=>value==="bleed"?"ze spadami":"bez spadów",dateLabel=value=>new Date(value).toLocaleString("pl-PL",{dateStyle:"short",timeStyle:"short"});
  const normalize=page=>FenixPageSchema.normalize(page),isMaze=page=>FenixPageSchema.moduleOf(page)==="maze-studio";
  const hasSolution=page=>Boolean(page?.solution?.available);
  const studioHref=page=>FenixModuleRegistry.get(page.module)?`modules/${page.module}/index.html?id=${encodeURIComponent(page.id)}`:null;

  const themeSelect=$("#themeSelect");
  themeSelect.value=localStorage.getItem("fenix-ui-theme")||"light";
  themeSelect.addEventListener("change",()=>{const theme=themeSelect.value;localStorage.setItem("fenix-ui-theme",theme);document.documentElement.dataset.theme=theme;window.dispatchEvent(new CustomEvent("fenix-theme-change",{detail:{theme}}))});

  const grid=$("#grid");
  if(grid&&!grid.previousElementSibling?.classList.contains("module-status-legend")){
    grid.insertAdjacentHTML("beforebegin",`<div class="module-status-legend" aria-label="Status modułów"><span class="module-status-key ready"><i></i>Gotowe</span><span class="module-status-key development"><i></i>W rozwoju</span><span class="module-status-key planned"><i></i>Planowane</span></div>`);
  }
  const modulePageCounts=project=>project.pages.reduce((counts,page)=>{const slug=FenixPageSchema.moduleOf(page);if(slug)counts[slug]=(counts[slug]||0)+1;return counts},{});
  const introSummary=selected=>{
    const names=dashboardModules.filter(module=>module.slug!=="intro-studio"&&selected.has(module.slug)).map(module=>module.name.replace(/ Studio$/,""));
    if(!names.length)return'<span class="module-intro-empty">Nie skonfigurowano</span>';
    const visible=names.slice(0,3).join(", "),more=names.length>3?` +${names.length-3}`:"";
    return`<span class="module-intro-count">✓ ${names.length}</span><span class="module-intro-names">${escapeHtml(visible+more)}</span>`;
  };
  function renderModules(){
    const project=FenixCore.getActiveProject(),introSelected=new Set(FenixCore.getIntroPlan().selectedModules),pageCounts=modulePageCounts(project);
    grid.innerHTML=dashboardModules.map(module=>{
      const pageCount=pageCounts[module.slug]||0,isIntro=module.slug==="intro-studio";
      const statusClass=` status-${module.dashboardStatus}${module.status==="structure"?" status-structure":""}${pageCount?" has-project-pages":""}`;
      const statusBadge=module.dashboardStatus==="ready"?'<span class="module-badge ready">GOTOWE</span>':module.dashboardStatus==="development"?'<span class="module-badge development">W ROZWOJU</span>':'<span class="module-badge planned">PLANOWANE</span>';
      const typeBadge=module.status==="structure"?'<span class="module-badge structure">STRUKTURA</span>':"";
      const pagesBadge=pageCount?`<span class="module-project-badge pages">W PROJEKCIE · ${pageCount} STR.</span>`:"";
      const href=`modules/${module.slug}/index.html`,interactive=!module.planned;
      const studioAction=module.planned?'<span class="module-placeholder">Do zaprojektowania →</span>':`<a class="module-link" href="${href}">Otwórz Studio →</a>`;
      const introState=isIntro?`<div class="module-intro-summary"><small>W INTRO</small>${introSummary(introSelected)}</div>`:"";
      return `<article class="module${statusClass}${interactive?" module-clickable":""}" data-module-slug="${module.slug}"${interactive?` data-module-href="${href}" role="link" tabindex="0" aria-label="Otwórz ${escapeHtml(module.name)}"`:""}><div class="module-top"><span class="module-icon">${escapeHtml(module.dashboardIcon||module.icon||"MOD")}</span><div class="module-badges">${statusBadge}${typeBadge}</div></div><div class="module-project-state">${pagesBadge}</div><h4>${escapeHtml(module.name)}</h4><p>${escapeHtml(module.dashboardDescription||module.description||"")}</p>${introState}<div class="module-actions">${studioAction}</div></article>`;
    }).join("");
  }
  grid.addEventListener("click",event=>{
    const card=event.target.closest(".module[data-module-href]");if(!card||event.target.closest("a,button,input,select,textarea"))return;location.href=card.dataset.moduleHref;
  });
  grid.addEventListener("keydown",event=>{const card=event.target.closest(".module[data-module-href]");if(!card||event.target!==card||(event.key!=="Enter"&&event.key!==" "))return;event.preventDefault();location.href=card.dataset.moduleHref});
  document.querySelectorAll(".nav .badge").forEach(badge=>{if(badge.closest("a")?.getAttribute("href")==="#modules")badge.textContent=dashboardModules.length});

  const projectSelect=$("#projectSelect"),projectCards=$("#projectCards"),projectDialog=$("#projectDialog"),projectForm=$("#projectForm"),projectId=$("#projectId"),projectName=$("#projectName"),projectFormat=$("#projectFormat"),projectBleed=$("#projectBleed"),projectAge=$("#projectAge"),projectTopic=$("#projectTopic"),deleteProjectButton=$("#deleteProject");
  function renderProjects(){
    const projects=FenixCore.getProjects(),active=FenixCore.getActiveProject();
    $("#sideProjectCount").textContent=projects.length;
    $("#activeProjectName").textContent=active.name;
    $("#activeProjectMeta").textContent=[formatLabel(active.format),bleedLabel(active.bleed),"300 DPI",active.ageGroup,active.topic].filter(Boolean).join(" · ");
    projectSelect.innerHTML=projects.map(project=>`<option value="${project.id}">${escapeHtml(project.name)} · ${project.pages.length} str.</option>`).join("");projectSelect.value=active.id;
    projectCards.innerHTML=projects.map(project=>`<article class="project-card ${project.id===active.id?"active":""}" data-project-id="${project.id}"><div><span class="project-status">${project.id===active.id?"Aktywny":"Projekt"}</span><h4>${escapeHtml(project.name)}</h4><p>${formatLabel(project.format)} · ${bleedLabel(project.bleed)}${project.ageGroup?` · ${escapeHtml(project.ageGroup)}`:""}</p></div><div class="project-card-bottom"><span>${project.pages.length} stron</span><small>Edytowano ${dateLabel(project.updatedAt)}</small></div></article>`).join("");
    projectCards.querySelectorAll("[data-project-id]").forEach(card=>card.onclick=()=>FenixCore.setActiveProject(card.dataset.projectId));
  }
  function openProjectDialog(project=null){const editing=Boolean(project);$("#projectDialogTitle").textContent=editing?"Edytuj projekt":"Nowy projekt";projectId.value=project?.id||"";projectName.value=project?.name||"";projectFormat.value=String(project?.format||"8.5x11").toLowerCase()==="a4"?"a4":project?.format||"8.5x11";projectBleed.value=project?.bleed||"no-bleed";projectAge.value=project?.ageGroup||"";projectTopic.value=project?.topic||"";deleteProjectButton.hidden=!editing;projectDialog.showModal();setTimeout(()=>projectName.focus(),0)}
  projectSelect.onchange=()=>FenixCore.setActiveProject(projectSelect.value);$("#newProject").onclick=()=>openProjectDialog();$("#newProjectTop").onclick=()=>openProjectDialog();$("#editProject").onclick=()=>openProjectDialog(FenixCore.getActiveProject());$("#closeProjectDialog").onclick=()=>projectDialog.close();$("#cancelProject").onclick=()=>projectDialog.close();projectDialog.addEventListener("click",event=>{if(event.target===projectDialog)projectDialog.close()});
  projectForm.addEventListener("submit",event=>{event.preventDefault();const data={name:projectName.value.trim(),format:projectFormat.value,bleed:projectBleed.value,ageGroup:projectAge.value.trim(),topic:projectTopic.value.trim()};if(!data.name)return;if(projectId.value)FenixCore.updateProject(projectId.value,data);else FenixCore.createProject(data);projectDialog.close()});
  deleteProjectButton.onclick=()=>{const projects=FenixCore.getProjects();if(projects.length===1)return alert("Nie można usunąć jedynego projektu.");const project=FenixCore.getActiveProject();if(confirm(`Usunąć projekt „${project.name}” wraz z jego stronami?`)){FenixCore.deleteProject(project.id);projectDialog.close()}};

  const bookBuilderButton=$("#openBookBuilder"),exportButton=$("#exportCart"),exportProjectButton=$("#exportProject"),clearButton=$("#clearCart");
  const setCartActionsState=hasPages=>[bookBuilderButton,exportButton,clearButton].forEach(element=>{element.classList.toggle("is-disabled",!hasPages);element.setAttribute("aria-disabled",String(!hasPages));if(element.tagName==="BUTTON")element.disabled=!hasPages});
  const kdpText=page=>{const status=FenixPageSchema.kdpStatus(page);return status==="ok"?"KDP OK":status==="warning"?"KDP: ostrzeżenie":status==="error"?"KDP: błąd":"KDP: brak walidacji"};
  function renderCart(){
    const project=FenixCore.getActiveProject(),cart=project.pages.map(normalize),hasPages=cart.length>0,used=new Set(cart.map(page=>page.module)),validation=FenixProjectValidator.validate({...project,pages:cart}),solutionCount=cart.filter(hasSolution).length,estimatedCount=cart.length+solutionCount;
    $("#cartStatus").textContent=`${cart.length} stron · +${solutionCount} rozwiązań · do ${estimatedCount} stron`;
    $("#cartCountLarge").textContent=cart.length;
    $("#cartSolutionCount").textContent=`${solutionCount} ${solutionCount===1?"potencjalne rozwiązanie":"potencjalnych rozwiązań"}`;
    $("#cartEstimatedCount").textContent=`Szacowany skład: do ${estimatedCount} stron.`;
    $("#sideCartCount").textContent=cart.length;$("#statPages").textContent=cart.length;$("#statSolutions").textContent=solutionCount;$("#statPdf").textContent=estimatedCount;$("#statModules").textContent=`${used.size} / ${dashboardModules.length}`;$("#statReady").textContent=`${validation.score}%`;$("#statReady").title=validation.checks.map(check=>`${check.label}: ${check.message}`).join("\n");$("#cartProgress").style.width=`${validation.score}%`;
    $("#cartList").innerHTML=hasPages?cart.map(page=>{const href=studioHref(page),interactive=Boolean(href),solutionText=hasSolution(page)?"Rozwiązanie: dostępne":"Rozwiązanie: brak";return `<div class="cart-item${interactive?" cart-item-clickable":""}"${interactive?` data-page-href="${href}" role="link" tabindex="0" aria-label="Otwórz ${escapeHtml(page.title)} w Studio"`:""}><div><strong>${escapeHtml(page.title)}</strong><br><small>${escapeHtml(page.module)} · ${new Date(page.createdAt).toLocaleString()}</small><br><small class="solution-availability ${hasSolution(page)?"has-solution":"no-solution"}">${solutionText}</small>${page.source.app==="fenix-mobile"?`<br><small class="mobile-source">FENIX Mobile · ${kdpText(page)}</small>`:""}</div><div>${isMaze(page)?`<a class="btn" href="${href}">Edytuj</a>`:""}<button data-remove="${page.id}" class="btn">Usuń</button></div></div>`}).join(""):"<div class=\"cart-empty\"><strong>Ten projekt nie ma jeszcze stron.</strong><span>Otwórz Studio, utwórz stronę i zapisz ją do aktywnego projektu.</span></div>";
    setCartActionsState(hasPages);
    document.querySelectorAll("[data-remove]").forEach(button=>button.onclick=()=>FenixCore.removePage(button.dataset.remove));
    document.querySelectorAll(".cart-item[data-page-href]").forEach(card=>{
      const open=()=>{location.href=card.dataset.pageHref};
      card.addEventListener("click",event=>{if(event.target.closest("a,button,input,select,textarea"))return;open()});
      card.addEventListener("keydown",event=>{if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();open()});
    });
  }
  let scheduled=false;function scheduleRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderProjects();renderModules();renderCart()})}window.addEventListener("fenix-state-change",scheduleRender);renderProjects();renderModules();renderCart();
  bookBuilderButton.onclick=event=>{if(bookBuilderButton.getAttribute("aria-disabled")==="true")event.preventDefault()};exportButton.onclick=FenixCore.exportPack;exportProjectButton.onclick=FenixCore.exportProject;clearButton.onclick=()=>{const project=FenixCore.getActiveProject();if(confirm(`Wyczyścić strony projektu „${project.name}”?`))FenixCore.clear()};

  const importStatus=$("#mobileImportStatus"),setImportStatus=(text,type="info")=>{importStatus.textContent=text;importStatus.dataset.type=type};
  const projectImportButton=$("#importProject"),projectImportTop=$("#importProjectTop"),projectImportFile=$("#importProjectFile");
  const openProjectImport=()=>projectImportFile.click();projectImportButton.onclick=openProjectImport;projectImportTop.onclick=openProjectImport;
  projectImportFile.onchange=async()=>{const file=projectImportFile.files?.[0];if(!file)return;projectImportButton.disabled=projectImportTop.disabled=true;setImportStatus("Importuję projekt Feniksa…");try{let payload;try{payload=JSON.parse(await file.text())}catch{throw new Error("Nie można odczytać pliku projektu.")}const project=FenixCore.importProjectPayload(payload);setImportStatus(`Zaimportowano projekt „${project.name}”: ${project.pages.length} stron, assety: ${Object.keys(project.assets||{}).length}.`,"ok")}catch(error){console.error(error);setImportStatus(error.message||"Import projektu nie powiódł się.","error");alert(error.message||"Nie udało się zaimportować projektu.")}finally{projectImportButton.disabled=projectImportTop.disabled=false;projectImportFile.value=""}};

  const importButton=$("#importMobile"),importButtonTop=$("#importMobileTop"),importFile=$("#importMobileFile");
  function validateMobileProject(data){if(!data||data.type!=="FENIX_MOBILE_PROJECT")throw new Error("To nie jest projekt wyeksportowany z FENIX Mobile.");if(!data.project||!Array.isArray(data.project.pages)||!data.project.pages.length)throw new Error("Plik nie zawiera prawidłowych stron projektu.");return data}
  function desktopPageFromMobile(page,data,index){return FenixPageSchema.normalize({...page,title:page.title||page.recipe?.title||`Strona ${index+1}`,source:{app:"fenix-mobile",version:data.appVersion||"unknown",format:"FENIX_MOBILE_PROJECT",originalId:page.id||null,projectName:data.project.name||null}})}
  async function importMobileProject(file){let data;try{data=JSON.parse(await file.text())}catch{throw new Error("Nie można odczytać pliku JSON.")}validateMobileProject(data);const imported=data.project.pages.map((page,index)=>desktopPageFromMobile(page,data,index));FenixCore.setCart([...FenixCore.getCart(),...imported]);return{count:imported.length,name:data.project.name||file.name,profile:data.productionProfile||null,mazeCount:imported.filter(isMaze).length}}
  const openImport=()=>importFile.click();importButton.onclick=openImport;importButtonTop.onclick=openImport;importFile.onchange=async()=>{const file=importFile.files?.[0];if(!file)return;importButton.disabled=importButtonTop.disabled=true;setImportStatus("Importuję projekt z FENIX Mobile…");try{const result=await importMobileProject(file),format=result.profile?.format||"nieokreślony",bleed=result.profile?.bleed==="bleed"?"ze spadami":"bez spadów";setImportStatus(`Zaimportowano „${result.name}”: ${result.count} stron · ${format} · ${bleed}. Labirynty: ${result.mazeCount}.`,"ok")}catch(error){console.error(error);setImportStatus(error.message||"Import nie powiódł się.","error");alert(error.message||"Nie udało się zaimportować projektu.")}finally{importButton.disabled=importButtonTop.disabled=false;importFile.value=""}};
})().catch(error=>{console.error(error);alert("FENIX nie uruchomił Dashboardu: "+error.message)});

"use strict";

(()=>{
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??"").replace(/[&<>'\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[char]));
  const allModules=FenixModuleRegistry.dashboard().filter(module=>module.slug!=="intro-studio");
  const choiceContainer=$("#introChoices"),status=$("#saveStatus");

  function label(module){return module.name.replace(/ Studio$/,"")}
  function selectedSlugs(){return[...choiceContainer.querySelectorAll("input:checked")].map(input=>input.value)}
  function updateSummary(){
    const selected=new Set(selectedSlugs()),modules=allModules.filter(module=>selected.has(module.slug));
    $("#selectionCount").textContent=modules.length;
    $("#selectionSummary").innerHTML=modules.length?modules.map(module=>`<span>${escapeHtml(label(module))}</span>`).join(""):'<span class="empty">Nic jeszcze nie wybrano</span>';
  }
  function save(){
    FenixCore.setIntroModules(selectedSlugs());
    status.textContent="✓ Wybór zapisany w aktywnym projekcie.";status.classList.add("saved");
    updateSummary();
    clearTimeout(save.timer);save.timer=setTimeout(()=>{status.textContent="Wybór zapisuje się automatycznie w aktywnym projekcie.";status.classList.remove("saved")},1800);
  }
  function render(){
    const project=FenixCore.getActiveProject(),selected=new Set(FenixCore.getIntroPlan().selectedModules);
    $("#projectInfo").textContent=`Aktywny projekt: ${project.name} · ${project.pages.length} stron`;
    choiceContainer.innerHTML=allModules.map(module=>`<label class="intro-choice"><input type="checkbox" value="${module.slug}" ${selected.has(module.slug)?"checked":""}><span><strong>${escapeHtml(label(module))}</strong><small>${escapeHtml(module.dashboardDescription||module.description||"")}</small>${module.planned?'<em>Studio planowane</em>':""}</span></label>`).join("");
    choiceContainer.querySelectorAll("input").forEach(input=>input.addEventListener("change",save));
    updateSummary();
  }
  $("#selectUsed").addEventListener("click",()=>{
    const used=new Set(FenixCore.getActiveProject().pages.map(page=>FenixPageSchema.moduleOf(page)));
    choiceContainer.querySelectorAll("input").forEach(input=>{input.checked=used.has(input.value)});save();
  });
  $("#clearSelection").addEventListener("click",()=>{choiceContainer.querySelectorAll("input").forEach(input=>{input.checked=false});save()});
  render();
})();

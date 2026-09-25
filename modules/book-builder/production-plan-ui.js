"use strict";
(()=>{
  const $=selector=>document.querySelector(selector);
  const planner=window.FenixProductionPlan;
  const core=(()=>{try{return typeof FenixCore!=="undefined"?FenixCore:null}catch{return null}})();
  if(!planner||!core)return;

  function currentPresetId(){return $("#productionPlanPreset")?.value||"ocean-fantasy-50"}

  function summaryText(result){
    const missing=result.missingCount;
    const overflow=result.overflowCount;
    const parts=[`Przypisano ${result.assignedCount}/${result.preset.slots.length} zaplanowanych aktywności.`];
    if(missing)parts.push(`Pozostało ${missing} pustych slotów.`);
    else parts.push("Plan 50/50 jest kompletny.");
    if(overflow)parts.push(`Poza planem: ${overflow} dodatkowych stron.`);
    return parts.join(" ");
  }

  function setWorking(message){
    const status=$("#productionPlanStatus"),apply=$("#applyProductionPlan"),clear=$("#clearProductionPlan");
    if(status)status.textContent=message;
    if(apply)apply.disabled=true;
    if(clear)clear.disabled=true;
  }

  function clearWorking(){
    const apply=$("#applyProductionPlan"),clear=$("#clearProductionPlan");
    if(apply)apply.disabled=false;
    if(clear)clear.disabled=false;
  }

  async function flushAndReload(message){
    if(typeof core.flushStorage==="function")await core.flushStorage();
    sessionStorage.setItem("fenix-production-plan-message",message);
    location.reload();
  }

  async function applyPlan(){
    const source=core.getCart();
    if(!source.length){alert("Projekt nie zawiera jeszcze stron do uporządkowania.");return}
    try{
      setWorking("Zapisuję plan aktywności i zabezpieczam dane projektu…");
      const result=planner.applyPreset(source,currentPresetId());
      const ordered=window.FenixBookOrder?.sort?window.FenixBookOrder.sort(result.pages):result.pages;
      core.setCart(ordered);
      await flushAndReload(summaryText(result));
    }catch(error){
      console.error("Production Plan",error);
      alert(`Nie udało się zastosować planu produkcyjnego: ${error.message}`);
      clearWorking();
    }
  }

  async function clearPlan(){
    try{
      setWorking("Usuwam przypisania planu i zabezpieczam dane projektu…");
      const source=core.getCart();
      const cleaned=source.map(page=>{
        if(!page?.recipe?.meta?.productionPlan&&!page?.productionPlan)return page;
        const recipe={...(page.recipe||{})};
        const meta={...(recipe.meta||{})};
        delete meta.productionPlan;
        recipe.meta=meta;
        const next={...page,recipe};
        if(Object.hasOwn(next,"productionPlan"))delete next.productionPlan;
        return next;
      });
      core.setCart(cleaned);
      await flushAndReload("Usunięto przypisania planu produkcyjnego. Kolejność stron pozostawiono bez zmian.");
    }catch(error){
      console.error("Production Plan",error);
      alert(`Nie udało się usunąć przypisań planu: ${error.message}`);
      clearWorking();
    }
  }

  function decorateCards(){
    const byId=new Map(core.getCart().map(page=>[String(page.id||""),page]));
    document.querySelectorAll("#pageList .page-card").forEach(card=>{
      const page=byId.get(String(card.dataset.pageId||""));
      const meta=page?planner.describePage(page):null;
      let badge=card.querySelector(".production-slot-badge");
      if(!meta){if(badge)badge.remove();return}
      const text=`#${meta.slot} · ${meta.zoneName} · zadanie ${meta.activityInZone}/10`;
      if(badge?.textContent===text)return;
      if(!badge){badge=document.createElement("div");badge.className="production-slot-badge"}
      badge.textContent=text;
      const target=card.querySelector(".page-meta");
      if(target&&!badge.isConnected)target.insertBefore(badge,target.firstChild);
    });
  }

  $("#applyProductionPlan")?.addEventListener("click",applyPlan);
  $("#clearProductionPlan")?.addEventListener("click",clearPlan);

  const message=sessionStorage.getItem("fenix-production-plan-message");
  if(message){
    sessionStorage.removeItem("fenix-production-plan-message");
    const status=$("#productionPlanStatus");
    if(status)status.textContent=message;
  }

  const list=$("#pageList");
  if(list){
    const observer=new MutationObserver(()=>decorateCards());
    // Cards are direct children of the list. Watching the full subtree made
    // decorateCards react to its own badge insertions and loop forever.
    observer.observe(list,{childList:true});
    setTimeout(decorateCards,0);
  }
})();

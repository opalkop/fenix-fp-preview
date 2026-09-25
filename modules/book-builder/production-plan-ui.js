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

  function applyPlan(){
    const source=core.getCart();
    if(!source.length){alert("Projekt nie zawiera jeszcze stron do uporządkowania.");return}
    try{
      const result=planner.applyPreset(source,currentPresetId());
      core.setCart(result.pages);
      sessionStorage.setItem("fenix-production-plan-message",summaryText(result));
      location.reload();
    }catch(error){
      console.error("Production Plan",error);
      alert(`Nie udało się zastosować planu produkcyjnego: ${error.message}`);
    }
  }

  function clearPlan(){
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
    sessionStorage.setItem("fenix-production-plan-message","Usunięto przypisania planu produkcyjnego. Kolejność stron pozostawiono bez zmian.");
    location.reload();
  }

  function decorateCards(){
    const byId=new Map(core.getCart().map(page=>[String(page.id||""),page]));
    document.querySelectorAll("#pageList .page-card").forEach(card=>{
      const page=byId.get(String(card.dataset.pageId||""));
      const meta=page?planner.describePage(page):null;
      const old=card.querySelector(".production-slot-badge");
      if(old)old.remove();
      if(!meta)return;
      const badge=document.createElement("div");
      badge.className="production-slot-badge";
      badge.textContent=`#${meta.slot} · ${meta.zoneName} · zadanie ${meta.activityInZone}/10`;
      const target=card.querySelector(".page-meta");
      if(target)target.insertBefore(badge,target.firstChild);
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
    observer.observe(list,{childList:true,subtree:true});
    setTimeout(decorateCards,0);
  }
})();

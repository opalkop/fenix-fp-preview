"use strict";

window.FenixProductionPlan=Object.freeze((()=>{
  const OCEAN_FANTASY_ZONES=Object.freeze([
    {id:"coral-reef",name:"Coral Reef"},
    {id:"turtle-bay",name:"Turtle Bay"},
    {id:"sunken-treasure",name:"Sunken Treasure"},
    {id:"mystic-deep",name:"Mystic Deep"},
    {id:"fantasy-kingdom",name:"Fantasy Kingdom"}
  ]);


  const ROBO_FUTURE_ZONES=Object.freeze([
    {id:"robot-lab",name:"Robot Lab"},
    {id:"factory-floor",name:"Factory Floor"},
    {id:"tech-zone",name:"Tech Zone"},
    {id:"future-city",name:"Future City"},
    {id:"space-mission",name:"Space Mission"}
  ]);

  // 50 aktywności ROBO FUTURE. Kolejność stron wewnątrz każdego Studia
  // pozostaje kolejnością produkcyjną, więc X1→Color X1, X2→Color X2 itd.
  const ROBO_FUTURE_MODULES=Object.freeze([
    ["maze-studio","coloring-studio","maze-studio","coloring-studio","maze-studio","coloring-studio","maze-studio","coloring-studio","word-search-studio","matching-studio"],
    ["tracing-studio","complete-picture","hidden-objects-studio","coloring-studio","dot-to-dot-studio","maze-studio","coloring-studio","logic-studio","word-search-studio","matching-studio"],
    ["tracing-studio","complete-picture","hidden-objects-studio","coloring-studio","dot-to-dot-studio","maze-studio","coloring-studio","hidden-objects-studio","word-search-studio","matching-studio"],
    ["tracing-studio","complete-picture","coloring-studio","dot-to-dot-studio","maze-studio","hidden-objects-studio","coloring-studio","logic-studio","word-search-studio","matching-studio"],
    ["tracing-studio","complete-picture","hidden-objects-studio","coloring-studio","dot-to-dot-studio","maze-studio","complete-picture","hidden-objects-studio","tracing-studio","complete-picture"]
  ]);

  function makeRoboFutureSlots(){
    const slots=[];
    ROBO_FUTURE_MODULES.forEach((modules,zoneIndex)=>{
      const zone=ROBO_FUTURE_ZONES[zoneIndex];
      modules.forEach((module,index)=>slots.push(Object.freeze({
        slot:slots.length+1,zoneId:zone.id,zoneName:zone.name,
        zoneOrder:zoneIndex+1,activityInZone:index+1,module
      })));
    });
    return Object.freeze(slots);
  }

  const OCEAN_FANTASY_MODULES=Object.freeze([
    ["coloring-studio","maze-studio","matching-studio","dot-to-dot-studio","hidden-objects-studio","coloring-studio","maze-studio","complete-picture","word-search-studio","logic-studio"],
    ["coloring-studio","maze-studio","dot-to-dot-studio","matching-studio","hidden-objects-studio","coloring-studio","maze-studio","word-search-studio","complete-picture","logic-studio"],
    ["coloring-studio","maze-studio","hidden-objects-studio","dot-to-dot-studio","matching-studio","maze-studio","coloring-studio","word-search-studio","complete-picture","logic-studio"],
    ["maze-studio","coloring-studio","hidden-objects-studio","dot-to-dot-studio","matching-studio","maze-studio","coloring-studio","word-search-studio","coloring-studio","logic-studio"],
    ["coloring-studio","maze-studio","dot-to-dot-studio","hidden-objects-studio","matching-studio","maze-studio","complete-picture","word-search-studio","dot-to-dot-studio","hidden-objects-studio"]
  ]);

  function makeOceanFantasySlots(){
    const slots=[];
    OCEAN_FANTASY_MODULES.forEach((modules,zoneIndex)=>{
      const zone=OCEAN_FANTASY_ZONES[zoneIndex];
      modules.forEach((module,index)=>slots.push(Object.freeze({
        slot:slots.length+1,
        zoneId:zone.id,
        zoneName:zone.name,
        zoneOrder:zoneIndex+1,
        activityInZone:index+1,
        module
      })));
    });
    return Object.freeze(slots);
  }

  const PRESETS=Object.freeze({
    "robo-future-50":Object.freeze({
      id:"robo-future-50",
      name:"ROBO FUTURE — 5 misji / 50 aktywności",
      slots:makeRoboFutureSlots()
    }),
    "ocean-fantasy-50":Object.freeze({
      id:"ocean-fantasy-50",
      name:"Ocean Fantasy Adventure — 5 stref / 50 aktywności",
      slots:makeOceanFantasySlots()
    })
  });

  const moduleOf=page=>String(page?.module||page?.recipe?.module||"");
  const isBlank=page=>Boolean(page?._blank)||moduleOf(page)==="blank-page";
  const isIntro=page=>moduleOf(page)==="intro-studio";
  const isClosing=page=>["congratulations-studio","qr-studio","certificate-studio","closing-studio","solutions-studio"].includes(moduleOf(page));
  const isActivity=page=>!isBlank(page)&&!isIntro(page)&&!isClosing(page);

  function planMeta(page){
    return page?.recipe?.meta?.productionPlan||page?.productionPlan||null;
  }

  function withPlanMeta(page,preset,slot){
    const recipe={...(page.recipe||{})};
    const meta={...(recipe.meta||{})};
    meta.productionPlan={
      presetId:preset.id,
      slot:slot.slot,
      zoneId:slot.zoneId,
      zoneName:slot.zoneName,
      zoneOrder:slot.zoneOrder,
      activityInZone:slot.activityInZone,
      module:slot.module
    };
    recipe.meta=meta;
    return {...page,recipe};
  }

  function clearPlanMeta(page){
    if(!page?.recipe?.meta?.productionPlan&&!page?.productionPlan)return page;
    const recipe={...(page.recipe||{})};
    const meta={...(recipe.meta||{})};
    delete meta.productionPlan;
    recipe.meta=meta;
    const next={...page,recipe};
    if(Object.hasOwn(next,"productionPlan"))delete next.productionPlan;
    return next;
  }

  function applyPreset(source=[],presetId="ocean-fantasy-50"){
    const preset=PRESETS[presetId];
    if(!preset)throw new Error(`Nieznany plan produkcyjny: ${presetId}`);
    const pages=Array.isArray(source)?source.slice():[];
    const activities=pages.filter(isActivity);
    const usedSlots=new Set();
    const assigned=new Map();

    // Zachowaj poprawne, wcześniejsze przypisania. Dzięki temu kolejne uruchomienia
    // nie przemieszają gotowych stron, gdy użytkownik dopisuje następne Studio.
    for(const page of activities){
      const meta=planMeta(page);
      if(!meta||meta.presetId!==preset.id)continue;
      const slot=preset.slots.find(item=>item.slot===Number(meta.slot));
      if(!slot||slot.module!==moduleOf(page)||usedSlots.has(slot.slot))continue;
      usedSlots.add(slot.slot);
      assigned.set(page,slot);
    }

    // Nowe strony przypisuj do pierwszych wolnych slotów danego typu Studio.
    for(const page of activities){
      if(assigned.has(page))continue;
      const module=moduleOf(page);
      const slot=preset.slots.find(item=>item.module===module&&!usedSlots.has(item.slot));
      if(!slot)continue;
      usedSlots.add(slot.slot);
      assigned.set(page,slot);
    }

    const planned=activities
      .filter(page=>assigned.has(page))
      .map(page=>({page:withPlanMeta(page,preset,assigned.get(page)),slot:assigned.get(page)}))
      .sort((a,b)=>a.slot.slot-b.slot.slot)
      .map(item=>item.page);

    const overflow=activities.filter(page=>!assigned.has(page)).map(clearPlanMeta);
    const orderedActivities=[...planned,...overflow];
    let activityIndex=0;
    const reordered=pages.map(page=>isActivity(page)?orderedActivities[activityIndex++]:page);

    const counts={};
    preset.slots.forEach(slot=>{counts[slot.module]=(counts[slot.module]||0)+1});
    const actual={};
    activities.forEach(page=>{const module=moduleOf(page);actual[module]=(actual[module]||0)+1});
    const missing=preset.slots.filter(slot=>!usedSlots.has(slot.slot));

    return {
      pages:reordered,
      preset,
      assignedCount:planned.length,
      overflowCount:overflow.length,
      missingCount:missing.length,
      missing,
      expectedCounts:counts,
      actualCounts:actual
    };
  }

  function describePage(page){
    const meta=planMeta(page);
    if(!meta)return null;
    return {
      presetId:meta.presetId,
      slot:Number(meta.slot)||0,
      zoneId:meta.zoneId||"",
      zoneName:meta.zoneName||"",
      zoneOrder:Number(meta.zoneOrder)||0,
      activityInZone:Number(meta.activityInZone)||0,
      module:meta.module||moduleOf(page)
    };
  }

  return{PRESETS,applyPreset,describePage,isActivity,moduleOf};
})());

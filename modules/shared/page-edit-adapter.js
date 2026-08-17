"use strict";
(()=>{
  const params=new URLSearchParams(location.search),requestedId=params.get("id");
  if(!requestedId)return;
  let bootAttempts=0;
  function boot(){
    if(!window.FenixCore){if(++bootAttempts<20)setTimeout(boot,100);return}
    const moduleOf=item=>window.FenixPageSchema?.moduleOf?FenixPageSchema.moduleOf(item):(item?.module||item?.recipe?.module||"");
    const normalize=item=>window.FenixPageSchema?.normalize?FenixPageSchema.normalize(item):item;
    const moduleSlug=document.body.dataset.module||params.get("module")||"";
    const page=FenixCore.getCart().map(normalize).find(item=>item.id===requestedId&&moduleOf(item)===moduleSlug);
    if(!page)return;
    const settings=page.recipe?.settings||{},content=page.recipe?.content||{};
    const originalAdd=FenixCore.addPage.bind(FenixCore),originalUpdate=FenixCore.updatePage.bind(FenixCore);
    let editing=true;
    FenixCore.addPage=function(payload){
      if(editing&&payload&&moduleOf(payload)===moduleSlug){
        originalUpdate(requestedId,payload);
        return FenixCore.getCart().length;
      }
      return originalAdd(payload);
    };
    function assign(el,value){
      if(!el||value==null)return;
      if(el.type==="checkbox")el.checked=Boolean(value);
      else if(el.tagName==="SELECT"||el.tagName==="INPUT"||el.tagName==="TEXTAREA")el.value=String(value);
      el.dispatchEvent(new Event(el.tagName==="SELECT"||el.type==="checkbox"?"change":"input",{bubbles:true}));
    }
    function hydrate(){
      const merged={...settings,title:page.title||page.recipe?.title||settings.title,seed:page.recipe?.seed??page.seed??settings.seed,instructions:settings.instructions??settings.instruction};
      Object.entries(merged).forEach(([key,value])=>{if(typeof value!=="object")assign(document.getElementById(key),value)});
      if(document.getElementById("count"))assign(document.getElementById("count"),1);
      const assetRef=content.assetRef||settings.assetRef||content.assetId||settings.assetId;
      if(assetRef){
        const selector=`[data-id="${CSS.escape(String(assetRef))}"], [data-asset-id="${CSS.escape(String(assetRef))}"]`;
        const button=document.querySelector(selector);if(button&&!button.classList.contains("selected"))button.click();
      }
      const cart=document.getElementById("cart")||document.getElementById("saveCart")||document.getElementById("savePage");
      if(cart){cart.textContent="Zapisz zmiany w Stronach projektu";cart.dataset.editingPage=requestedId}
      const status=document.getElementById("status");if(status&& !status.textContent.includes("Edytujesz"))status.textContent=`Edytujesz zapisaną stronę: ${page.title||moduleSlug}`;
    }
    let attempts=0;const tick=()=>{hydrate();if(++attempts<8)setTimeout(tick,180)};setTimeout(tick,0);
    window.FenixPageEdit={id:requestedId,module:moduleSlug,page,stop(){editing=false}};
  }
  boot();
})();

"use strict";
(()=>{
  if(document.body.dataset.module!=="hidden-objects-studio")return;
  const fieldIds=["density","minSize","maxSize","rotate","seed","title","instructions","titleSize","instructionSize"];
  const assetBySrc=src=>FenixCore.listAssets().find(asset=>asset.dataUrl===src)||null;
  function captureHiddenState(){
    const roles=[];
    document.querySelectorAll("#assetGrid .asset-card.target, #assetGrid .asset-card.distractor").forEach(card=>{
      const asset=assetBySrc(card.querySelector("img")?.src||"");if(!asset)return;
      const role=card.classList.contains("target")?"target":"distractor";
      roles.push({assetRef:asset.id,role,count:role==="target"?3:null});
    });
    const targetRows=[...document.querySelectorAll("#targetList .target-row")];
    targetRows.forEach(row=>{
      const asset=assetBySrc(row.querySelector("img")?.src||"");const item=roles.find(entry=>entry.assetRef===asset?.id&&entry.role==="target");if(item)item.count=Math.max(1,Math.min(12,Number(row.querySelector("input")?.value)||3));
    });
    return roles;
  }
  const originalAdd=FenixCore.addPage.bind(FenixCore);
  FenixCore.addPage=function(payload){
    if(FenixPageSchema.moduleOf(payload)==="hidden-objects-studio"){
      payload.recipe=payload.recipe||{module:"hidden-objects-studio"};
      payload.recipe.settings={...(payload.recipe.settings||{}),...Object.fromEntries(fieldIds.map(id=>[id,document.getElementById(id)?.value]))};
      payload.recipe.content={...(payload.recipe.content||{}),hiddenState:captureHiddenState()};
    }
    return originalAdd(payload);
  };
  const requestedId=new URLSearchParams(location.search).get("id");if(!requestedId)return;
  const page=FenixCore.getCart().find(item=>item.id===requestedId&&FenixPageSchema.moduleOf(item)==="hidden-objects-studio");if(!page)return;
  const settings=page.recipe?.settings||{},saved=page.recipe?.content?.hiddenState||[];
  Object.entries(settings).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&value!=null){el.value=value;el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}))}});
  let tries=0,done=false;
  function restore(){
    if(done)return;tries++;
    const cards=[...document.querySelectorAll("#assetGrid .asset-card")];if(!cards.length){if(tries<20)setTimeout(restore,120);return}
    for(const item of saved){const asset=FenixCore.getAsset(item.assetRef);if(!asset)continue;const card=cards.find(node=>node.querySelector("img")?.src===asset.dataUrl);if(!card)continue;if(!card.classList.contains("target")&&!card.classList.contains("distractor")){card.click();if(item.role==="distractor")card.click()}}
    setTimeout(()=>{for(const item of saved.filter(x=>x.role==="target")){const asset=FenixCore.getAsset(item.assetRef);const row=[...document.querySelectorAll("#targetList .target-row")].find(node=>node.querySelector("img")?.src===asset?.dataUrl);const input=row?.querySelector("input");if(input){input.value=item.count||3;input.dispatchEvent(new Event("input",{bubbles:true}))}}done=true;document.getElementById("generate")?.click()},100);
  }
  setTimeout(restore,100);
})();

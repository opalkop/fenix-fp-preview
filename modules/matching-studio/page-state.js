"use strict";
(()=>{
  if(document.body.dataset.module!=="matching-studio")return;
  const moduleOf=item=>window.FenixPageSchema?.moduleOf?FenixPageSchema.moduleOf(item):(item?.module||item?.recipe?.module||"");
  const originalAdd=FenixCore.addPage.bind(FenixCore);
  const assetBySrc=src=>FenixCore.listAssets().find(asset=>asset.dataUrl===src)||null;
  function selectedRefs(){return [...document.querySelectorAll("#assetGrid .asset-card.selected img")].map(img=>assetBySrc(img.src)?.id).filter(Boolean)}
  function manualPairs(){return [...document.querySelectorAll("#manualPairs .pair-row")].map(row=>{const inputs=row.querySelectorAll("input");return{left:inputs[0]?.value||"",right:inputs[1]?.value||""}})}
  FenixCore.addPage=function(payload){
    if(moduleOf(payload)==="matching-studio"){
      payload.recipe=payload.recipe||{module:"matching-studio"};payload.recipe.content=payload.recipe.content||{};
      payload.recipe.content.assetRefs=selectedRefs();
      if(document.getElementById("mode")?.value==="manual")payload.recipe.content.manualPairs=manualPairs();
    }
    return originalAdd(payload);
  };
  const id=new URLSearchParams(location.search).get("id");if(!id)return;
  const page=FenixCore.getCart().find(item=>item.id===id&&moduleOf(item)==="matching-studio");if(!page)return;
  const content=page.recipe?.content||{},refs=new Set(content.assetRefs||[]);
  if(!refs.size){for(const pair of content.pairs||[])for(const side of [pair.left,pair.right]){if(side?.dataUrl){const asset=assetBySrc(side.dataUrl);if(asset)refs.add(asset.id)}}}
  let tries=0;function restoreAssets(){tries++;const cards=[...document.querySelectorAll("#assetGrid .asset-card")];if(!cards.length){if(tries<20)setTimeout(restoreAssets,120);return}for(const ref of refs){const asset=FenixCore.getAsset(ref);const card=cards.find(node=>node.querySelector("img")?.src===asset?.dataUrl);if(card&&!card.classList.contains("selected"))card.click()}if(content.manualPairs?.length){document.getElementById("mode").value="manual";document.getElementById("mode").dispatchEvent(new Event("change",{bubbles:true}));setTimeout(()=>{const rows=[...document.querySelectorAll("#manualPairs .pair-row")];content.manualPairs.forEach((pair,index)=>{const inputs=rows[index]?.querySelectorAll("input");if(inputs?.[0]){inputs[0].value=pair.left;inputs[0].dispatchEvent(new Event("input",{bubbles:true}))}if(inputs?.[1]){inputs[1].value=pair.right;inputs[1].dispatchEvent(new Event("input",{bubbles:true}))}})},80)}document.getElementById("generate")?.click()}
  setTimeout(restoreAssets,120);
})();

"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const guide=$('guide');
  if(!guide)return;
  const grid=guide.closest('.form-grid');
  const guideLabel=guide.closest('label');
  if(grid&&guideLabel&&!$('guideOpacity')){
    const opacity=document.createElement('label');
    opacity.innerHTML='Widoczność konturu (%)<input id="guideOpacity" type="number" min="0" max="100" value="16">';
    const width=document.createElement('label');
    width.innerHTML='Grubość konturu<input id="guideWidth" type="number" min="1" max="8" value="3">';
    guideLabel.insertAdjacentElement('afterend',width);
    guideLabel.insertAdjacentElement('afterend',opacity);
  }
  const original=window.FenixDotCore;
  if(original?.render){
    window.FenixDotCore=Object.freeze({
      ...original,
      render:(asset,o={})=>original.render(asset,{...o,guideOpacity:Number($('guideOpacity')?.value||16),guideWidth:Number($('guideWidth')?.value||3)})
    });
  }
  let timer=null;
  const rerender=()=>{clearTimeout(timer);timer=setTimeout(()=>$('generate')?.click(),100)};
  ['guideOpacity','guideWidth'].forEach(id=>$(id)?.addEventListener('input',rerender));
  $('guide')?.addEventListener('change',()=>{
    const enabled=$('guide').value==='faint';
    if($('guideOpacity'))$('guideOpacity').disabled=!enabled;
    if($('guideWidth'))$('guideWidth').disabled=!enabled;
  });
  const syncDisabled=()=>{
    const enabled=$('guide').value==='faint';
    if($('guideOpacity'))$('guideOpacity').disabled=!enabled;
    if($('guideWidth'))$('guideWidth').disabled=!enabled;
  };
  syncDisabled();
  $('cart')?.addEventListener('click',()=>setTimeout(()=>{
    const id=new URLSearchParams(location.search).get('id');
    if(!id||!window.FenixCore)return;
    const page=FenixCore.getCart().find(p=>p.id===id);
    if(!page)return;
    const next={...page,recipe:{...(page.recipe||{}),settings:{...(page.recipe?.settings||{}),guideOpacity:Number($('guideOpacity')?.value||16),guideWidth:Number($('guideWidth')?.value||3)}}};
    FenixCore.updatePage(id,next);
  },0));
  window.addEventListener('load',syncDisabled);
})();
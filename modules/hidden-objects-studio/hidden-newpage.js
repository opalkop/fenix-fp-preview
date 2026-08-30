"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const requestedId=params.get("id");
  const freshToken=params.get("new");
  const makeSeed=()=>`fenix-hidden-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  async function init(){
    await FenixCore.ready;
    const seed=$("seed"),newBtn=$("newPage"),cart=$("cart"),status=$("status"),previewInfo=$("previewInfo");

    if(!requestedId&&freshToken&&seed){
      seed.value=makeSeed();
      seed.dispatchEvent(new Event("input",{bubbles:true}));
      if(previewInfo)previewInfo.textContent="Nowa strona Hidden Objects";
      if(cart)cart.textContent="Dodaj stronę do projektu";
      if(status)status.textContent="Nowa strona gotowa — układ ma nowy seed.";
    }

    if(newBtn){
      newBtn.onclick=()=>{
        const url=new URL(location.href);
        url.search="";
        url.searchParams.set("new",Date.now().toString());
        location.href=url.toString();
      };
    }
  }

  void init();
})();
"use strict";
(()=>{
  const cart=document.getElementById("cart"),canvas=document.getElementById("page"),taskTab=document.getElementById("taskTab"),solutionTab=document.getElementById("solutionTab"),status=document.getElementById("status");
  if(!cart||!canvas||!taskTab||!solutionTab||!window.FenixCore)return;
  const editId=new URLSearchParams(location.search).get("id")||null;
  if(!editId)return;
  let bypass=false,busy=false;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const snapshot=()=>canvas.toDataURL("image/png");
  const original=cart.onclick;
  cart.addEventListener("click",async event=>{
    if(bypass||busy)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy=true;
    try{
      if(status)status.textContent="Zapisuję dokładny podgląd Logic…";
      taskTab.click();
      await wait(60);
      const taskImage=snapshot();
      solutionTab.click();
      await wait(40);
      const solutionImage=snapshot();
      taskTab.click();
      await wait(20);
      bypass=true;
      if(typeof original==="function")original.call(cart,new Event("click"));
      bypass=false;
      const updated=FenixCore.updatePage(editId,{preview:{imageData:taskImage},solution:{available:true,imageData:solutionImage}});
      if(!updated)throw new Error("Nie udało się dopisać snapshotu do strony Logic.");
      cart.textContent="✓ Zapisano — edytuj dalej";
      if(status)status.textContent="✓ Zapisano Logic 1:1: zadanie + Solution.";
    }catch(error){
      console.error(error);
      if(status)status.textContent=`Błąd zapisu snapshotu Logic: ${error.message}`;
    }finally{
      bypass=false;
      busy=false;
    }
  },true);
})();

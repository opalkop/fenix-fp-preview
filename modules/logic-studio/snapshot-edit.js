"use strict";
(()=>{
  const editId=new URLSearchParams(location.search).get("id");
  if(!editId||!window.FenixCore)return;
  const canvas=document.getElementById("page"),cart=document.getElementById("cart"),task=document.getElementById("taskTab"),solution=document.getElementById("solutionTab");
  if(!canvas||!cart||!task||!solution||typeof cart.onclick!=="function")return;
  const originalClick=cart.onclick.bind(cart),originalUpdate=FenixCore.updatePage.bind(FenixCore);
  let pending=null;
  FenixCore.updatePage=(id,data)=>{
    if(pending&&String(id)===String(editId)&&String(data?.module||data?.recipe?.module||"")==="logic-studio"){
      data={...data,preview:{...(data.preview||{}),imageData:pending.task},solution:{...(data.solution||{}),available:true,imageData:pending.solution}};
      pending=null;
    }
    return originalUpdate(id,data);
  };
  cart.onclick=event=>{
    task.click();
    const taskImage=canvas.toDataURL("image/png");
    solution.click();
    const solutionImage=canvas.toDataURL("image/png");
    task.click();
    pending={task:taskImage,solution:solutionImage};
    return originalClick(event);
  };
})();

"use strict";
(()=>{
  const cart=document.getElementById("cart"),canvas=document.getElementById("page"),taskTab=document.getElementById("taskTab"),solutionTab=document.getElementById("solutionTab"),prev=document.getElementById("prev"),next=document.getElementById("next"),counter=document.getElementById("pageCounter"),status=document.getElementById("status");
  if(!cart||!canvas||!taskTab||!solutionTab||!window.FenixCore)return;
  const original=cart.onclick;
  if(typeof original!=="function")return;
  const editId=new URLSearchParams(location.search).get("id")||null;
  const wait=(ms=0)=>new Promise(resolve=>setTimeout(resolve,ms));
  const snapshot=()=>canvas.toDataURL("image/png");
  const parseCounter=()=>{const m=String(counter?.textContent||"1 / 1").match(/(\d+)\s*\/\s*(\d+)/);return{index:m?Math.max(0,Number(m[1])-1):0,total:m?Math.max(1,Number(m[2])):1}};
  async function showTask(){taskTab.click();await wait(35)}
  async function showSolution(){solutionTab.click();await wait(20)}
  async function goFirst(){for(let guard=0;guard<50&&!prev.disabled;guard++){prev.click();await wait(0)}}
  async function captureAll(){const initial=parseCounter(),wantedSolution=solutionTab.classList.contains("primary"),shots=[];await goFirst();const total=parseCounter().total;for(let i=0;i<total;i++){
      await showTask();const task=snapshot();
      await showSolution();const solution=snapshot();
      shots.push({task,solution});
      if(i<total-1){next.click();await wait(0)}
    }
    await goFirst();for(let i=0;i<initial.index;i++){next.click();await wait(0)}
    if(wantedSolution)await showSolution();else await showTask();
    return shots;
  }
  function patchPage(id,shot){const raw=FenixCore.getCart().find(p=>String(p.id)===String(id));if(!raw||!shot)return false;return FenixCore.updatePage(id,{preview:{imageData:shot.task},solution:{available:true,imageData:shot.solution},recipe:{...(raw.recipe||{}),meta:{...(raw.recipe?.meta||{}),snapshotVersion:1,snapshotSource:"logic-studio"}}});}
  cart.onclick=async function(event){
    if(cart.dataset.snapshotSaving==="1")return;
    cart.dataset.snapshotSaving="1";cart.disabled=true;
    const before=FenixCore.getCart(),beforeIds=new Set(before.map(p=>String(p.id)));
    try{
      if(status)status.textContent="Zapisuję dokładny podgląd zadania i Solution…";
      const shots=await captureAll();
      original.call(cart,event);
      await wait(0);
      const after=FenixCore.getCart();
      if(editId){patchPage(editId,shots[0]);}
      else{
        const added=after.filter(p=>!beforeIds.has(String(p.id))&&String(p.module||p.recipe?.module)==="logic-studio");
        added.forEach((p,i)=>patchPage(p.id,shots[i]||shots.at(-1)));
      }
      if(status)status.textContent=`✓ Zapisano Logic 1:1: zadanie + Solution (${shots.length} str.).`;
    }catch(error){console.error("Logic snapshot save",error);if(status)status.textContent=`Błąd zapisu snapshotu Logic: ${error.message||error}`;}
    finally{cart.disabled=false;delete cart.dataset.snapshotSaving;}
  };
})();

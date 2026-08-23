"use strict";
(()=>{
  const $=id=>document.getElementById(id), canvas=$("page");
  if(!canvas||!$("type")||!$("taskTab")||!$("solutionTab"))return;
  const VALID_MASKS=[[0,1,3,2],[0,3,2,1],[1,0,2,3],[1,2,3,0],[2,1,0,3],[2,3,1,0],[3,0,1,2],[3,2,0,1]];
  let busy=false, timer=null;
  function hash(text){let h=2166136261;for(const c of String(text||""))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
  function isSudoku(){return $("type").value==="sudoku"&&$("elementMode")?.value==="assets"}
  function selectedCards(){return [...document.querySelectorAll("#projectPane .logic-asset.selected")].filter(card=>card.querySelector("button[data-pick]"))}
  function projectCards(){return [...document.querySelectorAll("#projectPane .logic-asset")].filter(card=>card.querySelector("button[data-pick]"))}
  function clickCard(card){card?.querySelector("button[data-pick]")?.click()}
  function shuffle(list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function randomizeSet(){if(!isSudoku())return;const all=projectCards();if(all.length<4){const status=$("assetStatus");if(status){status.textContent=`Do losowania zestawu Sudoku potrzeba co najmniej 4 assetów w projekcie. Dostępne: ${all.length}.`;status.className="asset-status warn"}return}selectedCards().forEach(clickCard);shuffle(all).slice(0,4).forEach(clickCard);const status=$("assetStatus");if(status){status.textContent="Gotowe · wylosowano nowy zestaw 4 / 4 assetów dla Sudoku.";status.className="asset-status ready"}setTimeout(()=>$("generate")?.click(),30)}
  function clearSet(){if(!isSudoku())return;selectedCards().forEach(clickCard)}
  function currentMask(){const page=$("pageCounter")?.textContent||"1 / 1", seed=$("seed")?.value||"fenix";return VALID_MASKS[hash(seed+"|"+page)%VALID_MASKS.length]}
  function paintBalancedTask(solutionImage){const ctx=canvas.getContext("2d"), mask=currentMask(), gridTop=330, left=215, cell=105;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(solutionImage,0,0);ctx.fillStyle="#fff";ctx.strokeStyle="#111";ctx.lineWidth=3;for(let row=0;row<4;row++){const col=mask[row],x=left+col*cell,y=gridTop+row*cell;ctx.fillRect(x+3,y+3,cell-6,cell-6);ctx.strokeRect(x,y,cell,cell)}}
  function rebalanceTask(){clearTimeout(timer);timer=setTimeout(()=>{if(busy||!isSudoku()||selectedCards().length!==4)return;busy=true;const wantedSolution=$("solutionTab").classList.contains("primary");$("solutionTab").click();const solution=document.createElement("canvas");solution.width=canvas.width;solution.height=canvas.height;solution.getContext("2d").drawImage(canvas,0,0);if(wantedSolution){busy=false;return}$("taskTab").click();paintBalancedTask(solution);busy=false},20)}
  $("randomSudokuSet")?.addEventListener("click",randomizeSet);
  $("clearSudokuSet")?.addEventListener("click",clearSet);
  ["generate","randomSeed","prev","next","taskTab"].forEach(id=>$(id)?.addEventListener("click",()=>{if(!busy)rebalanceTask()}));
  $("type").addEventListener("change",()=>{if($("type").value==="sudoku"&&!new URLSearchParams(location.search).get("id"))$("count").value=1;rebalanceTask()});
  $("count")?.addEventListener("change",()=>{const n=Math.max(1,Math.min(20,Number($("count").value)||1));$("count").value=n});
  window.addEventListener("fenix-state-change",rebalanceTask);
  setTimeout(rebalanceTask,120);
})();

(()=>{
  const params=new URLSearchParams(location.search),editId=params.get("id")||null;
  const $=id=>document.getElementById(id),cart=$("cart"),canvas=$("page"),taskTab=$("taskTab"),solutionTab=$("solutionTab"),status=$("status");
  if(!editId||!cart||!canvas||!taskTab||!solutionTab||typeof FenixCore==="undefined")return;
  let saving=false;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function capturePair(){
    taskTab.click();await wait(180);const taskImage=canvas.toDataURL("image/png");
    solutionTab.click();await wait(180);const solutionImage=canvas.toDataURL("image/png");
    taskTab.click();await wait(60);
    return{taskImage,solutionImage};
  }
  cart.addEventListener("click",async()=>{
    if(saving)return;saving=true;
    try{
      await wait(120);
      const snap=await capturePair();
      const updated=FenixCore.updatePage(editId,{preview:{imageData:snap.taskImage},solution:{available:true,imageData:snap.solutionImage}});
      if(!updated)throw new Error("Nie udało się dopisać snapshotu Logic.");
      cart.textContent="✓ Zapisano 1:1 — edytuj dalej";
      const badge=$("editBadge");if(badge){badge.textContent="TRYB EDYCJI · ✓ SNAPSHOT 1:1 ZAPISANY";badge.classList.add("on")}
      if(status)status.textContent="✓ Zapisano Logic 1:1: zadanie + Solution.";
    }catch(error){console.error(error);if(status)status.textContent=`Błąd snapshotu Logic: ${error.message}`}
    finally{saving=false}
  });

  const requestId=params.get("bookBuilderSnapshot");
  if(!requestId||window.parent===window)return;
  async function autoCapture(){
    let ready=false;
    for(let i=0;i<120;i++){
      if((status?.textContent||"").includes("Wygenerowano")&&canvas.width>0&&canvas.height>0){ready=true;break}
      await wait(75);
    }
    if(!ready)await wait(700);
    const snap=await capturePair();
    window.parent.postMessage({type:"fenix-logic-snapshot",requestId,pageId:editId,...snap},location.origin);
  }
  setTimeout(()=>autoCapture().catch(error=>window.parent.postMessage({type:"fenix-logic-snapshot-error",requestId,pageId:editId,message:error.message},location.origin)),250);
})();

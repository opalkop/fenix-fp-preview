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
  const $=id=>document.getElementById(id),cart=$("cart"),canvas=$("page"),taskTab=$("taskTab"),solutionTab=$("solutionTab"),status=$("status"),editBadge=$("editBadge");
  const editId=new URLSearchParams(location.search).get("id")||null;
  if(!editId||!cart||!canvas||!taskTab||!solutionTab||!window.FenixCore)return;
  let saving=false,bypass=false;
  const original=cart.onclick;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const shot=()=>canvas.toDataURL("image/png");
  const confirmSaved=()=>{
    cart.textContent="✓ Zapisano 1:1 — edytuj dalej";
    cart.title="Snapshot zadania i Solution zapisany w stronie projektu.";
    if(editBadge){editBadge.classList.add("on");editBadge.textContent="TRYB EDYCJI · ✓ SNAPSHOT 1:1 ZAPISANY"}
    if(status)status.textContent="✓ Zapisano Logic 1:1: zadanie + Solution.";
  };
  cart.addEventListener("click",async event=>{
    if(bypass||saving)return;
    event.preventDefault();event.stopImmediatePropagation();saving=true;
    try{
      if(status)status.textContent="Zapisuję dokładny podgląd Logic…";
      taskTab.click();await wait(80);const taskImage=shot();
      solutionTab.click();await wait(50);const solutionImage=shot();
      taskTab.click();await wait(30);
      bypass=true;if(typeof original==="function")original.call(cart,new Event("click"));bypass=false;
      const updated=FenixCore.updatePage(editId,{preview:{imageData:taskImage},solution:{available:true,imageData:solutionImage}});
      if(!updated)throw new Error("Nie udało się dopisać snapshotu do strony Logic.");
      confirmSaved();
      setTimeout(confirmSaved,250);
      setTimeout(confirmSaved,700);
    }catch(error){console.error(error);if(status)status.textContent=`Błąd zapisu Logic: ${error.message}`}
    finally{bypass=false;saving=false}
  },true);
})();

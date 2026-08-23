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

  // Logic v6 snapshot bridge.
  // The Logic generator keeps its page canvases private inside app.js. Book Builder must not
  // recreate them from the recipe, because asset order and Sudoku balancing can differ.
  // On save we therefore walk through the generated pages, capture exactly what the Studio
  // displays for TASK and SOLUTION, and inject those immutable snapshots into FenixCore.
  const cart=$("cart"), originalSave=cart?.onclick;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const png=()=>canvas.toDataURL("image/png");
  function pagePosition(){const m=String($("pageCounter")?.textContent||"1 / 1").match(/(\d+)\s*\/\s*(\d+)/);return{index:Math.max(0,(Number(m?.[1])||1)-1),total:Math.max(1,Number(m?.[2])||1)}}
  async function goFirst(){while(!$("prev")?.disabled){$("prev").click();await wait(isSudoku()?35:5)}}
  async function captureSnapshots(){const original=pagePosition(), originalView=$("solutionTab")?.classList.contains("primary")?"solution":"task", shots=[];await goFirst();for(let i=0;i<original.total;i++){$("taskTab").click();await wait(isSudoku()?45:8);const task=png();$("solutionTab").click();await wait(8);const solution=png();shots.push({task,solution});if(i<original.total-1){$("next").click();await wait(isSudoku()?35:5)}}await goFirst();for(let i=0;i<original.index;i++){$("next").click();await wait(isSudoku()?35:5)}$(originalView==="solution"?"solutionTab":"taskTab")?.click();await wait(isSudoku()?35:5);return shots}
  function withSnapshot(data,shot){if(!data||!shot)return data;const module=String(data.module||data.recipe?.module||"");if(module!=="logic-studio")return data;return{...data,preview:{...(data.preview||{}),imageData:shot.task},solution:{...(data.solution||{}),available:true,imageData:shot.solution},source:{...(data.source||{}),snapshot:"logic-studio-v6"}}}
  if(cart&&typeof originalSave==="function"){
    cart.onclick=null;
    cart.addEventListener("click",async event=>{
      event.preventDefault();
      if(cart.dataset.snapshotSaving==="1")return;
      cart.dataset.snapshotSaving="1";
      const previousText=cart.textContent;
      cart.disabled=true;
      cart.textContent="Zapisuję dokładny podgląd…";
      try{
        const shots=await captureSnapshots();
        let addIndex=0;
        const add=FenixCore.addPage, update=FenixCore.updatePage;
        FenixCore.addPage=function(data){const shot=shots[Math.min(addIndex++,shots.length-1)];return add.call(FenixCore,withSnapshot(data,shot))};
        FenixCore.updatePage=function(id,data){return update.call(FenixCore,id,withSnapshot(data,shots[0]))};
        try{originalSave.call(cart,event)}finally{FenixCore.addPage=add;FenixCore.updatePage=update}
      }catch(error){console.error("Logic snapshot save",error);const status=$("status");if(status)status.textContent=`Błąd zapisu snapshotu Logic: ${error?.message||error}`;cart.textContent=previousText}
      finally{cart.disabled=false;delete cart.dataset.snapshotSaving}
    });
  }
})();
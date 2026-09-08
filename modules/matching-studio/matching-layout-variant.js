"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const seed=$("seed"), task=$("taskTab"), solution=$("solutionTab");
  if(!seed||!task||!solution)return;

  const label=seed.closest("label");
  if(label&&!$("matchingRandomizeLayout")){
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap";
    const btn=document.createElement("button");
    btn.id="matchingRandomizeLayout";
    btn.type="button";
    btn.textContent="Losuj nowy układ";
    btn.title="Tworzy nowy seed. Układ pozostanie stały po zapisaniu strony.";
    btn.style.cssText="padding:8px 12px;border:1px solid #b8c2cc;border-radius:8px;background:#fff;cursor:pointer;font-weight:700";
    const note=document.createElement("small");
    note.textContent="Seed zapisuje dokładny układ tej strony.";
    note.style.cssText="color:#66717d";
    row.append(btn,note);
    label.appendChild(row);
    btn.addEventListener("click",()=>{
      const stamp=Date.now().toString(36).slice(-6);
      seed.value=`match-${stamp}`;
      seed.dispatchEvent(new Event("input",{bubbles:true}));
      task.click();
    });
  }

  task.textContent="Zadanie — finalny układ";
  solution.textContent="Solution — ten sam układ";
  const heading=document.querySelector(".preview-heading #previewInfo");
  const sync=()=>{
    if(!heading)return;
    const base=heading.textContent.replace(/ · Podgląd:.*$/,'');
    heading.textContent=`${base} · Podgląd: ${solution.classList.contains("active")?"solution":"zadanie"}`;
  };
  task.addEventListener("click",()=>setTimeout(sync,0));
  solution.addEventListener("click",()=>setTimeout(sync,0));
  sync();
})();
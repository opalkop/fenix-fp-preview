"use strict";

(()=>{
  const intro=document.getElementById("fenixIntro");
  if(!intro)return;
  const enter=document.getElementById("fenixIntroEnter");
  let leaving=false;
  const unlockAndEnter=async()=>{
    if(leaving)return;
    leaving=true;
    enter?.setAttribute("disabled","");
    try{if(window.FenixDashboardSound)await window.FenixDashboardSound.play("startup")}catch{}
    intro.classList.add("is-leaving");
    window.setTimeout(()=>{
      intro.classList.add("is-hidden");
      intro.setAttribute("aria-hidden","true");
      intro.remove();
      document.body.classList.add("fenix-intro-complete");
    },560);
  };
  enter?.addEventListener("click",unlockAndEnter);
  intro.addEventListener("click",event=>{if(event.target.closest("button,a,input,select,textarea"))return;unlockAndEnter()});
  document.addEventListener("keydown",event=>{if(leaving)return;if(event.key==="Enter"||event.key===" "){event.preventDefault();unlockAndEnter()}},{capture:true});
})();

(()=>{
  const LABELS={"maze-studio":"MAZE","word-search-studio":"WS","coloring-studio":"COL","complete-picture":"CTP","tracing-studio":"TR","matching-studio":"MAT","dot-to-dot-studio":"DOT","hidden-objects-studio":"HO","alphabet-studio":"ABC","math-studio":"MATH","logic-studio":"LOG","intro-studio":"INTRO","congratulations-studio":"CONG","qr-studio":"QR","certificate-studio":"CERT"};
  const STRUCTURAL=new Set(["intro-studio","congratulations-studio","qr-studio","certificate-studio"]);
  const moduleOf=p=>window.FenixPageSchema?.moduleOf?FenixPageSchema.moduleOf(p):(p?.module||p?.recipe?.module||"unknown");
  const normalize=p=>window.FenixPageSchema?.normalize?FenixPageSchema.normalize(p):p;
  let scheduled=false;

  function apply(){
    scheduled=false;
    if(!window.FenixCore)return;
    const list=document.getElementById("cartList"),section=document.getElementById("pagesProject");
    if(!list||!section)return;
    const project=FenixCore.getActiveProject?.();
    if(!project)return;
    const pages=(project.pages||[]).map(normalize);
    const items=[...list.children].filter(node=>node.classList?.contains("cart-item"));
    if(!items.length)return;

    const counts={};
    pages.forEach(page=>{const mod=moduleOf(page);counts[mod]=(counts[mod]||0)+1});
    const activityCount=pages.filter(page=>!STRUCTURAL.has(moduleOf(page))).length;
    const solutionCount=pages.filter(page=>Boolean(page?.solution?.available)).length;

    let summary=section.querySelector(".pages-direct-summary");
    if(!summary){
      summary=document.createElement("div");
      summary.className="pages-direct-summary";
      list.parentElement.insertBefore(summary,list);
    }
    summary.innerHTML=`<strong>KONTROLA WORKFLOW</strong><b>${activityCount} aktywności</b><span>${Object.entries(counts).map(([mod,count])=>`${LABELS[mod]||mod}: ${count}`).join(" · ")} · Solutions: ${solutionCount}</span>`;

    const seen={};
    const newest=pages.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]?.id;
    items.forEach((item,index)=>{
      const page=pages[index];if(!page)return;
      const mod=moduleOf(page),short=LABELS[mod]||mod.toUpperCase(),local=seen[mod]=(seen[mod]||0)+1;
      item.dataset.pageModule=mod;
      item.style.borderLeft=mod==="word-search-studio"?"5px solid #6640b8":mod==="maze-studio"?"5px solid #1a59ad":"5px solid #f55214";
      let meta=item.querySelector(".pages-direct-meta");
      if(!meta){meta=document.createElement("div");meta.className="pages-direct-meta";item.firstElementChild?.prepend(meta)}
      meta.textContent=`${short} #${String(local).padStart(2,"0")} · STRONA ${String(index+1).padStart(2,"0")}/${String(pages.length).padStart(2,"0")} · ✓ ZAPISANA${page.id===newest?" · ★ OSTATNIO DODANA":""}`;
      const mobile=[...item.querySelectorAll("small")].find(el=>el.textContent.includes("FENIX Mobile"));
      if(mobile&&mobile.textContent.includes("KDP: brak walidacji"))mobile.textContent="FENIX Mobile · profil projektu 300 DPI";
      const actions=item.lastElementChild;
      if(item.dataset.pageHref&&actions&&!actions.querySelector(".pages-direct-edit")){
        const edit=document.createElement("a");edit.href=item.dataset.pageHref;edit.className="btn pages-direct-edit";edit.textContent="Edytuj";actions.prepend(edit);
      }
    });
  }

  function requestApply(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}

  const style=document.createElement("style");
  style.textContent=`.pages-direct-summary{margin:0 0 12px;padding:14px;border:2px solid #f55214;border-radius:12px;background:var(--dv2-panel,#fff);display:grid;gap:4px}.pages-direct-summary strong{font-size:11px;color:#f55214;letter-spacing:.06em}.pages-direct-summary b{font-size:22px;color:var(--dv2-text,#12171f)}.pages-direct-summary span{font-size:12px;color:var(--dv2-muted,#576373)}.pages-direct-meta{margin:0 0 7px;padding:6px 8px;border-radius:7px;background:var(--dv2-bg,#f4f6f9);color:var(--dv2-text,#12171f);font-size:11px;font-weight:900}.pages-direct-edit{font-weight:800}@media(max-width:760px){.pages-direct-summary b{font-size:18px}.pages-direct-meta{font-size:10px}}`;
  document.head.appendChild(style);

  function boot(){
    const list=document.getElementById("cartList");
    if(!list)return;
    new MutationObserver(requestApply).observe(list,{childList:true});
    window.addEventListener("fenix-state-change",requestApply);
    requestApply();
    [250,700,1500,3000].forEach(ms=>setTimeout(requestApply,ms));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

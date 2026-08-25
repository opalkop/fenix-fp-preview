"use strict";

(()=>{
  try{localStorage.setItem("fenix-ui-theme","light")}catch{}
  document.documentElement.dataset.theme="light";
  document.querySelectorAll('link[data-fenix-theme="fenix-mode"]').forEach(link=>link.remove());
  const stripThemeUi=()=>document.querySelectorAll(".theme-box,[data-fenix-theme-toggle]").forEach(el=>el.remove());
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",stripThemeUi,{once:true});else stripThemeUi();
})();

(()=>{
  const intro=document.getElementById("fenixIntro");
  if(!intro)return;
  const enter=document.getElementById("fenixIntroEnter");
  let leaving=false;
  const unlockAndEnter=async()=>{if(leaving)return;leaving=true;enter?.setAttribute("disabled","");try{if(window.FenixDashboardSound)await window.FenixDashboardSound.play("startup")}catch{}intro.classList.add("is-leaving");window.setTimeout(()=>{intro.classList.add("is-hidden");intro.setAttribute("aria-hidden","true");intro.remove();document.body.classList.add("fenix-intro-complete")},560)};
  enter?.addEventListener("click",unlockAndEnter);
  intro.addEventListener("click",event=>{if(event.target.closest("button,a,input,select,textarea"))return;unlockAndEnter()});
  document.addEventListener("keydown",event=>{if(leaving)return;if(event.key==="Enter"||event.key===" "){event.preventDefault();unlockAndEnter()}},{capture:true});
})();

(()=>{
  const LABELS={"maze-studio":"MAZE","word-search-studio":"WS","coloring-studio":"COL","complete-picture":"CTP","tracing-studio":"TR","matching-studio":"MAT","dot-to-dot-studio":"DOT","hidden-objects-studio":"HO","alphabet-studio":"ABC","math-studio":"MATH","logic-studio":"LOG","intro-studio":"INTRO","congratulations-studio":"CONG","qr-studio":"QR","certificate-studio":"CERT"};
  const STRUCTURAL=new Set(["intro-studio","congratulations-studio","qr-studio","certificate-studio"]);
  const moduleOf=p=>window.FenixPageSchema?.moduleOf?FenixPageSchema.moduleOf(p):(p?.module||p?.recipe?.module||"unknown");
  const normalize=p=>window.FenixPageSchema?.normalize?FenixPageSchema.normalize(p):p;
  const apply=()=>{
    if(!window.FenixCore)return;
    const list=document.getElementById("cartList"),section=document.getElementById("pagesProject");if(!list||!section)return;
    const project=FenixCore.getActiveProject?.();if(!project)return;
    const pages=(project.pages||[]).map(normalize),items=[...list.querySelectorAll(":scope > .cart-item")];if(!items.length)return;
    section.querySelectorAll(".pages-direct-summary,.pages-direct-group").forEach(n=>n.remove());
    const counts={};pages.forEach(p=>{const m=moduleOf(p);counts[m]=(counts[m]||0)+1});
    const totalActivities=pages.filter(p=>!STRUCTURAL.has(moduleOf(p))).length,solutions=pages.filter(p=>p?.solution?.available).length;
    const summary=document.createElement("div");summary.className="pages-direct-summary";summary.innerHTML=`<strong>KONTROLA WORKFLOW</strong><b>${totalActivities} aktywności</b><span>${Object.entries(counts).map(([m,c])=>`${LABELS[m]||m}: ${c}`).join(" · ")} · Solutions: ${solutions}</span>`;list.parentElement.insertBefore(summary,list);
    const seen={},newest=pages.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]?.id;let prev=null;
    items.forEach((item,index)=>{
      const page=pages[index];if(!page)return;const mod=moduleOf(page),short=LABELS[mod]||mod.toUpperCase(),local=seen[mod]=(seen[mod]||0)+1;
      if(mod!==prev){const group=document.createElement("div");group.className="pages-direct-group";group.textContent=`${short} — ${counts[mod]||0} stron`;list.insertBefore(group,item);prev=mod}
      let top=item.querySelector(".pages-direct-meta");if(!top){top=document.createElement("div");top.className="pages-direct-meta";item.firstElementChild?.prepend(top)}
      top.textContent=`${short} #${String(local).padStart(2,"0")}  ·  STRONA ${String(index+1).padStart(2,"0")}/${String(pages.length).padStart(2,"0")}  ·  ✓ ZAPISANA${page.id===newest?"  ·  ★ OSTATNIO DODANA":""}`;
      const mobile=[...item.querySelectorAll("small")].find(el=>el.textContent.includes("FENIX Mobile"));if(mobile&&mobile.textContent.includes("KDP: brak walidacji"))mobile.textContent="FENIX Mobile · profil projektu 300 DPI";
      const actions=item.lastElementChild;if(item.dataset.pageHref&&actions&&!actions.querySelector(".pages-direct-edit")){const a=document.createElement("a");a.href=item.dataset.pageHref;a.className="btn pages-direct-edit";a.textContent="Edytuj";actions.prepend(a)}
    });
  };
  const style=document.createElement("style");style.textContent=`.pages-direct-summary{margin:0 0 12px;padding:14px;border:2px solid #f55214;border-radius:12px;background:#fff;display:grid;gap:4px}.pages-direct-summary strong{font-size:11px;color:#f55214;letter-spacing:.06em}.pages-direct-summary b{font-size:22px}.pages-direct-summary span{font-size:12px;color:#576373}.pages-direct-group{margin:14px 0 6px;padding:8px 10px;border-radius:8px;background:#e8f2ff;color:#1a59ad;font-weight:900}.pages-direct-meta{margin:0 0 7px;padding:5px 7px;border-radius:7px;background:#f4f6f9;color:#12171f;font-size:11px;font-weight:900}.pages-direct-edit{font-weight:800}@media(max-width:760px){.pages-direct-summary b{font-size:18px}.pages-direct-meta{font-size:10px}}`;document.head.appendChild(style);
  const boot=()=>{apply();const list=document.getElementById("cartList");if(list)new MutationObserver(()=>requestAnimationFrame(apply)).observe(list,{childList:true,subtree:false});window.addEventListener("fenix-state-change",()=>requestAnimationFrame(apply));setTimeout(apply,300);setTimeout(apply,1000)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

(()=>{
  const STORAGE_KEY="fenix-project-assets-collapsed-v1";
  const boot=()=>{
    const panel=document.getElementById("projectAssets");if(!panel)return;
    const head=panel.querySelector(":scope > .panel-head");if(!head||head.querySelector(".project-assets-collapse-toggle"))return;
    const toggle=document.createElement("button");toggle.type="button";toggle.className="project-assets-collapse-toggle";toggle.setAttribute("aria-controls","projectAssets");
    const apply=collapsed=>{
      panel.classList.toggle("is-collapsed",collapsed);
      panel.dataset.collapsed=collapsed?"true":"false";
      toggle.setAttribute("aria-expanded",collapsed?"false":"true");
      toggle.innerHTML=collapsed?`<span aria-hidden="true">▾</span> Rozwiń assety`:`<span aria-hidden="true">▴</span> Zwiń assety`;
      try{localStorage.setItem(STORAGE_KEY,collapsed?"1":"0")}catch{}
    };
    const right=document.createElement("div");right.className="project-assets-head-actions";
    const existing=[...head.children].find(el=>el.id==="projectAssetsCount"||el.querySelector?.("#projectAssetsCount"));
    if(existing){head.removeChild(existing);right.appendChild(existing)}
    right.appendChild(toggle);head.appendChild(right);
    toggle.addEventListener("click",()=>apply(!panel.classList.contains("is-collapsed")));
    let collapsed=true;try{const saved=localStorage.getItem(STORAGE_KEY);if(saved!==null)collapsed=saved==="1"}catch{}
    apply(collapsed);
    const style=document.createElement("style");style.textContent=`
      .dashboard-v2 .project-assets-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
      .dashboard-v2 .project-assets-collapse-toggle{min-height:34px;padding:7px 11px;border:1px solid color-mix(in srgb,var(--dv2-orange) 45%,var(--dv2-line));border-radius:9px;background:var(--dv2-orange-soft);color:var(--dv2-orange);font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}
      .dashboard-v2 .project-assets-collapse-toggle:hover{border-color:var(--dv2-orange)}
      .dashboard-v2 .project-assets-panel.is-collapsed{padding-bottom:14px!important}
      .dashboard-v2 .project-assets-panel.is-collapsed>:not(.panel-head){display:none!important}
      .dashboard-v2 .project-assets-panel.is-collapsed .panel-head{margin-bottom:0!important}
      @media(max-width:760px){.dashboard-v2 .project-assets-head-actions{width:100%;justify-content:space-between}.dashboard-v2 .project-assets-collapse-toggle{flex:1}}
    `;document.head.appendChild(style);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

(()=>{
  const load=(src,done)=>{if(document.querySelector(`script[data-fenix-sync-src="${src}"]`))return done?.();const s=document.createElement("script");s.src=src;s.dataset.fenixSyncSrc=src;s.onload=()=>done?.();document.body.appendChild(s)};
  const boot=()=>load("core/sync-core.js?v=7",()=>load("core/sync-ui.js?v=7"));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

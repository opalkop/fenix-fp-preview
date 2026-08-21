"use strict";
(()=>{
  const body=document.body;
  if(!body)return;
  body.classList.add("fenix-studio-shell");
  const slug=body.dataset.module||body.dataset.screen||"module";
  body.dataset.fenixScreen=slug;

  try{localStorage.setItem("fenix-ui-theme","light")}catch{}
  document.documentElement.dataset.theme="light";
  document.querySelectorAll('link[data-fenix-theme="fenix-mode"]').forEach(link=>link.remove());
  document.querySelectorAll('[data-fenix-theme-toggle],.theme-box').forEach(el=>el.remove());

  const shellScript=[...document.scripts].find(item=>/\/assets\/studio-shell\.js(?:\?|$)/.test(item.src));
  if(shellScript&&!document.querySelector('link[data-fenix-contrast]')){
    const contrast=document.createElement("link");
    contrast.rel="stylesheet";
    contrast.href=new URL("contrast-fix.css",shellScript.src).href;
    contrast.dataset.fenixContrast="true";
    document.head.appendChild(contrast);
  }
  if(shellScript&&!document.querySelector('script[data-fenix-help]')){
    const help=document.createElement("script");
    help.src=new URL("help-overlay.js?v=0.22.11",shellScript.src).href;
    help.dataset.fenixHelp="true";
    document.body.appendChild(help);
  }

  if(shellScript&&!window.FenixSync&&!document.querySelector('script[data-fenix-studio-sync]')){
    const core=document.createElement("script");
    core.src=new URL("../core/sync-core.js?v=2",shellScript.src).href;
    core.dataset.fenixStudioSync="core";
    core.onload=()=>{
      if(document.getElementById("fenixSyncButton"))return;
      const ui=document.createElement("script");
      ui.src=new URL("../core/sync-ui.js?v=2",shellScript.src).href;
      ui.dataset.fenixStudioSync="ui";
      document.body.appendChild(ui);
    };
    document.body.appendChild(core);
  }

  const header=body.querySelector(":scope > header, .top, .master-header");
  if(header){
    header.classList.add("fenix-unified-header");
    const back=header.querySelector('a[href*="index.html"], a.back');
    if(back){back.classList.add("button","ghost");if(!back.textContent.trim().startsWith("←"))back.textContent=`← ${back.textContent.trim()}`}
  }

  const main=body.querySelector("main");
  if(main)main.classList.add("fenix-unified-main");
  body.querySelectorAll(".panel,.preview,.card,.ctp-panel,.ctp-preview,.workspace,.hero,.controls").forEach(el=>el.classList.add("fenix-surface"));

  const projectInfo=body.querySelector("#projectInfo");
  if(projectInfo&&typeof FenixCore!=="undefined"&&FenixCore.getActiveProject){
    const renderProject=()=>{
      const project=FenixCore.getActiveProject();
      const format=project.format==="a4"?"A4":project.format;
      projectInfo.textContent=`Aktywny projekt: ${project.name} · ${format} · ${project.bleed==="bleed"?"ze spadami":"bez spadów"}`;
    };
    renderProject();
    window.addEventListener("fenix-state-change",event=>{if(event.detail?.activeProject||event.detail?.projects)renderProject()});
  }

  const findActionHost=()=>body.querySelector(".actions,.panel-actions.save-actions,.panel-actions,.coloring-actions,.intro-controls,.ending-controls,.controls");
  const findSaveAction=()=>body.querySelector("#cart,#saveCart,#savePage,[data-save-page]");
  const findRefreshAction=()=>[...body.querySelectorAll("button")].find(button=>/odśwież\s+podgląd/i.test(button.textContent||""));

  function normalizeStudioActions(){
    const generate=body.querySelector("#generate");
    if(generate&&/generuj\s+(stronę|serię)/i.test(generate.textContent||""))generate.textContent="Odśwież podgląd";
    const cart=body.querySelector("#cart");
    if(cart&&/koszyk/i.test(cart.textContent||""))cart.textContent=/serię/i.test(cart.textContent||"")?"Dodaj serię do projektu":"Dodaj stronę do projektu";
    const save=findSaveAction();
    if(save&&/dodaj\s+do\s+stron\s+projektu/i.test(save.textContent||""))save.textContent="Dodaj stronę do projektu";
    if(findRefreshAction())return;
    if(generate){generate.setAttribute("aria-label","Odśwież podgląd strony");return}
    const host=findActionHost();
    if(!host||document.getElementById("fenixRefreshPreview"))return;
    const refresh=document.createElement("button");
    refresh.id="fenixRefreshPreview";
    refresh.type="button";
    refresh.className="ghost";
    refresh.textContent="Odśwież podgląd";
    refresh.title="Przelicz i odśwież podgląd strony bez dodawania jej do projektu";
    refresh.addEventListener("click",()=>{
      const source=body.querySelector('#title,[data-field="title"],textarea[data-field],input[data-field],select[data-field],#seed');
      if(source){source.dispatchEvent(new Event("input",{bubbles:true}));source.dispatchEvent(new Event("change",{bubbles:true}))}
      else window.dispatchEvent(new Event("resize"));
    });
    const saveAction=findSaveAction();
    if(saveAction?.parentElement===host)host.insertBefore(refresh,saveAction);else host.appendChild(refresh);
  }

  if(!document.getElementById("fenixUnifiedStudioUx")){
    const style=document.createElement("style");
    style.id="fenixUnifiedStudioUx";
    style.textContent=`
      body.fenix-studio-shell main.fenix-unified-main,
      body.fenix-studio-shell main.wrap,
      body.fenix-studio-shell .layout,
      body.fenix-studio-shell .maze-layout,
      body.fenix-studio-shell .ctp-layout,
      body.fenix-studio-shell .tracing-layout,
      body.fenix-studio-shell .matching-layout,
      body.fenix-studio-shell .coloring-layout,
      body.fenix-studio-shell .logic-layout,
      body.fenix-studio-shell .studio-layout{display:flex!important;flex-direction:column!important;grid-template-columns:1fr!important;align-items:stretch!important;width:min(1500px,100%)!important;margin:0 auto!important;gap:18px!important}
      body.fenix-studio-shell main.fenix-unified-main>*{width:100%!important;max-width:none!important;grid-column:1!important;grid-row:auto!important;position:static!important;top:auto!important;max-height:none!important;overflow:visible!important}
      body.fenix-studio-shell .panel,body.fenix-studio-shell .controls,body.fenix-studio-shell .card.controls,body.fenix-studio-shell .ctp-panel{position:static!important;top:auto!important;max-height:none!important;overflow:visible!important;width:100%!important}
      body.fenix-studio-shell .preview,body.fenix-studio-shell .workspace,body.fenix-studio-shell .hero,body.fenix-studio-shell .ctp-preview{width:100%!important;grid-column:1!important;grid-row:auto!important}
      body.fenix-studio-shell button[data-fenix-action]{min-height:44px!important;padding:10px 16px!important;border-radius:10px!important;font-weight:900!important;transition:transform .12s ease,filter .12s ease,box-shadow .12s ease!important}
      body.fenix-studio-shell button[data-fenix-action=refresh]{background:#3b82f6!important;border:1px solid #2563eb!important;color:#fff!important;box-shadow:0 4px 12px rgba(37,99,235,.24)!important}
      body.fenix-studio-shell button[data-fenix-action=save]{background:#ff7a35!important;border:1px solid #e45f1c!important;color:#fff!important;box-shadow:0 4px 12px rgba(228,95,28,.24)!important}
      body.fenix-studio-shell button[data-fenix-action=export]{background:#eef2f6!important;border:1px solid #cbd5df!important;color:#17202a!important;box-shadow:none!important}
      body.fenix-studio-shell button[data-fenix-action=variant],body.fenix-studio-shell button[data-fenix-action=reset]{background:#eef2f6!important;border:1px solid #cbd5df!important;color:#17202a!important;box-shadow:none!important}
      body.fenix-studio-shell button[data-fenix-action]:hover{filter:brightness(.94)!important;transform:translateY(-1px)!important}
      @media(max-width:600px){body.fenix-studio-shell .actions button[data-fenix-action],body.fenix-studio-shell .coloring-actions button[data-fenix-action],body.fenix-studio-shell .panel-actions button[data-fenix-action]{flex:1 1 100%!important;width:100%!important}}
    `;
    document.head.appendChild(style);
  }

  function classifyActionButtons(){
    body.querySelectorAll("button").forEach(button=>{
      const id=String(button.id||"");
      const text=String(button.textContent||"").trim();
      let role="";
      if(["cart","saveCart","savePage"].includes(id)||button.hasAttribute("data-save-page")||/(dodaj|zapisz|aktualizuj).*(stron|serię|projekt)|do projektu/i.test(text))role="save";
      else if(["generate","fenixRefreshPreview"].includes(id)||/(odśwież|generuj).*(podgląd|stronę|serię)/i.test(text))role="refresh";
      else if(["png","downloadPng"].includes(id)||/(eksport|pobierz).*(png|jpg|pdf)/i.test(text))role="export";
      else if(["newVariant","randomSeed"].includes(id)||/(nowy|losuj).*(wariant|zestaw|układ)/i.test(text))role="variant";
      else if(/reset|wyczyść ustawienia|przywróć/i.test(text)||/reset/i.test(id))role="reset";
      if(role)button.dataset.fenixAction=role;
    });
  }

  normalizeStudioActions();
  classifyActionButtons();
  setTimeout(()=>{normalizeStudioActions();classifyActionButtons()},0);
  setTimeout(()=>{normalizeStudioActions();classifyActionButtons()},250);
  setTimeout(classifyActionButtons,1000);
  const observer=new MutationObserver(()=>classifyActionButtons());
  observer.observe(body,{childList:true,subtree:true,characterData:true});
})();

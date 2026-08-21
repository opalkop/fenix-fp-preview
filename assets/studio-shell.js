"use strict";
(()=>{
  const body=document.body;
  if(!body)return;
  body.classList.add("fenix-studio-shell");
  const slug=body.dataset.module||body.dataset.screen||"module";
  body.dataset.fenixScreen=slug;

  const shellScript=[...document.scripts].find(item=>/\/assets\/studio-shell\.js(?:\?|$)/.test(item.src));
  if(shellScript&&!document.querySelector('link[data-fenix-contrast]')){
    const contrast=document.createElement("link");
    contrast.rel="stylesheet";
    contrast.href=new URL("contrast-fix.css",shellScript.src).href;
    contrast.dataset.fenixContrast="true";
    document.head.appendChild(contrast);
  }
  const fenixModeStyle=document.querySelector('link[data-fenix-theme="fenix-mode"]');
  if(fenixModeStyle)document.head.appendChild(fenixModeStyle);
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

  const themeKey="fenix-ui-theme";
  const current=(()=>{try{return localStorage.getItem(themeKey)||"light"}catch{return"light"}})();
  document.documentElement.dataset.theme=current;

  if(header&&!header.querySelector("[data-fenix-theme-toggle]")){
    const actions=header.querySelector(".header-actions")||header.lastElementChild;
    if(actions){
      const select=document.createElement("select");
      select.dataset.fenixThemeToggle="true";
      select.setAttribute("aria-label","Motyw interfejsu");
      select.innerHTML='<option value="light">Jasny</option><option value="dark">Ciemny</option><option value="system">Systemowy</option><option value="fenix">Fenix Mode</option>';
      select.value=current;
      select.style.width="auto";
      select.addEventListener("change",()=>{try{localStorage.setItem(themeKey,select.value)}catch{}document.documentElement.dataset.theme=select.value;window.dispatchEvent(new CustomEvent("fenix-theme-change",{detail:{theme:select.value}}))});
      actions.appendChild(select);
    }
  }

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

  // Wspólny kontrakt UX Studiów: zawsze widoczny zapis do projektu i ręczne odświeżenie podglądu.
  const actionText=element=>String(element?.textContent||"").trim().toLowerCase();
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
    if(generate){
      generate.setAttribute("aria-label","Odśwież podgląd strony");
      return;
    }

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
      if(source){
        source.dispatchEvent(new Event("input",{bubbles:true}));
        source.dispatchEvent(new Event("change",{bubbles:true}));
      }else{
        window.dispatchEvent(new Event("resize"));
      }
    });
    const saveAction=findSaveAction();
    if(saveAction?.parentElement===host)host.insertBefore(refresh,saveAction);
    else host.appendChild(refresh);
  }

  normalizeStudioActions();
  setTimeout(normalizeStudioActions,0);
  setTimeout(normalizeStudioActions,250);
})();

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
  if(shellScript&&!document.querySelector('script[data-fenix-help]')){
    const help=document.createElement("script");
    help.src=new URL("help-overlay.js",shellScript.src).href;
    help.dataset.fenixHelp="true";
    document.body.appendChild(help);
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
})();

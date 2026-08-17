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
    try{
      if(window.FenixDashboardSound){
        await window.FenixDashboardSound.play("startup");
      }
    }catch{}
    intro.classList.add("is-leaving");
    window.setTimeout(()=>{
      intro.classList.add("is-hidden");
      intro.setAttribute("aria-hidden","true");
      intro.remove();
      document.body.classList.add("fenix-intro-complete");
    },560);
  };

  enter?.addEventListener("click",unlockAndEnter);
  intro.addEventListener("click",event=>{
    if(event.target.closest("button,a,input,select,textarea"))return;
    unlockAndEnter();
  });
  document.addEventListener("keydown",event=>{
    if(leaving)return;
    if(event.key==="Enter"||event.key===" "){
      event.preventDefault();
      unlockAndEnter();
    }
  },{capture:true});
})();

(()=>{
  const current=[...document.scripts].find(script=>/\/assets\/dashboard-intro\.js(?:\?|$)/.test(script.src));
  if(!current)return;
  if(!document.querySelector('link[data-fenix-pages-ux]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=new URL("pages-project-ux.css?v=0.30.0",current.src).href;
    link.dataset.fenixPagesUx="1";
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-fenix-pages-ux]')){
    const script=document.createElement("script");
    script.src=new URL("pages-project-ux.js?v=0.30.0",current.src).href;
    script.dataset.fenixPagesUx="1";
    document.body.appendChild(script);
  }
})();

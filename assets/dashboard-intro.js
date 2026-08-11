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

"use strict";

(()=>{
  const STORAGE_KEY="fenix-dashboard-sound";
  let enabled=true;
  try{enabled=localStorage.getItem(STORAGE_KEY)!=="off"}catch{}

  let ctx=null;
  let master=null;
  let lastHover=0;
  let unlocked=false;
  let startupPlayed=false;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;

  const ensureContext=()=>{
    if(!AudioContextClass)return null;
    if(!ctx){
      ctx=new AudioContextClass();
      master=ctx.createGain();
      master.gain.value=0.9;
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const tone=(frequency,duration=0.08,volume=0.08,type="sine",delay=0)=>{
    if(!enabled)return;
    const ac=ensureContext();
    if(!ac||!master)return;
    const now=ac.currentTime+delay;
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(frequency,now);
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),now+0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now+duration+0.025);
  };

  const sweep=(from,to,duration=0.18,volume=0.08,delay=0,type="sine")=>{
    if(!enabled)return;
    const ac=ensureContext();
    if(!ac||!master)return;
    const now=ac.currentTime+delay;
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(from,now);
    osc.frequency.exponentialRampToValueAtTime(to,now+duration);
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(volume,now+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now+duration+0.025);
  };

  const sounds={
    startup(){
      sweep(150,520,0.28,0.09,0,"sine");
      sweep(420,1450,0.20,0.055,0.035,"triangle");
      sweep(1100,620,0.18,0.035,0.16,"sine");
      tone(760,0.11,0.03,"sine",0.22);
    },
    hover(){tone(650,0.06,0.045,"sine");},
    click(){tone(430,0.065,0.075,"triangle");tone(590,0.08,0.045,"sine",0.025);},
    open(){sweep(300,840,0.22,0.09);tone(920,0.10,0.05,"sine",0.14);},
    action(){tone(520,0.075,0.065,"triangle");},
    success(){tone(520,0.10,0.075,"sine");tone(660,0.11,0.065,"sine",0.075);tone(820,0.14,0.055,"sine",0.15);}
  };

  const updateButton=button=>{
    if(!button)return;
    button.textContent=enabled?"🔊 Dźwięki":"🔇 Dźwięki";
    button.setAttribute("aria-pressed",enabled?"true":"false");
    button.title=enabled?"Wyłącz efekty dźwiękowe":"Włącz efekty dźwiękowe";
  };

  const unlockAudio=async({playStartup=false}={})=>{
    const ac=ensureContext();
    if(!ac)return false;
    try{
      if(ac.state==="suspended")await ac.resume();
      unlocked=ac.state==="running";
      if(unlocked&&enabled&&playStartup&&!startupPlayed){
        startupPlayed=true;
        sounds.startup();
      }
      return unlocked;
    }catch{
      return false;
    }
  };

  const initialize=()=>{
    const themeBox=document.querySelector(".theme-box");
    if(themeBox&&!document.getElementById("dashboardSoundToggle")){
      const button=document.createElement("button");
      button.type="button";
      button.id="dashboardSoundToggle";
      button.className="nav-button";
      button.style.marginTop="8px";
      updateButton(button);
      button.addEventListener("click",async()=>{
        await unlockAudio();
        enabled=!enabled;
        try{localStorage.setItem(STORAGE_KEY,enabled?"on":"off")}catch{}
        updateButton(button);
        if(enabled){
          startupPlayed=true;
          sounds.success();
        }
      });
      themeBox.appendChild(button);
    }

    const firstUserGesture=async()=>{
      await unlockAudio({playStartup:true});
    };
    document.addEventListener("pointerdown",firstUserGesture,{once:true,capture:true});
    document.addEventListener("keydown",firstUserGesture,{once:true,capture:true});

    document.addEventListener("pointerover",event=>{
      const card=event.target.closest?.("#grid .module.motion-card-ready");
      if(!card||card.contains(event.relatedTarget)||!unlocked)return;
      const now=performance.now();
      if(now-lastHover<90)return;
      lastHover=now;
      sounds.hover();
    });

    document.addEventListener("pointerdown",async event=>{
      if(!unlocked)await unlockAudio({playStartup:true});
      const target=event.target.closest?.("button,.btn,.nav a,.module-link");
      if(!target||target.id==="dashboardSoundToggle")return;
      if(target.matches(".module-link"))sounds.open();
      else sounds.click();
    });

    window.FenixDashboardSound={
      play:async name=>{if(!unlocked)await unlockAudio({playStartup:true});sounds[name]?.();},
      isEnabled:()=>enabled,
      isUnlocked:()=>unlocked,
      setEnabled:value=>{enabled=Boolean(value);try{localStorage.setItem(STORAGE_KEY,enabled?"on":"off")}catch{};updateButton(document.getElementById("dashboardSoundToggle"));}
    };
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

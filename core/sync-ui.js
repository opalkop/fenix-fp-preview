"use strict";
(()=>{
  if(!window.FenixSync||document.getElementById("fenixSyncButton"))return;
  let busy=false,pushTimer=null,lastRemoteAt=0;
  const configured=()=>{const c=FenixSync.getConfig();return Boolean(c.autoSync&&c.owner&&c.repo&&c.token)};
  const formatSize=bytes=>{const n=Number(bytes)||0;return n>=1024*1024?`${(n/1024/1024).toFixed(2)} MB`:n>=1024?`${(n/1024).toFixed(1)} KB`:`${n} B`};
  const storageLabel=()=>{const info=FenixCore.getStorageInfo?.()||{};return info.mode==="indexeddb"?"IndexedDB · duże assety poza localStorage":"localStorage · tryb awaryjny"};
  const style=document.createElement("style");
  style.textContent=`#fenixSyncButton{display:block;width:100%;box-sizing:border-box;border:1px solid #d8dee7;border-radius:22px;padding:20px 22px;background:linear-gradient(135deg,#fff 0%,#f7f9fc 100%);color:#111827;text-align:left;cursor:pointer;box-shadow:0 10px 28px #15223512;font:inherit;transition:.18s ease}#fenixSyncButton:hover{transform:translateY(-1px);box-shadow:0 14px 34px #1522351c}#fenixSyncButton[data-state="busy"]{opacity:.72}#fenixSyncButton .fs-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}#fenixSyncButton .fs-kicker{display:block;font:800 11px/1.2 system-ui;letter-spacing:.12em;color:#e45520;margin-bottom:7px}#fenixSyncButton .fs-title{display:block;font:900 23px/1.1 system-ui;color:#111827;margin-bottom:6px}#fenixSyncButton .fs-desc{display:block;font:500 14px/1.45 system-ui;color:#667085;max-width:720px}#fenixSyncButton .fs-badge{flex:0 0 auto;border-radius:999px;padding:7px 10px;background:#eef2f6;color:#475467;font:800 11px system-ui}#fenixSyncButton[data-ready="true"] .fs-badge{background:#eaf7ef;color:#18794e}#fenixSyncButton .fs-card-bottom{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:15px;padding-top:13px;border-top:1px solid #e6eaf0}#fenixSyncButton .fs-status{font:800 13px system-ui;color:#344054}#fenixSyncButton .fs-devices{font:600 12px system-ui;color:#7b8492}#fenixSyncPanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;width:min(500px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#111827;border:1px solid #d7dce3;border-radius:20px;padding:18px;box-shadow:0 22px 70px #0005;font:13px system-ui}#fenixSyncPanel[hidden]{display:none}#fenixSyncPanel h3{margin:0 0 5px;font-size:21px}#fenixSyncPanel p{margin:0 0 10px;color:#5b6572}#fenixSyncPanel label{display:block;font-weight:750;margin:8px 0}#fenixSyncPanel input{display:block;box-sizing:border-box;width:100%;margin-top:4px;padding:9px;border:1px solid #ccd3dc;border-radius:9px}#fenixSyncPanel .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#fenixSyncPanel button{padding:9px 11px;border:1px solid #ccd3dc;border-radius:9px;background:#f5f7f9;font-weight:800}#fenixSyncPanel button.primary{background:#111827;color:#fff;border-color:#111827}#fenixSyncPanel button.asset{background:#eaf7ef;color:#146c43;border-color:#bfe4cd}#fenixSyncStatus{padding:8px;margin-top:9px;border-radius:9px;background:#f4f6f8;white-space:pre-wrap}#fenixSyncPanel .check{display:flex;align-items:center;gap:7px}#fenixSyncPanel .check input{width:auto;margin:0}#fenixSyncPanel .fs-local,#fenixSyncPanel .fs-assets{margin-top:16px;padding-top:14px;border-top:1px solid #e4e7ec}#fenixSyncPanel .fs-local h4,#fenixSyncPanel .fs-assets h4{margin:0 0 5px;font-size:15px}#fenixSyncPanel .fs-note{font-size:12px;line-height:1.45;color:#667085}#fenixSyncPanel .fs-local-size{font:800 12px/1.45 system-ui;color:#344054;margin-top:8px;padding:9px 10px;border-radius:10px;background:#eef8f1}#fenixSyncPanel .fs-storage-ok{color:#18794e}.fs-dashboard-wrap{margin:16px 0 22px}@media(max-width:700px){#fenixSyncButton{padding:17px 18px;border-radius:18px}#fenixSyncButton .fs-title{font-size:20px}#fenixSyncButton .fs-card-top{gap:10px}#fenixSyncPanel{width:calc(100vw - 18px);padding:15px}}`;
  document.head.appendChild(style);

  const button=document.createElement("button");
  button.id="fenixSyncButton";button.type="button";
  button.innerHTML=`<span class="fs-card-top"><span><span class="fs-kicker">PROJEKT I ASSETY · OSOBNE KANAŁY</span><span class="fs-title">↻ Fenix Sync</span><span class="fs-desc">Projekty i globalna biblioteka assetów mają osobne, jawne kanały synchronizacji.</span></span><span class="fs-badge">SPRAWDZAM…</span></span><span class="fs-card-bottom"><span class="fs-status">Sprawdzam konfigurację…</span><span class="fs-devices">Windows · Linux · Mobile</span></span>`;
  const panel=document.createElement("section");
  panel.id="fenixSyncPanel";panel.hidden=true;
  panel.innerHTML=`<h3>Fenix Sync</h3><p>Projekt i globalna biblioteka assetów synchronizują się niezależnie.</p><label>GitHub owner<input id="fsOwner" autocomplete="username"></label><label>Repozytorium danych<input id="fsRepo"></label><label>Branch<input id="fsBranch"></label><label>Ścieżka pliku<input id="fsPath"></label><label>Token GitHub<input id="fsToken" type="password" autocomplete="off"></label><label class="check"><input id="fsRemember" type="checkbox">Zapamiętaj token na tym urządzeniu</label><label class="check"><input id="fsAuto" type="checkbox" checked>Automatycznie utrzymuj projekt w synchronizacji</label><div class="row"><button id="fsSave" class="primary">Zapisz konfigurację</button><button id="fsSync" class="primary">Synchronizuj projekt</button><button id="fsPull">Pobierz projekt</button><button id="fsPush">Wyślij projekt</button></div><div class="fs-assets"><h4>Biblioteka assetów</h4><p class="fs-note">Oddzielny kanał wyłącznie dla globalnej biblioteki. Operacje assetów nie zapisują ani nie pobierają projektów.</p><div class="row"><button id="fsAssetPull" class="asset">Pobierz assety</button><button id="fsAssetPush" class="asset">Wyślij assety</button></div><p class="fs-note">Na urządzeniu źródłowym użyj „Wyślij assety”, a na drugim „Pobierz assety”. Pusta biblioteka w chmurze nie wyczyści istniejącej lokalnej biblioteki bez osobnego potwierdzenia.</p></div><div class="fs-local"><h4>Kopia lokalna projektu</h4><p class="fs-note">Plik .fenixsync jest kopią projektowego kanału synchronizacji. Globalna biblioteka assetów nie jest częścią tego pliku.</p><div class="row"><button id="fsExport">Pobierz ustawienia</button><button id="fsImport">Wczytaj ustawienia</button><input id="fsImportFile" type="file" accept=".fenixsync,.json,application/json" hidden></div><div id="fsLocalSize" class="fs-local-size"></div></div><div class="row"><button id="fsClose">Zamknij</button></div><div id="fenixSyncStatus">Nie skonfigurowano.</div>`;

  const wrap=document.createElement("div");wrap.className="fs-dashboard-wrap";wrap.appendChild(button);const anchor=document.querySelector(".project-strip");if(anchor)anchor.insertAdjacentElement("afterend",wrap);else wrap.hidden=true;document.body.appendChild(panel);
  const $=id=>document.getElementById(id),badge=()=>button.querySelector(".fs-badge"),cardStatus=()=>button.querySelector(".fs-status");
  function updateLocalSize(){try{const out=FenixSync.bundleToText({pretty:false}),info=FenixCore.getStorageInfo?.()||{};$("fsLocalSize").innerHTML=`Aktualny pakiet projektu: ${formatSize(out.size)}<br><span class="${info.mode==="indexeddb"?"fs-storage-ok":""}">Magazyn assetów: ${storageLabel()}</span>`;}catch{$("fsLocalSize").textContent=`Magazyn assetów: ${storageLabel()}`;}}
  function updateCard(text){const c=FenixSync.getConfig(),ready=Boolean(c.owner&&c.repo&&c.token);button.dataset.ready=String(ready);badge().textContent=busy?"SYNCHRONIZACJA…":ready?"GOTOWY":"KONFIGURACJA";cardStatus().textContent=text||(ready?`✓ Gotowy · ${c.owner}/${c.repo}`:"Token GitHub nie jest ustawiony na tym urządzeniu");}
  const status=text=>{$("fenixSyncStatus").textContent=text;updateCard(text);};
  const setBusy=value=>{busy=value;button.dataset.state=value?"busy":"ready";updateCard();};
  async function fill(){await FenixCore.ready;const c=FenixSync.getConfig();$("fsOwner").value=c.owner;$("fsRepo").value=c.repo;$("fsBranch").value=c.branch;$("fsPath").value=c.path;$("fsAuto").checked=c.autoSync;$("fsRemember").checked=c.rememberToken;if(c.token)$("fsToken").placeholder="Token ustawiony na tym urządzeniu";status(c.owner&&c.repo&&c.token?`Gotowy · ${c.owner}/${c.repo}`:"Uzupełnij token GitHub na tym urządzeniu.");updateLocalSize();}
  function save(){const old=FenixSync.getConfig(),token=$("fsToken").value||old.token,c=FenixSync.setConfig({owner:$("fsOwner").value,repo:$("fsRepo").value,branch:$("fsBranch").value,path:$("fsPath").value,token,rememberToken:$("fsRemember").checked,autoSync:$("fsAuto").checked});status(`Zapisano · ${c.owner}/${c.repo}`);return c;}

  async function execute(kind,{silent=false}={}){
    if(busy)return null;
    try{
      busy=true;setBusy(true);if(!silent)save();if(!silent)status(kind==="sync"?"Synchronizacja projektu…":kind==="pull"?"Pobieranie projektu…":"Wysyłanie projektu…");
      const out=kind==="sync"?await FenixSync.sync():kind==="pull"?await FenixSync.pull({merge:true}):await FenixSync.push();
      if(kind!=="push")lastRemoteAt=Date.now();
      if(!silent){
        if(kind==="push")status(`✓ Projekt zapisany · ${formatSize(out.size)} · części: ${out.chunks||0}`);
        else if(kind==="pull")status(out.found===false?"✓ Brak zdalnego projektu.":`✓ Projekt pobrany · ${formatSize(out.size)}${out.chunks?` · części: ${out.chunks}`:""}.`);
        else status(`✓ Projekt zsynchronizowany · ${formatSize(out.pushed?.size)}`);
      }else updateCard("✓ Automatyczna synchronizacja projektu aktywna");
      updateLocalSize();return out;
    }catch(error){status(`Błąd synchronizacji: ${error.message||error}`);return {error:String(error.message||error)};}finally{busy=false;setBusy(false);}
  }

  async function executeAssets(kind){
    if(busy)return null;
    try{
      busy=true;setBusy(true);save();status(kind==="pull"?"Pobieranie biblioteki assetów…":"Wysyłanie biblioteki assetów…");
      let out=kind==="pull"?await FenixSync.pullAssets():await FenixSync.pushAssets();
      if(kind==="pull"){
        if(out.found===false){status("Brak zdalnej biblioteki assetów. Najpierw użyj „Wyślij assety” na urządzeniu źródłowym.");return out;}
        if(out.requiresConfirmation&&out.reason==="remote-empty-local-nonempty"){
          const confirmed=window.confirm("Biblioteka assetów w chmurze jest pusta, a na tym urządzeniu istnieją lokalne assety. Czy na pewno chcesz wyczyścić lokalną globalną bibliotekę assetów?");
          if(!confirmed){status("Anulowano pobieranie pustej biblioteki. Lokalne assety pozostały bez zmian.");return out;}
          status("Potwierdzono wyczyszczenie globalnej biblioteki assetów…");
          out=await FenixSync.pullAssets({allowEmptyReplacement:true});
        }
        if(out.reloadRequired){status(`✓ Pobrano bibliotekę assetów · ${out.count||0} assetów · ${formatSize(out.size)}. Odświeżam Fenix…`);setTimeout(()=>location.reload(),350);}else status(`✓ Biblioteka assetów bez zmian · ${out.count||0} assetów.`);
      }else status(`✓ Wysłano bibliotekę assetów · ${out.count||0} assetów · ${formatSize(out.size)} · części: ${out.chunks||0}`);
      return out;
    }catch(error){status(`Błąd synchronizacji assetów: ${error.message||error}`);return {error:String(error.message||error)};}finally{busy=false;setBusy(false);}
  }

  function exportLocal(){try{const out=FenixSync.exportLocalBundle();status(`✓ Pobrano kopię projektu Fenix Sync · ${formatSize(out.size)}`);updateLocalSize();}catch(error){status(`Błąd eksportu: ${error.message||error}`);}}
  async function importLocal(file){if(!file)return;try{setBusy(true);status(`Wczytywanie pliku · ${formatSize(file.size)}…`);const out=await FenixSync.importLocalBundle(file,{prefer:"remote"});const mode=out.storage?.mode||FenixCore.getStorageInfo?.().mode||"unknown";status(`✓ Wczytano kopię projektu · ${formatSize(out.size)}\nNowe: ${out.stats.created}, zaktualizowane: ${out.stats.updated}, bez zmian: ${out.stats.kept}\nMagazyn assetów: ${mode==="indexeddb"?"IndexedDB":"localStorage (tryb awaryjny)"}`);updateLocalSize();}catch(error){status(`Błąd importu: ${error.message||error}`);}finally{$("fsImportFile").value="";setBusy(false);}}
  function queuePush(){if(!configured()||busy||Date.now()-lastRemoteAt<1800)return;clearTimeout(pushTimer);pushTimer=setTimeout(()=>execute("push",{silent:true}),2200);}
  async function refreshFromRemote(){if(!configured()||busy)return;await execute("pull",{silent:true});}

  button.onclick=()=>{panel.hidden=false;fill();};
  $("fsClose").onclick=()=>panel.hidden=true;
  $("fsSave").onclick=save;
  $("fsSync").onclick=()=>execute("sync");
  $("fsPull").onclick=()=>execute("pull");
  $("fsPush").onclick=()=>execute("push");
  $("fsAssetPull").onclick=()=>executeAssets("pull");
  $("fsAssetPush").onclick=()=>executeAssets("push");
  $("fsExport").onclick=exportLocal;
  $("fsImport").onclick=()=>$("fsImportFile").click();
  $("fsImportFile").onchange=event=>importLocal(event.target.files?.[0]);
  window.addEventListener("fenix-sync-progress",event=>{if(!busy)return;const {phase,current,total}=event.detail||{},step=Math.min(Number(current||0)+1,Number(total||0)),asset=String(phase||"").startsWith("asset-");status(`${String(phase||"").includes("pull")?"Pobieranie":"Wysyłanie"} ${asset?"assetów":"projektu"} · część ${step}/${total||0}…`);});
  window.addEventListener("fenix-state-change",queuePush);
  window.addEventListener("fenix-storage-ready",updateLocalSize);
  window.addEventListener("online",refreshFromRemote);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshFromRemote();});
  window.addEventListener("focus",()=>{if(Date.now()-lastRemoteAt>15000)refreshFromRemote();});
  fill();setTimeout(refreshFromRemote,450);
})();
"use strict";
(()=>{
  const LABELS={
    "maze-studio":{short:"MAZE",name:"Maze Studio",tone:"maze"},
    "word-search-studio":{short:"WS",name:"Word Search Studio",tone:"ws"},
    "coloring-studio":{short:"COL",name:"Coloring Studio",tone:"coloring"},
    "complete-picture":{short:"CTP",name:"Complete the Picture",tone:"ctp"},
    "tracing-studio":{short:"TR",name:"Tracing Studio",tone:"tracing"},
    "matching-studio":{short:"MAT",name:"Matching Studio",tone:"matching"},
    "dot-to-dot-studio":{short:"DOT",name:"Dot to Dot Studio",tone:"dot"},
    "hidden-objects-studio":{short:"HO",name:"Hidden Objects Studio",tone:"hidden"},
    "alphabet-studio":{short:"ABC",name:"Alphabet Studio",tone:"alphabet"},
    "math-studio":{short:"MATH",name:"Math Studio",tone:"math"},
    "logic-studio":{short:"LOG",name:"Logic Studio",tone:"logic"},
    "intro-studio":{short:"INTRO",name:"Intro Studio",tone:"intro"},
    "congratulations-studio":{short:"CONG",name:"Congratulations Studio",tone:"ending"},
    "qr-studio":{short:"QR",name:"QR Studio",tone:"ending"},
    "certificate-studio":{short:"CERT",name:"Certificate Studio",tone:"ending"}
  };
  const STRUCTURAL=new Set(["intro-studio","congratulations-studio","qr-studio","certificate-studio"]);
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const moduleOf=p=>window.FenixPageSchema?.moduleOf?FenixPageSchema.moduleOf(p):(p?.module||p?.recipe?.module||"unknown");
  const normalized=p=>window.FenixPageSchema?.normalize?FenixPageSchema.normalize(p):p;
  const hasSolution=p=>Boolean(p?.solution?.available);
  let busy=false;

  function settingsSummary(page){
    const s=page?.recipe?.settings||{},parts=[],mod=moduleOf(page),seed=page?.recipe?.seed??page?.seed;
    if(mod==="word-search-studio"){
      if(s.cols&&s.rows)parts.push(`${s.cols}×${s.rows}`);
      if(s.wordCount)parts.push(`${s.wordCount} słów`);
      if(s.maxWordLength)parts.push(`max ${s.maxWordLength}`);
      if(seed!=null)parts.push(`seed ${seed}`);
    }else if(mod==="maze-studio"){
      if(s.cols&&s.rows)parts.push(`${s.cols}×${s.rows}`);
      if(s.difficulty)parts.push(String(s.difficulty));
      if(seed!=null)parts.push(`seed ${seed}`);
    }else{
      if(s.difficulty)parts.push(String(s.difficulty));
      if(seed!=null)parts.push(`seed ${seed}`);
      if(s.assetScale)parts.push(`asset ${s.assetScale}%`);
    }
    return parts.slice(0,4).join(" · ");
  }

  function kdpText(page,project){
    const status=page?.validation?.kdp?.status;
    if(status==="ok")return"KDP ✓ OK";
    if(status==="error")return"KDP ✕ BŁĄD";
    if(status==="warning")return"KDP ! UWAGA";
    const known=Boolean(LABELS[moduleOf(page)]);
    return known&&project?.format?"KDP ✓ PROFIL PROJEKTU 300 DPI":"KDP · BRAK DANYCH";
  }

  function countsFor(pages){const counts={};for(const page of pages){const mod=moduleOf(page);counts[mod]=(counts[mod]||0)+1}return counts}

  function ensureToolbar(pages){
    const section=$("#pagesProject"),list=$("#cartList");if(!section||!list)return;
    let toolbar=section.querySelector(".pages-ux-toolbar");
    if(!toolbar){toolbar=document.createElement("div");toolbar.className="pages-ux-toolbar";list.parentElement.insertBefore(toolbar,list)}
    const counts=countsFor(pages),activityCount=pages.filter(p=>!STRUCTURAL.has(moduleOf(p))).length,solutions=pages.filter(hasSolution).length;
    const chips=Object.entries(counts).map(([mod,count])=>{const l=LABELS[mod]||{short:mod,name:mod,tone:"other"};return `<span class="pages-ux-chip tone-${esc(l.tone)}"><b>${esc(l.short)}</b><strong>${count}</strong></span>`}).join("");
    toolbar.innerHTML=`<div class="pages-ux-overview"><div class="pages-ux-total"><span class="pages-ux-kicker">KONTROLA WORKFLOW · AKTYWNA</span><strong>${activityCount} aktywności</strong><small>${pages.length} stron zapisanych · ${solutions} stron z rozwiązaniem</small></div><div class="pages-ux-chips">${chips}</div></div><div class="pages-ux-help"><b>Nie licz ręcznie.</b> Numery poniżej pokazują kolejność globalną i kolejność w każdym Studio. Ostatnia zapisana karta jest dodatkowo wyróżniona.</div>`;
  }

  function removeOldHeaders(list){list.querySelectorAll(":scope > .pages-ux-group").forEach(node=>node.remove())}

  function enhance(){
    if(busy||!window.FenixCore)return;busy=true;
    try{
      const list=$("#cartList"),project=FenixCore.getActiveProject?.();if(!list||!project)return;
      const pages=(project.pages||[]).map(normalized);ensureToolbar(pages);removeOldHeaders(list);
      const items=[...list.querySelectorAll(":scope > .cart-item")];if(!items.length)return;
      const counts=countsFor(pages),moduleSeen={},newestId=pages.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]?.id;
      let previousModule=null;
      items.forEach((item,index)=>{
        const page=pages[index];if(!page)return;
        const mod=moduleOf(page),label=LABELS[mod]||{short:mod.replace(/-studio$/,'').toUpperCase(),name:mod,tone:"other"};
        const local=moduleSeen[mod]=(moduleSeen[mod]||0)+1;
        if(mod!==previousModule){const header=document.createElement("div");header.className=`pages-ux-group tone-${label.tone}`;header.innerHTML=`<div><span>${esc(label.short)}</span><strong>${esc(label.name)}</strong></div><b>${counts[mod]||0} ${counts[mod]===1?"strona":"stron"}</b>`;list.insertBefore(header,item);previousModule=mod}
        item.className=item.className.replace(/\btone-\S+/g,"").trim();item.classList.add("pages-ux-item",`tone-${label.tone}`);
        item.dataset.pageId=page.id||"";item.dataset.module=mod;item.dataset.moduleIndex=String(local);item.dataset.globalIndex=String(index+1);
        const left=item.firstElementChild,actions=item.lastElementChild;if(!left||!actions)return;
        let meta=left.querySelector(".pages-ux-meta");if(!meta){meta=document.createElement("div");meta.className="pages-ux-meta";left.prepend(meta)}
        meta.innerHTML=`<span class="pages-ux-module">${esc(label.short)} #${String(local).padStart(2,"0")}</span><span class="pages-ux-global">STRONA ${String(index+1).padStart(2,"0")}/${String(pages.length).padStart(2,"0")}</span><span class="pages-ux-saved">✓ ZAPISANA</span>${page.id===newestId?'<span class="pages-ux-latest">★ OSTATNIO DODANA</span>':''}`;
        let heading=left.querySelector("strong:not(.pages-ux-generated-title)");if(heading)heading.classList.add("pages-ux-original-title");
        let generated=left.querySelector(".pages-ux-generated-title");if(!generated){generated=document.createElement("strong");generated.className="pages-ux-generated-title";meta.insertAdjacentElement("afterend",generated)}
        generated.textContent=`${label.short} #${String(local).padStart(2,"0")} — ${page.title||label.name}`;if(heading)heading.hidden=true;
        const summary=settingsSummary(page);let detail=left.querySelector(".pages-ux-detail");if(!detail){detail=document.createElement("div");detail.className="pages-ux-detail";left.appendChild(detail)}detail.textContent=summary||`${label.name} · pełne ustawienia zapisane w projekcie`;
        const mobile=left.querySelector(".mobile-source");if(mobile)mobile.textContent=kdpText(page,project);
        if(item.dataset.pageHref&&!actions.querySelector(".pages-ux-edit")){const edit=document.createElement("a");edit.className="btn pages-ux-edit";edit.href=item.dataset.pageHref;edit.textContent="Edytuj tę stronę";actions.prepend(edit)}
      });
    }finally{busy=false}
  }

  function boot(){
    const list=$("#cartList");if(!list)return;
    new MutationObserver(()=>requestAnimationFrame(enhance)).observe(list,{childList:true,subtree:false});
    window.addEventListener("fenix-state-change",()=>requestAnimationFrame(enhance));requestAnimationFrame(enhance);setTimeout(enhance,300);setTimeout(enhance,1000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

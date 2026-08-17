"use strict";
(()=>{
  const LABELS={
    "maze-studio":{short:"MAZE",name:"Maze",tone:"maze"},
    "word-search-studio":{short:"WS",name:"Word Search",tone:"ws"},
    "coloring-studio":{short:"COL",name:"Coloring",tone:"coloring"},
    "complete-picture":{short:"CTP",name:"Complete Picture",tone:"ctp"},
    "tracing-studio":{short:"TR",name:"Tracing",tone:"tracing"},
    "matching-studio":{short:"MAT",name:"Matching",tone:"matching"},
    "dot-to-dot-studio":{short:"DOT",name:"Dot to Dot",tone:"dot"},
    "hidden-objects-studio":{short:"HO",name:"Hidden Objects",tone:"hidden"},
    "alphabet-studio":{short:"ABC",name:"Alphabet",tone:"alphabet"},
    "math-studio":{short:"MATH",name:"Math",tone:"math"},
    "logic-studio":{short:"LOG",name:"Logic",tone:"logic"},
    "intro-studio":{short:"INTRO",name:"Intro",tone:"intro"},
    "congratulations-studio":{short:"CONG",name:"Congratulations",tone:"ending"},
    "qr-studio":{short:"QR",name:"QR",tone:"ending"},
    "certificate-studio":{short:"CERT",name:"Certificate",tone:"ending"}
  };
  const STRUCTURAL=new Set(["intro-studio","congratulations-studio","qr-studio","certificate-studio"]);
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const moduleOf=p=>window.FenixPageSchema?.moduleOf?p&&FenixPageSchema.moduleOf(p):(p?.module||p?.recipe?.module||"unknown");
  const normalized=p=>window.FenixPageSchema?.normalize?FenixPageSchema.normalize(p):p;
  const isSolution=p=>Boolean(p?.solution?.available);
  let busy=false;

  function settingsSummary(page){
    const s=page?.recipe?.settings||{}, parts=[];
    if(page?.recipe?.seed!=null||page?.seed!=null)parts.push(`seed ${page.recipe?.seed??page.seed}`);
    const mod=moduleOf(page);
    if(mod==="word-search-studio"){
      if(s.cols&&s.rows)parts.push(`${s.cols}×${s.rows}`);
      if(s.wordCount)parts.push(`${s.wordCount} słów`);
      if(s.maxWordLength)parts.push(`max ${s.maxWordLength}`);
    }else if(mod==="maze-studio"){
      if(s.cols&&s.rows)parts.push(`${s.cols}×${s.rows}`);
      if(s.difficulty)parts.push(String(s.difficulty));
    }else if(mod==="coloring-studio"){
      if(s.assetScale)parts.push(`asset ${s.assetScale}%`);
    }else if(s.difficulty){parts.push(String(s.difficulty));}
    return parts.slice(0,4).join(" · ");
  }

  function ensureToolbar(project,pages){
    const section=$("#pagesProject"), list=$("#cartList");if(!section||!list)return;
    let toolbar=section.querySelector(".pages-ux-toolbar");
    if(!toolbar){
      toolbar=document.createElement("div");toolbar.className="pages-ux-toolbar";
      list.parentElement.insertBefore(toolbar,list);
    }
    const counts={};pages.forEach(p=>{const m=moduleOf(p);counts[m]=(counts[m]||0)+1});
    const activityCount=pages.filter(p=>!STRUCTURAL.has(moduleOf(p))).length;
    const solutions=pages.filter(isSolution).length;
    const chips=Object.entries(counts).map(([m,count])=>{const l=LABELS[m]||{short:m,name:m,tone:"other"};return `<span class="pages-ux-chip tone-${esc(l.tone)}"><b>${esc(l.short)}</b><strong>${count}</strong></span>`}).join("");
    toolbar.innerHTML=`<div class="pages-ux-overview"><div><span class="pages-ux-kicker">KONTROLA WORKFLOW</span><strong>${activityCount} aktywności</strong><small>${pages.length} stron zapisanych · ${solutions} z rozwiązaniem</small></div><div class="pages-ux-chips">${chips}</div></div><div class="pages-ux-help">Każda karta ma teraz numer globalny i numer w swoim Studio. <b>OSTATNIO DODANA</b> pokazuje najnowszy zapis.</div>`;
  }

  function enhance(){
    if(busy||!window.FenixCore)return;busy=true;
    try{
      const list=$("#cartList");if(!list)return;
      const project=FenixCore.getActiveProject?.();if(!project)return;
      const pages=(project.pages||[]).map(normalized);
      ensureToolbar(project,pages);
      const items=[...list.querySelectorAll(":scope > .cart-item")];
      if(!items.length)return;
      const moduleSeen={};
      const newestId=pages.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]?.id;
      items.forEach((item,index)=>{
        const page=pages[index];if(!page)return;
        const mod=moduleOf(page),label=LABELS[mod]||{short:mod.replace(/-studio$/,'').toUpperCase(),name:mod,tone:"other"};
        const local=moduleSeen[mod]=(moduleSeen[mod]||0)+1;
        item.classList.add("pages-ux-item",`tone-${label.tone}`);
        item.dataset.pageId=page.id||"";item.dataset.module=mod;item.dataset.moduleIndex=String(local);item.dataset.globalIndex=String(index+1);
        const left=item.firstElementChild, actions=item.lastElementChild;if(!left||!actions)return;
        let meta=left.querySelector(".pages-ux-meta");if(!meta){meta=document.createElement("div");meta.className="pages-ux-meta";left.prepend(meta)}
        meta.innerHTML=`<span class="pages-ux-module">${esc(label.short)} #${String(local).padStart(2,"0")}</span><span class="pages-ux-global">STRONA #${String(index+1).padStart(2,"0")}</span><span class="pages-ux-saved">✓ ZAPISANA</span>${page.id===newestId?'<span class="pages-ux-latest">OSTATNIO DODANA</span>':''}`;
        const summary=settingsSummary(page);let detail=left.querySelector(".pages-ux-detail");if(!detail){detail=document.createElement("div");detail.className="pages-ux-detail";left.appendChild(detail)}detail.textContent=summary||`${label.name} · ustawienia zapisane w projekcie`;
        if(item.dataset.pageHref&&!actions.querySelector(".pages-ux-edit")){
          const edit=document.createElement("a");edit.className="btn pages-ux-edit";edit.href=item.dataset.pageHref;edit.textContent="Edytuj";actions.prepend(edit);
        }
      });
    }finally{busy=false}
  }

  function boot(){
    const list=$("#cartList");if(!list)return;
    const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(list,{childList:true,subtree:false});
    window.addEventListener("fenix-state-change",()=>requestAnimationFrame(enhance));
    requestAnimationFrame(enhance);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

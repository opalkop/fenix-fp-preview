"use strict";
(()=>{
 const $=s=>document.querySelector(s),results=$("#results"),headline=$("#headline"),totals=$("#totals");
 function group(title){const el=document.createElement("section");el.className="group";el.innerHTML=`<h3>${title}</h3>`;results.appendChild(el);return el}
 function row(parent,name,fn){const el=document.createElement("div");el.className="test";try{const detail=fn();el.innerHTML=`<span>${name}</span><strong class="ok">PASS${detail?` · ${detail}`:""}</strong>`;return true}catch(error){console.error(name,error);el.innerHTML=`<span>${name}<br><code>${String(error.message||error)}</code></span><strong class="fail">FAIL</strong>`;return false}finally{parent.appendChild(el)}}
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 function run(){
   results.innerHTML="";let passed=0,failed=0;const test=(parent,name,fn)=>row(parent,name,fn)?passed++:failed++;
   const registry=group("1. Rejestr modułów");
   test(registry,"Rejestr istnieje",()=>{assert(window.FenixModuleRegistry,"Brak FenixModuleRegistry")});
   test(registry,"12 unikalnych modułów",()=>{const all=FenixModuleRegistry.all(),slugs=all.map(x=>x.slug);assert(all.length===12,`Jest ${all.length}`);assert(new Set(slugs).size===slugs.length,"Powtarzające się slug-i");return `${all.length} modułów`});
   test(registry,"8 standardowych rendererów",()=>{const standard=FenixModuleRegistry.standard();assert(standard.length===8,`Jest ${standard.length}`);standard.forEach(module=>assert(FenixStandardRenderers.modules.includes(module.slug),`Brak renderera ${module.slug}`));return "wszystkie podpięte"});
   FenixModuleRegistry.all().forEach(module=>test(registry,`Typy bez duplikatów: ${module.name}`,()=>{const ids=module.types.map(type=>type[0]);assert(new Set(ids).size===ids.length,"Powtórzony typ ćwiczenia");return `${ids.length} typów`}));

   const schema=group("2. Schemat strony v3");
   test(schema,"Normalizacja starej strony",()=>{const page=FenixPageSchema.normalize({id:"legacy-1",module:"math-studio",title:"Test",seed:"abc",settings:{type:"operations"},imageData:"data:image/png;base64,AA==",hasSolution:true});assert(page.schemaVersion===3,"Zła wersja");assert(page.id==="legacy-1","Zmienił się identyfikator");assert(page.recipe.settings.type==="operations","Zginęły ustawienia");assert(page.preview.imageData,"Zginął podgląd");return "schemaVersion 3"});
   test(schema,"moduleOf()",()=>{assert(FenixPageSchema.moduleOf({module:"maze-studio"})==="maze-studio","Zły moduł")});
   test(schema,"hasSolution() dla Maze",()=>{assert(FenixPageSchema.hasSolution({module:"maze-studio"})===true,"Maze bez rozwiązania")});
   test(schema,"Walidacja strony v3",()=>{const page=FenixPageSchema.normalize({id:"x",module:"logic-studio",recipe:{module:"logic-studio"}}),v=FenixPageSchema.validate(page);assert(v.ok,v.errors.join(", "))});

   const validator=group("3. Walidator projektu");
   test(validator,"Projekt produkcyjny przechodzi podstawowe reguły",()=>{const pages=Array.from({length:24},(_,i)=>FenixPageSchema.normalize({id:`p${i}`,module:i%3===0?"math-studio":i%3===1?"logic-studio":"maze-studio",validation:{kdp:{status:"ok"}},solution:{available:true}}));const result=FenixProjectValidator.validate({format:"8.5x11",pages});assert(result.status!=="error","Walidator zwrócił error");assert(result.score>=80,`Wynik ${result.score}`);return `${result.score}%`});
   test(validator,"Nieparzysta liczba stron daje ostrzeżenie",()=>{const result=FenixProjectValidator.validate({format:"8.5x11",pages:Array.from({length:25},(_,i)=>FenixPageSchema.normalize({id:`q${i}`,module:"math-studio"}))});assert(result.checks.find(x=>x.id==="even-pages")?.status==="warning","Brak ostrzeżenia")});

   const renderers=group("4. Standardowe Studia — każdy typ");
   const previews=document.createElement("div");previews.className="preview-grid";renderers.appendChild(previews);
   for(const module of FenixModuleRegistry.standard()){
     for(const [type] of module.types){
       test(renderers,`${module.slug} / ${type}`,()=>{
         const rendered=FenixStandardRenderers.render(module.slug,{type,title:module.name,instructions:"Test activity.",difficulty:"medium",age:"5-7",range:20,extra:"A"},`smoke-${module.slug}-${type}`,0);
         assert(rendered.pageCanvas?.width===850&&rendered.pageCanvas?.height===1100,"Niepoprawny canvas");
         const mini=rendered.pageCanvas.cloneNode();mini.width=170;mini.height=220;mini.getContext("2d").drawImage(rendered.pageCanvas,0,0,170,220);previews.appendChild(mini);
         if(rendered.hasSolution)assert(rendered.solutionCanvas,"Deklarowane rozwiązanie bez canvasa");
         return rendered.hasSolution?"+ solution":"page";
       });
     }
   }

   const maze=group("5. Maze Core");
   test(maze,"Deterministyczność tego samego seeda",()=>{const a=FenixMaze.build(18,24,12345),b=FenixMaze.build(18,24,12345);assert(JSON.stringify(a)===JSON.stringify(b),"Ten sam seed daje inny labirynt");return "deterministyczny"});
   test(maze,"Rozwiązanie prowadzi od startu do mety",()=>{const m=FenixMaze.build(18,24,9876),path=FenixMaze.solve(m);assert(path.length>1,"Brak ścieżki");assert(path[0][0]===m.start.x&&path[0][1]===m.start.y,"Zły start");const end=path[path.length-1];assert(end[0]===m.end.x&&end[1]===m.end.y,"Zła meta");return `${path.length} pól`});
   test(maze,"Renderer ćwiczenia i rozwiązania",()=>{const page=FenixPageSchema.normalize({id:"maze",module:"maze-studio",title:"Find the Way!",recipe:{module:"maze-studio",seed:42,settings:{cols:18,rows:24,theme:"classic",endpointMode:"random"}}});const a=FenixMaze.render(page,{solution:false}),b=FenixMaze.render(page,{solution:true});assert(a.canvas.width===850&&a.canvas.height===1100,"Zły canvas");assert(JSON.stringify(a.endpoints)===JSON.stringify(b.endpoints),"Ćwiczenie i rozwiązanie mają inne punkty");return "spójny"});

   const intro=group("6. Intro Studio");
   test(intro,"Sześć typów stron Intro",()=>{assert(FenixIntroRenderer.PAGE_TYPES.length===6,"Nieprawidłowa liczba paneli");return "6 paneli"});
   test(intro,"Renderer odtwarza recepturę strony",()=>{const page=FenixPageSchema.normalize({module:"intro-studio",title:"Welcome!",recipe:{module:"intro-studio",settings:{pageType:"welcome",title:"Welcome!",body:"Final PDF text",footer:"Begin!",style:"framed",alignment:"center"}}}),canvas=FenixIntroRenderer.render(page,{width:850,height:1100});assert(canvas.width===850&&canvas.height===1100,"Niepoprawny canvas");return "850 × 1100"});

   headline.textContent=failed?`Diagnostyka: ${failed} błędów`:"Diagnostyka: wszystkie testy zaliczone";
   headline.className=failed?"fail":"ok";totals.textContent=`PASS: ${passed} · FAIL: ${failed}`;
 }
 $("#run").onclick=run;run();
})();

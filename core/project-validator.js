"use strict";

window.FenixProjectValidator=Object.freeze((()=>{
  const MIN_PAGES=24,allowedFormats=new Set(["8.5x11","6x9","a4"]),isBlank=page=>(window.FenixPageSchema?.moduleOf?window.FenixPageSchema.moduleOf(page):page?.module)==="blank-page";
  const pageModule=page=>window.FenixPageSchema?.moduleOf?window.FenixPageSchema.moduleOf(page):(page?.module||page?.recipe?.module||"");
  const solutionAvailable=page=>window.FenixPageSchema?.hasSolution?window.FenixPageSchema.hasSolution(page):Boolean(page?.solution?.available||page?.solutionImageData||page?.hasSolution);
  const validationStatus=page=>isBlank(page)?"ok":window.FenixPageSchema?.kdpStatus?window.FenixPageSchema.kdpStatus(page):(page?.validation?.kdp?.status||page?.kdpValidation?.status||"unknown");
  function validate(project={}){
    const pages=Array.isArray(project.pages)?project.pages:[],activityPages=pages.filter(page=>!isBlank(page)),modules=new Set(activityPages.map(pageModule).filter(module=>module&&module!=="unknown-module")),checks=[],add=(id,label,status,message)=>checks.push({id,label,status,message});
    add("format","Format książki",allowedFormats.has(project.format)?"ok":"error",allowedFormats.has(project.format)?`Format: ${project.format}.`:"Nieobsługiwany format projektu.");
    add("page-count","Minimalna liczba stron",pages.length>=MIN_PAGES?"ok":pages.length?"warning":"error",pages.length>=MIN_PAGES?`${pages.length} stron.`:`Dodaj co najmniej ${MIN_PAGES-pages.length} stron.`);
    add("even-pages","Parzysta liczba stron",pages.length>0&&pages.length%2===0?"ok":"warning",pages.length%2===0?"Liczba stron jest parzysta.":"Liczba stron jest nieparzysta; dodaj pustą stronę w Book Builderze.");
    add("module-mix","Różnorodność aktywności",modules.size>=3?"ok":modules.size?"warning":"error",modules.size>=3?`Wykorzystano ${modules.size} moduły.`:"Dla zróżnicowanej książki użyj co najmniej 3 modułów.");
    const invalid=pages.filter(page=>validationStatus(page)==="error").length,warnings=pages.filter(page=>validationStatus(page)==="warning").length,unknown=pages.filter(page=>validationStatus(page)==="unknown").length;
    add("kdp","Walidacja KDP",invalid?"error":warnings||unknown?"warning":"ok",invalid?`${invalid} stron ma błędy KDP.`:warnings?`${warnings} stron ma ostrzeżenia KDP.`:unknown?`${unknown} stron nie zostało jeszcze zwalidowanych.`:"Wszystkie strony mają status KDP OK.");
    const solutionModules=new Set(activityPages.filter(solutionAvailable).map(pageModule).filter(Boolean));
    add("solutions","Rozwiązania",solutionModules.size||!activityPages.length?"ok":"warning",solutionModules.size?`Rozwiązania dostępne dla ${solutionModules.size} typów aktywności.`:"Brak wykrytych rozwiązań.");
    const weights={ok:1,warning:.45,error:0},score=Math.round(checks.reduce((sum,check)=>sum+weights[check.status],0)/checks.length*100),status=checks.some(check=>check.status==="error")?"error":checks.some(check=>check.status==="warning")?"warning":"ok";
    return{status,score,checks,pageCount:pages.length,activityPageCount:activityPages.length,moduleCount:modules.size,solutionCount:activityPages.filter(solutionAvailable).length};
  }
  return{validate,MIN_PAGES};
})());

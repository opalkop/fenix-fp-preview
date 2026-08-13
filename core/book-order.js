"use strict";

window.FenixBookOrder=Object.freeze((()=>{
  const INTRO_ORDER=Object.freeze({
    welcome:100,
    mission:110,
    "mission-tracker":120,
    "how-to-use":130,
    rules:140,
    skills:150
  });
  const CLOSING_ORDER=Object.freeze({
    "congratulations-studio":800,
    "certificate-studio":810,
    "qr-studio":820,
    "closing-studio":830,
    "solutions-studio":900
  });
  const moduleOf=page=>String(page?.module||page?.recipe?.module||"");
  function rank(page){
    const module=moduleOf(page);
    if(module==="intro-studio")return INTRO_ORDER[page?.recipe?.settings?.pageType]??190;
    if(Object.hasOwn(CLOSING_ORDER,module))return CLOSING_ORDER[module];
    return module==="blank-page"?600:500;
  }
  function sort(pages=[]){
    return pages.map((page,index)=>({page,index,rank:rank(page)})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.page);
  }
  function section(page){
    const value=rank(page);
    if(value<200)return"Wprowadzenie";
    if(value<700)return value===600?"Strona techniczna":"Ćwiczenia";
    if(value<900)return"Zakończenie";
    return"Rozwiązania";
  }
  return{INTRO_ORDER,CLOSING_ORDER,rank,sort,section};
})());

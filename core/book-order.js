"use strict";

window.FenixBookOrder=Object.freeze((()=>{
  const INTRO_ORDER=Object.freeze({welcome:100,mission:110,"mission-tracker":120,"how-to-use":130,rules:140,skills:150});
  const CLOSING_ORDER=Object.freeze({"congratulations-studio":800,"qr-studio":810,"certificate-studio":820,"closing-studio":830,"solutions-studio":900});
  const moduleOf=page=>String(page?.module||page?.recipe?.module||"");
  const isBlank=page=>moduleOf(page)==="blank-page"||Boolean(page?._blank);
  function rank(page){const module=moduleOf(page);if(module==="intro-studio")return INTRO_ORDER[page?.recipe?.settings?.pageType]??190;if(Object.hasOwn(CLOSING_ORDER,module))return CLOSING_ORDER[module];return isBlank(page)?600:500}
  function sort(pages=[]){return pages.map((page,index)=>({page,index,rank:rank(page)})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.page)}
  const isClosing=page=>{const value=rank(page);return value>=800&&value<900};
  function parityBlank(){return{_blank:true,_autoParity:true,id:`certificate-parity-blank-${Date.now()}`,schemaVersion:3,module:"blank-page",title:"Pusta strona przy certyfikacie",recipe:{module:"blank-page",seed:null,title:"Pusta strona przy certyfikacie",settings:{automatic:true,reason:"certificate-blank-back"},content:{},meta:{},renderState:{}},solution:{available:false,imageData:null}}}
  function closingWithManualBlanks(source,closingCore){
    if(!closingCore.length)return[];
    const sourceClean=source.filter(page=>!page?._autoParity),closingIds=new Set(closingCore.map(page=>page.id).filter(Boolean));
    const first=sourceClean.findIndex(page=>isClosing(page)),lastBase=(()=>{let n=-1;sourceClean.forEach((page,i)=>{if(isClosing(page))n=i});return n})();
    if(first<0)return closingCore;
    let last=lastBase;while(last+1<sourceClean.length&&isBlank(sourceClean[last+1]))last++;
    const segment=sourceClean.slice(first,last+1).filter(page=>isClosing(page)||isBlank(page));
    const present=new Set(segment.filter(isClosing).map(page=>page.id).filter(Boolean));
    for(const page of closingCore)if(!page.id||!present.has(page.id))segment.push(page);
    segment.sort((a,b)=>{
      if(isBlank(a)||isBlank(b))return 0;
      return rank(a)-rank(b);
    });
    return segment;
  }
  function compose(pages=[],options={}){
    const source=pages.filter(page=>!page?._autoParity),nonBlank=source.filter(page=>!isBlank(page)),orderedNonBlank=sort(nonBlank),body=orderedNonBlank.filter(page=>!isClosing(page)),closingCore=orderedNonBlank.filter(isClosing),solutionPageCount=Math.max(0,Number(options.solutionPageCount)||0);
    const closing=closingWithManualBlanks(source,closingCore);
    const usedClosingBlanks=new Set(closing.filter(isBlank));
    const technicalBlanks=source.filter(page=>isBlank(page)&&!usedClosingBlanks.has(page));
    body.push(...technicalBlanks);
    const certIndex=closing.findIndex(page=>moduleOf(page)==="certificate-studio");
    if(certIndex>=0){
      const hasBlankBefore=certIndex>0&&isBlank(closing[certIndex-1]);
      if(!hasBlankBefore)closing.splice(certIndex,0,parityBlank());
    }
    return[...body,...closing];
  }
  function section(page){const value=rank(page);if(value<200)return"Wprowadzenie";if(isBlank(page))return"Strona techniczna";if(value<700)return"Ćwiczenia";if(value<900)return"Zakończenie";return"Rozwiązania"}
  return{INTRO_ORDER,CLOSING_ORDER,rank,sort,compose,section,isClosing};
})());

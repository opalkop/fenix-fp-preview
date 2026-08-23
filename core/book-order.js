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
    "qr-studio":810,
    "certificate-studio":820,
    "closing-studio":830,
    "solutions-studio":900
  });
  const moduleOf=page=>String(page?.module||page?.recipe?.module||"");
  const rawRank=page=>{
    const module=moduleOf(page);
    if(module==="intro-studio")return INTRO_ORDER[page?.recipe?.settings?.pageType]??190;
    if(Object.hasOwn(CLOSING_ORDER,module))return CLOSING_ORDER[module];
    return module==="blank-page"?600:500;
  };
  function rank(page){return Number.isFinite(page?._bookRank)?page._bookRank:rawRank(page)}

  function blankRank(pages,index){
    let prev=null,next=null;
    for(let i=index-1;i>=0;i--){if(moduleOf(pages[i])!=="blank-page"){prev=rawRank(pages[i]);break}}
    for(let i=index+1;i<pages.length;i++){if(moduleOf(pages[i])!=="blank-page"){next=rawRank(pages[i]);break}}

    // A technical blank manually placed next to the ending must stay there.
    // This is crucial because Solutions are injected before the closing block.
    const prevClosing=Number.isFinite(prev)&&prev>=800&&prev<900;
    const nextClosing=Number.isFinite(next)&&next>=800&&next<900;
    if(prevClosing&&nextClosing)return(prev+next)/2;
    if(nextClosing)return next-.5;
    if(prevClosing)return prev+.5;
    return 600;
  }

  function sort(pages=[]){
    const prepared=pages.map((page,index)=>{
      if(moduleOf(page)!=="blank-page"||page?._autoParity)return{page,index,rank:rawRank(page)};
      const contextual=blankRank(pages,index);
      return{page:{...page,_bookRank:contextual},index,rank:contextual};
    });
    return prepared.sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.page);
  }
  const isClosing=page=>{const value=rank(page);return value>=800&&value<900};
  function parityBlank(){
    return{_blank:true,_autoParity:true,_bookRank:819.5,id:"certificate-parity-blank",schemaVersion:3,module:"blank-page",title:"Pusta strona przed certyfikatem",recipe:{module:"blank-page",seed:null,title:"Pusta strona przed certyfikatem",settings:{automatic:true,reason:"certificate-even-page"},content:{},meta:{},renderState:{}},solution:{available:false,imageData:null}};
  }
  function compose(pages=[],options={}){
    const ordered=sort(pages.filter(page=>!page?._autoParity)),body=ordered.filter(page=>!isClosing(page)),closing=ordered.filter(isClosing),solutionPageCount=Math.max(0,Number(options.solutionPageCount)||0),certificateIndex=closing.findIndex(page=>moduleOf(page)==="certificate-studio");
    if(certificateIndex>=0){
      const hasBlankImmediatelyBefore=certificateIndex>0&&moduleOf(closing[certificateIndex-1])==="blank-page";
      if(!hasBlankImmediatelyBefore){
        const certificatePage=body.length+solutionPageCount+certificateIndex+1;
        if(certificatePage%2===1)closing.splice(certificateIndex,0,parityBlank());
      }
    }
    return[...body,...closing];
  }
  function section(page){
    const value=rank(page);
    if(value<200)return"Wprowadzenie";
    if(value<700)return value===600?"Strona techniczna":"Ćwiczenia";
    if(value<900)return moduleOf(page)==="blank-page"?"Strona techniczna":"Zakończenie";
    return"Rozwiązania";
  }
  return{INTRO_ORDER,CLOSING_ORDER,rank,sort,compose,section,isClosing};
})());
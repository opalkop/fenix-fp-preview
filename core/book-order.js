"use strict";

window.FenixBookOrder=Object.freeze((()=>{
  const INTRO_ORDER=Object.freeze({welcome:100,mission:110,"mission-tracker":120,"how-to-use":130,rules:140,skills:150});
  const CLOSING_ORDER=Object.freeze({"congratulations-studio":800,"qr-studio":810,"certificate-studio":820,"closing-studio":830,"solutions-studio":900});

  // Ocean Fantasy Adventure 4-8 — approved narrative/progressive order.
  // Only these exact page IDs are affected. Other projects keep their existing activity order.
  const OCEAN_FANTASY_ACTIVITY_ORDER=Object.freeze({
    "16ccc86b-47c8-461d-9577-3e6e762f3548":1,
    "9236dbab-c783-4ced-821a-224d8749f943":2,
    "b8fc3289-7252-4854-96fb-5bb16044b4bb":3,
    "d24eb0ad-c790-4e3b-bcbb-a049ef457580":4,
    "b4adee58-33b6-4fa1-837b-42e58b0ea204":5,
    "6a66dcdc-87a4-43f2-b238-2c4fe490e9b0":6,
    "4e1dd2bb-6954-4d74-87f6-82a768f79956":7,
    "113fe4c9-d566-4198-a483-cae5f7a2fa5d":8,
    "ccf8a74f-a9ca-403f-b54c-3999f874c0da":9,
    "a5f491db-28fa-447c-89a4-8ffaae2c289f":10,
    "71f1a9e2-91bc-447a-b4d1-40a294bcf6ee":11,
    "163dbdff-0f1d-4f35-b323-20fd1051d5a8":12,
    "4fc85ca9-7435-4a98-8a48-f49eb516a8db":13,
    "6b4a9df5-3c82-469c-87fc-219f5ca79692":14,
    "98471264-8c65-4537-9e0f-4cd711a381c3":15,
    "261af9f8-e3cc-4028-959e-7a7a011b8f35":16,
    "72a52808-bc61-4cff-94c0-7af898a5a853":17,
    "8393a6e0-d0f8-4512-84df-93dad4b603f9":18,
    "f13c195b-f117-4321-b4ed-7b2c4786b4c8":19,
    "a141c1c1-b0e2-4f9b-863e-8f67c3b341bd":20,
    "5788e82e-240b-4785-b98c-eadc7087cd08":21,
    "039bcd96-653e-4033-9e5b-c79234e83bcf":22,
    "c9b365c0-7487-4567-ba12-428250e99d51":23,
    "8c235cdd-4510-46a3-8a53-2ce32d5eaee6":24,
    "97cea195-36c5-43dc-b933-565b920e668f":25,
    "45d2faa0-077a-427e-82e4-7638e929126b":26,
    "01c8b2a5-1e19-4591-801d-7c89504757a3":27,
    "91cd26f0-b582-483f-92e1-0db3851e7820":28,
    "e70e2565-14ac-4985-b35f-1b1d13a4ddef":29,
    "fb7d7bcd-9155-4156-9f40-98af52fdf949":30,
    "2f40d5ca-2846-4c64-8d6d-e404fc508ddb":31,
    "72d17c44-76b5-4d19-a80b-cde85169e9e0":32,
    "fa660aba-77ef-4995-9d5f-008de7bad7fe":33,
    "304c2ee0-f2b8-446c-9565-95a63b190f58":34,
    "d986e653-b27f-4d16-80de-95a206fab7da":35,
    "c58ee29f-68f3-4af9-bec3-f24bb65957f3":36
  });

  const moduleOf=page=>String(page?.module||page?.recipe?.module||"");
  const isBlank=page=>moduleOf(page)==="blank-page"||Boolean(page?._blank);
  const narrativeActivityIndex=page=>OCEAN_FANTASY_ACTIVITY_ORDER[String(page?.id||"")]||0;

  function rank(page){
    const module=moduleOf(page);
    if(module==="intro-studio")return INTRO_ORDER[page?.recipe?.settings?.pageType]??190;
    if(Object.hasOwn(CLOSING_ORDER,module))return CLOSING_ORDER[module];
    if(isBlank(page))return 600;
    const narrativeIndex=narrativeActivityIndex(page);
    if(narrativeIndex)return 500+narrativeIndex;
    return 590;
  }

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
      const certificatePage=body.length+solutionPageCount+certIndex+1;
      if(certificatePage%2!==0)closing.splice(certIndex,0,parityBlank());
    }
    return[...body,...closing];
  }
  function section(page){const value=rank(page);if(value<200)return"Wprowadzenie";if(isBlank(page))return"Strona techniczna";if(value<700)return"Ćwiczenia";if(value<900)return"Zakończenie";return"Rozwiązania"}
  return{INTRO_ORDER,CLOSING_ORDER,OCEAN_FANTASY_ACTIVITY_ORDER,rank,sort,compose,section,isClosing};
})());

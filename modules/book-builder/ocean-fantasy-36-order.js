"use strict";

(()=>{
  const VERSION="ocean-fantasy-36-v4";

  // Narrative order for the 36 existing Ocean Fantasy activity pages.
  // Detection is based on the page IDs themselves, so synced/imported copies
  // of the same project are supported even when project.id changes.
  const ORDER=Object.freeze([
    "16ccc86b-47c8-461d-9577-3e6e762f3548",
    "9236dbab-c783-4ced-821a-224d8749f943",
    "b8fc3289-7252-4854-96fb-5bb16044b4bb",
    "d24eb0ad-c790-4e3b-bcbb-a049ef457580",
    "b4adee58-33b6-4fa1-837b-42e58b0ea204",
    "6a66dcdc-87a4-43f2-b238-2c4fe490e9b0",

    "4e1dd2bb-6954-4d74-87f6-82a768f79956",
    "113fe4c9-d566-4198-a483-cae5f7a2fa5d",
    "ccf8a74f-a9ca-403f-b54c-3999f874c0da",
    "a5f491db-28fa-447c-89a4-8ffaae2c289f",
    "71f1a9e2-91bc-447a-b4d1-40a294bcf6ee",
    "163dbdff-0f1d-4f35-b323-20fd1051d5a8",

    "4fc85ca9-7435-4a98-8a48-f49eb516a8db",
    "6b4a9df5-3c82-469c-87fc-219f5ca79692",
    "98471264-8c65-4537-9e0f-4cd711a381c3",
    "261af9f8-e3cc-4028-959e-7a7a011b8f35",
    "72a52808-bc61-4cff-94c0-7af898a5a853",
    "8393a6e0-d0f8-4512-84df-93dad4b603f9",

    "f13c195b-f117-4321-b4ed-7b2c4786b4c8",
    "a141c1c1-b0e2-4f9b-863e-8f67c3b341bd",
    "5788e82e-240b-4785-b98c-eadc7087cd08",
    "039bcd96-653e-4033-9e5b-c79234e83bcf",
    "c9b365c0-7487-4567-ba12-428250e99d51",
    "8c235cdd-4510-46a3-8a53-2ce32d5eaee6",

    "97cea195-36c5-43dc-b933-565b920e668f",
    "45d2faa0-077a-427e-82e4-7638e929126b",
    "01c8b2a5-1e19-4591-801d-7c89504757a3",
    "91cd26f0-b582-483f-92e1-0db3851e7820",
    "e70e2565-14ac-4985-b35f-1b1d13a4ddef",
    "fb7d7bcd-9155-4156-9f40-98af52fdf949",

    "2f40d5ca-2846-4c64-8d6d-e404fc508ddb",
    "72d17c44-76b5-4d19-a80b-cde85169e9e0",
    "fa660aba-77ef-4995-9d5f-008de7bad7fe",
    "304c2ee0-f2b8-446c-9565-95a63b190f58",
    "d986e653-b27f-4d16-80de-95a206fab7da",
    "c58ee29f-68f3-4af9-bec3-f24bb65957f3"
  ]);

  const sameOrder=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);

  function buildReorderedPages(pages){
    if(ORDER.length!==36||new Set(ORDER).size!==36){
      return{ok:false,reason:"invalid-plan",pages};
    }

    const byId=new Map((pages||[]).map(page=>[String(page?.id||""),page]));
    const missing=ORDER.filter(id=>!byId.has(id));
    if(missing.length)return{ok:false,reason:"missing-pages",missing,pages};

    const targetIds=new Set(ORDER);
    const currentTargetOrder=(pages||[])
      .filter(page=>targetIds.has(String(page?.id||"")))
      .map(page=>String(page.id));

    if(currentTargetOrder.length!==36)return{ok:false,reason:"target-count",pages};
    if(sameOrder(currentTargetOrder,ORDER))return{ok:true,changed:false,pages};

    let cursor=0;
    const orderedTargets=ORDER.map(id=>byId.get(id));
    const next=(pages||[]).map(page=>{
      const id=String(page?.id||"");
      return targetIds.has(id)?orderedTargets[cursor++]:page;
    });

    return{ok:true,changed:true,pages:next,currentTargetOrder};
  }

  function apply(){
    if(!window.FenixCore)return{applied:false,reason:"no-core"};
    const project=FenixCore.getActiveProject();
    if(!project)return{applied:false,reason:"no-project"};

    const result=buildReorderedPages(project.pages||[]);
    if(!result.ok){
      console.info("FENIX Ocean Fantasy order v4 not applicable:",result.reason);
      return{applied:false,...result};
    }

    const migrationKey=`fenix-page-order-migration:${project.id}:${VERSION}`;
    const backupKey=`fenix-page-order-backup:${project.id}:${VERSION}`;

    if(!result.changed){
      localStorage.setItem(migrationKey,`already-correct@${new Date().toISOString()}`);
      return{applied:false,reason:"already-correct",matched:true,count:36};
    }

    try{
      if(!localStorage.getItem(backupKey)){
        localStorage.setItem(backupKey,JSON.stringify((project.pages||[]).map(page=>page?.id||null)));
      }
      FenixCore.setCart(result.pages);
      localStorage.setItem(migrationKey,`applied@${new Date().toISOString()}`);
      window.dispatchEvent(new CustomEvent("fenix-ocean-fantasy-order-applied",{
        detail:{projectId:project.id,count:36,version:VERSION}
      }));
      return{applied:true,matched:true,count:36,projectId:project.id};
    }catch(error){
      console.error("FENIX Ocean Fantasy order v4 failed",error);
      return{applied:false,reason:"write-failed",error:String(error?.message||error)};
    }
  }

  async function run(){
    try{
      if(window.FenixCore?.ready)await FenixCore.ready;
      const result=apply();
      if(!result.matched&&!result.applied)return;
      await new Promise(resolve=>setTimeout(resolve,160));
      document.querySelector("#reloadCart")?.click();
      const summary=document.querySelector("#cartSummary");
      if(summary&&result.applied){
        summary.textContent="Ułożono i zapisano 36 aktywności Ocean Fantasy według planu fabularnego v4.";
      }
    }catch(error){
      console.error("FENIX Ocean Fantasy order v4 bootstrap failed",error);
    }
  }

  window.FenixOceanFantasyOrderV4=Object.freeze({VERSION,ORDER:[...ORDER],buildReorderedPages,apply});
  void run();
})();

"use strict";

(()=>{
  if(typeof FenixCore==="undefined")return;

  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const libraryRefOf=asset=>String(asset?.libraryRef||asset?.meta?.libraryRef||"").trim();

  function normalizeLegacyOcean(){
    const assets=FenixCore.listLibraryAssets({pack:"Ocean"});
    let updated=0;
    for(const asset of assets){
      const patch={
        pack:"Ocean",
        source:"fenix-library",
        name:String(asset.name||asset.filename||"Asset"),
        filename:String(asset.filename||asset.name||"Asset"),
        meta:{...(asset.meta||{}),pack:"Ocean",legacyMigrated:true}
      };
      const result=FenixCore.updateLibraryAsset(asset.id,patch);
      if(result)updated++;
    }
    return{pack:"Ocean",updated,total:assets.length};
  }

  async function materializeLinkedCopies(libraryId){
    const source=FenixCore.getAssetLibrary()?.[libraryId];
    if(!source)return{materialized:0,projects:[]};
    const touched=[];
    let materialized=0;
    for(const project of FenixCore.getProjects()){
      const assets=clone(project.assets||{});
      let changed=false;
      for(const [assetId,asset] of Object.entries(assets)){
        if(libraryRefOf(asset)!==libraryId)continue;
        const meta={...(asset.meta||{})};
        delete meta.libraryRef;
        assets[assetId]={
          ...asset,
          dataUrl:asset.dataUrl||source.dataUrl||"",
          mime:asset.mime||source.mime||"image/png",
          width:asset.width||source.width||0,
          height:asset.height||source.height||0,
          sizeBytes:asset.sizeBytes||source.sizeBytes||0,
          aspectRatio:asset.aspectRatio??source.aspectRatio??null,
          libraryRef:"",
          source:"project-local",
          meta:{...meta,detachedFromLibrary:true,detachedLibraryId:libraryId}
        };
        changed=true;
        materialized++;
      }
      if(changed){
        FenixCore.updateProject(project.id,{assets});
        touched.push(project.id);
      }
    }
    await FenixCore.flushStorage();
    return{materialized,projects:touched};
  }

  async function removeLibraryAssetSafely(id){
    const library=FenixCore.getAssetLibrary();
    const source=library?.[id];
    if(!source)return{removed:false,reason:"missing"};

    const pageUsage=FenixCore.libraryPageUsage(id);
    let preserved={materialized:0,projects:[]};
    if(pageUsage.length)preserved=await materializeLinkedCopies(id);

    const result=FenixCore.removeLibraryAsset(id,{force:true});
    await FenixCore.flushStorage();
    return{...(result||{removed:false}),preserved,pageUsage};
  }

  async function runStartupMigration(){
    await FenixCore.ready;
    const result=normalizeLegacyOcean();
    await FenixCore.flushStorage();
    window.dispatchEvent(new CustomEvent("fenix-legacy-library-migrated",{detail:result}));
    return result;
  }

  window.FenixAssetLibraryCompat=Object.freeze({
    normalizeLegacyOcean,
    materializeLinkedCopies,
    removeLibraryAssetSafely,
    runStartupMigration
  });

  runStartupMigration().catch(error=>console.error("FENIX legacy asset library migration",error));
})();

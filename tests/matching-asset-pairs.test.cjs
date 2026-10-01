"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const {chromium}=require("playwright");

const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return}
    res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html");
    res.end(data);
  });
});

const coreMock=`
window.FenixCore=(()=>{
  const svg=name=>'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="8" y="8" width="84" height="84" fill="white" stroke="black" stroke-width="6"/><text x="50" y="58" text-anchor="middle" font-size="22">'+name+'</text></svg>');
  const assets=Array.from({length:12},(_,index)=>({id:'asset-'+(index+1),name:'Asset '+(index+1),filename:'asset-'+(index+1)+'.svg',mime:'image/svg+xml',dataUrl:svg('A'+(index+1)),sizeBytes:100,tags:['content']}));
  const read=()=>JSON.parse(localStorage.getItem('matchingSmokeCart')||'[]');
  const write=cart=>{localStorage.setItem('matchingSmokeCart',JSON.stringify(cart));window.dispatchEvent(new CustomEvent('fenix-state-change',{detail:{cart:true}}))};
  const project=()=>({id:'project',name:'Matching Smoke',format:'8.5x11',assets:Object.fromEntries(assets.map(asset=>[asset.id,asset]))});
  return{
    ready:Promise.resolve(),getActiveProjectId:()=>project().id,getActiveProject:project,getProjects:()=>[project()],
    listAssets:()=>assets,getAsset:id=>assets.find(asset=>asset.id===id),putAsset:asset=>{const copy={...asset,id:'asset-'+(assets.length+1)};assets.push(copy);return copy},
    getCart:read,addPage:data=>write([...read(),{...data,id:'matching-1'}]),updatePage:(id,data)=>{let found=false;write(read().map(page=>page.id===id?(found=true,{...data,id}):page));return found},removePage:id=>write(read().filter(page=>page.id!==id)),downloadCanvas:()=>{}
  };
})();`;

(async()=>{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.MATCHING_BROWSER?{executablePath:process.env.MATCHING_BROWSER}:{})});
  const errors=[];
  try{
    const page=await browser.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
    await page.route("**/core/fenix-core.js*",route=>route.fulfill({contentType:"text/javascript",body:coreMock}));
    await page.goto(`${base}/modules/matching-studio/index.html`);
    await page.locator("#mode").selectOption("asset-pairs");
    await page.locator("#pairCount").fill("5");
    await page.waitForFunction(()=>document.querySelectorAll("[data-pair-row]").length===5);
    assert.equal(await page.locator("[data-pair-row]").count(),5,"pairCount=5 powinien utworzyć 5 jawnych wierszy");

    for(let index=1;index<=10;index++)await page.locator(`[data-asset-id="asset-${index}"]`).first().click();
    await page.waitForFunction(()=>document.querySelector("#summaryPairs").textContent==="5/5"&&document.querySelector("#status").textContent.startsWith("Podgląd gotowy"));
    const visiblePairs=await page.locator("[data-pair-row]").evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll(".asset-pair-slot strong")].map(node=>node.textContent)));
    assert.deepEqual(visiblePairs,[
      ["Asset 1","Asset 2"],["Asset 3","Asset 4"],["Asset 5","Asset 6"],["Asset 7","Asset 8"],["Asset 9","Asset 10"]
    ]);
    assert.equal(await page.locator("#summaryPairs").innerText(),"5/5");
    assert.equal(await page.locator("#shuffle").inputValue(),"yes");

    await page.locator("#cart").click();
    const saved=await page.evaluate(()=>FenixCore.getCart()[0]);
    assert.equal(saved.recipe.settings.mode,"asset-pairs");
    assert.equal(saved.recipe.content.assetPairs.length,5);
    assert.deepEqual(saved.recipe.content.assetPairs.map(pair=>[pair.leftAssetRef,pair.rightAssetRef]),[
      ["asset-1","asset-2"],["asset-3","asset-4"],["asset-5","asset-6"],["asset-7","asset-8"],["asset-9","asset-10"]
    ]);
    assert.equal(saved.recipe.content.assetRefs.length,10);
    assert.equal(saved.solution.available,true);

    await page.addScriptTag({url:`${base}/modules/book-builder/production-renderers.js`});
    const bookRender=await page.evaluate(async()=>{
      const rendered=await FenixBookProductionRenderers.render(FenixCore.getCart()[0],{solution:true,quality:"preview"});
      return{width:rendered.width,height:rendered.height};
    });
    assert.deepEqual(bookRender,{width:850,height:1100},"Book Builder powinien renderować zapisane jawne pary i Solution");

    await page.goto(`${base}/modules/matching-studio/index.html?id=matching-1`);
    await page.waitForFunction(()=>document.querySelector("#summaryPairs")?.textContent==="5/5");
    const restored=await page.locator("[data-pair-row]").evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll(".asset-pair-slot strong")].map(node=>node.textContent)));
    assert.deepEqual(restored,visiblePairs,"Ponowne otwarcie musi zachować dokładnie te same pary");

    await page.evaluate(()=>{
      const modern=FenixCore.getCart()[0],legacy=structuredClone(modern);
      legacy.id="matching-legacy";
      delete legacy.recipe.content.assetPairs;
      localStorage.setItem("matchingSmokeCart",JSON.stringify([modern,legacy]));
    });
    await page.goto(`${base}/modules/matching-studio/index.html?id=matching-legacy`);
    await page.waitForFunction(()=>document.querySelector("#summaryPairs")?.textContent==="5/5");
    const legacyRestored=await page.locator("[data-pair-row]").evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll(".asset-pair-slot strong")].map(node=>node.textContent)));
    assert.deepEqual(legacyRestored,visiblePairs,"Starsza strona asset-pairs powinna zostać odtworzona z assetRefs");

    await page.locator("#pairCount").fill("3");
    assert.equal(await page.locator("[data-pair-row]").count(),3,"Zmniejszenie pairCount powinno usunąć wiersze");
    await page.locator("#pairCount").fill("8");
    assert.equal(await page.locator("[data-pair-row]").count(),8,"Zwiększenie pairCount powinno dodać wiersze");

    for(const mode of ["alphabet","identical","shadow","word-image","number-quantity","manual"]){
      await page.locator("#mode").selectOption(mode);
      await page.waitForTimeout(350);
      assert(!errors.length,`Tryb ${mode} zgłosił błąd JS: ${errors.join(" | ")}`);
    }

    await page.reload();
    await page.waitForFunction(()=>FenixCore.getCart().length===2);
    assert.equal(await page.evaluate(()=>FenixCore.getCart()[0].recipe.content.assetPairs.length),5,"Odświeżenie nie może usunąć zapisanej strony");
    assert.deepEqual(errors,[],`Błędy JS: ${errors.join(" | ")}`);
    console.log("PASS Matching asset-pairs: 5 jawnych par, render, shuffle-safe Solution, zapis, reopen, pairCount 3–8 i pozostałe tryby.");
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());

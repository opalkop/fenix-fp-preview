"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless: true, ...(process.env.MAZE_BROWSER ? {executablePath: process.env.MAZE_BROWSER} : {})});
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    for (const [file, flag] of [["maze-regression.html", "mazeRegression"], ["maze-save-regression.html", "mazeSaveRegression"], ["maze-asset-reload-regression.html", "mazeAssetReloadRegression"]]) {
      await page.goto(`${base}/tests/${file}`);
      await page.waitForFunction(key => document.documentElement.dataset[key], flag);
      assert.equal(await page.evaluate(key => document.documentElement.dataset[key], flag), "pass", await page.locator("#out").innerText());
      console.log(await page.locator("#out").innerText());
    }
    await page.route("**/core/fenix-core.js*", route => route.fulfill({contentType: "text/javascript", body: `
      window.FenixCore = (() => {
        const assets = Array.from({length:5}, (_,i) => ({id:'cp'+(i+1),libraryRef:'cp'+(i+1),name:'Checkpoint '+(i+1),pack:'Smoke',tags:['gameplay'],dataUrl:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="30"/></svg>')}));
        const read = () => JSON.parse(localStorage.getItem('smokeCart') || '[]');
        const write = cart => localStorage.setItem('smokeCart',JSON.stringify(cart));
        return {ready:Promise.resolve(),getCart:read,listAssets:()=>assets,findAssets:({tag})=>tag==='deco'?[]:assets,getAsset:id=>assets.find(a=>a.id===id),listLibraryAssets:()=>assets,listLibraryPacks:()=>['Smoke'],linkLibraryAsset:id=>assets.find(a=>a.id===id),addPage:p=>write([...read(),{...p,id:'smoke'}]),updatePage:(id,p)=>write(read().map(a=>a.id===id?{...p,id}:a))};
      })();` }));
    for (let count = 1; count <= 5; count++) {
      await page.goto(`${base}/modules/maze-studio/index.html`);
      await page.waitForFunction(() => document.querySelector('#status').textContent === 'Czeka na generowanie');
      await page.locator('#checkpointCount').fill(String(count));
      const expected = [];
      for (let i = 1; i <= count; i++) {
        await page.locator(`#checkpointAssetPack${i}`).selectOption('Smoke');
        const value = await page.locator(`#checkpointAsset${i} option`).evaluateAll((options, id) => options.find(o=>o.value.endsWith(id)).value, `cp${i}`);
        await page.locator(`#checkpointAsset${i}`).selectOption(value);
        await page.locator(`#checkpointScale${i}`).fill(String(60+i*20));
        expected.push({assetRef:`cp${i}`,scale:60+i*20});
      }
      await page.locator('#generateMaze').click();
      await page.locator('#saveCart').waitFor({state:'visible'});
      await page.waitForFunction(() => !document.querySelector('#saveCart').disabled);
      await page.locator('#saveCart').click();
      const saved = await page.evaluate(() => FenixCore.getCart().find(p=>p.id==='smoke').recipe.settings);
      assert.deepEqual(saved.checkpointAssets.map(({assetRef,scale})=>({assetRef,scale})),expected);
      assert.equal(saved.checkpointAssetRef,'cp1');
      assert.equal(saved.checkpointScale,80);
      await page.goto(`${base}/modules/maze-studio/index.html?id=smoke`);
      await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Wczytano zapisany labirynt'));
      await page.waitForTimeout(1000);
      for (let i = 1; i <= count; i++) {
        assert.equal(await page.locator(`#checkpointAsset${i}`).inputValue(),`cp${i}`);
        assert.equal(await page.locator(`#checkpointScale${i}`).inputValue(),String(60+i*20));
      }
      await page.locator('#checkpointScale1').fill('125');
      await page.locator('#checkpointAsset1').selectOption('cp5');
      await page.locator('#generateMaze').click();
      await page.waitForFunction(() => !document.querySelector('#saveCart').disabled);
      await page.locator('#saveCart').click();
      assert.equal(await page.evaluate(() => FenixCore.getCart().find(p=>p.id==='smoke').recipe.settings.checkpointAssets[0].scale),125);
      assert.equal(await page.evaluate(() => FenixCore.getCart().find(p=>p.id==='smoke').recipe.settings.checkpointAssets[0].assetRef),'cp5');
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Wczytano zapisany labirynt'));
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('#checkpointAsset1').inputValue(),'cp5');
      assert.equal(await page.locator('#checkpointScale1').inputValue(),'125');
      await page.evaluate(() => localStorage.removeItem('smokeCart'));
      console.log(`PASS Maze Studio ${count} checkpoints: generate, save, reopen assets/scales, edit and resave`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => server.close());

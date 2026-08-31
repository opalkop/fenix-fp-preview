"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");

function context(){
  const log={roundRects:0,strokeStyles:[],fillStyles:[],texts:[]};
  const ctx={
    log,font:"",fillStyle:"",lineWidth:0,textAlign:"",textBaseline:"",globalAlpha:1,filter:"none",
    save(){},restore(){},clearRect(){},fillRect(){},strokeRect(){},translate(){},rotate(){},drawImage(){},
    beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){log.fillStyles.push(this.fillStyle)},setLineDash(){},fillText(value){log.texts.push(String(value))},
    roundRect(){log.roundRects++},stroke(){log.strokeStyles.push(this.strokeStyle)}
  };
  Object.defineProperty(ctx,"strokeStyle",{get(){return this._strokeStyle||""},set(value){this._strokeStyle=value}});
  Object.defineProperty(ctx,"fillStyle",{get(){return this._fillStyle||""},set(value){this._fillStyle=value}});
  Object.defineProperty(ctx,"lineWidth",{get(){return this._lineWidth||0},set(value){this._lineWidth=value;log.lineWidths=(log.lineWidths||[]).concat(value)}});
  return ctx;
}
function canvas(){const ctx=context();return{width:0,height:0,ctx,getContext:()=>ctx}}
function load(file){
  const sandbox={window:{},document:{createElement:()=>canvas()},console,structuredClone};
  vm.runInNewContext(fs.readFileSync(path.join(root,file),"utf8"),sandbox,{filename:file});
  return sandbox.window;
}

const order=load("core/book-order.js").FenixBookOrder;
const pages=[
  {id:"maze",module:"maze-studio"},
  {id:"skills",module:"intro-studio",recipe:{settings:{pageType:"skills"}}},
  {id:"welcome",module:"intro-studio",recipe:{settings:{pageType:"welcome"}}},
  {id:"certificate",module:"certificate-studio"},
  {id:"mission",module:"intro-studio",recipe:{settings:{pageType:"mission"}}},
  {id:"word-search",module:"word-search-studio"}
];
assert.deepEqual(order.sort(pages).map(page=>page.id),["welcome","mission","skills","maze","word-search","certificate"]);
const composed=order.compose(pages,{solutionPageCount:0});
assert.equal(composed.length,pages.length,"Book Builder nie może sam zwiększać liczby stron projektu.");
assert.equal(composed.some(page=>page._autoParity),false,"Book Builder nie może tworzyć automatycznych stron spoza Listy stron projektu.");
assert.deepEqual(new Set(composed.map(page=>page.id)),new Set(pages.map(page=>page.id)),"Skład ma zawierać dokładnie identyfikatory stron zapisanych przez użytkownika.");

const maze=load("modules/maze-studio/maze-core.js").FenixMaze;
const mazeResult=maze.render({module:"maze-studio",recipe:{seed:7,title:"Maze",settings:{cols:8,rows:10,decorations:[{x:.08,y:.2,symbol:"★"}],assetCount:1}}},{solution:true,solutionKey:true,width:850,height:1100,canvas:canvas()});
assert.equal(mazeResult.decorations.length,0,"Rozwiązanie Maze nie może zawierać warstwy Deco.");
assert.ok(mazeResult.canvas.ctx.log.fillStyles.includes("#666"),"Rozwiązanie Maze powinno używać oddzielnych ciemnoszarych punktów.");
assert.ok(!mazeResult.canvas.ctx.log.strokeStyles.includes("#ef4444"),"Rozwiązanie Maze nie może używać czerwieni.");
assert.ok(!mazeResult.canvas.ctx.log.texts.includes("Maze"),"Klucz Maze nie powinien powtarzać tytułu ćwiczenia.");

const wordSearch=load("modules/word-search-studio/word-search-core.js").FenixWordSearch;
const wordCanvas=canvas();
const wordResult=wordSearch.render({module:"word-search-studio",title:"Words",recipe:{seed:3,settings:{cols:6,rows:6,wordCount:2,decoAssetRefs:["deco"],decoCount:4},content:{words:["MOON","STAR"]}}},{solution:true,solutionKey:true,width:850,height:1100,canvas:wordCanvas,assetImages:{deco:{width:20,height:20}}});
assert.equal(wordResult.decorations.length,0,"Rozwiązanie Word Search nie może zawierać warstwy Deco.");
assert.ok(wordCanvas.ctx.log.roundRects>=2,"Litery rozwiązania powinny być zaznaczone oddzielnymi polami.");
assert.ok(wordCanvas.ctx.log.strokeStyles.includes("#aaa"),"Pola Word Search powinny mieć subtelną jasnoszarą obwódkę.");
assert.ok(Math.max(...wordCanvas.ctx.log.lineWidths.filter(Number.isFinite))<12,"Obwódka Word Search nie może dominować nad literami.");
assert.ok(!wordCanvas.ctx.log.texts.includes("Words"),"Klucz Word Search nie powinien powtarzać tytułu ćwiczenia.");
assert.ok(wordCanvas.ctx.log.texts.includes("CIRCLE = START   SQUARE = END"),"Klucz Word Search powinien objaśniać znaczniki początku i końca.");
assert.ok(wordCanvas.ctx.log.texts.some(text=>/^1\. /.test(text)),"Lista słów powinna używać numerów zgodnych ze znacznikami na siatce.");

console.log("PASS book-order-and-solutions: Book Builder nie wymyśla stron, a rozwiązania zachowują czarno-biały standard.");

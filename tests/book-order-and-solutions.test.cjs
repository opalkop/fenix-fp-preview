"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");

function context(){
  const log={roundRects:0,strokeStyles:[]};
  const ctx={
    log,font:"",fillStyle:"",lineWidth:0,textAlign:"",textBaseline:"",globalAlpha:1,filter:"none",
    save(){},restore(){},clearRect(){},fillRect(){},strokeRect(){},translate(){},rotate(){},drawImage(){},
    beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},setLineDash(){},fillText(){},
    roundRect(){log.roundRects++},stroke(){log.strokeStyles.push(this.strokeStyle)}
  };
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

const maze=load("modules/maze-studio/maze-core.js").FenixMaze;
const mazeResult=maze.render({module:"maze-studio",recipe:{seed:7,title:"Maze",settings:{cols:8,rows:10,decorations:[{x:.08,y:.2,symbol:"★"}],assetCount:1}}},{solution:true,width:850,height:1100,canvas:canvas()});
assert.equal(mazeResult.decorations.length,0,"Rozwiązanie Maze nie może zawierać warstwy Deco.");
assert.ok(mazeResult.canvas.ctx.log.strokeStyles.includes("#111"),"Ścieżka rozwiązania Maze powinna być czarna.");
assert.ok(!mazeResult.canvas.ctx.log.strokeStyles.includes("#ef4444"),"Rozwiązanie Maze nie może używać czerwieni.");

const wordSearch=load("modules/word-search-studio/word-search-core.js").FenixWordSearch;
const wordCanvas=canvas();
const wordResult=wordSearch.render({module:"word-search-studio",title:"Words",recipe:{seed:3,settings:{cols:6,rows:6,wordCount:2,decoAssetRefs:["deco"],decoCount:4},content:{words:["MOON","STAR"]}}},{solution:true,width:850,height:1100,canvas:wordCanvas,assetImages:{deco:{width:20,height:20}}});
assert.equal(wordResult.decorations.length,0,"Rozwiązanie Word Search nie może zawierać warstwy Deco.");
assert.ok(wordCanvas.ctx.log.roundRects>=2,"Słowa w rozwiązaniu powinny być otoczone obwódką, a nie przekreślone.");

console.log("PASS book-order-and-solutions: logiczny skład oraz czarno-białe rozwiązania bez Deco.");

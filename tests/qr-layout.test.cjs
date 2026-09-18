"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../modules/shared/ending-renderers.js"),"utf8");
function render(settings,asset,width=2550){
  const calls=[],stack=[];
  const ctx={fillStyle:"#000",font:"10px Arial",textBaseline:"alphabetic",textAlign:"start",
    measureText(text){return{width:[...String(text)].length*parseFloat(this.font.match(/[\d.]+(?=px)/)[0])*.9}},
    save(){stack.push({fillStyle:this.fillStyle,font:this.font,textBaseline:this.textBaseline,textAlign:this.textAlign})},
    restore(){Object.assign(this,stack.pop())},
    fillText(text,x,y){const size=parseFloat(this.font.match(/[\d.]+(?=px)/)[0]);calls.push({kind:"text",text,x,y,size,width:this.measureText(text).width,color:this.fillStyle,top:this.textBaseline==="top"?y:y-size,bottom:this.textBaseline==="top"?y+size:y+size*.25})},
    fillRect(x,y,w,h){calls.push({kind:"fill",x,y,w,h,color:this.fillStyle})},
    strokeRect(x,y,w,h){calls.push({kind:"stroke",x,y,w,h})},
    drawImage(image,x,y,w,h){calls.push({kind:"image",x,y,w,h})},setLineDash(){}
  };
  const canvas={getContext:()=>ctx},sandbox={window:{},document:{createElement:()=>canvas},TextEncoder};
  vm.runInNewContext(source,sandbox);
  sandbox.window.FenixEndingRenderers.render({module:"qr-studio",recipe:{settings}},{width,height:width*3300/2550,qrAssetImage:asset?{width:1000,height:1000}:null});
  return calls;
}
const examples=[
  {qrLabel:"SCAN ME",footer:"Ask an adult for help before opening a link."},
  {qrLabel:"Scan this code with an adult to continue your next amazing ocean adventure!",footer:"Ask an adult for help before opening a link. Together you can discover more ocean activities, bonus materials and adventures. Always explore safely with an adult."},
  {qrLabel:"W".repeat(80),footer:"W".repeat(160)}
];
let cases=0;
for(const codeSize of ["large","medium"])for(const style of ["clean","framed","card"])for(const asset of [true,false])for(const width of [2550,1275])for(const example of examples){
  const s=width/2550,qrSize=(codeSize==="large"?1390:1120)*s,bottom=1250*s+qrSize;
  const calls=render({...example,codeSize,style,labelSize:72,footerSize:72,title:"W".repeat(120),body:"Ocean adventure ".repeat(46),titleSize:160,bodySize:90},asset,width);
  const texts=calls.filter(c=>c.kind==="text"),label=texts.filter(c=>c.top>=bottom&&c.top<2910*s),footer=texts.filter(c=>c.top>=2910*s);
  const compact=value=>value.replace(/\s/g,"");
  assert.equal(compact(label.map(c=>c.text).join("")),compact(example.qrLabel));
  assert.equal(compact(footer.map(c=>c.text).join("")),compact(example.footer));
  for(const c of [...label,...footer]){
    assert.equal(c.color,"#111","Loaded QR assets must not leave label/footer white");
    assert(c.x-c.width/2>=245*s-.01&&c.x+c.width/2<=width-245*s+.01,"Text must stay within safe side margins");
    assert(c.bottom<=3090*s+.01,"Text must stay above bottom safe margin");
  }
  assert(label.every(c=>c.top>=bottom+40*s&&c.bottom<=bottom+200*s));
  assert(footer.every(c=>c.top>=2910*s));
  assert(texts.filter(c=>c.top<1250*s).every(c=>c.bottom<=1150*s+.01),"Intro text must not collide with QR quiet zone");
  if(style==="card"){
    const card=calls.find(c=>c.kind==="stroke");
    assert(label.every(c=>c.x-c.width/2>card.x&&c.x+c.width/2<card.x+card.w&&c.bottom<card.y+card.h));
    assert(card.y+card.h<Math.min(...footer.map(c=>c.top)));
  }
  if(asset){
    const image=calls.find(c=>c.kind==="image"),field=calls.find(c=>c.kind==="fill"&&c.w===qrSize);
    assert.equal(field.color,"#fff");assert.equal(field.y,1250*s);
    assert.equal(image.w,qrSize*.9);assert.equal(image.h,qrSize*.9);
    assert(Math.abs(image.x-field.x-qrSize*.05)<.01);assert(Math.abs(image.y-field.y-qrSize*.05)<.01);
  }
  cases++;
}
console.log(`qr-layout.test.cjs: ${cases} layout cases OK`);

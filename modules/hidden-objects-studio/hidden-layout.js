"use strict";
window.FenixHiddenLayout=(()=>{
  const SAFE_LEFT=70,SAFE_RIGHT=780,SCENE_BOTTOM=1000,ITEM_WIDTH=116,ITEM_HEIGHT=58,ITEM_GAP=18,ROW_GAP=70;
  function rowCounts(count){
    const n=Math.max(0,Math.floor(Number(count)||0));
    if(n<=5)return n?[n]:[];
    const rows=Math.ceil(n/5),base=Math.floor(n/rows),extra=n%rows;
    return Array.from({length:rows},(_,index)=>base+(index<extra?1:0));
  }
  function compute(count,{instructionSize=24}={}){
    const rows=rowCounts(count),headerBottom=135+Math.max(18,Number(instructionSize)||24)*.45,targetTop=Math.max(170,Math.ceil(headerBottom+18)),items=[];
    let index=0;
    rows.forEach((columns,row)=>{
      const rowWidth=columns*ITEM_WIDTH+(columns-1)*ITEM_GAP,startX=(850-rowWidth)/2,y=targetTop+row*ROW_GAP;
      for(let column=0;column<columns;column++){
        const x=startX+column*(ITEM_WIDTH+ITEM_GAP);
        items.push({index:index++,row,column,image:{x,y,w:58,h:58},count:{x:x+62,y:y+35,maxWidth:54},bounds:{x,y,w:ITEM_WIDTH,h:ITEM_HEIGHT}});
      }
    });
    const targetBottom=rows.length?targetTop+(rows.length-1)*ROW_GAP+ITEM_HEIGHT:targetTop;
    const sceneTop=Math.max(300,Math.ceil(targetBottom+(rows.length>1?35:30))),scene={left:SAFE_LEFT,right:SAFE_RIGHT,top:sceneTop,bottom:SCENE_BOTTOM,width:SAFE_RIGHT-SAFE_LEFT,height:SCENE_BOTTOM-sceneTop};
    return{rowCounts:rows,targetItems:items,targetArea:{left:SAFE_LEFT,right:SAFE_RIGHT,top:targetTop,bottom:targetBottom},scene};
  }
  return Object.freeze({compute,rowCounts});
})();

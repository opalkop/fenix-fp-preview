"use strict";

window.FenixIntroRenderer=(()=>{
  const PAGE_TYPES=Object.freeze([
    {id:"welcome",label:"Welcome Page",description:"Powitanie i krótkie zaproszenie do przygody."},
    {id:"mission",label:"Your Mission",description:"Cel książki i zadanie młodego odkrywcy."},
    {id:"mission-tracker",label:"Mission Tracker",description:"Strona postępu z polem do oznaczenia każdej ukończonej aktywności."},
    {id:"how-to-use",label:"How to Use This Book",description:"Proste objaśnienie sposobu pracy z książką."},
    {id:"rules",label:"Adventure Rules",description:"Najważniejsze zasady zabawy i bezpieczeństwa."},
    {id:"skills",label:"Skills You’ll Practice",description:"Umiejętności rozwijane podczas wykonywania zadań."}
  ]);
  const COPY={
    welcome:{title:"Welcome to Your Adventure!",body:"Get ready for a fun journey filled with puzzles, discoveries, and creative challenges. Take your time, do your best, and enjoy every page!",footer:"Let the adventure begin!"},
    mission:{title:"Your Mission",body:"Complete each activity and follow the challenges from beginning to end. Every finished page brings you one step closer to completing your adventure.",footer:"Ready? Your mission starts now!"},
    "mission-tracker":{title:"MISSION TRACKER",body:"Color one star after each completed activity!",footer:"Complete every mission and celebrate your achievement!",countMode:"auto",trackerCount:35,trackerColumns:7,markerShape:"star"},
    "how-to-use":{title:"How to Use This Book",body:"Work through the activities in any order you like. Read the instruction at the top of each page, use a pencil or crayons, and ask an adult for help whenever you need it.",footer:"There is no need to rush — have fun learning!"},
    rules:{title:"Adventure Rules",body:"1. Read each instruction carefully.\n2. Take your time and try your best.\n3. Use an eraser when you need another try.\n4. Keep the pages neat and have fun.\n5. Celebrate every activity you complete!",footer:"Be curious. Be creative. Keep going!"},
    skills:{title:"Skills You’ll Practice",body:"This book helps you practice focus, observation, problem-solving, hand-eye coordination, creativity, and confidence. Each activity gives your brain a new and exciting challenge.",footer:"Every page helps your skills grow!"}
  };
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const STRUCTURAL_MODULES=new Set(["intro-studio","blank-page","certificate-studio","congratulations-studio","solutions-studio"]);
  function activityCount(project={}){const pages=Array.isArray(project.pages)?project.pages:[];return pages.filter(page=>!STRUCTURAL_MODULES.has(String(page?.module||page?.recipe?.module||""))).length}
  function defaults(type,project={}){
    const base=COPY[type]||COPY.welcome,topic=String(project.topic||"").trim();
    if(type==="welcome"&&topic)return{...base,title:`Welcome to the ${topic.replace(/\b\w/g,char=>char.toUpperCase())} Adventure!`};
    if(type==="mission-tracker")return{...base,trackerCount:activityCount(project)||base.trackerCount};
    return{...base};
  }
  function prepare(page,project={}){
    const settings=object(page?.recipe?.settings);if(settings.pageType!=="mission-tracker"||settings.countMode!=="auto")return page;
    const detected=activityCount(project);if(!detected)return page;
    return{...page,recipe:{...page.recipe,settings:{...settings,trackerCount:detected}}};
  }
  function wrap(ctx,text,maxWidth){
    const paragraphs=String(text||"").split(/\n/),lines=[];
    paragraphs.forEach((paragraph,index)=>{
      const words=paragraph.trim().split(/\s+/).filter(Boolean);let line="";
      words.forEach(word=>{const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word}});
      if(line)lines.push(line);if(!words.length||index<paragraphs.length-1)lines.push("");
    });
    return lines;
  }
  function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke()}
  function renderTracker(ctx,settings,{width,height,scale,margin,contentWidth,dividerY,footer}){
    const count=Math.max(1,Math.min(120,Number(settings.trackerCount)||35)),columns=Math.max(3,Math.min(12,Number(settings.trackerColumns)||7)),rows=Math.ceil(count/columns),glyph={star:"☆",circle:"○",square:"□"}[settings.markerShape]||"☆";
    ctx.textAlign="center";ctx.font=`700 ${Math.round(48*scale)}px Arial, sans-serif`;ctx.fillText(String(settings.body||COPY["mission-tracker"].body),width/2,dividerY+115*scale);
    const gridTop=dividerY+230*scale,gridBottom=height-(footer?450:300)*scale,cellWidth=contentWidth/columns,cellHeight=(gridBottom-gridTop)/Math.max(1,rows),glyphSize=Math.max(28*scale,Math.min(105*scale,cellWidth*.56,cellHeight*.62));
    ctx.font=`400 ${Math.round(glyphSize)}px Arial, sans-serif`;ctx.textBaseline="middle";
    for(let index=0;index<count;index++){const column=index%columns,row=Math.floor(index/columns),x=margin+cellWidth*(column+.5),y=gridTop+cellHeight*(row+.5);ctx.fillText(glyph,x,y)}
  }
  function render(page,{canvas=null,width=2550,height=3300}={}){
    const target=canvas||document.createElement("canvas");target.width=width;target.height=height;
    const ctx=target.getContext("2d"),settings=object(page?.recipe?.settings),type=settings.pageType||"welcome",copy=defaults(type),scale=width/2550;
    const title=String(settings.title||page?.title||copy.title),body=String(settings.body||copy.body),footer=String(settings.footer??copy.footer),alignment=settings.alignment==="left"?"left":"center",style=["clean","framed","playful"].includes(settings.style)?settings.style:"clean";
    const margin=230*scale,contentWidth=width-margin*2;
    ctx.save();ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);ctx.strokeStyle="#111";ctx.fillStyle="#111";
    if(style==="framed"){ctx.lineWidth=5*scale;roundedRect(ctx,105*scale,105*scale,width-210*scale,height-210*scale,38*scale)}
    if(style==="playful"){
      ctx.lineWidth=5*scale;ctx.beginPath();ctx.arc(180*scale,180*scale,45*scale,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(width-180*scale,180*scale,28*scale,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((150+i*38)*scale,(height-170)*scale);ctx.lineTo((166+i*38)*scale,(height-205)*scale);ctx.lineTo((182+i*38)*scale,(height-170)*scale);ctx.stroke()}
    }
    ctx.textAlign=alignment;ctx.textBaseline="alphabetic";
    const x=alignment==="left"?margin:width/2;
    ctx.font=`900 ${Math.round(112*scale)}px Arial, sans-serif`;
    const titleLines=wrap(ctx,title,contentWidth),titleLine=128*scale,titleTop=500*scale;
    titleLines.forEach((line,index)=>ctx.fillText(line,x,titleTop+index*titleLine));
    const dividerY=titleTop+titleLines.length*titleLine+45*scale;ctx.lineWidth=5*scale;ctx.beginPath();ctx.moveTo(alignment==="left"?margin:width/2-310*scale,dividerY);ctx.lineTo(alignment==="left"?margin+620*scale:width/2+310*scale,dividerY);ctx.stroke();
    if(type==="mission-tracker")renderTracker(ctx,{...settings,body},{width,height,scale,margin,contentWidth,dividerY,footer});
    else{
      const bodyTop=dividerY+150*scale,maxBottom=height-520*scale,availableHeight=maxBottom-bodyTop;let bodyFont=52*scale,bodyLines=[],bodyLine=0;
      do{ctx.font=`${Math.round(bodyFont)}px Arial, sans-serif`;bodyLines=wrap(ctx,body,contentWidth);bodyLine=bodyFont*1.5;if(bodyLines.length*bodyLine<=availableHeight)break;bodyFont-=2*scale}while(bodyFont>22*scale);
      if(bodyLines.length*bodyLine>availableHeight){bodyLine=availableHeight/Math.max(1,bodyLines.length);bodyFont=Math.max(14*scale,bodyLine/1.45);ctx.font=`${Math.round(bodyFont)}px Arial, sans-serif`;bodyLines=wrap(ctx,body,contentWidth);bodyLine=availableHeight/Math.max(1,bodyLines.length)}
      bodyLines.forEach((line,index)=>ctx.fillText(line,x,bodyTop+index*bodyLine));
    }
    if(footer){ctx.font=`700 ${Math.round(42*scale)}px Arial, sans-serif`;ctx.textAlign="center";ctx.fillText(footer,width/2,height-285*scale)}
    ctx.restore();return target;
  }
  function fromPage(page){const settings=object(page?.recipe?.settings),type=settings.pageType||"welcome";return{...defaults(type),...settings,pageType:type}}
  return Object.freeze({PAGE_TYPES,activityCount,defaults,prepare,fromPage,render});
})();

"use strict";

window.FenixEndingRenderers=(()=>{
  const DEFINITIONS=Object.freeze({
    "congratulations-studio":{
      name:"Congratulations Studio",label:"Strona gratulacyjna",file:"congratulations",
      defaults:{title:"CONGRATULATIONS!",subtitle:"YOU DID IT!",body:"You completed every challenge and reached the end of this adventure. Be proud of your focus, creativity, and determination!",footer:"Amazing work — keep exploring!",showActivityCount:true,countMode:"auto",activityCount:35,activityCountText:"You completed {count} activities!",showSkills:false,skillsText:"Focus · Observation · Problem-solving · Creativity",showQrTransition:true,transitionTitle:"YOUR ADVENTURE DOESN’T HAVE TO END HERE!",transitionText:"Turn the page to discover what comes next.",alignment:"center",style:"framed",titleSize:"standard",spacing:"standard",showAchievementMark:true},
      groups:[
        {title:"1. Główny komunikat",hint:"Tytuł, podtytuł, gratulacje i końcowa stopka.",fields:[["title","Tytuł","text",120],["subtitle","Krótki podtytuł","text",100],["body","Treść gratulacji","textarea",900],["footer","Końcowa stopka","text",160]]},
        {title:"2. Podsumowanie osiągnięcia",hint:"Opcjonalna liczba ukończonych aktywności i ćwiczone umiejętności.",fields:[["showActivityCount","Pokaż liczbę ukończonych aktywności","checkbox","Liczba może zostać pobrana automatycznie z aktywnego projektu."],["countMode","Sposób liczenia","select",[["auto","Automatycznie z projektu"],["manual","Ustaw ręcznie"]]],["activityCount","Liczba aktywności","number",[1,999]],["activityCountText","Komunikat z liczbą","text",180],["showSkills","Pokaż ćwiczone umiejętności","checkbox","Dodaje krótką linię z najważniejszymi umiejętnościami."],["skillsText","Umiejętności","textarea",300]]},
        {title:"3. Przejście do strony QR",hint:"Zapowiedź następnej strony bez powtarzania samego kodu QR.",fields:[["showQrTransition","Pokaż przejście do QR Studio","checkbox","Czytelnik otrzyma informację, że przygoda może trwać dalej."],["transitionTitle","Nagłówek przejścia","text",160],["transitionText","Treść przejścia","textarea",360]]},
        {title:"4. Wygląd strony",hint:"Czarny tekst, białe tło i układ odpowiedni do wnętrza KDP.",fields:[["style","Ramka strony","select",[["clean","Bez ramki"],["framed","Delikatna ramka"],["bold-frame","Mocniejsza ramka"]]],["alignment","Wyrównanie","select",[["center","Do środka"],["left","Do lewej"]]],["titleSize","Rozmiar tytułu","select",[["small","Mniejszy"],["standard","Standardowy"],["large","Duży"]]],["spacing","Odstępy","select",[["compact","Kompaktowe"],["standard","Standardowe"],["airy","Przestronne"]]],["showAchievementMark","Pokaż prosty symbol osiągnięcia","checkbox","Czarno-biały znak ✓ w obrysie koła — bez warstwy deco."]]}
      ]
    },
    "certificate-studio":{
      name:"Certificate Studio",label:"Certyfikat ukończenia",file:"certificate",
      defaults:{title:"CERTIFICATE OF COMPLETION",preamble:"This certificate is proudly presented to",achievement:"for successfully completing every activity in this book.",dateLabel:"Date",signatureLabel:"Signature",footer:"Keep learning. Keep creating. Keep growing.",style:"classic"},
      groups:[
        {title:"1. Treść certyfikatu",hint:"Teksty pozostają edytowalne, a miejsce na imię jest puste do wpisania.",fields:[["title","Nagłówek","text",120],["preamble","Tekst nad imieniem","text",180],["achievement","Treść osiągnięcia","textarea",500],["footer","Stopka","text",160]]},
        {title:"2. Pola do wypełnienia",hint:"Podpisy pod liniami na datę i podpis.",fields:[["dateLabel","Podpis daty","text",50],["signatureLabel","Podpis opiekuna / nauczyciela","text",70],["style","Styl","select",[["classic","Klasyczny"],["minimal","Minimalny"],["double-frame","Podwójna ramka"]]]]}
      ]
    },
    "qr-studio":{
      name:"QR Studio",label:"Strona z kodem QR",file:"qr",
      defaults:{qrAssetRef:"",title:"KEEP THE ADVENTURE GOING!",body:"Scan the code to discover more activities, bonus materials, or the next part of the adventure.",qrLabel:"SCAN ME",footer:"Ask an adult for help before opening a link.",codeSize:"large",style:"clean"},
      groups:[
        {title:"1. Asset kodu QR",hint:"Dodaj gotowy kod QR jako asset aktywnego projektu lub wybierz zapisany wcześniej.",fields:[["qrAssetRef","Kod QR projektu","asset","PNG, JPG, WEBP lub SVG. Najlepiej kwadratowy, czarno-biały plik o wysokim kontraście."]]},
        {title:"2. Treść strony",hint:"Teksty prowadzące czytelnika do kolejnego materiału.",fields:[["title","Tytuł strony","text",120],["body","Instrukcja","textarea",700],["qrLabel","Podpis pod kodem","text",80],["footer","Stopka bezpieczeństwa","text",160]]},
        {title:"3. Wygląd strony",hint:"Kod pozostaje na białym polu bezpieczeństwa i jest renderowany bez warstwy deco.",fields:[["codeSize","Rozmiar kodu","select",[["large","Duży — zalecany"],["medium","Średni"]]],["style","Kompozycja","select",[["clean","Czysta"],["framed","Ramka strony"],["card","Karta QR"]]]]}
      ]
    }
  });
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const wrap=(ctx,text,maxWidth)=>{
    const lines=[];
    String(text||"").split(/\n/).forEach((paragraph,pIndex)=>{
      let line="";
      paragraph.trim().split(/\s+/).filter(Boolean).forEach(word=>{const test=line?`${line} ${word}`:word;if(!line||ctx.measureText(test).width<=maxWidth)line=test;else{lines.push(line);line=word}});
      if(line)lines.push(line);if(!paragraph.trim()||pIndex<String(text||"").split(/\n/).length-1)lines.push("");
    });
    return lines;
  };
  function textBlock(ctx,text,x,y,maxWidth,fontSize,lineHeight,align="center",maxLines=10){
    let size=fontSize,lines=[];
    do{ctx.font=`400 ${Math.round(size)}px Arial, sans-serif`;lines=wrap(ctx,text,maxWidth);if(lines.length<=maxLines)break;size-=2}while(size>22);
    ctx.textAlign=align;lines.slice(0,maxLines).forEach((line,index)=>ctx.fillText(line,x,y+index*lineHeight*(size/fontSize)));
    return y+Math.min(lines.length,maxLines)*lineHeight*(size/fontSize);
  }
  function base(width,height,style){
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d"),s=width/2550;
    ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);ctx.fillStyle="#111";ctx.strokeStyle="#111";ctx.lineCap="round";ctx.lineJoin="round";
    if(style==="framed"||style==="bold-frame"||style==="classic"||style==="double-frame"){ctx.lineWidth=(style==="bold-frame"?10:5)*s;ctx.strokeRect(120*s,120*s,width-240*s,height-240*s)}
    if(style==="double-frame"){ctx.lineWidth=2*s;ctx.strokeRect(150*s,150*s,width-300*s,height-300*s)}
    return{canvas,ctx,s};
  }
  function renderCongratulations(settings,width,height){
    const {canvas,ctx,s}=base(width,height,settings.style),left=settings.alignment==="left",x=left?245*s:width/2,align=left?"left":"center",max=2060*s,gap={compact:.78,standard:1,airy:1.22}[settings.spacing]||1,titleSize={small:88,standard:108,large:128}[settings.titleSize]||108;
    let y=settings.showAchievementMark?590*s:470*s;
    if(settings.showAchievementMark){ctx.lineWidth=5*s;ctx.beginPath();ctx.arc(width/2,330*s,90*s,0,Math.PI*2);ctx.stroke();ctx.lineWidth=12*s;ctx.beginPath();ctx.moveTo(width/2-42*s,330*s);ctx.lineTo(width/2-10*s,365*s);ctx.lineTo(width/2+50*s,295*s);ctx.stroke()}
    ctx.textAlign=align;ctx.font=`900 ${titleSize*s}px Arial, sans-serif`;const titleLines=wrap(ctx,settings.title,max).slice(0,3),titleLine=(titleSize+20)*s;titleLines.forEach((line,index)=>ctx.fillText(line,x,y+index*titleLine));y+=titleLines.length*titleLine;
    if(settings.subtitle){y+=45*s*gap;ctx.font=`900 ${48*s}px Arial, sans-serif`;ctx.fillText(settings.subtitle,x,y);y+=65*s}
    y+=55*s*gap;ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(left?x:x-320*s,y);ctx.lineTo(left?x+640*s:x+320*s,y);ctx.stroke();
    y=textBlock(ctx,settings.body,x,y+125*s*gap,max,52*s,78*s,align,7);
    if(settings.showActivityCount){y+=75*s*gap;const message=String(settings.activityCountText||"You completed {count} activities!").replaceAll("{count}",String(Math.max(1,Number(settings.activityCount)||1)));ctx.font=`900 ${50*s}px Arial, sans-serif`;wrap(ctx,message,max).slice(0,2).forEach((line,index)=>ctx.fillText(line,x,y+index*65*s));y+=Math.min(2,wrap(ctx,message,max).length)*65*s}
    if(settings.showSkills&&settings.skillsText){y+=65*s*gap;ctx.font=`800 ${30*s}px Arial, sans-serif`;ctx.fillText("SKILLS PRACTICED",x,y);y=textBlock(ctx,settings.skillsText,x,y+60*s,max,38*s,56*s,align,3)}
    if(settings.showQrTransition){y=Math.max(y+95*s*gap,1980*s);ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(left?x:x-250*s,y);ctx.lineTo(left?x+500*s:x+250*s,y);ctx.stroke();y+=90*s*gap;ctx.font=`900 ${40*s}px Arial, sans-serif`;wrap(ctx,settings.transitionTitle,max).slice(0,2).forEach((line,index)=>ctx.fillText(line,x,y+index*55*s));y+=Math.min(2,wrap(ctx,settings.transitionTitle,max).length)*55*s+35*s;textBlock(ctx,settings.transitionText,x,y,max,38*s,58*s,align,4)}
    ctx.textAlign="center";ctx.font=`700 ${40*s}px Arial, sans-serif`;ctx.fillText(settings.footer,width/2,height-270*s);return canvas;
  }
  function renderCertificate(settings,width,height){
    const {canvas,ctx,s}=base(width,height,settings.style),cx=width/2;
    ctx.textAlign="center";ctx.font=`900 ${105*s}px Arial, sans-serif`;wrap(ctx,settings.title,1900*s).slice(0,2).forEach((line,i)=>ctx.fillText(line,cx,620*s+i*120*s));
    ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(720*s,880*s);ctx.lineTo(1830*s,880*s);ctx.stroke();
    ctx.font=`400 ${48*s}px Arial, sans-serif`;ctx.fillText(settings.preamble,cx,1150*s);
    ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(520*s,1510*s);ctx.lineTo(2030*s,1510*s);ctx.stroke();
    ctx.font=`italic ${34*s}px Arial, sans-serif`;ctx.fillText("Name",cx,1570*s);
    textBlock(ctx,settings.achievement,cx,1840*s,1740*s,54*s,82*s,"center",6);
    const y=2520*s;ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(430*s,y);ctx.lineTo(1050*s,y);ctx.moveTo(1500*s,y);ctx.lineTo(2120*s,y);ctx.stroke();
    ctx.font=`400 ${34*s}px Arial, sans-serif`;ctx.fillText(settings.dateLabel,740*s,y+62*s);ctx.fillText(settings.signatureLabel,1810*s,y+62*s);
    ctx.font=`700 ${38*s}px Arial, sans-serif`;ctx.fillText(settings.footer,cx,height-300*s);return canvas;
  }

  // Lokalny, samowystarczalny QR: wersja 10-L, tryb bajtowy, do 271 bajtów UTF-8.
  const gfExp=new Uint8Array(512),gfLog=new Uint8Array(256);
  (()=>{let value=1;for(let i=0;i<255;i++){gfExp[i]=value;gfLog[value]=i;value<<=1;if(value&256)value^=0x11d}for(let i=255;i<512;i++)gfExp[i]=gfExp[i-255]})();
  const gfMul=(a,b)=>a&&b?gfExp[gfLog[a]+gfLog[b]]:0;
  function generator(degree){let poly=[1];for(let i=0;i<degree;i++){const next=new Array(poly.length+1).fill(0);poly.forEach((coef,j)=>{next[j]^=coef;next[j+1]^=gfMul(coef,gfExp[i])});poly=next}return poly}
  function remainder(data,degree){const gen=generator(degree),result=new Array(degree).fill(0);data.forEach(byte=>{const factor=byte^result[0];result.shift();result.push(0);for(let i=0;i<degree;i++)result[i]^=gfMul(gen[i+1],factor)});return result}
  function bch(value,poly){let shifted=value;const degree=n=>31-Math.clz32(n),target=degree(poly);while(degree(shifted)>=target)shifted^=poly<<(degree(shifted)-target);return shifted}
  function qrMatrix(value){
    const bytes=[...new TextEncoder().encode(String(value||""))];if(bytes.length>271)throw new Error("Adres QR jest za długi. Maksymalnie 271 bajtów UTF-8.");
    const bits=[],push=(value,count)=>{for(let i=count-1;i>=0;i--)bits.push((value>>>i)&1)};
    push(4,4);push(bytes.length,16);bytes.forEach(byte=>push(byte,8));for(let i=0;i<Math.min(4,2192-bits.length);i++)bits.push(0);while(bits.length%8)bits.push(0);
    const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((sum,bit)=>(sum<<1)|bit,0));for(let pad=0;data.length<274;pad++)data.push(pad%2?0x11:0xec);
    const sizes=[68,68,69,69],blocks=[],ecc=[];let offset=0;sizes.forEach(size=>{const block=data.slice(offset,offset+size);offset+=size;blocks.push(block);ecc.push(remainder(block,18))});
    const code=[];for(let i=0;i<69;i++)blocks.forEach(block=>{if(i<block.length)code.push(block[i])});for(let i=0;i<18;i++)ecc.forEach(block=>code.push(block[i]));
    const size=57,matrix=Array.from({length:size},()=>Array(size).fill(false)),func=Array.from({length:size},()=>Array(size).fill(false));
    const set=(r,c,dark)=>{if(r>=0&&c>=0&&r<size&&c<size){matrix[r][c]=Boolean(dark);func[r][c]=true}};
    const finder=(row,col)=>{for(let dr=-1;dr<=7;dr++)for(let dc=-1;dc<=7;dc++){const dark=dr>=0&&dr<=6&&dc>=0&&dc<=6&&(dr===0||dr===6||dc===0||dc===6||(dr>=2&&dr<=4&&dc>=2&&dc<=4));set(row+dr,col+dc,dark)}};
    finder(0,0);finder(0,size-7);finder(size-7,0);
    for(let i=8;i<size-8;i++){if(!func[6][i])set(6,i,i%2===0);if(!func[i][6])set(i,6,i%2===0)}
    [6,28,50].forEach(row=>[6,28,50].forEach(col=>{if(func[row][col])return;for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)set(row+dr,col+dc,Math.max(Math.abs(dr),Math.abs(dc))!==1)}));
    for(let i=0;i<15;i++){const vr=i<6?i:i<8?i+1:size-15+i,vc=8;set(vr,vc,false);const hr=8,hc=i<8?size-i-1:i<9?15-i:15-i-1;set(hr,hc,false)}set(size-8,8,true);
    for(let i=0;i<18;i++){set(Math.floor(i/3),i%3+size-11,false);set(i%3+size-11,Math.floor(i/3),false)}
    const payload=[];code.forEach(byte=>{for(let i=7;i>=0;i--)payload.push((byte>>>i)&1)});let bitIndex=0;
    for(let right=size-1;right>=1;right-=2){if(right===6)right--;const upward=((right+1)&2)===0;for(let vert=0;vert<size;vert++){const row=upward?size-1-vert:vert;for(let j=0;j<2;j++){const col=right-j;if(func[row][col])continue;let dark=bitIndex<payload.length?payload[bitIndex++]:0;if((row+col)%2===0)dark^=1;matrix[row][col]=Boolean(dark)}}}
    const format=((1<<3)|0),formatBits=((format<<10)|bch(format<<10,0x537))^0x5412;
    for(let i=0;i<15;i++){const dark=((formatBits>>>i)&1)!==0,vr=i<6?i:i<8?i+1:size-15+i,hc=i<8?size-i-1:i<9?15-i:15-i-1;matrix[vr][8]=dark;matrix[8][hc]=dark}matrix[size-8][8]=true;
    const versionBits=(10<<12)|bch(10<<12,0x1f25);for(let i=0;i<18;i++){const dark=((versionBits>>>i)&1)!==0;matrix[Math.floor(i/3)][i%3+size-11]=dark;matrix[i%3+size-11][Math.floor(i/3)]=dark}
    return matrix;
  }
  function drawQr(ctx,value,x,y,size){
    const matrix=qrMatrix(value),quiet=4,module=size/(matrix.length+quiet*2);ctx.fillStyle="#fff";ctx.fillRect(x,y,size,size);ctx.fillStyle="#000";
    matrix.forEach((row,r)=>row.forEach((dark,c)=>{if(dark)ctx.fillRect(x+(c+quiet)*module,y+(r+quiet)*module,Math.ceil(module+.15),Math.ceil(module+.15))}));
  }
  function renderQr(settings,width,height,qrAssetImage=null){
    const {canvas,ctx,s}=base(width,height,settings.style),cx=width/2,max=1980*s;
    ctx.textAlign="center";ctx.font=`900 ${100*s}px Arial, sans-serif`;wrap(ctx,settings.title,max).slice(0,2).forEach((line,i)=>ctx.fillText(line,cx,520*s+i*115*s));
    textBlock(ctx,settings.body,cx,830*s,1840*s,48*s,72*s,"center",5);
    const qrSize=(settings.codeSize==="medium"?1120:1390)*s,qrX=(width-qrSize)/2,qrY=1250*s;
    if(settings.style==="card"){ctx.lineWidth=4*s;ctx.strokeRect(qrX-70*s,qrY-70*s,qrSize+140*s,qrSize+270*s)}
    ctx.fillStyle="#fff";ctx.fillRect(qrX,qrY,qrSize,qrSize);
    if(qrAssetImage){const sourceWidth=qrAssetImage.naturalWidth||qrAssetImage.width||1,sourceHeight=qrAssetImage.naturalHeight||qrAssetImage.height||1,inner=qrSize*.9,scale=Math.min(inner/sourceWidth,inner/sourceHeight),drawWidth=sourceWidth*scale,drawHeight=sourceHeight*scale;ctx.save();ctx.imageSmoothingEnabled=false;ctx.filter="grayscale(1) contrast(1.35)";ctx.drawImage(qrAssetImage,qrX+(qrSize-drawWidth)/2,qrY+(qrSize-drawHeight)/2,drawWidth,drawHeight);ctx.restore()}else{ctx.strokeStyle="#777";ctx.lineWidth=4*s;ctx.setLineDash([22*s,16*s]);ctx.strokeRect(qrX+70*s,qrY+70*s,qrSize-140*s,qrSize-140*s);ctx.setLineDash([]);ctx.fillStyle="#555";ctx.font=`800 ${42*s}px Arial, sans-serif`;ctx.fillText("DODAJ ASSET KODU QR",cx,qrY+qrSize/2)}
    ctx.font=`900 ${42*s}px Arial, sans-serif`;ctx.fillText(settings.qrLabel,cx,qrY+qrSize+90*s);
    ctx.font=`400 ${34*s}px Arial, sans-serif`;ctx.fillText(settings.footer,cx,height-245*s);return canvas;
  }
  function fromPage(page,module){const definition=DEFINITIONS[module],stored=object(page?.recipe?.settings),content=object(page?.recipe?.content);return{...definition.defaults,...stored,...(module==="qr-studio"&&content.assetRef?{qrAssetRef:content.assetRef}:{})}}
  function page(module,settings,original=null){
    const definition=DEFINITIONS[module],stamp=new Date().toISOString();
    const assetRef=module==="qr-studio"?String(settings.qrAssetRef||""):"";
    return FenixPageSchema.normalize({id:original?.id,createdAt:original?.createdAt||stamp,updatedAt:stamp,module,title:settings.title||definition.label,recipe:{module,seed:null,title:settings.title||definition.label,settings:{...definition.defaults,...settings},content:assetRef?{assetRef}:{},meta:{renderer:"ending-v2"},renderState:{}},solution:{available:false,imageData:null},validation:{kdp:{status:module==="qr-studio"&&!assetRef?"warning":"ok",messages:module==="qr-studio"&&!assetRef?["Dodaj asset kodu QR przed eksportem finalnego PDF."]:[]}},production:{format:"8.5x11",bleed:"no-bleed",dpi:300,width:2550,height:3300},source:{app:module,version:"0.25.0",format:"native"}});
  }
  function render(pageValue,{width=2550,height=3300,qrAssetImage=null}={}){
    const module=String(pageValue?.module||pageValue?.recipe?.module||""),settings=fromPage(pageValue,module);
    if(module==="congratulations-studio")return renderCongratulations(settings,width,height);
    if(module==="certificate-studio")return renderCertificate(settings,width,height);
    if(module==="qr-studio")return renderQr(settings,width,height,qrAssetImage);
    throw new Error(`Nieobsługiwana strona końcowa: ${module}`);
  }
  return Object.freeze({modules:Object.freeze(Object.keys(DEFINITIONS)),DEFINITIONS,fromPage,page,render,qrMatrix});
})();

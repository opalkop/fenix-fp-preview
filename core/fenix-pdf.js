"use strict";

window.FenixPdf=Object.freeze((()=>{
  const encoder=new TextEncoder(),text=value=>encoder.encode(String(value));
  const concat=chunks=>{const size=chunks.reduce((sum,chunk)=>sum+chunk.length,0),result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result};
  const ascii=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7e]/g," ").replace(/([\\()])/g,"\\$1");
  const fileName=value=>{const safe=String(value||"fenix-book").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");return`${safe||"fenix-book"}.pdf`};
  function build({pages,title="FENIX Activity Book"}){
    if(!Array.isArray(pages)||!pages.length)throw new Error("PDF nie zawiera żadnych stron.");
    const objectCount=2+pages.length*3+1,objects=new Array(objectCount+1),pageIds=[];
    pages.forEach((page,index)=>{const pageId=3+index*3,imageId=pageId+1,contentId=pageId+2,widthPt=Number(page.widthPt),heightPt=Number(page.heightPt),image=page.jpegBytes instanceof Uint8Array?page.jpegBytes:new Uint8Array(page.jpegBytes||[]);if(!image.length||!widthPt||!heightPt)throw new Error(`Nieprawidłowe dane strony ${index+1}.`);pageIds.push(`${pageId} 0 R`);const commands=text(`q\n${widthPt.toFixed(4)} 0 0 ${heightPt.toFixed(4)} 0 0 cm\n/Im1 Do\nQ\n`);objects[pageId]=text(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(4)} ${heightPt.toFixed(4)}] /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);objects[imageId]=concat([text(`<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,text("\nendstream")]);objects[contentId]=concat([text(`<< /Length ${commands.length} >>\nstream\n`),commands,text("endstream")])});
    const infoId=3+pages.length*3;objects[1]=text("<< /Type /Catalog /Pages 2 0 R >>");objects[2]=text(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.join(" ")}] >>`);objects[infoId]=text(`<< /Title (${ascii(title)}) /Creator (FENIX Portable Book Builder) /Producer (FENIX PDF Engine) >>`);
    const chunks=[text("%PDF-1.4\n%FENIX\n")],offsets=new Array(objectCount+1).fill(0);let cursor=chunks[0].length;
    for(let id=1;id<=objectCount;id++){offsets[id]=cursor;const chunk=concat([text(`${id} 0 obj\n`),objects[id],text("\nendobj\n")]);chunks.push(chunk);cursor+=chunk.length}
    const xrefOffset=cursor,xref=["xref",`0 ${objectCount+1}`,"0000000000 65535 f "];for(let id=1;id<=objectCount;id++)xref.push(`${String(offsets[id]).padStart(10,"0")} 00000 n `);chunks.push(text(`${xref.join("\n")}\ntrailer\n<< /Size ${objectCount+1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));return concat(chunks)
  }
  function download(bytes,name){const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=fileName(name);link.style.display="none";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return{blob,fileName:link.download,size:bytes.length}}
  return{build,download,fileName};
})());

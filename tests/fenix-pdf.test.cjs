"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const sandbox={window:{},TextEncoder,Uint8Array,Blob,URL,setTimeout};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../core/fenix-pdf.js"),"utf8"),sandbox,{filename:"fenix-pdf.js"});
const jpeg=new Uint8Array(Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==","base64"));
const bytes=sandbox.window.FenixPdf.build({title:"Książeczka próbna",pages:[{jpegBytes:jpeg,pixelWidth:2550,pixelHeight:3300,widthPt:612,heightPt:792},{jpegBytes:jpeg,pixelWidth:1800,pixelHeight:2700,widthPt:432,heightPt:648}]}),source=Buffer.from(bytes).toString("latin1");

assert.ok(source.startsWith("%PDF-1.4"),"Brak nagłówka PDF.");
assert.match(source,/\/Count 2\b/,"PDF powinien zawierać dwie strony.");
assert.match(source,/\/MediaBox \[0 0 612\.0000 792\.0000\]/,"Brak formatu 8.5 × 11 cala.");
assert.match(source,/\/MediaBox \[0 0 432\.0000 648\.0000\]/,"Brak formatu 6 × 9 cala.");
assert.match(source,/\/Filter \/DCTDecode/,"Obrazy JPEG powinny być osadzone bez ponownej kompresji.");
assert.ok(source.endsWith("%%EOF\n"),"Brak poprawnego zakończenia PDF.");

const xrefOffset=Number(source.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
assert.equal(source.slice(xrefOffset,xrefOffset+4),"xref","startxref wskazuje niewłaściwy bajt.");
const entries=source.slice(xrefOffset).split("\n").slice(3,12);
for(let id=1;id<=8;id++){const offset=Number(entries[id-1].slice(0,10));assert.equal(source.slice(offset,offset+`${id} 0 obj`.length),`${id} 0 obj`,`Błędny offset obiektu ${id}.`)}

assert.equal(sandbox.window.FenixPdf.fileName("Mój Pierwszy Projekt"),"moj-pierwszy-projekt.pdf");
console.log("PASS fenix-pdf: wielostronicowy PDF, rozmiary stron, JPEG, xref i nazwa pliku.");

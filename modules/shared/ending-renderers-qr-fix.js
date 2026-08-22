"use strict";

(()=>{
  const original=window.FenixEndingRenderers;
  if(!original||original.__qrTextFix)return;

  const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number(value)||fallback));
  const originalRender=original.render;

  const patched={
    ...original,
    __qrTextFix:true,
    render(pageValue,options={}){
      const canvas=originalRender(pageValue,options);
      const module=String(pageValue?.module||pageValue?.recipe?.module||"");
      if(module!=="qr-studio")return canvas;

      const settings=original.fromPage(pageValue,module);
      const ctx=canvas.getContext("2d");
      const s=canvas.width/2550;
      const cx=canvas.width/2;
      const qrSize=(settings.codeSize==="medium"?1120:1390)*s;
      const qrY=1250*s;
      const labelSize=clamp(settings.labelSize,30,72,46);
      const footerSize=clamp(settings.footerSize,28,72,40);

      // renderQr leaves fillStyle white after painting the QR safety area.
      // Repaint the QR caption and safety footer explicitly in black so they
      // are visible both in Studio preview and in Book Builder/PDF export.
      ctx.save();
      ctx.fillStyle="#111";
      ctx.textAlign="center";
      ctx.font=`900 ${labelSize*s}px Arial, sans-serif`;
      ctx.fillText(String(settings.qrLabel||""),cx,qrY+qrSize+90*s);
      ctx.font=`400 ${footerSize*s}px Arial, sans-serif`;
      ctx.fillText(String(settings.footer||""),cx,canvas.height-245*s);
      ctx.restore();

      return canvas;
    }
  };

  window.FenixEndingRenderers=Object.freeze(patched);
})();

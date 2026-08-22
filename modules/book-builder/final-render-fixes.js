"use strict";
(()=>{
  // Book Builder production fixes. Keep Studio data untouched; only clean the final renderer.
  const standard=window.FenixStandardRenderers;
  if(standard?.render){
    window.FenixStandardRenderers=Object.freeze({
      modules:standard.modules,
      render(module,options,seed,pageNo=0,scale=1){
        const rendered=standard.render(module,options,seed,pageNo,scale);
        if(module!=="logic-studio"||!rendered?.pageCanvas)return rendered;
        const canvas=rendered.pageCanvas,ctx=canvas.getContext("2d"),s=canvas.width/850;
        // Logic pages must not contain the legacy Name line or their own page number.
        // Preserve the page frame while cleaning only the footer band.
        ctx.save();
        ctx.fillStyle="#fff";
        ctx.fillRect(39*s,990*s,772*s,71*s);
        ctx.strokeStyle="#111827";
        ctx.lineWidth=3*s;
        ctx.beginPath();
        ctx.moveTo(36*s,1064*s);
        ctx.lineTo(814*s,1064*s);
        ctx.stroke();
        ctx.restore();
        return rendered;
      }
    });
  }

  const ending=window.FenixEndingRenderers;
  if(ending?.render){
    window.FenixEndingRenderers=Object.freeze({
      ...ending,
      render(pageValue,options={}){
        const module=String(pageValue?.module||pageValue?.recipe?.module||"");
        if(module!=="qr-studio")return ending.render(pageValue,options);
        const page=structuredClone?structuredClone(pageValue):JSON.parse(JSON.stringify(pageValue));
        page.recipe=page.recipe||{};
        page.recipe.settings={...(page.recipe.settings||{})};
        // Legacy/empty QR settings are normalized for the final PDF.
        if(!String(page.recipe.settings.qrLabel||"").trim())page.recipe.settings.qrLabel="DISCOVER MORE BOOKS";
        if(String(page.recipe.settings.qrLabel||"").trim().toUpperCase()==="SCAN ME")page.recipe.settings.qrLabel="DISCOVER MORE BOOKS";
        if(!String(page.recipe.settings.footer||"").trim())page.recipe.settings.footer="Ask a grown-up for help before opening the link.";
        return ending.render(page,options);
      }
    });
  }
})();

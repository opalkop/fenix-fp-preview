"use strict";
(()=>{
  const original=window.FenixStandardRenderers;
  if(!original?.render)return;
  const cleanFooter=rendered=>{
    if(!rendered?.pageCanvas)return rendered;
    const c=rendered.pageCanvas,ctx=c.getContext("2d"),s=c.width/850;
    ctx.save();ctx.fillStyle="#fff";ctx.fillRect(39*s,985*s,772*s,76*s);ctx.strokeStyle="#111827";ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(36*s,1064*s);ctx.lineTo(814*s,1064*s);ctx.stroke();ctx.restore();return rendered;
  };
  window.FenixStandardRenderers=Object.freeze({
    modules:original.modules,
    render(module,...args){const rendered=original.render(module,...args);return module==="logic-studio"||module==="tracing-studio"?cleanFooter(rendered):rendered}
  });
})();

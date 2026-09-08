"use strict";
(()=>{
  if(!document.body?.classList.contains("fenix-studio-shell")||document.getElementById("fenixStudioActionStandard"))return;
  const style=document.createElement("style");
  style.id="fenixStudioActionStandard";
  style.textContent=`
    .fenix-standard-actions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;width:100%!important;margin:16px 0 8px!important;align-items:stretch!important}
    .fenix-standard-actions button{width:100%!important;min-height:46px!important;border-radius:10px!important;font-weight:900!important;margin:0!important;justify-content:center!important}
    .fenix-standard-actions [data-fenix-standard=refresh]{grid-column:1;background:#2563eb!important;border:1px solid #1d4ed8!important;color:#fff!important;box-shadow:0 4px 12px rgba(37,99,235,.25)!important}
    .fenix-standard-actions [data-fenix-standard=export]{grid-column:2;background:#f5f7fa!important;border:1px solid #cbd5df!important;color:#111827!important;box-shadow:none!important}
    .fenix-standard-actions [data-fenix-standard=new]{grid-column:1;background:#f5f7fa!important;border:1px solid #cbd5df!important;color:#111827!important;box-shadow:none!important}
    .fenix-standard-actions [data-fenix-standard=save]{grid-column:1/-1;background:#f97316!important;border:1px solid #ea580c!important;color:#fff!important;box-shadow:0 4px 12px rgba(249,115,22,.25)!important}
    .fenix-standard-actions [data-fenix-standard=refresh]:hover{background:#1d4ed8!important}
    .fenix-standard-actions [data-fenix-standard=save]:hover{background:#ea580c!important}
    @media(max-width:600px){.fenix-standard-actions{grid-template-columns:1fr!important}.fenix-standard-actions>*{grid-column:1!important}}
  `;
  document.head.appendChild(style);

  const buttons=()=>[...document.querySelectorAll("button")];
  const by=(ids,re)=>buttons().find(b=>ids.includes(b.id)||re.test((b.textContent||"").trim()));
  const refresh=by(["generate","fenixRefreshPreview"],/(odśwież\s*podgląd|generuj\s*(podgląd|stronę|serię))/i);
  const exp=by(["png","downloadPng"],/(eksport|pobierz).*\b(png|jpg|jpeg)\b/i);
  const fresh=by(["newPage"],/nowa\s*strona/i);
  const save=by(["cart","saveCart","savePage"],/(dodaj|zapisz|aktualizuj).*(stron|projekt)|do\s*projektu/i);
  if(!refresh&&!exp&&!fresh&&!save)return;

  const anchor=save||refresh||fresh||exp;
  const sourceHost=anchor?.closest(".actions,.coloring-actions,.panel-actions,.save-actions,.controls,.panel,.card")||anchor?.parentElement;
  if(!sourceHost)return;
  const bar=document.createElement("div");bar.className="fenix-standard-actions";
  const ordered=[[refresh,"refresh"],[exp,"export"],[fresh,"new"],[save,"save"]];
  ordered.forEach(([button,role])=>{if(!button)return;button.dataset.fenixStandard=role;bar.appendChild(button)});
  const status=sourceHost.querySelector(":scope > #status, :scope > .status, :scope > .status-line");
  if(status)sourceHost.insertBefore(bar,status);else sourceHost.appendChild(bar);
})();
"use strict";
(()=>{
  if(document.querySelector("#fenixHelpButton"))return;
  const script=[...document.scripts].find(item=>/\/assets\/help-overlay\.js(?:\?|$)/.test(item.src));
  const root=script?new URL("../",script.src):new URL("./",location.href);
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=new URL("assets/help-overlay.css?v=0.15.0",root).href;
  document.head.appendChild(link);
  const fenixModeStyle=document.querySelector('link[data-fenix-theme="fenix-mode"]');
  if(fenixModeStyle)document.head.appendChild(fenixModeStyle);

  const button=document.createElement("button");
  button.id="fenixHelpButton";
  button.type="button";
  button.textContent="? Jak pracować";
  button.setAttribute("aria-haspopup","dialog");

  const dialog=document.createElement("dialog");
  dialog.id="fenixHelpDialog";
  dialog.innerHTML=`
    <div class="fenix-help-head">
      <div><h2>Mapa pracy w FENIX</h2><p>Od projektu do gotowego PDF bez zgadywania, co zrobić dalej.</p></div>
      <button class="fenix-help-close" type="button" aria-label="Zamknij">×</button>
    </div>
    <div class="fenix-help-body">
      <div class="fenix-help-steps">
        <div class="fenix-help-step"><span>KROK 1</span>Wybierz projekt</div>
        <div class="fenix-help-step"><span>KROK 2</span>Generuj strony</div>
        <div class="fenix-help-step"><span>KROK 3</span>Dodaj do Koszyka</div>
        <div class="fenix-help-step"><span>KROK 4</span>Ułóż książkę</div>
        <div class="fenix-help-step"><span>KROK 5</span>Zapisz PDF</div>
      </div>
      <div class="fenix-help-grid">
        <article class="fenix-help-card"><h3>Dashboard</h3><p>Tworzenie i przełączanie projektów, kontrola Koszyka, import Mobile i wejście do Book Buildera.</p></article>
        <article class="fenix-help-card"><h3>Standardowe Studia</h3><p>Logic, Math, Alphabet, Tracing, Matching, Hidden Objects, Dot to Dot i Coloring. Generują serie stron według wspólnego schematu.</p></article>
        <article class="fenix-help-card"><h3>Maze Studio</h3><p>Specjalistyczna edycja labiryntów, zachowanie seeda, startu, mety, motywu i rozwiązania.</p></article>
        <article class="fenix-help-card"><h3>Complete the Picture</h3><p>Specjalistyczny generator z assetami, importem własnego obrazka, zoomem i podglądem rozwiązania.</p></article>
        <article class="fenix-help-card"><h3>Book Builder</h3><p>Finalny skład książki: kolejność stron, puste strony, rozwiązania, podgląd i zapis do PDF.</p></article>
        <article class="fenix-help-card"><h3>Najważniejsza kontrola</h3><p>Zawsze sprawdź nazwę aktywnego projektu przed dodaniem stron do Koszyka.</p></article>
      </div>
      <div class="fenix-help-note"><strong>Bezpieczna praca:</strong> przed większą zmianą eksportuj projekt. Przy zapisie PDF ustaw skalę 100% i wyłącz nagłówki oraz stopki przeglądarki.</div>
      <div class="fenix-help-actions"><a href="${new URL("index.html",root).href}">Przejdź do Dashboardu</a><a href="${new URL("modules/book-builder/index.html",root).href}">Otwórz Book Builder</a></div>
    </div>`;

  document.body.append(button,dialog);
  button.onclick=()=>dialog.showModal();
  dialog.querySelector(".fenix-help-close").onclick=()=>dialog.close();
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
})();

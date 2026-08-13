"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const dashboard=read("index.html");
const dashboardCss=read("assets/dashboard-v2.css");
const builder=read("modules/book-builder/index.html");
const builderCss=read("modules/book-builder/book-builder.css");

assert.match(dashboard,/id="bookBuilderGateway"[\s\S]*class="book-builder-gateway"/,"Dashboard powinien zawierać jedno główne wejście do Book Buildera.");
assert.ok(dashboard.indexOf('id="grid"')<dashboard.indexOf('id="bookBuilderGateway"'),"Kafel Book Buildera powinien znajdować się pod siatką Studiów.");
assert.match(dashboardCss,/\.book-builder-gateway\{[^}]*min-height:150px/,"Kafel Book Buildera powinien być wizualnie większy od zwykłego kafla Studia.");

const details=(builder.match(/<details\b/g)||[]).length;
assert.equal(details,5,"Book Builder powinien mieć pięć rozwijanych sekcji.");
assert.ok(builder.indexOf('class="controls book-builder-controls"')<builder.indexOf('class="workspace book-preview"'),"Ustawienia muszą znajdować się nad podglądem.");
assert.match(builderCss,/\.book-builder-layout[^\{]*\{[^}]*grid-template-columns:1fr!important/,"Book Builder powinien wymuszać jedną kolumnę.");
assert.match(builderCss,/\.book-builder-layout \.book-builder-controls[^\{]*\{[^}]*grid-row:1!important/,"Ustawienia powinny zajmować pierwszy rząd.");
assert.match(builderCss,/\.book-builder-layout \.book-preview[^\{]*\{[^}]*grid-row:2!important/,"Podgląd powinien zajmować drugi rząd.");

["cartSummary","contentSummary","bookTitle","format","pageNumbers","addBlank","includeSolutions","solutionLayout","validationSummary","previewBook","exportPdf","pageList"].forEach(id=>assert.match(builder,new RegExp(`id="${id}"`),`Brak kontrolki ${id}.`));
assert.match(builder,/core\/fenix-pdf\.js/,"Book Builder powinien ładować lokalny silnik PDF.");
assert.match(builder,/word-search-studio\/word-search-core\.js/,"Book Builder powinien ładować renderer Word Search.");
const builderJs=read("modules/book-builder/book-builder.js");
assert.match(builderJs,/isWordSearch/,"Book Builder powinien rozpoznawać strony Word Search.");
assert.match(builderJs,/FenixWordSearch\.render/,"Book Builder powinien odtwarzać Word Search z receptury.");
assert.match(builderJs,/if\(!canvas\)throw new Error/,"Eksport PDF powinien zgłaszać czytelny błąd brakującego canvasa.");
assert.doesNotMatch(builderJs,/window\.print\s*\(/,"Finalny eksport nie może otwierać okna drukowania.");

console.log("PASS book-builder-layout: duży kafel Dashboardu, 5 paneli i wymuszony układ góra–dół.");

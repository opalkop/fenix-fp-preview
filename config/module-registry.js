"use strict";

/**
 * Jedno źródło prawdy o modułach Feniksa.
 * Aktywne moduły zachowują dotychczasowy kontrakt FenixModuleRegistry.all().
 * Dashboard korzysta z FenixModuleRegistry.dashboard(), które dodaje również
 * moduły planowane bez mieszania ich z aktywnymi rendererami i walidatorami.
 */
const ACTIVE_MODULES=[
  {slug:"maze-studio",name:"Maze Studio",description:"Labirynty z regulacją trudności, startem, metą i rozwiązaniami.",icon:"◫",dashboardIcon:"MAZE",dashboardDescription:"Labirynty i rozwiązania",engine:"maze",types:[]},
  {slug:"word-search-studio",name:"Word Search Studio",description:"Wykreślanki z kontrolą wieku, trudności, seeda i rozwiązania.",icon:"WS",dashboardIcon:"WS",dashboardDescription:"Wykreślanki i klucze odpowiedzi",engine:"word-search",types:[]},
  {slug:"complete-picture",name:"Complete the Picture",description:"Dokończ obrazek i przygotuj zadania rysunkowe do druku.",icon:"◩",dashboardIcon:"CTP",dashboardDescription:"Dokończ obrazek / własne assety",engine:"complete-picture",types:[
    ["half-vertical","Dokończ drugą połowę — pionowo","Odtwórz brakującą pionową połowę obrazka."],
    ["half-horizontal","Dokończ drugą połowę — poziomo","Odtwórz brakującą poziomą połowę obrazka."],
    ["shadow-trace","Rysuj po cieniu / śladzie","Ćwicz prowadzenie linii po delikatnym śladzie."],
    ["grid-copy","Przerysuj obrazek w siatce","Skopiuj obrazek pole po polu."],
    ["missing-part","Dorysuj brakujący fragment","Uzupełnij usunięty fragment rysunku."],
    ["mirror-pair","Narysuj odbicie lustrzane","Narysuj lustrzane odbicie wzoru."]
  ]},
  {slug:"coloring-studio",name:"Coloring Studio",description:"Kolorowanki przygotowane do druku i zestawów tematycznych.",icon:"✎",dashboardIcon:"COL",dashboardDescription:"Kolorowanki generowane proceduralnie",engine:"standard",types:[
    ["mandala","Mandala dziecięca","Symetryczna kompozycja z dużymi polami do kolorowania."],
    ["animals","Zwierzęta geometryczne","Proste postacie budowane z figur i grubych konturów."],
    ["flowers","Kwiaty","Kilka dużych kwiatów przygotowanych do druku."],
    ["space","Kosmos","Rakiety, planety i gwiazdy w prostej scenie."],
    ["patterns","Wzory symetryczne","Powtarzalne ornamenty z dużymi zamkniętymi polami."],
    ["color-number","Koloruj według numerów","Pola oznaczone numerami odpowiadającymi kolorom."]
  ]},
  {slug:"tracing-studio",name:"Tracing Studio",description:"Linie, kształty i symbole do ćwiczenia motoryki małej.",icon:"〰",dashboardIcon:"TR",dashboardDescription:"Linie, kształty i ćwiczenia śledzenia",engine:"standard",types:[
    ["waves","Fale","Rzędy falistych linii do ćwiczenia płynnego ruchu ręki."],
    ["zigzag","Zygzaki","Łamane ścieżki o regulowanej trudności."],
    ["loops","Pętle","Powtarzalne pętle przygotowujące do pisania."],
    ["paths","Ścieżki między obiektami","Prowadzenie linii od początku do celu."],
    ["shapes","Kształty","Obrysowywanie podstawowych figur."],
    ["mixed","Pakiet mieszany","Jedna strona zawierająca kilka różnych rodzajów śladu."]
  ]},
  {slug:"matching-studio",name:"Matching Studio",description:"Dopasowywanie obrazków, par i logicznych powiązań.",icon:"⟷",dashboardIcon:"MAT",dashboardDescription:"Łączenie par i dopasowania",engine:"standard",types:[
    ["identical","Identyczne pary","Łączenie takich samych symboli z dwóch kolumn."],
    ["shape-shadow","Obrazek i cień","Dopasowanie symbolu do odpowiadającego mu konturu lub cienia."],
    ["number-quantity","Liczba i ilość","Łączenie cyfry z właściwą liczbą elementów."],
    ["letter-case","Wielka i mała litera","Łączenie wielkich liter z małymi."],
    ["operation-result","Działanie i wynik","Dopasowanie działania do prawidłowego wyniku."],
    ["category","Dopasuj kategorię","Łączenie elementów należących do wspólnej grupy."]
  ]},
  {slug:"alphabet-studio",name:"Alphabet Studio",description:"Ćwiczenia literowe i strony edukacyjne dla młodszych dzieci.",icon:"ABC",dashboardIcon:"ABC",dashboardDescription:"Litery, słowa i ćwiczenia alfabetu",engine:"standard",types:[
    ["letter-day","Litera dnia","Duża litera, mała litera i ćwiczenie rozpoznawania znaku."],
    ["trace","Śledzenie liter","Pisanie wielkich i małych liter po przerywanym śladzie."],
    ["find","Znajdź literę","Wyszukiwanie wskazanej litery wśród znaków podobnych."],
    ["match-case","Wielka i mała litera","Łączenie odpowiednich wielkich i małych liter."],
    ["missing","Brakujące litery","Uzupełnianie luk w krótkich fragmentach alfabetu."],
    ["words","Proste słowa","Przepisywanie krótkich angielskich słów."]
  ]},
  {slug:"math-studio",name:"Math Studio",description:"Zadania matematyczne o kontrolowanym poziomie trudności.",icon:"123",dashboardIcon:"123",dashboardDescription:"Ćwiczenia matematyczne",engine:"standard",types:[
    ["operations","Działania","Losowe działania dopasowane do wybranego zakresu liczbowego."],
    ["missing","Brakująca liczba","Uzupełnianie brakującego składnika lub wyniku."],
    ["compare","Porównywanie > < =","Wstawianie właściwego znaku między liczbami."],
    ["count","Policz obrazki","Liczenie symboli i wpisywanie wyniku."],
    ["pyramid","Piramidy liczbowe","Uzupełnianie pól na podstawie sum liczb niżej."],
    ["sequence","Ciągi liczbowe","Rozpoznawanie kroku i wpisywanie brakującej liczby."]
  ]},
  {slug:"dot-to-dot-studio",name:"Dot to Dot Studio",description:"Łączenie punktów z możliwością skalowania i personalizacji.",icon:"•—•",dashboardIcon:"DOT",dashboardDescription:"Połącz kropki i sekwencje",engine:"standard",types:[
    ["circle","Okrągły obrazek","Punkty prowadzące po zamkniętym, zaokrąglonym konturze."],
    ["star","Gwiazda","Łączenie punktów tworzących gwiazdę."],
    ["heart","Serce","Łączenie punktów tworzących serce."],
    ["flower","Kwiat","Łączenie punktów tworzących prosty kwiat."],
    ["spiral","Spirala","Łączenie punktów po coraz ciaśniejszej spirali."]
  ]},
  {slug:"hidden-objects-studio",name:"Hidden Objects Studio",description:"Obiekty szukane, dystraktory i kontrola powtórzeń assetów.",icon:"⌕",dashboardIcon:"HO",dashboardDescription:"Wyszukiwanie ukrytych elementów",engine:"standard",types:[
    ["symbols","Ukryte symbole","Wyszukiwanie wskazanych symboli w zagęszczonym polu."],
    ["numbers","Ukryte liczby","Wyszukiwanie konkretnych cyfr wśród dystraktorów."],
    ["letters","Ukryte litery","Wyszukiwanie wskazanych liter."],
    ["pairs","Znajdź pary","Odnajdywanie identycznych par wśród wielu elementów."],
    ["different","Znajdź różniący się element","Wskazanie jednego elementu, który nie pasuje do pozostałych."]
  ]},
  {slug:"logic-studio",name:"Logic Studio",description:"Zadania logiczne i łamigłówki do książek aktywności.",icon:"◇",dashboardIcon:"LOG",dashboardDescription:"Zadania logiczne i spostrzegawczość",engine:"standard",types:[
    ["sequence","Kontynuuj sekwencję","Dziecko rozpoznaje regułę powtarzania symboli i wpisuje kolejny element."],
    ["odd","Co nie pasuje?","W każdym rzędzie trzeba odnaleźć i zakreślić jeden element różniący się od pozostałych."],
    ["matrix","Brakujący element","Ćwiczenie z tabelą obrazkową, w której należy wskazać brakujący symbol."],
    ["sudoku","Sudoku obrazkowe 4×4","Każdy symbol może wystąpić tylko raz w wierszu i kolumnie."],
    ["analogy","Analogie obrazkowe","Należy rozpoznać zależność między symbolami i wybrać prawidłowe uzupełnienie."]
  ]}
];

const PLANNED_MODULES=[
  {slug:"certificate-studio",name:"Certificate Studio",dashboardIcon:"CERT",dashboardDescription:"Certyfikat ukończenia książki",status:"structure",planned:true},
  {slug:"intro-studio",name:"Intro Studio",dashboardIcon:"IN",dashboardDescription:"Intro + How to Play / How to Use",status:"structure",planned:true},
  {slug:"congratulations-studio",name:"Congratulations Studio",dashboardIcon:"CONG",dashboardDescription:"Strona gratulacyjna na zakończenie",status:"structure",planned:true},
  {slug:"solutions-studio",name:"Solutions Studio",dashboardIcon:"SOL",dashboardDescription:"Skład i organizacja rozwiązań",status:"structure",planned:true}
];

const freezeModule=module=>Object.freeze({...module,status:module.status||"ready",types:Object.freeze((module.types||[]).map(type=>Object.freeze(type)))});
window.FenixModules=Object.freeze(ACTIVE_MODULES.map(freezeModule));
window.FenixPlannedModules=Object.freeze(PLANNED_MODULES.map(freezeModule));

window.FenixModuleRegistry=Object.freeze({
  all:()=>window.FenixModules.slice(),
  dashboard:()=>[...window.FenixModules,...window.FenixPlannedModules],
  get:slug=>window.FenixModules.find(module=>module.slug===slug)||null,
  standard:()=>window.FenixModules.filter(module=>module.engine==="standard")
});

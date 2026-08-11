# FENIX — status refaktoryzacji

## Cel

Utrzymać jeden logiczny system bez powielonych silników, równoległych formatów danych i martwych warstw kodu, przy zachowaniu zgodności ze starymi projektami, FENIX Mobile i pracą lokalną.

## Zakończone

- jeden centralny rejestr modułów i typów ćwiczeń,
- schemat strony v3 i normalizacja Desktop/Mobile/Legacy,
- uproszczony `FenixCore` i jeden główny strumień zmian,
- ujednolicone formaty `a4`, `8.5x11`, `6x9`,
- wspólny profil produkcyjny 300 DPI i bleed/no-bleed,
- jeden `maze-core.js` dla Maze Studio i Book Buildera,
- usunięta kopia algorytmu Maze z Book Buildera,
- usunięty stary `maze-engine.js`,
- usunięty `studio-live-ui.js`,
- standardowe Studia rozdzielone na kontroler i wspólne renderery,
- typy ćwiczeń mają własną logikę zamiast kilku nazw prowadzących do tego samego generatora,
- Complete the Picture korzysta ze wspólnego core i biblioteki assetów projektu,
- Book Builder odtwarza strony proceduralne z receptury zamiast wymagać ciężkich bitmap,
- jeden centralny walidator projektu,
- import/eksport `.fenixproject` między komputerami,
- wspólny interfejs i pomoc na ekranach produkcyjnych,
- Diagnostyka Feniksa,
- automatyczna kontrola składni JS i lokalnych odwołań HTML,
- automatyczny audyt martwego kodu i dokładnych duplikatów,
- automatyczne budowanie paczki Portable dla Windows i Linux.

## Świadomie pozostawione

- `legacy/` — wyłącznie jako warstwa zgodności i odzyskiwania starszych danych; nie jest aktywną architekturą nowych modułów,
- obsługa `mobilePage` w normalizatorze — potrzebna do migracji wcześniejszych eksportów FENIX Mobile,
- kompatybilne stare zdarzenia `fenix-project-change` i `fenix-cart-change` — pozostawione, aby nie uszkodzić starszych integracji.

## Dalsze opcjonalne usprawnienia

Nie są wymagane do obecnej wersji Portable, ale mogą być wykonane przy dalszym rozwoju:

- IndexedDB lub backend dla bardzo dużych bibliotek projektów,
- testy end-to-end sterujące prawdziwą przeglądarką,
- wersja internetowa/SaaS,
- dalsze moduły produkcyjne.

## Zasada bezpieczeństwa

`main` pozostaje nienaruszony do czasu świadomego scalenia PR. Paczka Portable jest budowana z gałęzi refaktoryzacji dopiero po przejściu automatycznych kontroli.

# FENIX — Activity Book Studio

FENIX to lokalne studio do produkcji książek z ćwiczeniami dla dzieci (KDP): labirynty, wykreślanki, kolorowanki, szlaczki, łączenie w pary, zagadki logiczne i inne. Strony generowane w Studiach trafiają do wspólnego projektu, a **Book Builder** składa z nich gotową książkę z rozwiązaniami i eksportuje PDF.

Aplikacja działa w przeglądarce, bez instalacji, bez serwera i bez internetu.

- **Wersja:** zobacz `VERSION.txt`
- **Podgląd online:** https://opalkop.github.io/fenix-fp-preview/

## Uruchomienie

| System | Sposób |
|---|---|
| Windows | `START-FENIX-WINDOWS.bat` |
| Linux | `START-FENIX-LINUX.sh` |
| Każdy | otwórz `index.html` w Chrome, Edge lub Firefox |

Szczegóły dla użytkownika: `CZYTAJ-MNIE-START.txt` oraz `docs/USER-GUIDE.md`.

## Moduły

**Book Builder** — główny moduł: kolejność stron, strony puste, rozwiązania, plan produkcji, finalny PDF.

**Ćwiczenia:** Maze Studio · Word Search Studio · Complete the Picture · Coloring Studio · Tracing Studio · Matching Studio · Alphabet Studio · Math Studio · Dot to Dot Studio · Hidden Objects Studio · Logic Studio

**Strony książki:** Intro Studio · Congratulations Studio · Certificate Studio · QR Studio

Rejestr modułów: `config/module-registry.js`.

## Jak to działa

1. Dashboard (`index.html`) — tworzysz lub wybierasz projekt (format, spady, wiek, temat).
2. Studia (`modules/<nazwa>/`) — generujesz strony i dodajesz je do aktywnego projektu.
3. Book Builder — układasz książkę i eksportujesz PDF.
4. Projekty przenosisz między komputerami jako pliki `.fenixproject` (Eksportuj / Importuj projekt na Dashboardzie).

Dane projektów są zapisywane w przeglądarce (localStorage / IndexedDB).

## Struktura repozytorium

| Folder | Zawartość |
|---|---|
| `assets/` | Dashboard, wspólny wygląd i skrypty powłoki Studiów |
| `core/` | rdzeń: projekty, schemat stron, walidacja, PDF, synchronizacja, biblioteka assetów |
| `config/` | rejestr modułów i podział odpowiedzialności Studiów |
| `modules/` | Studia i Book Builder; `modules/shared/` — wspólne renderery |
| `book-assets/` | miejsce na assety książek |
| `tests/` | testy regresji (Node) i strony testów przeglądarkowych |
| `tools/` | audyt martwego kodu, audyt assetów, serwer lokalny, skrypty naprawcze |
| `docs/` | przewodnik użytkownika, architektura, standard assetów; `docs/archive/` — notatki historyczne |
| `legacy/` | częściowo odzyskany kod MBG; pełny silnik jest w repozytorium `opalkop/fenix-mbg` |

## Gałęzie i publikacja

- **`feature/fenix-portable-mobile`** — gałąź robocza. Tu trafia cały rozwój.
- Repozytorium `opalkop/fenix-fp-preview` automatycznie kopiuje tę gałąź (GitHub uruchamia synchronizację co kilka godzin) i publikuje ją na GitHub Pages. Synchronizację można też uruchomić ręcznie: fp-preview → Actions → Sync FP Preview → Run workflow. Nie edytuj kodu w fp-preview, bo zmiany zostaną nadpisane.
- `main` — stan gałęzi roboczej z 8 października 2026 (wcześniej stara v0.14). Nie aktualizuje się sam: aby go odświeżyć, przesuń go na `feature/fenix-portable-mobile`.

## Testy

Testy Node (`maze-smoke.test.cjs` wymaga dodatkowo pakietu `playwright`, pozostałe nie mają zależności):

```sh
for t in tests/*.test.cjs tests/*.test.js; do node "$t" || break; done
```

Kontrola martwego kodu: `node tools/dead-code-audit.mjs`

W przeglądarce: Dashboard → **Diagnostyka** (`tests/smoke.html`) oraz `tests/maze-regression.html`.

CI (`.github/workflows/`) uruchamia testy przy każdym pushu na gałąź roboczą.

## Licencja

Zobacz `LICENSE.txt`.

# Checklista ręcznej weryfikacji refaktoryzacji

## Dashboard i dane
- [ ] Dashboard uruchamia się lokalnie z `index.html`.
- [ ] Lista modułów zawiera wszystkie pozycje z centralnego rejestru.
- [ ] Można utworzyć, edytować, przełączyć i usunąć projekt.
- [ ] Nie można usunąć jedynego projektu.
- [ ] Stary `fenix-cart-v1` jest odzyskiwany bez utraty stron.
- [ ] Format A4 jest zapisany jako `a4` i poprawnie wyświetlany.
- [ ] Dodanie strony normalizuje ją do `schemaVersion: 3`.
- [ ] Import FENIX Mobile nie przechowuje równoległych kopii `mobilePage`.
- [ ] Eksport `.fenixproject` i `.fenixpack` zawiera wersję schematu.
- [ ] Zmiana Koszyka powoduje jeden zaplanowany render dashboardu.

## Wspólny wygląd
- [ ] Wszystkie standardowe Studia mają ten sam nagłówek, panele, formularze i przyciski.
- [ ] Maze Studio korzysta z tego samego układu wizualnego.
- [ ] Complete the Picture korzysta z tego samego układu wizualnego.
- [ ] Book Builder korzysta z tego samego nagłówka, paneli i kontrolek.
- [ ] Przełącznik motywu działa na każdym ekranie.
- [ ] Widok mobilny składa się do jednej kolumny.
- [ ] Aktywny projekt jest widoczny na ekranach produkcyjnych.

## Generowanie i eksport
- [ ] Standardowe Studia generują podgląd i zapisują strony do Koszyka.
- [ ] Maze Studio otwiera i zapisuje istniejące strony.
- [ ] Complete the Picture generuje serię i rozwiązanie.
- [ ] Book Builder odczytuje strony zapisane w nowym schemacie.
- [ ] Book Builder tworzy podgląd do druku.
- [ ] Brak błędów w konsoli podczas przechodzenia między modułami.

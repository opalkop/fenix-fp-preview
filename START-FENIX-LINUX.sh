#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$(pwd)/index.html" >/dev/null 2>&1 &
elif command -v gio >/dev/null 2>&1; then
  gio open "$(pwd)/index.html" >/dev/null 2>&1 &
else
  printf '%s\n' "Otwórz plik index.html w przeglądarce."
fi

#!/bin/bash

echo ""
echo " ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███╗   ███╗ "
echo " ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║████╗ ████║ "
echo " ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║██╔████╔██║ "
echo " ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║██║╚██╔╝██║ "
echo " ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝██║ ╚═╝ ██║ "
echo " ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ "
echo ""
echo " KI YouTube Studio — Backend wird gestartet..."
echo ""

# Zum Skriptordner wechseln
cd "$(dirname "$0")"

# Node.js prüfen
if ! command -v node &> /dev/null; then
  echo " [FEHLER] Node.js nicht gefunden!"
  echo ""
  echo " Installation:"
  echo "   macOS:  brew install node"
  echo "   Linux:  sudo apt install nodejs npm"
  echo ""
  exit 1
fi

# node_modules prüfen
if [ ! -d "node_modules" ]; then
  echo " [INFO] Abhängigkeiten werden installiert (einmalig)..."
  echo ""
  npm install
  if [ $? -ne 0 ]; then
    echo " [FEHLER] npm install fehlgeschlagen."
    exit 1
  fi
  echo ""
fi

# .env prüfen
if [ ! -f ".env" ]; then
  echo " [INFO] Erstelle .env aus .env.example..."
  cp .env.example .env
  echo " [INFO] Bitte trage deine API Keys in die Datei '.env' ein."
  echo ""
fi

echo " [OK] Starte NEXUM Backend auf http://localhost:3000"
echo ""
echo " Dashboard: http://localhost:3000"
echo " Schließe dieses Terminal NICHT — hier läuft der Server."
echo ""

# Browser öffnen (im Hintergrund, nach kurzer Verzögerung)
(sleep 2 && \
  if command -v open &> /dev/null; then
    open http://localhost:3000
  elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
  fi
) &

# Server starten
node server.js

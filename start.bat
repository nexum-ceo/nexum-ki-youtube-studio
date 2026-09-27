@echo off
chcp 65001 > nul
title NEXUM Studio

echo.
echo  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███╗   ███╗
echo  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║████╗ ████║
echo  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║██╔████╔██║
echo  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║██║╚██╔╝██║
echo  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝██║ ╚═╝ ██║
echo  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝
echo.
echo  KI YouTube Studio — Backend wird gestartet...
echo.

:: Node.js prüfen
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [FEHLER] Node.js nicht gefunden!
  echo.
  echo  Bitte Node.js von https://nodejs.org herunterladen und installieren.
  echo  Danach diese Datei erneut starten.
  echo.
  pause
  exit /b 1
)

:: In Projektordner wechseln
cd /d "%~dp0"

:: node_modules prüfen
if not exist "node_modules" (
  echo  [INFO] Abhängigkeiten werden installiert (einmalig)...
  echo.
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo  [FEHLER] npm install fehlgeschlagen.
    pause
    exit /b 1
  )
  echo.
)

:: .env prüfen
if not exist ".env" (
  echo  [INFO] Erstelle .env aus .env.example...
  copy ".env.example" ".env" >nul
  echo  [INFO] Bitte trage deine API Keys in die Datei ".env" ein.
  echo.
)

echo  [OK] Starte NEXUM Backend auf http://localhost:3000
echo.
echo  Das Dashboard öffnet sich in deinem Browser...
echo  Schließe dieses Fenster NICHT — es läuft der Backend-Server.
echo.

:: Browser öffnen (kurze Verzögerung damit der Server starten kann)
timeout /t 2 /nobreak >nul
start http://localhost:3000

:: Server starten
node server.js

echo.
echo  Server beendet.
pause

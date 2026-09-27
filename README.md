# NEXUM Studio 🎬

**KI-gestützte YouTube-Pipeline** — Skript, Voiceover, Video und Upload in einem Dashboard.

---

## 🚂 Deployment auf Railway (Cloud — empfohlen)

Railway schläft **nicht ein** und hat einen kostenlosen $5-Credit pro Monat.

### Schritt 1 — GitHub-Repository erstellen

1. Gehe zu [github.com](https://github.com) → **New repository**
2. Name: `NEXUM-studio` → **Create repository**
3. Lade den Ordnerinhalt hoch (**ohne** `node_modules/`, `.env`, `uploads/`):
   ```bash
   cd nexum/
   git init
   git add .
   git commit -m "NEXUM Studio initial"
   git remote add origin https://github.com/DEIN-NAME/nexum-studio.git
   git push -u origin main
   ```

### Schritt 2 — Auf Railway deployen

1. Gehe zu [railway.app](https://railway.app) → **New Project**
2. Wähle **Deploy from GitHub repo**
3. Verbinde dein GitHub-Konto und wähle `nexum-studio`
4. Railway erkennt `railway.json` automatisch → klicke **Deploy**

Railway gibt dir eine URL wie `https://nexum-studio-production.up.railway.app`

> **Vorteil:** Railway schläft **nicht ein** — kein Kaltstart wie bei Render Free-Tier.

### Schritt 3 — API Keys auf Railway eintragen

Im Railway-Dashboard → dein Service → **Variables** → diese Variablen setzen:

| Variable | Wert |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-...` |
| `ELEVENLABS_API_KEY` | `xi-api-key-...` |
| `SYNTEROLINK_API_KEY` | `sk-...` |
| `YOUTUBE_CLIENT_ID` | `...apps.googleusercontent.com` |
| `YOUTUBE_CLIENT_SECRET` | `GOCSPX-...` |
| `YOUTUBE_REDIRECT_URI` | `https://DEINE-URL.up.railway.app/api/youtube/callback` |

Danach **Redeploy** auslösen (oben rechts → „Deploy").

### Schritt 4 — YouTube OAuth für Cloud aktualisieren

1. Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
2. Dein Projekt → **APIs & Dienste → Anmeldedaten**
3. Dein OAuth2-Client → **Autorisierte Weiterleitungs-URIs** bearbeiten
4. URI hinzufügen: `https://DEINE-URL.up.railway.app/api/youtube/callback`
5. **Speichern**

---

## ☁️ Deployment auf Render (alternative Cloud)

### Schritt 1 — GitHub-Repository erstellen

*(gleich wie bei Railway, siehe oben)*

### Schritt 2 — Auf Render deployen

1. Gehe zu [render.com](https://render.com) → **New → Web Service**
2. Verbinde dein GitHub-Konto und wähle das `nexum-studio` Repository
3. Render erkennt `render.yaml` automatisch — einfach bestätigen
4. Klicke auf **Create Web Service**

Render gibt dir eine URL wie `https://nexum-studio.onrender.com`

> **Hinweis:** Der Free-Tier schläft nach 15 Minuten Inaktivität ein. Erster Aufruf dauert ~30 Sekunden.

### Schritt 3 — API Keys auf Render eintragen

Im Render-Dashboard → dein Service → **Environment** → diese Variablen setzen:

| Variable | Wert |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-...` |
| `ELEVENLABS_API_KEY` | `xi-api-key-...` |
| `SYNTEROLINK_API_KEY` | `sk-...` |
| `YOUTUBE_CLIENT_ID` | `...apps.googleusercontent.com` |
| `YOUTUBE_CLIENT_SECRET` | `GOCSPX-...` |
| `YOUTUBE_REDIRECT_URI` | `https://nexum-studio.onrender.com/api/youtube/callback` |

---

## 🖥️ Lokaler Start (ohne Cloud)

### Voraussetzung
- [Node.js](https://nodejs.org) (Version 18+)

### Windows
Doppelklick auf **`start.bat`**

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

Dashboard öffnet sich automatisch unter **http://localhost:3000**

---

## 🔑 API Keys eintragen

| Service | Key-Typ | Woher |
|---|---|---|
| **OpenRouter** | API Key | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **ElevenLabs** | API Key | elevenlabs.io → Profile → API Keys |
| **Synterolink** | API Key | Dein Synterolink-Account |
| **YouTube** | OAuth2 | Automatisch via Button „Testen" |

---

## YouTube OAuth2 einrichten (einmalig)

1. [console.cloud.google.com](https://console.cloud.google.com) → Neues Projekt
2. **YouTube Data API v3** aktivieren
3. **OAuth 2.0-Anmeldedaten** erstellen (Typ: Web-Anwendung)
4. Redirect-URIs eintragen:
   - Lokal: `http://localhost:3000/api/youtube/callback`
   - Railway: `https://DEINE-URL.up.railway.app/api/youtube/callback`
   - Render: `https://DEINE-URL.onrender.com/api/youtube/callback`
5. Client ID + Secret in Einstellungen oder `.env` eintragen
6. Dashboard → Einstellungen → YouTube → **Testen** → autorisieren

---

## Funktionen

| Feature | Service | Beschreibung |
|---|---|---|
| 🤖 **KI-Skript** | OpenRouter | Automatische Skript-Generierung für YouTube Shorts |
| 🎙️ **Voiceover** | ElevenLabs | Text-to-Speech auf Deutsch (11 Stimmen) |
| 🎬 **KI-Video** | Synterolink | Video-Generierung (9:16, Shorts-Format) |
| 📤 **Upload** | YouTube API | Direkt-Upload mit Titel, Tags und Beschreibung |

---

## Projektstruktur

```
nexum/
├── server.js          ← Express-Backend (API-Proxy + YouTube OAuth)
├── railway.json       ← Railway Deployment-Konfiguration
├── render.yaml        ← Render.com Deployment-Konfiguration
├── public/
│   └── index.html     ← Dashboard (automatisch ausgeliefert)
├── uploads/           ← Generierte Dateien (lokal persistent, Cloud ephemeral)
├── .env               ← Deine Keys (NICHT in Git pushen!)
├── .env.example       ← Vorlage
├── .gitignore         ← Schützt .env und node_modules
├── package.json
├── start.bat          ← Windows-Starter
└── start.sh           ← Mac/Linux-Starter
```

---

## Troubleshooting

**„Backend nicht erreichbar" (lokal)**
→ `start.bat` / `start.sh` ausführen. Port 3000 muss frei sein.

**Railway: Service startet nicht**
→ Logs im Railway-Dashboard prüfen. `npm install` muss ohne Fehler laufen.

**Render: Service schläft ein**
→ Erster Aufruf dauert ~30 Sekunden. Upgrade auf Paid-Tier für permanenten Betrieb.

**YouTube-Upload schlägt fehl**
→ Redirect-URI in Google Cloud Console muss exakt mit `YOUTUBE_REDIRECT_URI` übereinstimmen.

**Generierte Dateien auf Cloud weg nach Neustart**
→ Normal (ephemeral storage). Dateien direkt nach der Generierung herunterladen.

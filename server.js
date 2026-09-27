require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const fetch      = require('node-fetch');
const FormData   = require('form-data');
const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

const app    = express();
const PORT   = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// ── In-Memory Key-Store (überschreibbar via Frontend-Save) ──────────────────
const keys = {
  openrouter:   process.env.OPENROUTER_API_KEY   || '',
  elevenlabs:   process.env.ELEVENLABS_API_KEY    || '',
  synterolink:  process.env.SYNTEROLINK_API_KEY   || '',
  youtube_client_id:     process.env.YOUTUBE_CLIENT_ID     || '',
  youtube_client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
  youtube_redirect_uri:  process.env.YOUTUBE_REDIRECT_URI  || `http://localhost:${PORT}/api/youtube/callback`,
};
let youtubeTokens = null; // OAuth2-Tokens nach Authentifizierung

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ── Hilfsfunktion ────────────────────────────────────────────────────────────
function getOAuth2Client() {
  return new google.auth.OAuth2(
    keys.youtube_client_id,
    keys.youtube_client_secret,
    keys.youtube_redirect_uri
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// API-KEYS SPEICHERN / LADEN
// ═══════════════════════════════════════════════════════════════════════════════

// Keys vom Frontend speichern
app.post('/api/keys', (req, res) => {
  const { service, key, clientId, clientSecret } = req.body;
  if (service === 'openrouter')  keys.openrouter  = key;
  if (service === 'elevenlabs')  keys.elevenlabs  = key;
  if (service === 'synterolink') keys.synterolink = key;
  if (service === 'youtube') {
    keys.youtube_client_id     = clientId     || keys.youtube_client_id;
    keys.youtube_client_secret = clientSecret || keys.youtube_client_secret;
  }
  res.json({ ok: true });
});

// Keys abrufen (ohne Secret-Werte zurückzugeben)
app.get('/api/keys/status', (req, res) => {
  res.json({
    openrouter:  !!keys.openrouter,
    elevenlabs:  !!keys.elevenlabs,
    synterolink: !!keys.synterolink,
    youtube:     !!(keys.youtube_client_id && keys.youtube_client_secret),
    youtubeAuth: !!youtubeTokens,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KEY-TEST ENDPUNKTE
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/test/openrouter', async (req, res) => {
  const key = req.body.key || keys.openrouter;
  if (!key) return res.status(400).json({ error: 'Kein API Key' });
  try {
    const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': 'Bearer ' + key }
    });
    if (r.status === 401) return res.status(401).json({ error: 'Ungültiger API Key' });
    const d = await r.json();
    if (key) keys.openrouter = key;
    res.json({ ok: true, label: d.data?.label || 'OpenRouter' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/elevenlabs', async (req, res) => {
  const key = req.body.key || keys.elevenlabs;
  if (!key) return res.status(400).json({ error: 'Kein API Key' });
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key }
    });
    if (r.status === 401) return res.status(401).json({ error: 'Ungültiger API Key' });
    const d = await r.json();
    if (key) keys.elevenlabs = key;
    const tier = d.subscription?.tier || 'free';
    const charLeft = (d.subscription?.character_limit || 0) - (d.subscription?.character_count || 0);
    res.json({ ok: true, tier, charLeft });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/synterolink', async (req, res) => {
  const key = req.body.key || keys.synterolink;
  if (!key) return res.status(400).json({ error: 'Kein API Key' });
  try {
    const r = await fetch('https://api.synterolink.com/v1/models', {
      headers: { 'Authorization': 'Bearer ' + key }
    });
    if (r.status === 401) return res.status(401).json({ error: 'Ungültiger API Key' });
    if (!r.ok) return res.status(r.status).json({ error: 'Fehler ' + r.status });
    if (key) keys.synterolink = key;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KI-SKRIPT GENERIERUNG (OpenRouter)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/script/generate', async (req, res) => {
  const { topic, style, duration, model } = req.body;
  if (!keys.openrouter) return res.status(400).json({ error: 'OpenRouter API Key fehlt' });

  const systemPrompt = `Du bist ein professioneller YouTube-Shorts-Skriptschreiber für deutschsprachige KI-Content-Kanäle.
Schreibe prägnante, aufmerksamkeitsstarke Skripte für ${duration || 60}-Sekunden-Videos.
Stil: ${style || 'informativ und spannend'}. Immer auf Deutsch.`;

  const userPrompt = `Schreibe ein YouTube-Shorts-Skript über: "${topic}"
Format:
- HOOK (erste 3 Sekunden, knallharter Einstieg)
- MAIN (Hauptinhalt, 45-50 Sek)
- CTA (Call-to-Action, letzte 5 Sek)
Nur den gesprochenen Text, keine Regieanweisungen.`;

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + keys.openrouter,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexumo.studio',
        'X-Title': 'NEXUMO Studio'
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt }
        ],
        max_tokens: 1000
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: e.error?.message || 'Fehler ' + r.status });
    }
    const d = await r.json();
    const script = d.choices?.[0]?.message?.content || '';
    res.json({ ok: true, script });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VOICEOVER GENERIERUNG (ElevenLabs)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/voice/generate', async (req, res) => {
  const { text, voiceId, stability, similarity } = req.body;
  if (!keys.elevenlabs) return res.status(400).json({ error: 'ElevenLabs API Key fehlt' });
  if (!text)    return res.status(400).json({ error: 'Kein Text angegeben' });
  if (!voiceId) return res.status(400).json({ error: 'Keine Voice ID angegeben' });

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': keys.elevenlabs,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: stability ?? 0.5,
          similarity_boost: similarity ?? 0.75
        }
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: e.detail?.message || 'Fehler ' + r.status });
    }
    const buffer = await r.buffer();
    const filename = `voice_${Date.now()}.mp3`;
    const filepath = path.join('uploads', filename);
    fs.writeFileSync(filepath, buffer);
    res.json({ ok: true, file: `/uploads/${filename}`, size: buffer.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO GENERIERUNG (Synterolink)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/video/generate', async (req, res) => {
  const { prompt, model, duration, aspect_ratio } = req.body;
  if (!keys.synterolink) return res.status(400).json({ error: 'Synterolink API Key fehlt' });
  if (!prompt) return res.status(400).json({ error: 'Kein Prompt angegeben' });

  try {
    const r = await fetch('https://api.synterolink.com/v1/video/generations', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + keys.synterolink,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'grok-2-vision',
        prompt,
        duration: duration || 6,
        aspect_ratio: aspect_ratio || '9:16'
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: e.error?.message || 'Fehler ' + r.status });
    }
    const d = await r.json();
    res.json({ ok: true, jobId: d.id, status: d.status, data: d });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Video-Job Status abrufen
app.get('/api/video/status/:jobId', async (req, res) => {
  if (!keys.synterolink) return res.status(400).json({ error: 'Synterolink API Key fehlt' });
  try {
    const r = await fetch(`https://api.synterolink.com/v1/video/generations/${req.params.jobId}`, {
      headers: { 'Authorization': 'Bearer ' + keys.synterolink }
    });
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// YOUTUBE OAUTH2 + UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════

// Schritt 1: Auth-URL generieren
app.get('/api/youtube/auth', (req, res) => {
  if (!keys.youtube_client_id || !keys.youtube_client_secret) {
    return res.status(400).json({ error: 'YouTube Client ID und Secret fehlen' });
  }
  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent'
  });
  res.json({ ok: true, url });
});

// Schritt 2: OAuth2 Callback
app.get('/api/youtube/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Kein Code erhalten');
  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    youtubeTokens = tokens;
    res.send(`
      <html><body style="font-family:sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <div style="font-size:48px">✅</div>
          <h2 style="color:#4ade80">YouTube verbunden!</h2>
          <p style="color:#aaa">Du kannst dieses Fenster schließen und zu NEXUMO zurückkehren.</p>
        </div>
      </body></html>
    `);
  } catch (e) {
    res.status(500).send('Fehler: ' + e.message);
  }
});

// YouTube Auth-Status
app.get('/api/youtube/auth/status', (req, res) => {
  res.json({ connected: !!youtubeTokens });
});

// Video auf YouTube hochladen
app.post('/api/youtube/upload', upload.single('video'), async (req, res) => {
  if (!youtubeTokens) return res.status(401).json({ error: 'YouTube nicht authentifiziert – bitte zuerst /api/youtube/auth aufrufen' });

  const { title, description, tags, privacyStatus, categoryId } = req.body;
  const videoFile = req.file;
  if (!videoFile) return res.status(400).json({ error: 'Keine Video-Datei hochgeladen' });

  try {
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials(youtubeTokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2 });

    const r = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'NEXUMO Upload',
          description: description || '',
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          categoryId: categoryId || '28', // Science & Technology
          defaultLanguage: 'de',
          defaultAudioLanguage: 'de'
        },
        status: {
          privacyStatus: privacyStatus || 'private'
        }
      },
      media: {
        body: fs.createReadStream(videoFile.path)
      }
    });

    // Temp-Datei löschen
    fs.unlink(videoFile.path, () => {});

    res.json({
      ok: true,
      videoId: r.data.id,
      url: `https://www.youtube.com/watch?v=${r.data.id}`,
      title: r.data.snippet?.title
    });
  } catch (e) {
    fs.unlink(videoFile?.path || '', () => {});
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPLETTE PIPELINE (Alles in einem Schritt)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/pipeline/run', async (req, res) => {
  // Streaming SSE für Echtzeit-Fortschritt
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (step, data) => {
    res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);
  };

  const { topic, style, duration, voiceId, videoModel, videoPrompt, uploadToYt, ytTitle } = req.body;

  try {
    // Schritt 1: Skript generieren
    send('script', { status: 'start', message: 'Generiere Skript…' });
    const scriptResp = await fetch(`http://localhost:${PORT}/api/script/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, style, duration })
    });
    const scriptData = await scriptResp.json();
    if (!scriptData.ok) throw new Error('Skript-Fehler: ' + scriptData.error);
    send('script', { status: 'done', script: scriptData.script });

    // Schritt 2: Voiceover
    if (voiceId && keys.elevenlabs) {
      send('voice', { status: 'start', message: 'Generiere Voiceover…' });
      const voiceResp = await fetch(`http://localhost:${PORT}/api/voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scriptData.script, voiceId })
      });
      const voiceData = await voiceResp.json();
      if (!voiceData.ok) throw new Error('Voice-Fehler: ' + voiceData.error);
      send('voice', { status: 'done', file: voiceData.file });
    }

    // Schritt 3: Video generieren
    if (keys.synterolink) {
      send('video', { status: 'start', message: 'Generiere Video…' });
      const vidResp = await fetch(`http://localhost:${PORT}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt || topic,
          model: videoModel || 'grok-2-vision',
          duration: 6,
          aspect_ratio: '9:16'
        })
      });
      const vidData = await vidResp.json();
      if (!vidData.ok) throw new Error('Video-Fehler: ' + vidData.error);
      send('video', { status: 'done', jobId: vidData.jobId });
    }

    send('done', { status: 'done', message: 'Pipeline abgeschlossen ✓' });
    res.end();
  } catch (err) {
    send('error', { status: 'error', message: err.message });
    res.end();
  }
});

// ── Statische Uploads ausliefern ─────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    services: {
      openrouter:  !!keys.openrouter,
      elevenlabs:  !!keys.elevenlabs,
      synterolink: !!keys.synterolink,
      youtube:     !!youtubeTokens,
    }
  });
});

// ── Server starten ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║        NEXUMO Studio Backend             ║
║        http://localhost:${PORT}             ║
╚══════════════════════════════════════════╝

✓ Server läuft auf Port ${PORT}
→ Dashboard: http://localhost:${PORT}
→ Health:    http://localhost:${PORT}/api/health
  `);
});

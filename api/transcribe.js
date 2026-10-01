// Proxy de transcription (Cloudflare Worker).
// Reçoit l'audio brut en POST, le transmet à Whisper (langue arabe), renvoie { segments: [{ start, end, text }] }.
// La clé reste dans la variable d'environnement OPENAI_API_KEY. L'audio n'est jamais écrit : il ne vit qu'en mémoire
// le temps de la requête.

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'whisper-1';
const MAX_BYTES = 25 * 1024 * 1024; // limite de l'API Whisper
// Amorce : oriente Whisper vers l'orthographe coranique usuelle.
const PROMPT = 'بسم الله الرحمن الرحيم. الحمد لله رب العالمين.';

const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!allowed.includes(origin) && !isLocal) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403, cors);
    if (!env.OPENAI_API_KEY) return json({ error: 'config' }, 500, cors);

    const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim();
    const ext = EXTENSIONS[type];
    if (!ext) return json({ error: 'format' }, 415, cors);
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return json({ error: 'too-large' }, 413, cors);

    const audio = await request.arrayBuffer();
    if (!audio.byteLength) return json({ error: 'empty' }, 400, cors);
    if (audio.byteLength > MAX_BYTES) return json({ error: 'too-large' }, 413, cors);

    const form = new FormData();
    form.append('file', new File([audio], `audio.${ext}`, { type }));
    form.append('model', MODEL);
    form.append('language', 'ar');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('temperature', '0');
    form.append('prompt', PROMPT);

    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, 502, cors);

    const data = await upstream.json();
    const segments = (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: String(s.text ?? '').trim() }));
    return json({ segments }, 200, cors);
  },
};

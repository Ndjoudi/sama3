// SEUL point d'appel réseau du projet (§14.4).

// URL du proxy de transcription déployé (api/transcribe.js). Vide = pas encore configuré.
const TRANSCRIBE_URL = 'https://sama3-transcribe.djoudi-feed.workers.dev';
const TRANSCRIBE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024; // sous la limite Whisper de 25 Mo

const QURAN_TEXT_URL = new URL('../../content/quran-simple.json', import.meta.url);

// Codes : offline | http | timeout | invalid | too-large | quota | not-configured
export class ApiError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

async function request(url, { timeoutMs = 30000, ...init } = {}) {
  if (!navigator.onLine) throw new ApiError('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new ApiError(err.name === 'AbortError' ? 'timeout' : navigator.onLine ? 'http' : 'offline', err);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 413) throw new ApiError('too-large');
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error === 'quota' ? 'quota' : 'http', new Error(`HTTP ${res.status}`));
  }
  try {
    return await res.json();
  } catch (err) {
    throw new ApiError('invalid', err);
  }
}

// — Traduction et tafsir (§9) —
// Traduction : Rachid Maach, Quran.com v4, ressource 779.
// Tafsir : « L'Exégèse abrégée du Noble Coran » (Al-Mukhtasar), absente de Quran.com → QuranEnc.
const QURAN_COM = 'https://api.quran.com/api/v4';
const QURANENC = 'https://quranenc.com/api/v1';
export const TRANSLATION_ID = 779;
export const TAFSIR_KEY = 'french_mokhtasar';

// [{ id, name_simple, translated_name: { name }, verses_count }]
export async function fetchChapters() {
  const data = await request(`${QURAN_COM}/chapters?language=fr`);
  return data.chapters;
}

// Textes de traduction bruts d'une sourate, dans l'ordre des versets.
export async function fetchTranslation(surah) {
  const data = await request(`${QURAN_COM}/quran/translations/${TRANSLATION_ID}?chapter_number=${surah}`);
  return data.translations.map((t) => t.text);
}

// Tafsir d'une sourate : [{ aya, translation }].
export async function fetchTafsir(surah) {
  const data = await request(`${QURANENC}/translation/sura/${TAFSIR_KEY}/${surah}`);
  return data.result.map((r) => ({ aya: Number(r.aya), text: r.translation }));
}

// Texte coranique local (content/quran-simple.json). Mis en cache par le navigateur.
export function loadQuranText() {
  return request(QURAN_TEXT_URL);
}

// Audio → segments horodatés [{ start, end, text }] via le proxy.
export async function transcribe(blob, mime) {
  if (!TRANSCRIBE_URL) throw new ApiError('not-configured');
  if (blob.size > MAX_UPLOAD_BYTES) throw new ApiError('too-large');
  const data = await request(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': mime },
    body: blob,
    timeoutMs: TRANSCRIBE_TIMEOUT_MS,
  });
  if (!Array.isArray(data?.segments)) throw new ApiError('invalid');
  return data.segments;
}

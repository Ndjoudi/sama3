// Contenu d'affichage d'un passage : noms de sourates, texte arabe, traduction, tafsir.
// Traduction et tafsir passent par api.js puis sont gardés en cache IndexedDB (lecture hors ligne ensuite).

import { fetchChapters, fetchTranslation, fetchTafsir, TRANSLATION_ID, TAFSIR_KEY } from './api.js';
import * as quranRepo from './quranRepo.js';

const DB_NAME = 'sama3_cache';
const STORE = 'content';

let dbPromise = null;
const memory = new Map(); // évite de relire IndexedDB à chaque rendu

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function cacheGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cacheSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// Cache d'abord, réseau sinon. Retourne null si indisponible (hors ligne et jamais chargé).
async function cached(key, load) {
  if (memory.has(key)) return memory.get(key);
  let value = await cacheGet(key).catch(() => undefined);
  if (value === undefined) {
    try {
      value = await load();
      cacheSet(key, value).catch(() => {});
    } catch {
      return null;
    }
  }
  memory.set(key, value);
  return value;
}

// Notes de bas de page retirées : <sup …>1</sup> et [161].
function cleanText(html) {
  return String(html ?? '')
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

// { [surah]: { name, meaning } } ou null
export async function getChapters() {
  return cached('chapters:fr', async () => {
    const chapters = await fetchChapters();
    return Object.fromEntries(chapters.map((c) => [c.id, { name: c.name_simple, meaning: c.translated_name?.name ?? '' }]));
  });
}

async function getTranslations(surah) {
  return cached(`translation:${TRANSLATION_ID}:${surah}`, async () => (await fetchTranslation(surah)).map(cleanText));
}

async function getTafsirs(surah) {
  return cached(`tafsir:${TAFSIR_KEY}:${surah}`, async () => {
    const out = [];
    for (const { aya, text } of await fetchTafsir(surah)) out[aya - 1] = cleanText(text);
    return out;
  });
}

// Versets d'un passage : [{ surah, ayah, arabic, translation|null }]
export async function getPassageVerses({ surah, fromAyah, toAyah }) {
  await quranRepo.load();
  const translations = await getTranslations(surah);
  return quranRepo.range(surah, fromAyah, toAyah).map((v) => ({
    surah: v.s,
    ayah: v.a,
    arabic: v.text,
    translation: translations?.[v.a - 1] ?? null,
  }));
}

// Détail d'un verset : { surah, ayah, arabic, translation|null, tafsir|null }
export async function getVerseDetail(surah, ayah) {
  await quranRepo.load();
  const [translations, tafsirs] = await Promise.all([getTranslations(surah), getTafsirs(surah)]);
  return {
    surah,
    ayah,
    arabic: quranRepo.getVerse(surah, ayah)?.text ?? '',
    translation: translations?.[ayah - 1] ?? null,
    tafsir: tafsirs?.[ayah - 1] ?? null,
  };
}

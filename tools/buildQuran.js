// Génère content/quran-simple.json (6236 versets) depuis l'API Quran.com v4.
// Usage : node tools/buildQuran.js
// Texte : écriture imlaei (orthographe usuelle, la plus proche de ce que produit la transcription).

import { writeFile, mkdir } from 'node:fs/promises';
import { normalizeArabic } from '../src/utils/normalizeArabic.js';

const SOURCE = 'https://api.quran.com/api/v4/quran/verses/imlaei';
const OUTPUT = new URL('../content/quran-simple.json', import.meta.url);
const EXPECTED_VERSES = 6236;

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Quran.com : HTTP ${res.status}`);
const { verses } = await res.json();

const out = verses.map(({ verse_key, text_imlaei }) => {
  const [s, a] = verse_key.split(':').map(Number);
  const text = text_imlaei.trim();
  return { s, a, text, norm: normalizeArabic(text) };
});

if (out.length !== EXPECTED_VERSES) throw new Error(`${out.length} versets reçus, ${EXPECTED_VERSES} attendus`);
if (out.some((v) => !v.norm)) throw new Error('Verset vide après normalisation');

await mkdir(new URL('.', OUTPUT), { recursive: true });
// Un verset par ligne : diff lisible si on régénère.
await writeFile(OUTPUT, '[\n' + out.map((v) => JSON.stringify(v)).join(',\n') + '\n]\n');
console.log(`content/quran-simple.json : ${out.length} versets`);

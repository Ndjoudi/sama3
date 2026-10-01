// Texte coranique local : chargement unique et accès en mémoire.

import { loadQuranText } from './api.js';

let verses = null; // [{ s, a, text, norm }] dans l'ordre du mushaf
let firstIndex = null; // firstIndex[s] = index global du verset s:1
let loading = null;

export function load() {
  loading ??= loadQuranText()
    .then((data) => {
      verses = data;
      firstIndex = [];
      data.forEach((v, i) => {
        if (v.a === 1) firstIndex[v.s] = i;
      });
      return verses;
    })
    .catch((err) => {
      loading = null; // nouvel essai possible au prochain appel
      throw err;
    });
  return loading;
}

export function isLoaded() {
  return verses !== null;
}

// Tous les versets (ne pas modifier).
export function all() {
  return verses;
}

export function indexOf(surah, ayah) {
  return firstIndex[surah] + ayah - 1;
}

export function at(index) {
  return verses[index];
}

export function getVerse(surah, ayah) {
  return verses[indexOf(surah, ayah)] ?? null;
}

export function ayahCount(surah) {
  const start = firstIndex[surah];
  const end = surah < 114 ? firstIndex[surah + 1] : verses.length;
  return end - start;
}

// Versets fromAyah..toAyah inclus d'une sourate.
export function range(surah, fromAyah, toAyah) {
  const start = indexOf(surah, fromAyah);
  return verses.slice(start, start + (toAyah - fromAyah + 1));
}

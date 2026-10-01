// Reconnaissance des passages (§8) : transcription approximative → passages coraniques.
//
// 1. Chaque mot transcrit est normalisé puis rapproché du mot coranique le plus proche (tolérance aux fautes).
// 2. Index de bigrammes de mots sur `norm` : les bigrammes communs votent pour un alignement
//    (position dans le texte coranique − position dans le segment).
// 3. Les meilleurs alignements sont scorés finement (alignement mot à mot flou) → meilleure correspondance par segment.
// 4. Continuité : à score quasi égal, on préfère le candidat qui prolonge le passage en cours (versets répétés).
// 5. Les segments consécutifs sur des versets consécutifs fusionnent ; les versets intermédiaires sont comblés.

import { normalizeArabic } from '../utils/normalizeArabic.js';
import * as quranRepo from './quranRepo.js';

// — Réglages (constantes nommées, §8.5) —
export const MIN_CONFIDENCE = 0.5; // score minimal d'un segment ; en dessous il est ignoré
export const MIN_MATCHED_WORDS = 3; // un segment doit retrouver au moins ce nombre de mots
export const WORD_SIM_MIN = 0.7; // similarité minimale pour considérer deux mots comme identiques
export const TIE_MARGIN = 0.08; // écart de score considéré comme une égalité (règle de continuité)
export const MAX_GAP_AYAHS = 10; // nombre max de versets non entendus comblés à l'intérieur d'un passage
export const MAX_SILENCE_SEC = 45; // silence au-delà duquel on ouvre un nouveau passage
export const BACKTRACK_AYAHS = 1; // retour en arrière toléré (l'imam reprend un verset)

const NGRAM = 2;
const MAX_POSTINGS = 400; // bigramme trop courant pour voter utilement
const RARE_WORD_MAX = 6; // un mot isolé ne vote que s'il est rare
const DIAG_TOLERANCE = 4; // mots ajoutés / oubliés tolérés dans un alignement
const TOP_CANDIDATES = 6;
const BASMALA = { s: 1, a: 1 }; // seule, elle précède une sourate : ce n'est pas un passage

let index = null;

// ————————————————————————————————————————— Index

function buildIndex(verses) {
  const words = [];
  const wordVerse = [];
  verses.forEach((v, vi) => {
    for (const w of v.norm.split(' ')) {
      words.push(w);
      wordVerse.push(vi);
    }
  });

  const grams = new Map();
  for (let i = 0; i + NGRAM <= words.length; i++) {
    const key = words.slice(i, i + NGRAM).join(' ');
    let list = grams.get(key);
    if (!list) grams.set(key, (list = []));
    list.push(i);
  }

  const unigrams = new Map();
  words.forEach((w, i) => {
    let list = unigrams.get(w);
    if (!list) unigrams.set(w, (list = []));
    list.push(i);
  });

  // Bigrammes de lettres → mots du vocabulaire, pour retrouver vite les mots proches.
  const vocab = [...unigrams.keys()];
  const charGrams = new Map();
  vocab.forEach((w, wi) => {
    for (const g of new Set(letterPairs(w))) {
      let list = charGrams.get(g);
      if (!list) charGrams.set(g, (list = []));
      list.push(wi);
    }
  });

  return { verses, words, wordVerse, grams, unigrams, vocab, charGrams, corrections: new Map() };
}

function getIndex() {
  const verses = quranRepo.all();
  if (!index || index.verses !== verses) index = buildIndex(verses);
  return index;
}

// ————————————————————————————————————————— Mots

function letterPairs(w) {
  const padded = ` ${w} `;
  const out = [];
  for (let i = 0; i < padded.length - 1; i++) out.push(padded.slice(i, i + 2));
  return out;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function wordSimilarity(a, b) {
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// Mot transcrit → mot coranique le plus proche (ou lui-même si rien d'assez proche).
function correct(word, idx) {
  if (idx.unigrams.has(word)) return word;
  const cached = idx.corrections.get(word);
  if (cached) return cached;

  const pairs = new Set(letterPairs(word));
  const shared = new Map();
  for (const g of pairs) {
    for (const wi of idx.charGrams.get(g) ?? []) shared.set(wi, (shared.get(wi) ?? 0) + 1);
  }
  const minShared = Math.max(1, Math.floor(pairs.size / 2));
  let best = word;
  let bestSim = WORD_SIM_MIN;
  for (const [wi, n] of shared) {
    if (n < minShared) continue;
    const candidate = idx.vocab[wi];
    if (Math.abs(candidate.length - word.length) > 2) continue;
    const sim = wordSimilarity(word, candidate);
    if (sim > bestSim) {
      bestSim = sim;
      best = candidate;
    }
  }
  idx.corrections.set(word, best);
  return best;
}

// ————————————————————————————————————————— Un segment

// Alignement flou (plus longue sous-séquence commune pondérée) entre le segment et une fenêtre du texte.
function align(tokens, from, to, idx) {
  from = Math.max(0, from);
  to = Math.min(idx.words.length, to);
  const q = idx.words.slice(from, to);
  const n = tokens.length;
  const m = q.length;
  if (!n || !m) return null;

  const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = wordSimilarity(tokens[i - 1], q[j - 1]);
      const diag = sim >= WORD_SIM_MIN ? dp[i - 1][j - 1] + sim : 0;
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], diag);
    }
  }

  // Remontée : positions coraniques appariées.
  const matched = [];
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const sim = wordSimilarity(tokens[i - 1], q[j - 1]);
    if (sim >= WORD_SIM_MIN && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + sim)) < 1e-6) {
      matched.push(from + j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  if (!matched.length) return null;
  matched.reverse();

  // On écarte les versets de bord touchés par un seul mot (fin du verset précédent, etc.).
  const perVerse = new Map();
  for (const p of matched) perVerse.set(idx.wordVerse[p], (perVerse.get(idx.wordVerse[p]) ?? 0) + 1);
  const solid = (vi) => perVerse.get(vi) >= Math.min(2, idx.verses[vi].norm.split(' ').length);
  let lo = 0;
  let hi = matched.length - 1;
  while (lo < hi && !solid(idx.wordVerse[matched[lo]])) lo++;
  while (hi > lo && !solid(idx.wordVerse[matched[hi]])) hi--;
  const kept = matched.slice(lo, hi + 1);

  const weight = dp[n][m] * (kept.length / matched.length);
  const span = kept.at(-1) - kept[0] + 1;
  return {
    firstVerse: idx.wordVerse[kept[0]],
    lastVerse: idx.wordVerse[kept.at(-1)],
    matched: kept.length,
    score: (2 * weight) / (n + span),
  };
}

// Alignements candidats : vote des bigrammes (et mots rares) par diagonale.
function candidateWindows(tokens, idx) {
  const votes = new Map();
  const vote = (positions, offset, weight) => {
    for (const p of positions) {
      const d = p - offset;
      votes.set(d, (votes.get(d) ?? 0) + weight);
    }
  };
  for (let i = 0; i + NGRAM <= tokens.length; i++) {
    const postings = idx.grams.get(tokens.slice(i, i + NGRAM).join(' '));
    if (postings && postings.length <= MAX_POSTINGS) vote(postings, i, 1 / Math.log2(1 + postings.length));
  }
  tokens.forEach((t, i) => {
    const postings = idx.unigrams.get(t);
    if (postings && postings.length <= RARE_WORD_MAX) vote(postings, i, 0.5 / postings.length);
  });

  // Regroupe les diagonales proches (mots insérés / oubliés).
  const sorted = [...votes].sort((a, b) => a[0] - b[0]);
  const clusters = [];
  for (const [d, w] of sorted) {
    const last = clusters.at(-1);
    if (last && d - last.to <= DIAG_TOLERANCE) {
      last.to = d;
      last.weight += w;
    } else clusters.push({ from: d, to: d, weight: w });
  }
  return clusters.sort((a, b) => b.weight - a.weight).slice(0, TOP_CANDIDATES);
}

function slackFor(tokens) {
  return Math.max(DIAG_TOLERANCE, Math.ceil(tokens.length * 0.3));
}

function sameSurah(a, b, idx) {
  return idx.verses[a].s === idx.verses[b].s;
}

// Le candidat prolonge-t-il le passage en cours ?
function continues(passage, cand, idx) {
  return (
    sameSurah(passage.lastVerse, cand.firstVerse, idx) &&
    cand.firstVerse >= passage.lastVerse - BACKTRACK_AYAHS &&
    cand.firstVerse <= passage.lastVerse + MAX_GAP_AYAHS + 1
  );
}

function scoreSegment(tokens, current, idx) {
  const slack = slackFor(tokens);
  const candidates = candidateWindows(tokens, idx)
    .map((c) => align(tokens, c.from - slack, c.to + tokens.length + slack, idx))
    .filter(Boolean);

  // Candidat « suite logique » : la fenêtre qui commence où le passage en cours s'est arrêté.
  if (current) {
    const verseStart = wordStartOf(current.lastVerse, idx);
    const next = align(tokens, verseStart - slack, verseStart + tokens.length * 2 + slack, idx);
    if (next) candidates.push(next);
  }

  // Un candidat qui déborde sur la sourate suivante est ramené à sa sourate de départ.
  for (const c of candidates) {
    if (!sameSurah(c.firstVerse, c.lastVerse, idx)) {
      while (!sameSurah(c.firstVerse, c.lastVerse, idx)) c.lastVerse--;
    }
  }

  const valid = candidates
    .filter((c) => c.score >= MIN_CONFIDENCE && c.matched >= MIN_MATCHED_WORDS)
    .sort((a, b) => b.score - a.score);
  if (!valid.length) return { best: null, candidates };

  const top = valid[0];
  const follow = current && valid.find((c) => c.score >= top.score - TIE_MARGIN && continues(current, c, idx));
  return { best: follow ?? top, candidates: valid };
}

// Position du premier mot d'un verset dans le flux de mots.
function wordStartOf(verseIndex, idx) {
  idx.verseStarts ??= (() => {
    const starts = new Int32Array(idx.verses.length);
    for (let p = idx.wordVerse.length - 1; p >= 0; p--) starts[idx.wordVerse[p]] = p;
    return starts;
  })();
  return idx.verseStarts[verseIndex];
}

// ————————————————————————————————————————— Passages

function toPassage(p, idx) {
  const first = idx.verses[p.firstVerse];
  const last = idx.verses[p.lastVerse];
  return {
    surah: first.s,
    fromAyah: first.a,
    toAyah: last.a,
    confidence: Math.round((p.scoreSum / p.weightSum) * 100) / 100,
  };
}

function isLoneBasmala(p) {
  return p.surah === BASMALA.s && p.fromAyah === BASMALA.a && p.toAyah === BASMALA.a;
}

// Analyse détaillée (utilisée par la page de test) : passages + décision par segment.
export async function analyze(segments) {
  await quranRepo.load();
  const idx = getIndex();
  const passages = [];
  const details = [];
  let current = null;

  for (const seg of segments) {
    const tokens = normalizeArabic(seg.text).split(' ').filter(Boolean).map((w) => correct(w, idx));
    const { best } = tokens.length ? scoreSegment(tokens, current, idx) : { best: null };
    details.push({ segment: seg, tokens, best: best && { ...best, ...verseRef(best, idx) } });
    if (!best) continue;

    const silence = current ? seg.start - current.lastTime : 0;
    if (current && continues(current, best, idx) && silence <= MAX_SILENCE_SEC) {
      current.lastVerse = Math.max(current.lastVerse, best.lastVerse);
      current.lastTime = seg.end;
      current.scoreSum += best.score * best.matched;
      current.weightSum += best.matched;
    } else {
      if (current) passages.push(current);
      current = {
        firstVerse: best.firstVerse,
        lastVerse: best.lastVerse,
        lastTime: seg.end,
        scoreSum: best.score * best.matched,
        weightSum: best.matched,
      };
    }
  }
  if (current) passages.push(current);

  return {
    passages: passages.map((p) => toPassage(p, idx)).filter((p) => !isLoneBasmala(p)),
    details,
  };
}

function verseRef(c, idx) {
  const a = idx.verses[c.firstVerse];
  const b = idx.verses[c.lastVerse];
  return { ref: `${a.s}:${a.a}${b.a !== a.a ? `-${b.a}` : ''}` };
}

// segments : [{ start, end, text }] dans l'ordre → passages [{ surah, fromAyah, toAyah, confidence }]
export async function match(segments) {
  return (await analyze(segments)).passages;
}

// File d'attente (§7) : traite les enregistrements un par un dès que le réseau est disponible.
// transcription → matcher → session dans le store → suppression de l'audio (jamais avant).

import * as audioStore from './audioStore.js';
import * as store from './store.js';
import * as quranRepo from './quranRepo.js';
import { transcribe } from './api.js';
import { match } from './matcher.js';
import { recordingId } from '../utils/ids.js';
import { labels } from '../labels.js';

const listeners = new Set();
let running = false;
let started = false;

// Événements : { type: 'change' } | { type: 'done', sessionId }
function emit(event) {
  for (const fn of listeners) fn(event);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isOnline() {
  return navigator.onLine;
}

// Enregistrements en attente / en cours / en erreur, sans le blob.
export async function items() {
  const records = await audioStore.list();
  return records.map(({ blob, ...rest }) => ({ ...rest, size: blob?.size ?? 0 }));
}

// Démarrage de l'app : reprend ce qui était « en cours » lors d'une fermeture brutale, puis traite.
export async function init() {
  if (started) return;
  started = true;
  for (const r of await audioStore.list()) {
    if (r.status === audioStore.STATUS.processing) await audioStore.updateStatus(r.id, audioStore.STATUS.pending);
  }
  const wake = () => {
    emit({ type: 'change' });
    processAll();
  };
  window.addEventListener('online', wake);
  window.addEventListener('offline', () => emit({ type: 'change' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') processAll();
  });
  emit({ type: 'change' });
  processAll();
}

// Résultat du recorder { blob, mime, startedAt, durationSec } → IndexedDB (statut pending), puis traitement.
export async function enqueue({ blob, mime, startedAt, durationSec }) {
  await audioStore.add({ id: recordingId(startedAt), createdAt: startedAt.toISOString(), durationSec, mime, blob });
  emit({ type: 'change' });
  processAll();
}

export async function retry(id) {
  await audioStore.updateStatus(id, audioStore.STATUS.pending);
  emit({ type: 'change' });
  processAll();
}

export async function processAll() {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    for (;;) {
      const next = (await audioStore.list()).find((r) => r.status === audioStore.STATUS.pending);
      if (!next || !navigator.onLine) break;
      const ok = await processOne(next);
      if (!ok && !navigator.onLine) break;
    }
  } finally {
    running = false;
  }
}

async function processOne(record) {
  await audioStore.updateStatus(record.id, audioStore.STATUS.processing);
  emit({ type: 'change' });
  try {
    const segments = await transcribe(record.blob, record.mime);
    await quranRepo.load();
    const passages = await match(segments);
    store.addSession({
      id: record.id,
      createdAt: record.createdAt,
      durationSec: record.durationSec,
      label: labels.session.defaultLabel,
      passages,
    });
    // La session est écrite : l'audio peut maintenant disparaître (§7).
    await audioStore.delete(record.id);
    emit({ type: 'change' });
    emit({ type: 'done', sessionId: record.id });
    return true;
  } catch (err) {
    const code = err?.code ?? 'unknown';
    // Réseau perdu en cours de route : on remet en attente, sans erreur visible.
    if (code === 'offline') await audioStore.updateStatus(record.id, audioStore.STATUS.pending);
    else await audioStore.updateStatus(record.id, audioStore.STATUS.error, code);
    emit({ type: 'change' });
    return false;
  }
}

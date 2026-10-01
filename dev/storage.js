// Test manuel du stockage : sessions (localStorage) et audio en attente (IndexedDB).
import { Button } from '../src/components/atoms/Button.js';
import { Text } from '../src/components/atoms/Text.js';
import * as store from '../src/services/store.js';
import * as audioStore from '../src/services/audioStore.js';
import { recordingId } from '../src/utils/ids.js';
import { formatDate, formatTime, formatDuration } from '../src/utils/format.js';

const root = document.getElementById('demo');
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Tarawih'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Date factice unique : maintenant moins quelques minutes aléatoires.
function fakeDate() {
  return new Date(Date.now() - Math.floor(Math.random() * 1e7) * 1000);
}

function block(title, actions, output) {
  const el = document.createElement('section');
  el.className = 'dev__section';
  const row = document.createElement('div');
  row.className = 'dev__row';
  row.append(...actions);
  el.append(Text({ text: title, variant: 'label' }), row, output);
  return el;
}

function logArea() {
  const el = document.createElement('div');
  el.className = 'dev__stack dev__log';
  return el;
}

function entry(text, onDelete) {
  const row = document.createElement('div');
  row.className = 'dev__entry';
  row.append(Text({ text, variant: 'small' }), Button({ label: 'Suppr.', variant: 'danger', onClick: onDelete }));
  return row;
}

// — Sessions —
const sessionsOut = logArea();
function renderSessions() {
  const sessions = store.getSessions();
  sessionsOut.replaceChildren(
    Text({ text: `${sessions.length} session(s) — localStorage « sama3_state »`, variant: 'small', tone: 'muted' }),
    ...sessions.map((s) =>
      entry(
        `${s.id} · ${s.label} · ${formatDate(s.createdAt)} ${formatTime(s.createdAt)} · ${formatDuration(s.durationSec)} · ${s.passages.map((p) => `${p.surah}:${p.fromAyah}-${p.toAyah}`).join(', ')}`,
        () => store.deleteSession(s.id),
      ),
    ),
  );
}
store.subscribe(renderSessions);

function addFakeSession() {
  const date = fakeDate();
  const surah = 1 + Math.floor(Math.random() * 114);
  store.addSession({
    id: recordingId(date),
    createdAt: date.toISOString(),
    durationSec: 300 + Math.floor(Math.random() * 1200),
    label: pick(PRAYERS),
    passages: [
      { surah: 1, fromAyah: 1, toAyah: 7, confidence: 0.91 },
      { surah, fromAyah: 1, toAyah: 3, confidence: 0.74 },
    ],
  });
}

// — Audio en attente —
const pendingOut = logArea();
async function renderPending() {
  const records = await audioStore.list();
  pendingOut.replaceChildren(
    Text({ text: `${records.length} enregistrement(s) — IndexedDB « sama3 / pending »`, variant: 'small', tone: 'muted' }),
    ...records.map((r) => {
      const row = entry(
        `${r.id} · ${r.status}${r.errorMessage ? ` (${r.errorMessage})` : ''} · ${formatDuration(r.durationSec)} · ${r.mime} · ${r.blob.size} o`,
        async () => {
          await audioStore.delete(r.id);
          renderPending();
        },
      );
      const cycle = { pending: 'processing', processing: 'error', error: 'pending' };
      row.append(
        Button({
          label: '→ ' + cycle[r.status],
          variant: 'secondary',
          onClick: async () => {
            await audioStore.updateStatus(r.id, cycle[r.status], cycle[r.status] === 'error' ? 'network' : null);
            renderPending();
          },
        }),
      );
      return row;
    }),
  );
}

async function addFakePending() {
  const date = fakeDate();
  await audioStore.add({
    id: recordingId(date),
    createdAt: date.toISOString(),
    durationSec: 60 + Math.floor(Math.random() * 1500),
    mime: 'audio/webm',
    blob: new Blob([new Uint8Array(1024)], { type: 'audio/webm' }),
  });
  renderPending();
}

root.append(
  Text({ text: 'Stockage', variant: 'display' }),
  block('Sessions (store)', [Button({ label: 'Ajouter une session factice', onClick: addFakeSession })], sessionsOut),
  block('Audio en attente (audioStore)', [Button({ label: 'Ajouter un audio factice', onClick: addFakePending })], pendingOut),
);

renderSessions();
renderPending();

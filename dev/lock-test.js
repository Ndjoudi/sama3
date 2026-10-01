// Test de faisabilité §6 : l'enregistrement continue-t-il écran verrouillé ?
// Autonome volontairement (n'utilise pas recorder.js) : on teste le navigateur, pas notre code.
import { Button } from '../src/components/atoms/Button.js';
import { Badge } from '../src/components/atoms/Badge.js';
import { Text } from '../src/components/atoms/Text.js';
import { formatDuration } from '../src/utils/format.js';

const TIMESLICE_MS = 1000;
const CHUNK_GAP_ALERT_MS = 3000; // écart entre deux morceaux au-delà duquel on soupçonne un trou
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];

const root = document.getElementById('demo');
const timerEl = Text({ text: '00:00', variant: 'display', numeric: true });
const statusEl = document.createElement('div');
const resultEl = document.createElement('div');
resultEl.className = 'dev__stack';
const logEl = document.createElement('div');
logEl.className = 'dev__stack dev__log';

let recorder, stream, chunks, chunkTimes, startedAt, tick;

function log(message) {
  const t = startedAt ? formatDuration((Date.now() - startedAt) / 1000) : '--:--';
  logEl.prepend(Text({ text: `${t}  ${message}`, variant: 'small', tone: 'muted' }));
}

function setStatus(text, tone) {
  statusEl.replaceChildren(Badge({ text, tone }));
}

const startBtn = Button({ label: 'Démarrer le test', icon: 'mic', block: true, onClick: start });
const stopBtn = Button({ label: 'Arrêter', icon: 'stop', variant: 'danger', block: true, disabled: true, onClick: stop });

async function start() {
  resultEl.replaceChildren();
  logEl.replaceChildren();
  const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setStatus(`Micro refusé : ${err.name}`, 'danger');
    return;
  }
  recorder = new MediaRecorder(stream, { mimeType: mime || undefined, audioBitsPerSecond: 32000 });
  chunks = [];
  chunkTimes = [];
  startedAt = Date.now();

  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
    const now = Date.now();
    const prev = chunkTimes.at(-1);
    if (prev && now - prev > CHUNK_GAP_ALERT_MS) log(`⚠ trou probable : ${Math.round((now - prev) / 1000)} s sans morceau`);
    chunkTimes.push(now);
  };
  recorder.onerror = (e) => log(`erreur recorder : ${e.error?.name ?? e.type}`);
  recorder.onpause = () => log('recorder en pause (système)');
  recorder.onresume = () => log('recorder reprend');
  recorder.onstop = finish;

  const track = stream.getAudioTracks()[0];
  track.onmute = () => log('piste audio coupée (mute)');
  track.onunmute = () => log('piste audio rétablie (unmute)');
  track.onended = () => log('piste audio terminée par le système');

  recorder.start(TIMESLICE_MS);
  log(`démarré — format : ${recorder.mimeType || 'défaut'}`);
  setStatus('Enregistrement', 'danger');
  startBtn.disabled = true;
  stopBtn.disabled = false;
  tick = setInterval(() => {
    timerEl.textContent = formatDuration((Date.now() - startedAt) / 1000);
  }, 500);
}

function stop() {
  if (recorder?.state !== 'inactive') recorder.stop();
}

async function finish() {
  clearInterval(tick);
  stream.getTracks().forEach((t) => t.stop());
  const wallSec = (Date.now() - startedAt) / 1000;
  const blob = new Blob(chunks, { type: recorder.mimeType });
  let fileSec = NaN;
  try {
    const ctx = new AudioContext();
    fileSec = (await ctx.decodeAudioData(await blob.arrayBuffer())).duration;
    ctx.close();
  } catch (err) {
    log(`décodage impossible : ${err.name}`);
  }
  const missing = wallSec - fileSec;
  const ok = Number.isFinite(fileSec) && missing < 2;

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = URL.createObjectURL(blob);

  resultEl.replaceChildren(
    Badge({ text: ok ? 'Test concluant' : 'Test échoué', tone: ok ? 'success' : 'danger', icon: ok ? 'check' : 'error' }),
    Text({ text: `Durée réelle (horloge) : ${formatDuration(wallSec)}` }),
    Text({ text: `Durée du fichier : ${Number.isFinite(fileSec) ? formatDuration(fileSec) : 'inconnue'}` }),
    Text({ text: `Audio manquant : ${Number.isFinite(missing) ? `${missing.toFixed(1)} s` : '?'}`, tone: ok ? 'muted' : 'accent' }),
    Text({ text: `${chunks.length} morceaux · ${(blob.size / 1024).toFixed(0)} Ko · ${blob.type}`, variant: 'small', tone: 'muted' }),
    audio,
  );
  setStatus('Terminé', ok ? 'success' : 'danger');
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

document.addEventListener('visibilitychange', () => {
  if (recorder?.state === 'recording') log(`page ${document.visibilityState === 'hidden' ? 'masquée (écran éteint ?)' : 'visible'}`);
});

const head = document.createElement('div');
head.className = 'dev__stack';
head.append(
  Text({ text: 'Test écran verrouillé', variant: 'title' }),
  Text({ text: 'Démarre, verrouille le téléphone 5 minutes, déverrouille, arrête.', variant: 'small', tone: 'muted' }),
  statusEl,
  timerEl,
  startBtn,
  stopBtn,
  resultEl,
);
root.append(head, logEl);
setStatus('Prêt', 'neutral');

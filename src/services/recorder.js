// Enregistrement micro via MediaRecorder (§6).
// Un seul enregistrement à la fois. L'audio partiel est conservé si le système coupe le micro.
// L'écran est maintenu allumé pendant l'enregistrement (wakeLock.js).

import * as wakeLock from './wakeLock.js';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
const BITRATE = 32000;
const TIMESLICE_MS = 1000; // morceaux réguliers : rien n'est perdu en cas d'interruption
const METER_FLOOR_DB = -60; // en dessous : silence (niveau 0)
const METER_CURVE = 2; // > 1 : les sons faibles restent bas, les pics ressortent
const METER_FFT = 1024;

// Codes d'erreur (libellés dans labels.js).
export const RECORDER_ERROR = Object.freeze({
  denied: 'mic-denied',
  noMic: 'mic-missing',
  unsupported: 'unsupported',
  failed: 'mic-failed',
});

export class RecorderError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

let current = null; // { recorder, stream, chunks, startedAt, stopping, onInterrupted, meter }

export function isSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

export function isRecording() {
  return current !== null;
}

// Secondes écoulées depuis le début (horloge murale : juste même écran éteint).
export function elapsedSec() {
  return current ? (Date.now() - current.startedAt.getTime()) / 1000 : 0;
}

function pickMime() {
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
}

// Analyseur du niveau sonore, branché sur le flux micro. Facultatif : l'enregistrement marche sans.
function createMeter(stream) {
  try {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = METER_FFT;
    ctx.createMediaStreamSource(stream).connect(analyser);
    ctx.resume?.();
    return { ctx, analyser, buffer: new Float32Array(METER_FFT) };
  } catch {
    return null;
  }
}

// Niveau sonore instantané entre 0 (silence) et 1 (très fort), échelle en décibels.
export function level() {
  const meter = current?.meter;
  if (!meter) return 0;
  meter.analyser.getFloatTimeDomainData(meter.buffer);
  let sum = 0;
  for (const v of meter.buffer) sum += v * v;
  const rms = Math.sqrt(sum / meter.buffer.length);
  if (!rms) return 0;
  const db = 20 * Math.log10(rms);
  const linear = Math.min(1, Math.max(0, (db - METER_FLOOR_DB) / -METER_FLOOR_DB));
  return linear ** METER_CURVE;
}

// onInterrupted(result) : appelé si le système arrête l'enregistrement de lui-même.
export async function start({ onInterrupted } = {}) {
  if (current) return;
  if (!isSupported()) throw new RecorderError(RECORDER_ERROR.unsupported);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
  } catch (err) {
    const code =
      err.name === 'NotAllowedError' || err.name === 'SecurityError'
        ? RECORDER_ERROR.denied
        : err.name === 'NotFoundError'
          ? RECORDER_ERROR.noMic
          : RECORDER_ERROR.failed;
    throw new RecorderError(code, err);
  }

  const mime = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime || undefined, audioBitsPerSecond: BITRATE });
  const session = { recorder, stream, chunks: [], startedAt: new Date(), stopping: null, onInterrupted, meter: createMeter(stream) };

  recorder.ondataavailable = (e) => {
    if (e.data.size) session.chunks.push(e.data);
  };
  // Arrêt non demandé (piste coupée par le système, erreur) : on finalise avec l'audio partiel.
  const interrupt = () => {
    if (current !== session || session.stopping) return;
    finalize(session, true).then((result) => session.onInterrupted?.(result));
  };
  recorder.onerror = interrupt;
  stream.getAudioTracks()[0]?.addEventListener('ended', interrupt);

  recorder.start(TIMESLICE_MS);
  current = session;
  wakeLock.keepAwake();
}

// Arrête et retourne { blob, mime, startedAt, durationSec, interrupted:false }.
export function stop() {
  if (!current) return Promise.resolve(null);
  return finalize(current, false);
}

function finalize(session, interrupted) {
  session.stopping ??= new Promise((resolve) => {
    const done = () => {
      session.stream.getTracks().forEach((t) => t.stop());
      session.meter?.ctx.close().catch(() => {});
      wakeLock.release();
      if (current === session) current = null;
      const mime = (session.recorder.mimeType || pickMime() || 'audio/webm').split(';')[0];
      resolve({
        blob: new Blob(session.chunks, { type: mime }),
        mime,
        startedAt: session.startedAt,
        durationSec: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
        interrupted,
      });
    };
    if (session.recorder.state === 'inactive') done();
    else {
      session.recorder.addEventListener('stop', done, { once: true });
      session.recorder.stop();
    }
  });
  return session.stopping;
}

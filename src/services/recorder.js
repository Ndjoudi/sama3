// Enregistrement micro via MediaRecorder (§6).
// Un seul enregistrement à la fois. L'audio partiel est conservé si le système coupe le micro.

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
const BITRATE = 32000;
const TIMESLICE_MS = 1000; // morceaux réguliers : rien n'est perdu en cas d'interruption

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

let current = null; // { recorder, stream, chunks, startedAt, stopping, onInterrupted }

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
  const session = { recorder, stream, chunks: [], startedAt: new Date(), stopping: null, onInterrupted };

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

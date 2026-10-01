import { RecorderPanel } from '../organisms/RecorderPanel.js';
import { QueueList } from '../organisms/QueueList.js';
import { Timer } from '../molecules/Timer.js';
import { StatusBanner } from '../molecules/StatusBanner.js';
import * as recorder from '../../services/recorder.js';
import * as queue from '../../services/queue.js';
import * as store from '../../services/store.js';
import { labels } from '../../labels.js';

const TICK_MS = 500;
const PRIVACY_PREF = 'privacyNoticeSeen';

// Écran d'enregistrement. Retourne { el, destroy }.
// onRecordingChange(bool) : prévient le shell (masquer la navigation pendant l'enregistrement).
export function RecordScreen({ onRecordingChange } = {}) {
  const el = document.createElement('div');
  el.className = 'screen screen--record';

  const panelSlot = document.createElement('div');
  const queueSlot = document.createElement('div');
  el.append(panelSlot, queueSlot);

  // Rappel de vie privée au premier lancement (§15).
  if (!store.getPref(PRIVACY_PREF)) {
    const notice = StatusBanner({
      tone: 'accent',
      icon: 'mic',
      title: labels.privacy.title,
      message: labels.privacy.message,
      actionLabel: labels.privacy.ok,
      onAction: () => {
        store.setPref(PRIVACY_PREF, true);
        notice.remove();
      },
    });
    el.prepend(notice);
  }

  let state = recorder.isRecording() ? 'recording' : 'idle';
  let banner = null;
  let tick = null;

  function render() {
    panelSlot.replaceChildren(
      RecorderPanel({
        state,
        seconds: recorder.elapsedSec(),
        banner,
        onStart: start,
        onStop: stop,
        onDismissBanner: () => {
          banner = null;
          render();
        },
      }),
    );
  }

  // Seul le chrono change chaque demi-seconde : on ne remplace que lui.
  function refreshTimer() {
    panelSlot.querySelector('.timer')?.replaceWith(Timer({ seconds: recorder.elapsedSec(), active: true }));
  }

  function setState(next) {
    state = next;
    clearInterval(tick);
    if (state === 'recording') tick = setInterval(refreshTimer, TICK_MS);
    onRecordingChange?.(state === 'recording' || state === 'saving');
    render();
  }

  function errorBanner(code) {
    const text = labels.recorderErrors[code] ?? labels.recorderErrors['mic-failed'];
    return { tone: 'danger', ...text };
  }

  async function start() {
    banner = null;
    setState('starting');
    try {
      await recorder.start({ onInterrupted: (result) => save(result) });
      setState('recording');
    } catch (err) {
      banner = errorBanner(err.code);
      setState('idle');
    }
  }

  async function stop() {
    setState('saving');
    save(await recorder.stop());
  }

  async function save(result) {
    if (!result) return setState('idle');
    if (!result.blob.size) {
      banner = errorBanner('empty');
      return setState('idle');
    }
    try {
      await queue.enqueue(result);
      banner = result.interrupted
        ? { tone: 'accent', icon: 'error', title: labels.record.interruptedTitle, message: labels.record.interruptedMessage }
        : { tone: 'success', title: labels.record.savedTitle, message: labels.record.savedMessage };
    } catch {
      banner = errorBanner('save-failed');
    }
    setState('idle');
  }

  // Lecture IndexedDB asynchrone : seul le dernier rendu demandé s'affiche.
  let queueRender = 0;
  async function renderQueue() {
    const ticket = ++queueRender;
    const items = await queue.items();
    if (ticket !== queueRender) return;
    queueSlot.replaceChildren(QueueList({ items, online: queue.isOnline(), onRetry: (id) => queue.retry(id) }));
  }
  const unsubscribe = queue.subscribe(renderQueue);
  renderQueue();

  const onVisible = () => {
    if (document.visibilityState === 'visible' && state === 'recording') refreshTimer();
  };
  document.addEventListener('visibilitychange', onVisible);

  setState(state);

  return {
    el,
    destroy() {
      clearInterval(tick);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}

import { Icon } from '../atoms/Icon.js';
import { Spinner } from '../atoms/Spinner.js';
import { labels } from '../../labels.js';

// Le gros bouton unique de l'écran d'enregistrement.
// state : idle | starting | recording | saving
export function RecordButton({ state = 'idle', onStart, onStop }) {
  const recording = state === 'recording';
  const busy = state === 'starting' || state === 'saving';

  const el = document.createElement('button');
  el.type = 'button';
  el.className = `record-btn record-btn--${state}`;
  el.disabled = busy;
  el.setAttribute('aria-pressed', String(recording));

  const disc = document.createElement('span');
  disc.className = 'record-btn__disc';
  disc.append(busy ? Spinner({ size: 'lg', label: labels.record.saving }) : Icon({ name: recording ? 'stop' : 'mic', size: 'lg' }));

  const text = document.createElement('span');
  text.className = 'record-btn__label';
  text.textContent = recording ? labels.record.stop : busy ? labels.record.saving : labels.record.start;

  el.append(disc, text);
  el.addEventListener('click', () => (recording ? onStop?.() : onStart?.()));
  return el;
}

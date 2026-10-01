import { formatDuration } from '../../utils/format.js';

// Durée écoulée. `active` affiche le témoin d'enregistrement.
export function Timer({ seconds = 0, active = false }) {
  const el = document.createElement('div');
  el.className = `timer${active ? ' timer--active' : ''}`;

  const dot = document.createElement('span');
  dot.className = 'timer__dot';
  dot.setAttribute('aria-hidden', 'true');

  const value = document.createElement('time');
  value.className = 'timer__value';
  value.dateTime = `PT${Math.floor(seconds)}S`;
  value.textContent = formatDuration(seconds);

  el.append(dot, value);
  return el;
}

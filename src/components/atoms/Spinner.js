import { labels } from '../../labels.js';

// size : md | lg
export function Spinner({ label = labels.common.loading, size = 'md' } = {}) {
  const el = document.createElement('span');
  el.className = `spinner spinner--${size}`;
  el.setAttribute('role', 'status');

  const ring = document.createElement('span');
  ring.className = 'spinner__ring';
  ring.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'visually-hidden';
  text.textContent = label;

  el.append(ring, text);
  return el;
}

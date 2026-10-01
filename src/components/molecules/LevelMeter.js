import { labels } from '../../labels.js';

// Niveau du son capté en direct : une barre par mesure, la plus récente à droite.
// levels : nombres entre 0 et 1 (le parent fournit toujours le même nombre de barres).
export function LevelMeter({ levels = [], active = false }) {
  const el = document.createElement('div');
  el.className = `level-meter${active ? ' level-meter--active' : ''}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', labels.record.meter);

  for (const level of levels) {
    const bar = document.createElement('span');
    bar.className = 'level-meter__bar';
    bar.style.setProperty('--level', level.toFixed(3));
    el.append(bar);
  }
  return el;
}

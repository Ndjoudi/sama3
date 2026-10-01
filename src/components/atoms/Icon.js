import { icons } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Icône SVG inline. Décorative par défaut ; fournir `label` si elle porte seule un sens.
export function Icon({ name, size = 'md', label }) {
  const markup = icons[name];
  if (!markup) throw new Error(`Icon : nom inconnu « ${name} »`);

  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('class', `icon icon--${size}`);
  el.setAttribute('focusable', 'false');
  el.innerHTML = markup;

  if (label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
  } else {
    el.setAttribute('aria-hidden', 'true');
  }
  return el;
}

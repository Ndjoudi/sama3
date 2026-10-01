import { Icon } from './Icon.js';

// Bouton carré 44px, icône seule. `label` est obligatoire : il sert de nom accessible.
// variant : plain | outline | accent | danger
export function IconButton({ icon, label, variant = 'plain', disabled = false, onClick }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `icon-btn icon-btn--${variant}`;
  el.disabled = disabled;
  el.setAttribute('aria-label', label);
  el.title = label;
  el.append(Icon({ name: icon }));

  if (onClick) el.addEventListener('click', onClick);
  return el;
}

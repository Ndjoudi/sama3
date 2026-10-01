import { Icon } from './Icon.js';

// variant : primary | secondary | quiet | danger
export function Button({ label, variant = 'primary', icon, block = false, disabled = false, type = 'button', onClick }) {
  const el = document.createElement('button');
  el.type = type;
  el.className = `btn btn--${variant}${block ? ' btn--block' : ''}`;
  el.disabled = disabled;

  if (icon) el.append(Icon({ name: icon }));

  const text = document.createElement('span');
  text.className = 'btn__label';
  text.textContent = label;
  el.append(text);

  if (onClick) el.addEventListener('click', onClick);
  return el;
}

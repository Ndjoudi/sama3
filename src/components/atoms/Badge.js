import { Icon } from './Icon.js';

// tone : neutral | accent | success | danger | info
export function Badge({ text, tone = 'neutral', icon }) {
  const el = document.createElement('span');
  el.className = `badge badge--${tone}`;
  if (icon) el.append(Icon({ name: icon, size: 'sm' }));
  el.append(text);
  return el;
}

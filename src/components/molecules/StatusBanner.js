import { Icon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';

const DEFAULT_ICON = { info: 'network', success: 'check', danger: 'error', accent: 'mic', neutral: 'history' };

// Bandeau d'information. tone : neutral | info | success | danger | accent
export function StatusBanner({ tone = 'neutral', icon, title, message, actionLabel, onAction }) {
  const el = document.createElement('div');
  el.className = `banner banner--${tone}`;
  el.setAttribute('role', tone === 'danger' ? 'alert' : 'status');

  const body = document.createElement('div');
  body.className = 'banner__body';
  if (title) {
    const t = document.createElement('p');
    t.className = 'banner__title';
    t.textContent = title;
    body.append(t);
  }
  if (message) {
    const m = document.createElement('p');
    m.className = 'banner__message';
    m.textContent = message;
    body.append(m);
  }

  el.append(Icon({ name: icon ?? DEFAULT_ICON[tone] }), body);
  if (actionLabel && onAction) {
    const action = Button({ label: actionLabel, variant: 'quiet', onClick: onAction });
    action.classList.add('banner__action');
    el.append(action);
  }
  return el;
}

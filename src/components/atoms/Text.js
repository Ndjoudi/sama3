// variant : display | title | body | small | label | arabic
// tone    : default | muted | faint | accent
const DEFAULT_TAG = {
  display: 'h1',
  title: 'h2',
  body: 'p',
  small: 'p',
  label: 'span',
  arabic: 'p',
};

export function Text({ text, variant = 'body', tone = 'default', as, numeric = false }) {
  const el = document.createElement(as ?? DEFAULT_TAG[variant] ?? 'p');
  el.className = `text text--${variant}`;
  if (tone !== 'default') el.classList.add(`text--${tone}`);
  if (numeric) el.classList.add('text--numeric');

  if (variant === 'arabic') {
    el.lang = 'ar';
    el.dir = 'rtl';
  }

  el.textContent = text;
  return el;
}

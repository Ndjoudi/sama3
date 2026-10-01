import { Icon } from '../atoms/Icon.js';
import { toArabicDigits } from '../../utils/format.js';
import { labels } from '../../labels.js';

// Un verset dans une liste : texte arabe, numéro, traduction. Tap → détail.
export function VerseCard({ surah, ayah, arabic, translation, onSelect }) {
  const el = document.createElement('article');
  el.className = 'verse-card';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'verse-card__hit';
  button.setAttribute('aria-label', `${labels.result.verse(ayah)}, ${labels.result.surah(surah)}`);
  button.addEventListener('click', () => onSelect?.({ surah, ayah }));

  const ar = document.createElement('p');
  ar.className = 'verse-card__arabic text--arabic';
  ar.lang = 'ar';
  ar.dir = 'rtl';
  ar.textContent = `${arabic} ﴿${toArabicDigits(ayah)}﴾`;

  const fr = document.createElement('p');
  fr.className = `verse-card__translation${translation ? '' : ' verse-card__translation--missing'}`;
  fr.textContent = translation ?? labels.result.translationMissing;

  const foot = document.createElement('div');
  foot.className = 'verse-card__foot';
  const num = document.createElement('span');
  num.textContent = labels.result.verse(ayah);
  foot.append(num, Icon({ name: 'chevron', size: 'sm' }));

  button.append(ar, fr, foot);
  el.append(button);
  return el;
}

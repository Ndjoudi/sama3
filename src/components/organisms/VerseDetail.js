import { IconButton } from '../atoms/IconButton.js';
import { Text } from '../atoms/Text.js';
import { Tabs } from '../molecules/Tabs.js';
import { toArabicDigits } from '../../utils/format.js';
import { labels } from '../../labels.js';

const TABS = [
  { id: 'arabic', label: labels.result.tabs.arabic },
  { id: 'translation', label: labels.result.tabs.translation },
  { id: 'tafsir', label: labels.result.tabs.tafsir },
];

// Détail d'un verset : arabe, traduction, tafsir en onglets.
// tab : arabic | translation | tafsir
export function VerseDetail({ surah, ayah, name, arabic, translation, tafsir, tab = 'arabic', onTabChange, onBack }) {
  const el = document.createElement('article');
  el.className = 'verse-detail';

  const head = document.createElement('header');
  head.className = 'verse-detail__head';
  const title = document.createElement('div');
  title.append(
    Text({ text: name ?? labels.result.surah(surah), variant: 'title', as: 'h1' }),
    Text({ text: labels.result.verse(ayah), variant: 'small', tone: 'muted' }),
  );
  head.append(IconButton({ icon: 'back', label: labels.result.back, onClick: onBack }), title);

  const panel = document.createElement('div');
  panel.className = 'verse-detail__panel';
  panel.setAttribute('role', 'tabpanel');

  if (tab === 'arabic') {
    panel.append(Text({ text: `${arabic} ﴿${toArabicDigits(ayah)}﴾`, variant: 'arabic' }));
  } else if (tab === 'translation') {
    panel.append(
      Text({ text: translation ?? labels.result.translationMissing, tone: translation ? 'default' : 'muted' }),
      Text({ text: labels.result.translationSource, variant: 'small', tone: 'faint' }),
    );
  } else {
    panel.append(
      Text({ text: tafsir ?? labels.result.tafsirMissing, tone: tafsir ? 'default' : 'muted' }),
      Text({ text: labels.result.tafsirSource, variant: 'small', tone: 'faint' }),
    );
  }

  el.append(head, Tabs({ tabs: TABS, active: tab, onChange: onTabChange }), panel);
  return el;
}

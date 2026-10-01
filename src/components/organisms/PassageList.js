import { VerseCard } from '../molecules/VerseCard.js';
import { Text } from '../atoms/Text.js';
import { formatAyahRange } from '../../utils/format.js';
import { labels } from '../../labels.js';

// Passages dans l'ordre récité, chacun avec ses versets.
// passages : [{ surah, name, meaning, fromAyah, toAyah, verses: [{ surah, ayah, arabic, translation }] }]
export function PassageList({ passages, onSelectVerse }) {
  const el = document.createElement('div');
  el.className = 'passage-list';

  for (const p of passages) {
    const section = document.createElement('section');
    section.className = 'passage';

    const head = document.createElement('header');
    head.className = 'passage__head';
    head.append(
      Text({ text: p.name ?? labels.result.surah(p.surah), variant: 'title', as: 'h2' }),
      Text({
        text: [p.meaning, labels.result.verses(formatAyahRange(p.fromAyah, p.toAyah))].filter(Boolean).join(' · '),
        variant: 'small',
        tone: 'muted',
      }),
    );

    const verses = document.createElement('div');
    verses.className = 'passage__verses';
    for (const v of p.verses) verses.append(VerseCard({ ...v, onSelect: onSelectVerse }));

    section.append(head, verses);
    el.append(section);
  }
  return el;
}

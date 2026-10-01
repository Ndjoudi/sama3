import { IconButton } from '../atoms/IconButton.js';
import { Text } from '../atoms/Text.js';
import { formatDate, formatTime, formatDuration } from '../../utils/format.js';
import { labels } from '../../labels.js';

// En-tête d'une prière : nom, date, durée, nombre de passages.
export function PassageHeader({ label, createdAt, durationSec, passageCount, onBack }) {
  const el = document.createElement('header');
  el.className = 'passage-header';

  if (onBack) el.append(IconButton({ icon: 'back', label: labels.result.back, onClick: onBack }));

  const body = document.createElement('div');
  body.className = 'passage-header__body';
  body.append(
    Text({ text: label, variant: 'display' }),
    Text({ text: `${formatDate(createdAt)} · ${formatTime(createdAt)}`, variant: 'small', tone: 'muted' }),
    Text({
      text: `${labels.result.passages(passageCount)} · ${formatDuration(durationSec)}`,
      variant: 'small',
      tone: 'faint',
      numeric: true,
    }),
  );
  el.append(body);
  return el;
}

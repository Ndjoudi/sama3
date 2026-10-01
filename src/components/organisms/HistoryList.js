import { IconButton } from '../atoms/IconButton.js';
import { Text } from '../atoms/Text.js';
import { formatDate, formatTime } from '../../utils/format.js';
import { labels } from '../../labels.js';

// Historique regroupé par jour : la date, puis une ligne par prière (nom, heure, modifier, supprimer).
// days : [{ key, date, sessions: [{ id, label, createdAt }] }] — les plus récents d'abord
export function HistoryList({ days, onOpen, onRename, onDelete }) {
  const el = document.createElement('div');
  el.className = 'history';

  for (const day of days) {
    const section = document.createElement('section');
    section.className = 'history__day';
    const date = Text({ text: formatDate(day.date), variant: 'small', tone: 'muted', as: 'h2' });
    date.classList.add('history__date');
    section.append(date);

    const list = document.createElement('ul');
    list.className = 'history__list';
    for (const s of day.sessions) {
      const row = document.createElement('li');
      row.className = 'history__row';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'history__open';
      open.append(
        Text({ text: s.label, variant: 'body', as: 'span' }),
        Text({ text: formatTime(s.createdAt), variant: 'small', tone: 'muted', as: 'span', numeric: true }),
      );
      open.addEventListener('click', () => onOpen?.(s.id));

      row.append(
        open,
        IconButton({ icon: 'edit', label: `${labels.history.rename} · ${s.label}`, onClick: () => onRename?.(s.id) }),
        IconButton({ icon: 'trash', label: `${labels.history.delete} · ${s.label}`, variant: 'danger', onClick: () => onDelete?.(s.id) }),
      );
      list.append(row);
    }
    section.append(list);
    el.append(section);
  }
  return el;
}

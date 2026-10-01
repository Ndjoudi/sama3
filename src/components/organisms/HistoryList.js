import { IconButton } from '../atoms/IconButton.js';
import { Icon } from '../atoms/Icon.js';
import { Text } from '../atoms/Text.js';
import { formatDate, formatTime } from '../../utils/format.js';
import { labels } from '../../labels.js';

// Une entrée par prière : date, prière, nombre de passages, aperçu des sourates.
// sessions : [{ id, label, createdAt, passageCount, preview }]
export function HistoryList({ sessions, onOpen, onRename, onDelete }) {
  const el = document.createElement('ul');
  el.className = 'history';

  for (const s of sessions) {
    const item = document.createElement('li');
    item.className = 'history__item';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'history__open';
    open.addEventListener('click', () => onOpen?.(s.id));

    const body = document.createElement('div');
    body.className = 'history__body';
    body.append(
      Text({ text: `${formatDate(s.createdAt)} · ${formatTime(s.createdAt)}`, variant: 'small', tone: 'muted' }),
      Text({ text: s.label, variant: 'title', as: 'span' }),
      Text({ text: s.preview || labels.history.noPassage, variant: 'small', tone: s.preview ? 'default' : 'faint' }),
      Text({ text: labels.result.passages(s.passageCount), variant: 'label', tone: 'accent' }),
    );
    open.append(body, Icon({ name: 'chevron' }));

    const actions = document.createElement('div');
    actions.className = 'history__actions';
    actions.append(
      IconButton({ icon: 'edit', label: `${labels.history.rename} · ${s.label}`, onClick: () => onRename?.(s.id) }),
      IconButton({ icon: 'trash', label: `${labels.history.delete} · ${s.label}`, variant: 'danger', onClick: () => onDelete?.(s.id) }),
    );

    item.append(open, actions);
    el.append(item);
  }
  return el;
}

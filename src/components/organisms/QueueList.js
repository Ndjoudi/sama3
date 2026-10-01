import { Badge } from '../atoms/Badge.js';
import { Button } from '../atoms/Button.js';
import { Spinner } from '../atoms/Spinner.js';
import { Text } from '../atoms/Text.js';
import { StatusBanner } from '../molecules/StatusBanner.js';
import { formatDate, formatTime, formatDuration } from '../../utils/format.js';
import { labels } from '../../labels.js';

const BADGE = {
  pending: { text: labels.queue.pending, tone: 'neutral' },
  processing: { text: labels.queue.processing, tone: 'accent' },
  error: { text: labels.queue.error, tone: 'danger', icon: 'error' },
};

// items : [{ id, createdAt, durationSec, status, errorMessage }]
export function QueueList({ items = [], online = true, onRetry }) {
  const el = document.createElement('section');
  el.className = 'queue';
  if (!items.length) {
    el.hidden = true;
    return el;
  }

  el.append(Text({ text: labels.queue.title, variant: 'label', tone: 'faint' }));
  if (!online) el.append(StatusBanner({ tone: 'info', title: labels.queue.offlineTitle, message: labels.queue.offlineMessage }));

  const list = document.createElement('ul');
  list.className = 'queue__list';
  for (const item of items) {
    const row = document.createElement('li');
    row.className = `queue__item queue__item--${item.status}`;

    const info = document.createElement('div');
    info.className = 'queue__info';
    info.append(
      Text({ text: `${formatDate(item.createdAt)} · ${formatTime(item.createdAt)}`, variant: 'body' }),
      Text({ text: formatDuration(item.durationSec), variant: 'small', tone: 'muted', numeric: true }),
    );
    if (item.status === 'error') {
      info.append(Text({ text: labels.queueErrors[item.errorMessage] ?? labels.queueErrors.unknown, variant: 'small', tone: 'muted' }));
    }

    const side = document.createElement('div');
    side.className = 'queue__side';
    if (item.status === 'processing') side.append(Spinner({ label: labels.queue.processing }));
    side.append(Badge(BADGE[item.status] ?? BADGE.pending));
    if (item.status === 'error') side.append(Button({ label: labels.queue.retry, variant: 'secondary', onClick: () => onRetry?.(item.id) }));

    row.append(info, side);
    list.append(row);
  }
  el.append(list);
  return el;
}

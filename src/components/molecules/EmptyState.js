import { Icon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';
import { Text } from '../atoms/Text.js';

// État vide ou indisponible, avec action facultative.
export function EmptyState({ icon = 'history', title, message, actionLabel, onAction }) {
  const el = document.createElement('div');
  el.className = 'empty-state';

  const mark = document.createElement('div');
  mark.className = 'empty-state__mark';
  mark.append(Icon({ name: icon, size: 'lg' }));

  el.append(mark, Text({ text: title, variant: 'title' }));
  if (message) el.append(Text({ text: message, variant: 'small', tone: 'muted' }));
  if (actionLabel && onAction) el.append(Button({ label: actionLabel, variant: 'secondary', onClick: onAction }));
  return el;
}

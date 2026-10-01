// Page de démonstration des 6 atoms (dev uniquement).
import { Button } from '../src/components/atoms/Button.js';
import { IconButton } from '../src/components/atoms/IconButton.js';
import { Icon } from '../src/components/atoms/Icon.js';
import { Badge } from '../src/components/atoms/Badge.js';
import { Spinner } from '../src/components/atoms/Spinner.js';
import { Text } from '../src/components/atoms/Text.js';
import { icons } from '../src/components/atoms/icons.js';

const root = document.getElementById('demo');

function section(title, ...children) {
  const el = document.createElement('section');
  el.className = 'dev__section';
  el.append(Text({ text: title, variant: 'label' }), ...children);
  return el;
}

function row(...children) {
  const el = document.createElement('div');
  el.className = 'dev__row';
  el.append(...children);
  return el;
}

function stack(...children) {
  const el = document.createElement('div');
  el.className = 'dev__stack';
  el.append(...children);
  return el;
}

// — Bascule de thème (dev) —
const html = document.documentElement;
function currentTheme() {
  if (html.dataset.theme) return html.dataset.theme;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
const themeBtn = Button({
  label: `Thème : ${currentTheme()}`,
  variant: 'secondary',
  onClick: () => {
    html.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    themeBtn.querySelector('.btn__label').textContent = `Thème : ${html.dataset.theme}`;
  },
});

const head = document.createElement('header');
head.className = 'dev__head';
head.append(Text({ text: 'Atoms', variant: 'display' }), themeBtn);

// — Palette —
const swatches = document.createElement('div');
swatches.className = 'dev__swatches';
for (const token of [
  'bg', 'surface', 'surface-raised', 'line-strong',
  'text', 'text-muted', 'accent', 'danger',
  'success', 'info', 'accent-soft', 'danger-soft',
]) {
  const s = document.createElement('div');
  s.className = 'dev__swatch';
  s.title = `--color-${token}`;
  s.style.background = `var(--color-${token})`;
  swatches.append(s);
}

root.append(
  head,

  section('Palette', swatches),

  section(
    'Text',
    stack(
      Text({ text: 'Prière du Maghrib', variant: 'display' }),
      Text({ text: 'Al-Baqara, 255 – 257', variant: 'title' }),
      Text({ text: 'Texte courant de l’interface, lisible dans la pénombre.' }),
      Text({ text: 'Texte secondaire, atténué.', variant: 'small', tone: 'muted' }),
      Text({ text: 'Étiquette', variant: 'label', tone: 'accent' }),
      Text({ text: '12:48', variant: 'title', numeric: true }),
      Text({ text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ', variant: 'arabic' }),
    ),
  ),

  section(
    'Button',
    stack(
      Button({ label: 'Commencer', icon: 'mic', block: true }),
      row(
        Button({ label: 'Réessayer', variant: 'secondary' }),
        Button({ label: 'Historique', variant: 'quiet', icon: 'history' }),
      ),
      row(
        Button({ label: 'Supprimer', variant: 'danger' }),
        Button({ label: 'Désactivé', disabled: true }),
      ),
    ),
  ),

  section(
    'IconButton',
    row(
      IconButton({ icon: 'history', label: 'Historique' }),
      IconButton({ icon: 'chevron', label: 'Ouvrir', variant: 'outline' }),
      IconButton({ icon: 'mic', label: 'Enregistrer', variant: 'accent' }),
      IconButton({ icon: 'stop', label: 'Arrêter', variant: 'danger' }),
      IconButton({ icon: 'check', label: 'Valider', disabled: true }),
    ),
  ),

  section(
    'Icon',
    row(...Object.keys(icons).map((name) => Icon({ name, size: 'lg', label: name }))),
  ),

  section(
    'Badge',
    row(
      Badge({ text: 'En attente' }),
      Badge({ text: 'En cours', tone: 'accent' }),
      Badge({ text: 'Terminé', tone: 'success', icon: 'check' }),
      Badge({ text: 'Erreur', tone: 'danger', icon: 'error' }),
      Badge({ text: 'Hors ligne', tone: 'info', icon: 'network' }),
    ),
  ),

  section('Spinner', row(Spinner(), Spinner({ size: 'lg', label: 'Transcription en cours' }))),
);

// Formatage d'affichage : durées et dates en français.

const pad = (n) => String(n).padStart(2, '0');

// 75 → "01:15" ; 3725 → "1:02:05"
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

// "mercredi 30 septembre 2026"
export function formatDate(iso) {
  return dateFormatter.format(new Date(iso));
}

// "30 sept."
export function formatShortDate(iso) {
  return shortDateFormatter.format(new Date(iso));
}

// "14:12"
export function formatTime(iso) {
  return timeFormatter.format(new Date(iso));
}

// 255 → "٢٥٥" (chiffres arabes orientaux, pour le texte coranique)
export function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Plage de versets : "255" ou "255–257"
export function formatAyahRange(from, to) {
  return from === to ? String(from) : `${from}–${to}`;
}

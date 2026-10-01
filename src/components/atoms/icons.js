// Seule source d'icônes du projet (§14.7). Grille 24×24, tracé en currentColor.
// Les formes pleines portent la classe icon__fill.

export const icons = {
  mic: `
    <rect x="9" y="3" width="6" height="11" rx="3"/>
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0"/>
    <path d="M12 17.5V21"/>`,
  stop: `
    <rect class="icon__fill" x="6" y="6" width="12" height="12" rx="2.5"/>`,
  history: `
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/>
    <path d="M3.5 4.5V9H8"/>
    <path d="M12 7.5V12l3 2"/>`,
  check: `
    <path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  error: `
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M12 7.5v5.5"/>
    <path d="M12 16.5v.01"/>`,
  network: `
    <path d="M2.5 9a14 14 0 0 1 19 0"/>
    <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/>
    <path d="M8.7 16a5 5 0 0 1 6.6 0"/>
    <path d="M12 19.5v.01"/>`,
  chevron: `
    <path d="M9.5 6l6 6-6 6"/>`,
  back: `
    <path d="M14.5 6l-6 6 6 6"/>`,
  edit: `
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/>
    <path d="M13.5 6.5l4 4"/>`,
  trash: `
    <path d="M4.5 7h15"/>
    <path d="M9.5 7V4.5h5V7"/>
    <path d="M6.5 7l1 13h9l1-13"/>`,
  export: `
    <path d="M12 15V3.5"/>
    <path d="M7.5 8L12 3.5 16.5 8"/>
    <path d="M4.5 14v5.5h15V14"/>`,
  import: `
    <path d="M12 3.5V15"/>
    <path d="M7.5 10.5L12 15l4.5-4.5"/>
    <path d="M4.5 14v5.5h15V14"/>`,
};

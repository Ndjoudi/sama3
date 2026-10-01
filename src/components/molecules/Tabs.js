// Onglets. tabs : [{ id, label }] ; le contenu de l'onglet actif est rendu par le parent.
export function Tabs({ tabs, active, onChange, label }) {
  const el = document.createElement('div');
  el.className = 'tabs';
  el.setAttribute('role', 'tablist');
  if (label) el.setAttribute('aria-label', label);

  for (const tab of tabs) {
    const selected = tab.id === active;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tabs__tab${selected ? ' tabs__tab--active' : ''}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      if (!selected) onChange?.(tab.id);
    });
    el.append(button);
  }

  // Flèches gauche / droite entre onglets.
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.id === active);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange?.(next.id);
  });
  return el;
}

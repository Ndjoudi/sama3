import { HistoryList } from '../organisms/HistoryList.js';
import { EmptyState } from '../molecules/EmptyState.js';
import { StatusBanner } from '../molecules/StatusBanner.js';
import { Button } from '../atoms/Button.js';
import { Text } from '../atoms/Text.js';
import * as store from '../../services/store.js';
import * as exporter from '../../services/exporter.js';
import { labels } from '../../labels.js';

// Historique des prières. Retourne { el, destroy }.
export function HistoryScreen({ navigate }) {
  const el = document.createElement('div');
  el.className = 'screen screen--history';
  let banner = null;

  // Sessions (plus récentes d'abord) regroupées par jour local.
  function byDay(sessions) {
    const days = [];
    for (const s of sessions) {
      const key = new Date(s.createdAt).toDateString();
      let day = days.at(-1);
      if (day?.key !== key) days.push((day = { key, date: s.createdAt, sessions: [] }));
      day.sessions.push({ id: s.id, label: s.label, createdAt: s.createdAt });
    }
    return days;
  }

  function rename(id) {
    const session = store.getSession(id);
    const next = window.prompt(labels.history.renamePrompt, session?.label ?? '');
    if (next && next.trim()) store.renameSession(id, next);
  }

  function remove(id) {
    const session = store.getSession(id);
    if (session && window.confirm(labels.history.deleteConfirm(session.label))) store.deleteSession(id);
  }

  function exportAll() {
    const day = new Date().toISOString().slice(0, 10);
    exporter.download(exporter.toBlob(store.getSessions()), labels.history.exportFileName(day));
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const added = store.importSessions(exporter.parse(await file.text()));
      banner = { tone: 'success', title: labels.history.imported(added) };
    } catch {
      banner = { tone: 'danger', title: labels.history.importFailed };
    }
    render();
  });

  function render() {
    const sessions = store.getSessions();

    const head = document.createElement('header');
    head.className = 'screen__head';
    const actions = document.createElement('div');
    actions.className = 'screen__actions';
    actions.append(
      Button({ label: labels.history.export, icon: 'export', variant: 'quiet', disabled: !sessions.length, onClick: exportAll }),
      Button({ label: labels.history.import, icon: 'import', variant: 'quiet', onClick: () => fileInput.click() }),
    );
    head.append(Text({ text: labels.history.title, variant: 'display' }), actions);

    const parts = [head];
    if (banner) {
      parts.push(
        StatusBanner({
          ...banner,
          actionLabel: labels.dismiss,
          onAction: () => {
            banner = null;
            render();
          },
        }),
      );
    }
    parts.push(
      sessions.length
        ? HistoryList({
            days: byDay(sessions),
            onOpen: (id) => navigate(`#/result/${encodeURIComponent(id)}`),
            onRename: rename,
            onDelete: remove,
          })
        : EmptyState({
            icon: 'history',
            title: labels.history.emptyTitle,
            message: labels.history.emptyMessage,
            actionLabel: labels.history.emptyAction,
            onAction: () => navigate('#/record'),
          }),
      fileInput,
    );
    el.replaceChildren(...parts);
  }

  const unsubscribe = store.subscribe(render);
  render();

  return { el, destroy: unsubscribe };
}

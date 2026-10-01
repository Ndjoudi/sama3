// Point d'entrée et routeur (hash).
//   #/record                      enregistrement (défaut)
//   #/history                     historique
//   #/result/:id                  passages d'une prière
//   #/result/:id/:surah/:ayah     détail d'un verset
import { RecordScreen } from './components/screens/RecordScreen.js';
import { ResultScreen } from './components/screens/ResultScreen.js';
import { HistoryScreen } from './components/screens/HistoryScreen.js';
import { Tabs } from './components/molecules/Tabs.js';
import * as queue from './services/queue.js';
import * as recorder from './services/recorder.js';
import { labels } from './labels.js';

const view = document.getElementById('app');
const nav = document.getElementById('nav');
let screen = null;

function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

const routes = {
  record: () => RecordScreen({ onRecordingChange: (on) => document.body.classList.toggle('is-recording', on) }),
  history: () => HistoryScreen({ navigate }),
  result: ([id, surah, ayah]) =>
    ResultScreen({ sessionId: decodeURIComponent(id ?? ''), surah: Number(surah) || null, ayah: Number(ayah) || null, navigate }),
};

// Barre basse : Enregistrer / Historique (le résultat appartient à l'historique).
const NAV_TABS = [
  { id: 'record', label: labels.nav.record },
  { id: 'history', label: labels.nav.history },
];

function renderNav(name) {
  const active = name === 'record' ? 'record' : 'history';
  nav.replaceChildren(Tabs({ tabs: NAV_TABS, active, label: labels.nav.label, onChange: (id) => navigate(`#/${id}`) }));
}

function route() {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const key = routes[name] ? name : 'record';
  screen?.destroy?.();
  screen = routes[key](params);
  view.replaceChildren(screen.el);
  renderNav(key);
  window.scrollTo(0, 0);
}

// Fin de traitement → ouverture du résultat (sauf pendant un enregistrement).
queue.subscribe((event) => {
  if (event.type === 'done' && !recorder.isRecording()) navigate(`#/result/${encodeURIComponent(event.sessionId)}`);
});

window.addEventListener('hashchange', route);
route();
queue.init();

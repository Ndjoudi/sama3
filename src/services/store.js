// État de l'application + persistance localStorage (clé sama3_state).
// Contient les sessions traitées (schéma §5) et quelques préférences.

const STORAGE_KEY = 'sama3_state';
const STATE_VERSION = 1;

const listeners = new Set();
let state = load();

function emptyState() {
  return { version: STATE_VERSION, sessions: [], prefs: {} };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      version: STATE_VERSION,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.map(toSession).filter(Boolean) : [],
      prefs: parsed.prefs && typeof parsed.prefs === 'object' ? parsed.prefs : {},
    };
  } catch {
    return emptyState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function commit(next) {
  state = next;
  persist();
  for (const fn of listeners) fn(state);
}

// Ramène un objet quelconque au schéma exact d'une session (§5), ou null s'il est invalide.
export function toSession(raw) {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt))) return null;
  const passages = Array.isArray(raw.passages) ? raw.passages.map(toPassage) : [];
  if (passages.includes(null)) return null;
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    durationSec: Number.isFinite(raw.durationSec) ? Math.round(raw.durationSec) : 0,
    label: typeof raw.label === 'string' ? raw.label : '',
    passages,
  };
}

function toPassage(raw) {
  const surah = Number(raw?.surah);
  const fromAyah = Number(raw?.fromAyah);
  const toAyah = Number(raw?.toAyah);
  if (![surah, fromAyah, toAyah].every(Number.isInteger)) return null;
  if (surah < 1 || surah > 114 || fromAyah < 1 || toAyah < fromAyah) return null;
  const confidence = Number(raw.confidence);
  return { surah, fromAyah, toAyah, confidence: Number.isFinite(confidence) ? confidence : 0 };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Sessions, les plus récentes d'abord.
export function getSessions() {
  return [...state.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSession(id) {
  return state.sessions.find((s) => s.id === id) ?? null;
}

export function addSession(raw) {
  const session = toSession(raw);
  if (!session) throw new Error('store.addSession : session invalide');
  const others = state.sessions.filter((s) => s.id !== session.id);
  commit({ ...state, sessions: [...others, session] });
  return session;
}

export function renameSession(id, label) {
  commit({
    ...state,
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, label: String(label).trim() } : s)),
  });
}

export function deleteSession(id) {
  commit({ ...state, sessions: state.sessions.filter((s) => s.id !== id) });
}

// Ajoute les sessions absentes (même id = ignorée). Retourne le nombre ajouté.
export function importSessions(rawList) {
  const known = new Set(state.sessions.map((s) => s.id));
  const added = rawList.map(toSession).filter((s) => s && !known.has(s.id));
  if (added.length) commit({ ...state, sessions: [...state.sessions, ...added] });
  return added.length;
}

export function getPref(key) {
  return state.prefs[key];
}

export function setPref(key, value) {
  commit({ ...state, prefs: { ...state.prefs, [key]: value } });
}

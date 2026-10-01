// IndexedDB : enregistrements audio en attente de traitement (store "pending", schéma §5).

const DB_NAME = 'sama3';
const DB_VERSION = 1;
const STORE = 'pending';

export const STATUS = Object.freeze({
  pending: 'pending',
  processing: 'processing',
  error: 'error',
});

let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// { id, createdAt, durationSec, mime, blob } → enregistré avec status "pending".
export async function add({ id, createdAt, durationSec, mime, blob }) {
  const record = { id, createdAt, durationSec, mime, blob, status: STATUS.pending, errorMessage: null };
  await run('readwrite', (store) => store.add(record));
  return record;
}

export function get(id) {
  return run('readonly', (store) => store.get(id)).then((r) => r ?? null);
}

// Tous les enregistrements, du plus ancien au plus récent.
export async function list() {
  const all = await run('readonly', (store) => store.getAll());
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateStatus(id, status, errorMessage = null) {
  const record = await get(id);
  if (!record) return null;
  const next = { ...record, status, errorMessage: status === STATUS.error ? errorMessage : null };
  await run('readwrite', (store) => store.put(next));
  return next;
}

// Alias « delete » conforme au §5 (mot réservé en déclaration, autorisé en export).
function remove(id) {
  return run('readwrite', (store) => store.delete(id));
}
export { remove as delete };

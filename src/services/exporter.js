// Export / import JSON des sessions (sans audio, sans texte coranique).

import { toSession } from './store.js';

const FORMAT = 'sama3-sessions';
const VERSION = 1;

export class ImportError extends Error {}

// Sessions → Blob JSON téléchargeable.
export function toBlob(sessions) {
  const payload = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), sessions };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

// Déclenche le téléchargement d'un Blob sous le nom donné.
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Texte d'un fichier d'export → sessions valides. Lève ImportError si le fichier n'est pas reconnu.
export function parse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('json');
  }
  if (data?.format !== FORMAT || !Array.isArray(data.sessions)) throw new ImportError('format');
  return data.sessions.map(toSession).filter(Boolean);
}

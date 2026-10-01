// Garde l'écran allumé pendant l'enregistrement (§6) : iOS coupe le micro d'une page web écran verrouillé.
// Le navigateur libère le verrou quand la page est masquée : on le reprend à son retour.

let sentinel = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
    sentinel = lock;
  } catch {
    sentinel = null; // refusé (batterie faible, mode économie) : l'enregistrement continue quand même
  }
}

document.addEventListener('visibilitychange', acquire);

export function isSupported() {
  return 'wakeLock' in navigator;
}

export async function keepAwake() {
  wanted = true;
  await acquire();
}

export async function release() {
  wanted = false;
  const lock = sentinel;
  sentinel = null;
  await lock?.release().catch(() => {});
}

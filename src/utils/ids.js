// Identifiants d'enregistrement : rec_AAAAMMJJ_HHMMSS (heure locale).
// Les secondes évitent la collision de deux enregistrements dans la même minute.

const pad = (n) => String(n).padStart(2, '0');

export function recordingId(date = new Date()) {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `rec_${day}_${time}`;
}

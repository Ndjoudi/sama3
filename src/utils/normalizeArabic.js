// Seule fonction de normalisation arabe du projet (§8.2, §14.5).
// Utilisée par le client (matcher) ET par tools/buildQuran.js pour le champ `norm`.

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g; // harakat, alif suscrit, signes coraniques
const TATWEEL = /ـ/g;
const ALIF_HAMZA = /[آأإٱٲٳ]/g; // آ أ إ ٱ ٲ ٳ → ا
const WAW_HAMZA = /ؤ/g; // ؤ → و
const YA_HAMZA = /ئ/g; // ئ → ي
const LONE_HAMZA = /ء/g; // ء supprimée
const ALIF_MAQSURA = /ى/g; // ى → ي
const TA_MARBUTA = /ة/g; // ة → ه
const NON_ARABIC = /[^ء-ي\s]/g; // ponctuation, chiffres, latin
const SPACES = /\s+/g;

export function normalizeArabic(text) {
  return String(text ?? '')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(ALIF_HAMZA, 'ا')
    .replace(WAW_HAMZA, 'و')
    .replace(YA_HAMZA, 'ي')
    .replace(LONE_HAMZA, '')
    .replace(ALIF_MAQSURA, 'ي')
    .replace(TA_MARBUTA, 'ه')
    .replace(NON_ARABIC, ' ')
    .replace(SPACES, ' ')
    .trim();
}

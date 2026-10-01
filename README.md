# Sama3 — Retrouver les versets entendus à la mosquée

> Nom de travail (clé `sama3_state`). Renommage trivial après le Prompt 1.

**Ce README est la spécification complète et définitive du projet. Il fait loi.**
Si une information manque : s'arrêter et poser la question. Ne pas deviner.

---

## 1. Objectif

Pendant la prière, l'utilisateur enregistre la récitation de l'imam. À la fin, il coupe. Dès que le réseau revient, l'app reconnaît les passages récités et affiche, pour chacun : sourate, versets, texte arabe, traduction française et tafsir. Chaque prière est conservée dans un historique pour pouvoir y revenir.

L'audio est supprimé dès que le résultat est reçu. Seul le résultat (léger) est conservé.

## 2. Périmètre

**Dans le périmètre**
- Enregistrement local, écran maintenu allumé (voir §6), sans réseau
- File d'attente : traitement dès que le réseau est disponible
- Transcription arabe approximative (API Whisper via proxy serverless)
- Matching flou contre le texte coranique, côté navigateur
- Liste des passages reconnus + détail (arabe, traduction, tafsir)
- Historique local, export/import JSON

**Hors périmètre (ne pas coder)**
- Comptes, synchronisation cloud
- Reconnaissance du récitant, notation de la récitation
- Conservation de l'audio après traitement
- Lecture audio des versets
- Tout mode hors-ligne pour la transcription
- Import de fichiers audio (v2)

## 3. Contraintes techniques

- Web app, **mobile portrait d'abord** (cible 380 px), zones tactiles ≥ 44 px
- HTML / CSS / JS vanilla, modules ES natifs. **Pas de build, pas de framework, pas de bundler, pas de package.json côté application**
- Aucune dépendance externe : pas de CDN, pas de police d'icônes. Icônes en SVG inline (`atoms/icons.js`)
- Publiable en statique (GitHub Pages)
- Exceptions Node : `/tools/*.js` (scripts offline) et `/api/*.js` (fonction serverless)
- Français uniquement pour l'interface

## 4. Architecture

```
/index.html
/README.md
/styles/tokens.css          ← seule source de valeurs visuelles
/styles/base.css
/src/main.js                ← point d'entrée, routeur
/src/components/
    atoms/                  ← Button, IconButton, Icon, Badge, Spinner, Text
    molecules/              ← RecordButton, Timer, LevelMeter, StatusBanner, VerseCard, PassageHeader, Tabs, EmptyState
    organisms/              ← RecorderPanel, QueueList, PassageList, VerseDetail, HistoryList
    screens/                ← RecordScreen, ResultScreen, HistoryScreen
/src/services/
    recorder.js             ← MediaRecorder + niveau sonore (voir §6)
    wakeLock.js             ← écran maintenu allumé pendant l'enregistrement
    audioStore.js           ← IndexedDB : audio en attente
    queue.js                ← file d'attente + détection réseau
    api.js                  ← SEUL point d'appel réseau
    quranRepo.js            ← chargement du texte coranique local
    matcher.js              ← normalisation + recherche floue + continuité
    quranContent.js         ← traduction + tafsir (via api.js), cache
    store.js                ← état + persistance localStorage
    exporter.js             ← export / import JSON
/src/utils/                 ← normalizeArabic.js, format.js, ids.js
/content/quran-simple.json  ← généré offline, jamais à la main
/api/transcribe.js          ← fonction serverless (clé cachée)
/tools/buildQuran.js        ← génère content/quran-simple.json
```

**Flux de données**
```
RecordScreen → recorder → audioStore (IndexedDB)
                              ↓ réseau détecté
                           queue → api.transcribe → segments (texte + temps)
                              ↓
                           matcher (quranRepo) → passages
                              ↓
                           store (résultat) + audioStore.delete(audio)
                              ↓
                   ResultScreen → quranContent (traduction + tafsir)
```

## 5. Modèle de données

**Enregistrement en attente** (IndexedDB, store `pending`)
```json
{ "id": "rec_20260930_1412", "createdAt": "ISO", "durationSec": 1260,
  "mime": "audio/webm", "blob": "<Blob>", "status": "pending|processing|error",
  "errorMessage": null }
```

**Session traitée** (localStorage, clé `sama3_state`)
```json
{ "id": "rec_20260930_1412", "createdAt": "ISO", "durationSec": 1260,
  "label": "Dhuhr",
  "passages": [
    { "surah": 2, "fromAyah": 255, "toAyah": 257, "confidence": 0.82 }
  ] }
```
Les passages sont stockés dans l'ordre de récitation. **Aucun horodatage interne à l'enregistrement n'est conservé ni affiché** (les temps de segments ne servent qu'au calcul dans `matcher.js`). `label` = la prière (Fajr, Dhuhr, Asr, Maghrib, Isha, Jumu'a, Tarawih…), modifiable.
Aucun texte arabe, traduction ni tafsir stocké dans la session : récupérés via `quranContent` (avec cache).

**Texte coranique** (`content/quran-simple.json`)
```json
[{ "s": 1, "a": 1, "text": "بسم الله الرحمن الرحيم", "norm": "بسم الله الرحمن الرحيم" }]
```
`norm` = texte normalisé (voir §8). Généré par `tools/buildQuran.js`.

## 6. Enregistrement

**Exigence : l'enregistrement doit couvrir toute la prière (jusqu'à ~25 min).**

**Décision (test du 2026-10-01, iPhone iOS 18.7) :** Safari coupe le micro d'une page web dès que l'écran se verrouille. L'utilisateur a choisi de **garder l'écran allumé** pendant l'enregistrement (Screen Wake Lock API, `services/wakeLock.js`), téléphone posé écran vers le sol, non verrouillé. Options écartées : coquille native Capacitor (compte Apple payant ou réinstallation hebdomadaire), import depuis Dictaphone.

- `MediaRecorder` en `audio/webm;codecs=opus` (fallback `audio/mp4` sur iOS), débit bas (~32 kbps)
- Écran maintenu allumé du début à la fin de l'enregistrement ; le verrou est repris si la page redevient visible. Si le téléphone est verrouillé malgré tout, l'audio déjà capturé est conservé (voir plus bas)
- Jauge du niveau sonore en direct (`LevelMeter`) pour vérifier que la récitation est bien captée
- Écran d'enregistrement minimal : un seul gros bouton, timer, jauge, aucune autre action pendant l'enregistrement
- Démarrage par un tap **avant** la prière ; le téléphone n'est pas verrouillé
- Le blob est écrit dans IndexedDB à l'arrêt, puis la file d'attente prend le relais
- Si le micro est refusé ou si l'enregistrement est interrompu : message explicite, l'audio partiel déjà capturé est conservé et traité

## 7. File d'attente et réseau

- `queue.js` écoute `online` / `offline` et tente au démarrage de l'app
- Un enregistrement `pending` est envoyé dès que le réseau est disponible, un par un
- Succès → passages calculés → session ajoutée au store → **audio supprimé d'IndexedDB**
- Échec → statut `error`, l'audio est conservé, bouton « Réessayer »
- L'audio n'est jamais supprimé avant que la session soit écrite dans le store

## 8. Reconnaissance

1. `api.transcribe(blob)` → appelle `/api/transcribe` (proxy) → Whisper, langue `ar`, sortie avec segments horodatés
2. Normalisation de chaque segment : retrait des diacritiques et tatweel, unification alif/hamza, ya/alif maqsura, ta marbuta → ha. Même fonction pour `norm` dans le JSON (`utils/normalizeArabic.js`)
3. Recherche floue : index de n-grammes de mots sur `norm`, score par similarité ; meilleure correspondance par segment
4. **Continuité** : si des segments consécutifs correspondent à des versets consécutifs, ils fusionnent en un seul passage. En cas d'égalité entre versets similaires (passages répétés dans le Coran), on privilégie celui qui prolonge le passage précédent
5. Seuil de confiance minimal (valeur dans `matcher.js`, constante nommée) ; en dessous : segment ignoré
6. **Comblement des trous** : une fois le premier verset et le dernier verset d'un passage identifiés avec confiance, tout verset intermédiaire manquant (non reconnu directement par la transcription, à cause d'un silence, d'un bruit ou d'une transcription trop pauvre) est ajouté automatiquement par simple continuité du texte coranique — pas de nouvelle tentative de reconnaissance, on sait déjà ce qu'il y a entre deux versets donnés. Ne pas combler entre deux passages disjoints (silence long, changement de sourate) : seulement à l'intérieur d'un même passage continu
7. La transcription est approximative par conception : le matching doit tolérer des mots faux

Le matching s'exécute dans le navigateur. La transcription est la seule étape serveur.

## 9. Traduction et tafsir

- Source : API Quran.com v4, appelée **uniquement via `api.js`**
- **Traduction** : Rachid Maach (français), verset par verset
- **Tafsir** : version résumée de l'« Exégèse du Noble Coran » (affichage synthétique par verset ou par groupe de versets)
- Les identifiants de ressources Quran.com correspondants ne sont **pas fixés ici** : lister les ressources disponibles, repérer celles qui correspondent, et les faire **confirmer par l'utilisateur** avant de les coder. Si une ressource n'existe pas sur Quran.com, le signaler et proposer une alternative. Ne pas deviner.
- Récupérés à l'ouverture d'un passage, mis en cache (IndexedDB ou localStorage) pour lecture hors-ligne ensuite

## 10. Écrans

| Écran | Contenu |
|---|---|
| **RecordScreen** | RecorderPanel, QueueList (enregistrements en attente / en cours / en erreur) |
| **ResultScreen** | PassageHeader (date, prière), PassageList dans l'ordre récité → tap → VerseDetail |
| **HistoryScreen** | HistoryList : une entrée par prière (date, prière, nombre de passages, aperçu des sourates), tap → ResultScreen, renommage de la prière, suppression, export/import |

Navigation : barre basse à 2 entrées (Enregistrer, Historique). ResultScreen s'ouvre depuis l'historique ou la fin de traitement.

## 11. Design

- Tokens uniquement (`tokens.css`) : couleurs, espacements, rayons, typographies, ombres, durées
- Police arabe : pile système (`"Noto Naskh Arabic"` si présente, sinon `serif`), grande taille, `dir="rtl"`, interligne généreux. Aucune police téléchargée
- Sobre, apaisé, lisible. Pas de look « template IA » : pas de dégradés violets, pas de cartes génériques empilées
- Thème sombre par défaut (démarrage de l'enregistrement en mosquée, lecture nocturne) ; thème clair en variante de tokens

## 12. Inventaire des composants (liste FERMÉE)

**Atoms** : `Button`, `IconButton`, `Icon`, `Badge`, `Spinner`, `Text`
**Molecules** : `RecordButton`, `Timer`, `LevelMeter`, `StatusBanner`, `VerseCard`, `PassageHeader`, `Tabs`, `EmptyState`
**Organisms** : `RecorderPanel`, `QueueList`, `PassageList`, `VerseDetail`, `HistoryList`
**Screens** : `RecordScreen`, `ResultScreen`, `HistoryScreen`

Total : 22. (`LevelMeter` ajouté à la demande : niveau du son capté en direct pendant l'enregistrement.) Un besoin non couvert → proposer l'ajout au README et attendre validation.

## 13. Contrat d'un composant

```js
export function VerseCard({ surah, ayah, arabic, translation, onSelect }) {
  const el = document.createElement('article');
  // ... construit le DOM, classes CSS uniquement
  return el;
}
```
- Fonction pure : props → élément DOM. Pas d'état global, pas de fetch, pas d'accès au store
- Les interactions remontent par callbacks (`onSelect`, `onStop`…)
- Les **screens** sont les seuls à parler aux services et au store

## 14. Règles anti-duplication

1. Aucune valeur visuelle en dur : tout vient de `tokens.css`
2. Un composant ne touche jamais au store ni au réseau
3. Toute logique métier vit dans `/services`
4. Un seul point d'appel réseau : `api.js`
5. Une seule fonction de normalisation arabe : `utils/normalizeArabic.js`
6. Un seul composant par responsabilité : chercher avant de créer
7. Les icônes sont dans `atoms/icons.js`, jamais ailleurs
8. Aucun texte d'interface dans la logique : les libellés sont dans les composants ou un fichier `labels.js`
9. Aucune écriture dans `content/` à la main
10. Un fichier, une responsabilité

## 15. Sécurité et vie privée

- Clé API uniquement dans la variable d'environnement du serveur, jamais dans le dépôt ni le client
- L'audio quitte le téléphone uniquement vers `/api/transcribe`, n'est pas conservé côté serveur
- Audio supprimé localement après traitement réussi
- Rappel dans l'UI au premier lancement : demander à la mosquée si l'enregistrement est autorisé

## 16. Risques connus

| Risque | Mitigation |
|---|---|
| Écho / bruit en mosquée | Transcription approximative tolérée, matching flou, continuité |
| Le navigateur coupe le micro écran verrouillé | Confirmé sur iOS : écran maintenu allumé (Wake Lock), consigne affichée de ne pas verrouiller |
| Batterie consommée par l'écran allumé | Téléphone posé écran vers le sol, luminosité minimale conseillée |
| Versets très similaires | Règle de continuité (§8.4) |
| Limite de taille de l'API de transcription | Débit audio bas ; si dépassement, découpage côté client (à valider avant de coder) |

## 17. Roadmap

| # | Étape |
|---|---|
| 1 | Fondations visuelles : tokens, base.css, atoms, shell HTML |
| 2 | Store et stockage : `store.js`, `audioStore.js` |
| 3 | Enregistrement : test de faisabilité écran verrouillé, `recorder.js`, RecordScreen |
| 4 | Données coraniques et matcher : `buildQuran.js`, `quranRepo`, `matcher`, page de test manuel |
| 5 | Proxy et file d'attente : `api/transcribe.js`, `api.js`, `queue.js` |
| 6 | Résultats : ResultScreen, PassageList, VerseDetail, `quranContent.js` |
| 7 | Historique, export/import, finitions |

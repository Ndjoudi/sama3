# Prompts Claude Code — Sama3

Un prompt à la fois. Vérifie le résultat, puis passe au suivant.
`README.md` doit être à la racine du dépôt avant le Prompt 0.

---

## PROMPT 0 — Cadrage (une seule fois, en premier)

```
Tu vas développer Sama3, une application web qui retrouve les versets du Coran
récités pendant une prière, à partir d'un enregistrement audio.

Le fichier README.md à la racine est la spécification complète et définitive du
projet. Elle fait autorité sur toute décision : architecture, schémas de
données, composants, flux, design. Lis-la intégralement avant d'écrire la
première ligne de code.

RÈGLES ABSOLUES

1. Le README fait loi. Si une information manque, arrête-toi et pose la
   question. Ne devine pas, ne comble pas par une convention habituelle.
   Si tu identifies une contradiction, signale-la avant de coder.

2. Aucun composant hors de l'inventaire §12. Cette liste de 21 composants est
   fermée. Avant de créer quoi que ce soit, cherche s'il existe déjà. Un besoin
   non couvert : propose l'ajout au README et attends validation.

3. Respect strict des 10 règles de §14. En particulier : aucune valeur visuelle
   en dur (uniquement tokens.css), un composant ne touche jamais au store ni au
   réseau, toute logique métier dans /services, un seul point d'appel réseau.

4. Pas de build step. HTML/CSS/JS vanilla, modules ES natifs. Aucun framework,
   aucun bundler, aucun package.json côté application. Exceptions : /tools et
   /api (Node).

5. Aucune dépendance externe. Pas de CDN, pas de police, pas de bibliothèque
   tierce. Icônes en SVG inline dans atoms/icons.js.

6. Mobile portrait d'abord. Cible 380px de large. Zones tactiles ≥ 44px.

7. Traduction : Rachid Maach. Tafsir : version résumée de l'Exégèse du Noble
   Coran. Identifiants Quran.com : ne jamais les inventer. Liste les ressources
   disponibles, propose les correspondances et attends ma confirmation.

8. L'audio est supprimé après traitement réussi, jamais avant que la session
   soit écrite dans le store (§7).

MÉTHODE DE TRAVAIL

Je te donnerai les étapes une par une. Pour chacune :
  1. Annonce ce que tu vas produire
  2. Écris le code
  3. Liste les fichiers créés ou modifiés
  4. Indique comment vérifier le résultat
  5. Arrête-toi et attends ma validation

Ne code jamais plusieurs étapes d'affilée. N'anticipe pas. N'ajoute aucune
fonctionnalité non spécifiée : §2 liste ce qui est hors périmètre, ne le code pas.

Pour ce premier message : confirme que tu as lu le README en entier, signale
toute ambiguïté ou information manquante, et propose ton plan pour l'étape 1.
```

---

## PROMPT 1 — Fondations visuelles

```
Étape 1 de la roadmap §17.

Produis :
- styles/tokens.css (thème sombre par défaut + variante claire)
- styles/base.css (reset léger, typographie, police arabe RTL)
- Les 6 atoms : Button, IconButton, Icon, Badge, Spinner, Text
- atoms/icons.js (SVG inline : micro, stop, historique, check, erreur, réseau, chevron)
- index.html + main.js avec une page de démonstration qui affiche chaque atom

Direction visuelle : sobre, apaisée, lisible, pensée pour un usage
en mosquée et dans la pénombre. Originalité exigée : pas de look template IA.
Propose-moi d'abord la palette et la typographie en 5 lignes, attends mon
accord, puis code.
```

---

## PROMPT 2 — Store et stockage

```
Étape 2 de la roadmap §17.

Produis :
- services/store.js : état, persistance localStorage (clé sama3_state),
  abonnement aux changements, schéma de session exact de §5
- services/audioStore.js : IndexedDB, store "pending", schéma exact de §5
  (add, get, list, updateStatus, delete)
- utils/ids.js, utils/format.js (durée mm:ss, dates FR)
- Une page de test manuel /dev/storage.html qui permet d'ajouter, lister et
  supprimer des entrées factices

Aucune UI métier à cette étape.
```

---

## PROMPT 3 — Enregistrement

```
Étape 3 de la roadmap §17.

Exigence clé (§6) : l'enregistrement doit continuer ÉCRAN ÉTEINT ET VERROUILLÉ.

Première partie, avant tout le reste :
- Produis /dev/lock-test.html : enregistre via MediaRecorder, affiche le timer,
  à l'arrêt affiche la durée réelle du fichier et permet de le réécouter
- Explique-moi comment tester 5 minutes téléphone verrouillé en poche
- Arrête-toi. Je te donne le résultat. Si le test échoue, propose-moi la voie
  native (Capacitor) et attends mon accord. Ne choisis pas seul.

Seconde partie, après ma validation :
- services/recorder.js : start/stop, durée, gestion de l'interruption (l'audio
  partiel est conservé)
- Molecules : RecordButton, Timer, StatusBanner
- Organism : RecorderPanel
- Screen : RecordScreen (sans QueueList pour l'instant)
- À l'arrêt : le blob est écrit dans audioStore avec le statut "pending"
- Gestion explicite du micro refusé
```

---

## PROMPT 4 — Données coraniques et matcher

```
Étape 4 de la roadmap §17.

Produis :
- utils/normalizeArabic.js (règles exactes de §8.2)
- tools/buildQuran.js : script Node qui génère content/quran-simple.json
  (6236 versets, champs s / a / text / norm). Source : API Quran.com v4.
  Utilise la même normalisation que le client (importe le même module).
- services/quranRepo.js : chargement et index en mémoire
- services/matcher.js : index de n-grammes, score flou, seuil nommé, règle de
  continuité (§8.4), fusion en passages
- Une page de test manuel /dev/matcher.html : je colle une transcription
  approximative en arabe, tu affiches les passages trouvés avec leur score

Aucun appel à la transcription à cette étape. On valide d'abord le matching à la
main avec des textes volontairement déformés.
```

---

## PROMPT 5 — Proxy et file d'attente

```
Étape 5 de la roadmap §17.

Avant de coder : dis-moi quel fournisseur de transcription tu prévois, la limite
de taille de fichier, et si un découpage est nécessaire pour 20-25 minutes
d'audio. Attends ma validation.

Puis produis :
- api/transcribe.js : fonction serverless, clé en variable d'environnement,
  langue arabe, segments horodatés, audio non conservé
- services/api.js : SEUL point d'appel réseau du projet
- services/queue.js : détection online/offline, traitement un par un,
  transcription → matcher → session dans le store → suppression audio,
  statuts pending / processing / error, réessai
- Molecule/organism manquants : QueueList
- Branche QueueList dans RecordScreen

Explique-moi les étapes de déploiement du proxy et de configuration de la clé.
```

---

## PROMPT 6 — Résultats

```
Étape 6 de la roadmap §17.

Avant de coder : appelle la liste des traductions et des tafsirs disponibles sur
Quran.com v4. Repère la traduction française de Rachid Maach et la version
résumée de l'« Exégèse du Noble Coran ». Donne-moi les IDs trouvés et attends ma
confirmation. Si l'une des deux n'existe pas sur Quran.com, dis-le et propose une
alternative, sans en choisir une toi-même.

Puis produis :
- services/quranContent.js : traduction + tafsir via api.js, cache local
- Molecules : VerseCard, PassageHeader, Tabs, EmptyState
- Organisms : PassageList, VerseDetail
- Screen : ResultScreen (passages dans l'ordre récité, sans horodatage ; tap →
  détail : arabe, traduction, tafsir en onglets)
- Ouverture automatique du résultat à la fin d'un traitement
```

---

## PROMPT 7 — Historique et finitions

```
Étape 7 de la roadmap §17.

Produis :
- Organism : HistoryList
- Screen : HistoryScreen (une entrée par prière : date, prière, nombre de
  passages, aperçu des sourates ; tap → ResultScreen ; renommage de la prière ;
  suppression)
- services/exporter.js : export / import JSON de sessions
- Barre de navigation basse (Enregistrer, Historique)
- Rappel de vie privée au premier lancement (§15)
- manifest.webmanifest minimal pour l'installation sur écran d'accueil

Puis fais une revue complète : relis les 10 règles de §14 et liste toute
violation que tu trouves dans le code existant.
```

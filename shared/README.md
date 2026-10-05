# Sources communes et build de tous les modules Bubble

Les dix modules du dépôt sont générés à partir de sources. Chaque YAML dans `*/dist` reste autonome : Home Assistant ne charge aucun fichier de ce dossier, aucun module de base ni dépendance npm.

## Organisation

| Sources | Rôle |
|---|---|
| `shared/src/editor-options.js` | Formulaire natif commun à Weather, Wind Rose et Alert Manager |
| `shared/src/editor-group.js` | Groupes de formulaire et arrondis natifs pour tous les éditeurs concernés |
| `shared/src/number-locales.js` | Correspondance des préférences numériques Home Assistant |
| `shared/src/number-format.js` | Formatage localisé de Signature et des présentations séparées |
| `shared/src/numeric-value.js` | Lecture numérique commune à Flow et Weather |
| [signature-shared/src](../signature-shared/src) | Éditeur et comportements des présentations Signature, également réutilisés par le module historique |
| `signature-*/src` et `alert_manager/src` | Métadonnées, formulaires et code propres à chaque module |
| [scripts/build-modules.cjs](../scripts/build-modules.cjs) | Build et vérification de toutes les distributions |

Le module historique réutilise aussi les commandes numériques et le lecteur de Compact ainsi que les mesures et la géométrie de Room. Ses options et son ID `signature` sont conservés. Les différences de lecture numérique restent explicites : Wind Rose refuse les booléens et Navigation conserve son traitement existant des valeurs vides.

## Modifier et publier

Avec Node.js 22 ou plus récent, depuis la racine :

```sh
npm ci --ignore-scripts
npm run build:modules
npm run check:modules
npm test
npx playwright install chromium
npm run test:styles
npm run test:styles:split
```

1. Modifier les sources propres au module ou les fonctions communes. Ne pas éditer directement `dist`.
2. Augmenter la version dans le `src/module.yaml` de chaque module affecté, puis actualiser son guide et le tableau des versions du README racine.
3. Régénérer et vérifier les distributions ; les committer avec les sources. Les chemins d'installation restent identiques.

`npm run build` est un alias du build complet. `build:signature` et `check:signature` restent disponibles pour les quatre présentations séparées. La CI utilise `check:modules` pour refuser toute distribution périmée, même si la modification concerne un fichier partagé. Elle vérifie également les comportements et les styles calculés dans des fixtures Chromium ; ces tests ne sont pas une exécution Home Assistant ou Safari/iOS.

## Composition des sources

Les fichiers sont inclus par un commentaire placé sur sa propre ligne, avec un chemin relatif à la racine du dépôt :

```js
/* @include shared/src/editor-options.js */
```

L'assembleur développe récursivement les inclusions et conserve leur indentation. Les chemins absents, extérieurs au dépôt ou les cycles interrompent le build. Les six modules migrés utilisent `src/code.css` comme enveloppe Bubble, avec `runtime.js`, un éditeur et une feuille `presentation.css` lorsque nécessaire. Le champ `code` conserve le mélange CSS/templates JavaScript attendu par Bubble.

Flow, Weather et Wind Rose utilisent `@@MODULE_VERSION@@` dans leur source de runtime ; le build y injecte la version déclarée dans `module.yaml`. Les caches, abonnements et fonctions de nettoyage restent propres à chaque carte. Les variables du thème restent dans le CSS pour suivre les changements de thème sans reconstruction.

Square, Compact, Room et Header conservent leur assembleur spécialisé : il choisit leurs fragments JavaScript/CSS puis élimine les branches constantes avec Terser, sans renommage de variables ni optimisation unsafe. Le build complet appelle cet assembleur et génère les six autres modules sans transformation de leur logique.

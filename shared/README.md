# Sources communes et build de tous les modules Bubble

Les neuf modules du dépôt sont générés à partir de sources. Chaque YAML dans `*/dist` reste autonome : Home Assistant ne charge aucun fichier de ce dossier, aucun module de base ni dépendance npm.

## Organisation

| Sources | Rôle |
|---|---|
| `shared/src/editor-fields/presentation.yaml` | Douze définitions communes des champs Compact, Square, Room et Header, résolues au build |
| `scripts/module-definition.cjs` | Résolution des références de champs et des propriétés locales, avec conservation des alias YAML |
| `shared/src/editor-base.js` | Cycle commun des formulaires natifs ; adaptateurs Signature, Flow et modules avec listes/héritage |
| `shared/src/editor-options.js` | Formulaire natif commun à Weather, Wind Rose et Alert Manager |
| `shared/src/editor-group.js` | Groupes de formulaire et arrondis natifs pour tous les éditeurs concernés |
| `shared/src/number-locales.js` | Correspondance des préférences numériques Home Assistant |
| `shared/src/number-format.js` | Locale et formatage localisé des présentations Signature, Flow, Weather et Wind Rose |
| `shared/src/number-precision.js` | Précision native commune à Signature et Flow ; limites et défauts propres au rôle |
| `shared/src/template-source.js` | Rendu Jinja et identification des sources/entités pour Signature, Flow et couleurs Wind Rose |
| `shared/src/color.js` | Palette du thème et validation CSS pour Signature, Flow, Wind Rose et Alert Manager |
| `shared/src/dom.js` | Création HTML/SVG et écritures conditionnelles de texte/attributs pour Flow, Weather et Wind Rose |
| `shared/src/color-thresholds.js` | Échelles numériques et interpolation RGB communes à Compact, Square et Header |
| `shared/src/color-contrast.js` | Luminance des fonds RGB et protection CSS du premier plan, avec suivi du thème sans observateur |
| `shared/src/numeric-value.js` | Lecture numérique commune à Flow et Weather |
| [shared/src/styles](src/styles/README.md) | Fragments CSS par rôle : surfaces, typographie, séparateurs, onglets et focus des huit modules Signature |
| [signature-shared/src](../signature-shared/src) | Éditeur, comportements et composition CSS des quatre présentations Signature |
| `signature-*/src` et `alert_manager/src` | Métadonnées, formulaires et code propres à chaque module |
| [scripts/build-modules.cjs](../scripts/build-modules.cjs) | Build et vérification de toutes les distributions |

Compact définit les commandes numériques et l’habillage du lecteur ; Room définit les mesures et leur géométrie. Les différences de lecture numérique restent explicites : Wind Rose refuse les booléens et Navigation conserve son traitement existant des valeurs vides.

## Modifier et publier

Avec Node.js 22 ou plus récent, depuis la racine :

```sh
npm ci --ignore-scripts
npm run build:modules
npm run check:modules
npm test
npx playwright install chromium
npm run test:styles
```

1. Modifier les sources propres au module ou les fonctions communes. Ne pas éditer directement `dist`.
2. Augmenter la version dans le `src/module.yaml` de chaque module affecté, puis actualiser son guide et le tableau des versions du README racine.
3. Régénérer et vérifier les distributions localement pour les tester ; les committer avec les sources, ou laisser le workflow automatique les publier après le push. Les chemins d'installation restent identiques.

`npm run build` est un alias du build complet. `build:signature` et `check:signature` restent disponibles pour les quatre présentations séparées. La CI régénère d'abord les distributions dans son checkout, puis vérifie leur correspondance aux sources et leurs comportements. Les tests de styles utilisent également les modules construits depuis les sources du commit testé, sans attendre le commit automatique. Les fixtures Chromium ne sont pas une exécution Home Assistant ou Safari/iOS.

Les suites navigateur utilisent le même [socle de préparation et nettoyage](../styles/README.md), avec un contexte isolé par fixture. Les exceptions non gérées et les erreurs capturées au rendu font échouer le test dans toutes les suites. `test:styles:split` appelle la suite navigateur complète.

## Build automatique GitHub

Le workflow [Build module distributions](../.github/workflows/build.yml) démarre après un push qui modifie un fichier `**/src/**`, un script de build, `package.json`, `package-lock.json` ou le workflow lui-même. Il fonctionne sur les branches du dépôt, y compris `main`, et peut aussi être lancé manuellement depuis l'onglet Actions.

Il installe les dépendances, reconstruit les neuf modules, exécute `check:modules` et `npm test`, puis commit uniquement les YAML modifiés dans `*/dist` sur la même branche. S'ils sont déjà à jour, il ne crée aucun commit. Les versions et leur documentation restent à modifier dans les sources ; le workflow ne les augmente pas automatiquement.

Les builds d'une même branche sont sérialisés. Si un autre commit arrive pendant le build, le script reprend la dernière révision et reconstruit avant de retenter le push, au maximum trois fois, sans push forcé. La publication utilise le `GITHUB_TOKEN` du job avec `contents: write` ; les branches protégées conservent leurs règles. Aucun secret supplémentaire n'est requis. Les commits du bot limités à `dist` ne correspondent pas au filtre des sources ; GitHub ne déclenche pas non plus de nouveau workflow `push` pour un commit publié avec ce token ([documentation GitHub](https://docs.github.com/en/actions/concepts/security/github_token)).

Les pull requests restent validées par la CI en lecture seule ; le workflow de publication s'exécute après un push sur une branche du dépôt, sans écrire dans un fork.

## Composition des sources

Les fichiers sont inclus par un commentaire placé sur sa propre ligne, avec un chemin relatif à la racine du dépôt :

```js
/* @include shared/src/editor-options.js */
```

L'assembleur développe récursivement les inclusions et conserve leur indentation. Les chemins absents, extérieurs au dépôt ou les cycles interrompent le build. Les cinq autres modules utilisent `src/code.css` comme enveloppe Bubble, avec `runtime.js`, un éditeur et une feuille `presentation.css` lorsque nécessaire. Le champ `code` conserve le mélange CSS/templates JavaScript attendu par Bubble.

Les fragments CSS de [src/styles](src/styles/README.md) sont inclus dans les sélecteurs propres aux modules. Une inclusion peut transmettre un objet JSON de paramètres textuels ; la première ligne `/* @defaults {...} */` du fragment fournit ses défauts, remplacés via les marqueurs `@@NOM@@`. Les paramètres restent locaux à l'inclusion et les erreurs interrompent le build. Les priorités CSS, propriétés natives Bubble et accents sont explicites ; les dispositions restent dans chaque module. Flow possède également sa feuille `src/presentation.css`, incluse dans le template mis en cache du runtime. Ces assemblages n'ajoutent ni import CSS ni calcul de style à l'exécution.

Compact, Square, Room, Header, Flow, Weather et Wind Rose utilisent `@@MODULE_VERSION@@` dans leur source de runtime ; le build y injecte la version déclarée dans `module.yaml`. À la première exécution d’une nouvelle distribution sur une carte existante, une version différente ou absente déclenche le nettoyage du runtime précédent et la reconstruction de ses caches. Les caches, abonnements et fonctions de nettoyage restent propres à chaque carte. Les variables du thème restent dans le CSS pour suivre les changements de thème sans reconstruction.

Square, Compact, Room et Header conservent leur assembleur spécialisé : il choisit leurs fragments JavaScript/CSS puis élimine les branches constantes avec Terser. Le build complet appelle cet assembleur et génère les cinq autres modules.

## Définitions des champs d’éditeur

Les champs réellement communs de Compact, Square, Room et Header sont définis dans [src/editor-fields/presentation.yaml](src/editor-fields/presentation.yaml). Leur position et visibilité restent dans `src/module.yaml` :

```yaml
color:
  $field: color
  visible_if: (!card || card.card_type === 'button')
```

Le build remplace `$field` par la définition complète puis applique les propriétés locales. Une propriété locale remplace la propriété entière : aucun merge implicite des sous-objets. Les valeurs `false`, `0`, `null`, chaînes vides et listes vides restent explicites. Les champs propres à une disposition restent dans leur module ; Header conserve sa description particulière des sous-boutons.

Les références inconnues, définitions non objet et cycles interrompent le build. Les alias YAML restent partagés pour conserver les formulaires Flow/Alert Manager compacts. Le YAML livré ne contient aucune référence `$field` et ne demande aucun fichier commun dans Home Assistant. Le workflow existant suit déjà les sources et scripts concernés.

Une modification du catalogue doit actualiser tous ses consommateurs affectés et leurs versions. Les tests couvrent les formulaires générés, leurs conditions et conversions ; la comparaison avant/après de cette extraction conserve les neuf définitions, l’ordre des champs et le JavaScript/CSS livré.

## Distributions minifiées

Le build applique [minify-module.cjs](../scripts/minify-module.cjs) aux neuf distributions, y compris dans le workflow automatique GitHub :

- Terser raccourcit les identifiants locaux, simplifie les expressions et retire les commentaires JavaScript. Les noms des propriétés, options, composants et espaces d'état restent inchangés. Les transformations `unsafe` et les hypothèses de getters purs sont désactivées pour préserver les lectures suivies par Home Assistant.
- clean-css réduit les espaces et commentaires des feuilles CSS embarquées complètes. Les expressions JavaScript sont remplacées temporairement par des marqueurs de syntaxe valide puis rétablies dans leur ordre initial, sans être exécutées. Les fragments incomplets et les templates taggés ne sont pas transformés. L'ordre des règles, leurs valeurs, leurs unités et les variables CSS restent conservés.
- Les métadonnées structurées et le formulaire sont écrits en YAML flow, avec une indentation réduite et un champ `code` littéral. Le résultat reste un YAML autonome à importer. Aucun minificateur ni dépendance n'est chargé dans Home Assistant.

Les sources restent dans `src` ; les fichiers `dist` sont destinés à l'installation. Les tests d'éditeur exécutent les distributions complètes sur une carte détachée, sans dépendre de commentaires de repérage ou des noms de variables générés. Les vérifications de schéma utilisent les clés des sources, les tests de rendu et d'actions utilisent le code livré.

Mesure du 5 octobre 2026 sur les neuf distributions, comparées au commit `1e041ce` : **385 797 → 250 046 octets UTF-8**, soit **35,2 % de réduction**. Cette mesure porte sur les fichiers YAML bruts, pas sur le temps de chargement de Home Assistant. La comparaison des styles calculés couvre 152 rendus sur fixtures Chromium, en clair/sombre, avec/sans thème et à 328/600 px.

## Contrats des helpers

Les couleurs nommées de la palette suivent les variables natives du thème ; les valeurs CSS explicites restent littérales. Les sources Jinja partagent une heuristique de cible, pas un parseur complet. La précision du registre des entités précède les suggestions puis les anciens attributs, sans uniformiser les bornes métier. Les adaptateurs d’éditeur conservent leurs scopes et conversions YAML. Voir [STYLE_GUIDE.md](../STYLE_GUIDE.md) pour les priorités et la migration des noms de couleur.

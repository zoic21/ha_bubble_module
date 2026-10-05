# Sources communes des modules Signature

Les modules autonomes **Compact 1.2.4** et **Square et Header 1.1.4**, **Room 1.0.7** partagent les helpers JavaScript, le pont d’éditeur et les règles CSS communes de `src`. Chaque module a sa propre définition et sa présentation dans `signature-*/src`. Les commandes numériques et l’habillage des lecteurs multimédias sont définis dans Compact ; la géométrie et le formatage des températures sont définis dans Room. La branche média retourne son CSS avant les transformations de tuiles et ne crée aucun runtime de tuile.

Les définitions des champs communs sont dans [shared/src/editor-fields/presentation.yaml](../shared/src/editor-fields/presentation.yaml). Les sources des modules gardent les références `$field`, leur ordre et leurs propriétés locales, dont la visibilité. Le build développe ces références avant de générer les formulaires ; les distributions restent autonomes et leurs options inchangées.

Le [thème](../themes/signature.yaml) fournit les paramètres d’apparence, avec des valeurs de secours dans les modules. Les [fragments CSS communs](../shared/src/styles/README.md) centralisent les règles et les replis utilisés également par Flow, Weather, Wind Rose et Navigation. `base.css.js` et les présentations incluent les fragments nécessaires ; `visibility.css.js` conserve les règles de visibilité des tuiles. Le partage concerne aussi les valeurs, templates, actions, cache et nettoyage. Il ne crée aucun module de base à activer sur les cartes.

```sh
npm ci --ignore-scripts
npm run build:modules
npm run check:modules
npm test
npm run test:styles
```

Le build assemble les fichiers choisis pour chaque présentation et spécialise les branches constantes avec Terser. La passe commune minifie ensuite les identifiants locaux et expressions JavaScript, le CSS embarqué complet et les métadonnées YAML, sans transformation unsafe ni renommage des propriétés externes. Cet assembleur spécialisé génère les quatre présentations ; le build complet génère aussi Flow, Weather, Wind Rose, Navigation et Alert Manager. Ne pas modifier directement `dist` : `check:modules` vérifie leur correspondance exacte avec les sources. Voir le [guide de build de tous les modules](../shared/README.md). Toute publication doit mettre à jour les versions des distributions affectées et leurs guides.

Les styles utilisent les variables CSS à l’exécution : ne pas calculer leurs valeurs en JavaScript. Les caches réutilisent la géométrie, sans figer les états, les templates ou les actions. Chaque module possède son propre espace d’état et sa fonction `onTeardown`. Les attributs CSS de présentation supposent un seul module de présentation par carte.

Le cycle de vie commun compare la version du runtime à celle injectée au build depuis `src/module.yaml`. Une version différente ou absente, une autre racine de carte ou un type devenu incompatible libère l’ancien runtime avant le rendu suivant. Le nettoyage restaure les icônes et actions, retire les lignes secondaires, annule les contrôles numériques et arrête les observateurs concernés. Les caches de structure et CSS sont ensuite recréés ; à version inchangée, les mises à jour d’entités les réutilisent. La fonction `dispose` d’un ancien runtime ne peut pas supprimer celui qui le remplace.

Les tests vérifient les valeurs, commandes, caches, formulaires, actions, nettoyage et styles calculés des distributions autonomes. Les fixtures sont des DOM de forme Bubble, pas un runtime Home Assistant. Voir le [guide de migration](doc/MIGRATION.md).

Les [seuils de couleur numériques](doc/COLOR_THRESHOLDS.md) sont définis dans `shared/src/color-thresholds.js`, puis adaptés aux sources HA et aux fonds des carrés/badges dans `signature-shared/src/color-thresholds.js`. `shared/src/color-contrast.js` conserve le premier plan du thème si lisible et fournit sinon un repli noir/blanc ; le contraste suit les changements de thème en CSS, sans lecture de styles ni observateur. Le build livre ces fonctions uniquement dans Compact, Square et Header. Les listes sont préparées au changement de configuration ; les valeurs d’entité restent lues à chaque exécution pour le suivi Bubble. Les surfaces de carte et les valeurs principales gardent leurs rôles ; le libellé d’un badge utilise aussi un premier plan protégé, sans changer son contenu.

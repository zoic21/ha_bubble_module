# Sources communes des modules Signature

Les modules autonomes **Compact 1.2.0** et **Square et Header 1.1.0**, **Room 1.0.4** partagent les helpers JavaScript, le pont d’éditeur et les règles CSS communes de `src`. Chaque module a sa propre définition et sa présentation dans `signature-*/src`. Les commandes numériques et l’habillage des lecteurs multimédias sont définis dans Compact ; la géométrie et le formatage des températures sont définis dans Room. La branche média retourne son CSS avant les transformations de tuiles et ne crée aucun runtime de tuile.

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

Les tests vérifient les valeurs, commandes, caches, formulaires, actions, nettoyage et styles calculés des distributions autonomes. Les fixtures sont des DOM de forme Bubble, pas un runtime Home Assistant. Voir le [guide de migration](doc/MIGRATION.md).

Les [seuils de couleur numériques](doc/COLOR_THRESHOLDS.md) sont définis dans `shared/src/color-thresholds.js`, puis adaptés aux sources HA et aux icônes dans `signature-shared/src/color-thresholds.js`. Le build les livre uniquement dans Compact, Square et Header. Les listes sont préparées au changement de configuration ; les valeurs d’entité restent lues à chaque exécution pour le suivi Bubble. Aucun calcul de couleur ne modifie les tokens de fond ou les textes.

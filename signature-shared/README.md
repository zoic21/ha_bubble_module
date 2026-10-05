# Sources communes des modules Signature

Les modules autonomes **Compact 1.1.1** et **Square, Room et Header 1.0.1** partagent les helpers JavaScript, le pont d’éditeur et les règles CSS communes de `src`. Chaque module a sa propre définition et sa présentation dans `signature-*/src`. Les commandes numériques et l’habillage des lecteurs multimédias sont définis dans Compact ; la géométrie et le formatage des températures sont définis dans Room. Le module historique réutilise également ces fragments. La branche média retourne son CSS avant les transformations de tuiles et ne crée aucun runtime de tuile.

Le [thème](../themes/signature.yaml) fournit les paramètres d’apparence, avec des valeurs de secours dans les modules. Le partage des sources concerne surtout les valeurs, les templates, les actions, le cache et le nettoyage. Il ne crée aucun module de base à activer sur les cartes.

```sh
npm ci --ignore-scripts
npm run build:modules
npm run check:modules
npm test
npm run test:styles
npm run test:styles:split
```

Le build assemble les fichiers choisis pour chaque présentation et spécialise les branches constantes avec Terser, sans renommage de variables ni optimisations unsafe. Cet assembleur spécialisé génère les quatre présentations ; le build complet génère aussi Signature, Flow, Weather, Wind Rose, Navigation et Alert Manager. Ne pas modifier directement `dist` : `check:modules` vérifie leur correspondance exacte avec les sources. Le module historique réutilise désormais les fragments identiques de présentation, Compact et Room, sans changer ses options. Voir le [guide de build de tous les modules](../shared/README.md). Toute publication doit mettre à jour les versions des distributions affectées et leurs guides.

Les styles utilisent les variables CSS à l’exécution : ne pas calculer leurs valeurs en JavaScript. Les caches réutilisent la géométrie, sans figer les états, les templates ou les actions. Chaque module possède son propre espace d’état et sa fonction `onTeardown`. Les attributs CSS de présentation supposent un seul module de présentation par carte.

Les tests comparent les comportements et les styles calculés aux distributions historiques. Les fixtures sont des DOM de forme Bubble, pas un runtime Home Assistant. Voir le [guide de migration](doc/MIGRATION.md).

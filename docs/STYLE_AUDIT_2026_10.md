# Cohérence des styles — 17 octobre 2026

Cette passe compare les rôles de texte, arrondis, retraits, espacements et
contrôles des modules. Elle corrige les écarts vérifiés et regroupe les règles
de même rôle dans les sources communes, sans modification des dashboards.

## Corrections

| Cas | Avant | Après |
|---|---|---|
| Unités Panel | Couleur primaire et espacement hérité de −0,7 px | Couleur secondaire, poids normal, espacement nul, comme Square/Flow |
| Valeurs Panel | Chiffres proportionnels hérités | Chiffres tabulaires |
| Secondaire Panel | Interligne et rangée de 16 px fixes | `max(16px, secondaire × 1,2)` pour le texte et la rangée ; 20,4 px avec une police de 17 px |
| Panel avec commandes nommées | Valeur fixée à 20 px | Token `signature-compact-value-font-size`, défaut 20 px |
| Média Panel | Interlignes fixes de 20/18 px | Interligne de 1,3 suivant chaque police, comme le lecteur Compact |
| Unité Room `room_state_as_value` | Poids 500 hérité de la valeur | Poids normal 400, couleur secondaire et espacement nul |
| Scènes Hue | Police 13 px et interligne 16 px fixes | Token secondaire, interligne adaptatif ; bandeau d'au moins 40 px ou deux interlignes |

Panel reste haut de 118 px, avec l'illustration de 80 px à droite. Hue reste
haut de 112 px ; l'espace de palette s'ajuste au bandeau. Les fontes fortement
agrandies restent contraintes par ces hauteurs : cette passe ne promet pas
trois grandes informations et trois commandes sans troncature à toute largeur.
Les unités de durée Panel gardent les espaces déjà portés par leur texte,
sans marge supplémentaire devant chaque unité.

## Sources communes

`shared/src/styles/unit.css` possède taille, poids, couleur et espacement des
unités. Les répétitions locales Flow/Weather/Room et du socle Signature sont
retirées. `secondary-line.css` compose le rôle secondaire et son interligne,
utilisé dans le socle, Compact, Panel, Group et Hue. Les lecteurs et diagrammes
gardent leur interligne propre avec `secondary.css` seul.

`command-label.css` partage les libellés Room/Panel à 11 px et interligne 16 px.
Les trois fragments `switch-target.css`, `switch-track.css` et
`switch-thumb.css` partagent la géométrie Compact/Square/Hue : cible native
52 × 34 px, piste 48 × 28 px, poignée 24 px. Les sélecteurs, transitions,
couleurs d'état, décalages et actions restent dans leurs modules.

Ces inclusions sont résolues au build. Chaque YAML reste autonome : aucun
nouveau module à activer, fichier global, requête réseau, calcul de style,
observateur ou abonnement ajouté. Les URLs et choix Jinja des illustrations
restent relus selon le contrat existant.

## Dimensions conservées

Les rayons de carte 22 px, d'icône 12 px et de contrôle 14 px suivent toujours
les variables de thème. Les pilules Compact et Group de 36 px gardent leur
rayon concentrique de 12 px et leur retrait extérieur de 10 px ; les switches,
cercles, badges et pilules Header gardent leur géométrie propre.

Les retraits ne sont pas uniformisés : Compact/Square à 10 px, Room à 12 px
dans son contenu, Panel à 12 px horizontalement et 10 px verticalement,
Flow à 14 px (10 px horizontalement sur petite carte), sections Weather/Wind
généralement à 16 px. Les marges d'actions et séparateurs gardent leurs
compensations de bordure et leurs adaptations existantes.

## Versions et installation

| Module | Avant | Après |
|---|---|---|
| Compact | 1.4.7 | 1.4.8 |
| Square | 2.0.1 | 2.0.2 |
| Room | 1.4.1 | 1.4.2 |
| Panel | 1.0.1 | 1.0.2 |
| Flow | 3.6.1 | 3.6.2 |
| Weather | 1.3.5 | 1.3.6 |
| Group | 1.1.2 | 1.1.3 |
| Hue | 1.0.0 | 1.0.1 |

Réimporter les distributions utilisées. Le thème, les dashboards, Header,
Wind Rose, Navigation, Irrigation et Alert Manager n'ont pas de mise à jour
d'installation pour cette passe. Les extractions à rendu identique de
Square/Flow/Weather/Group sont versionnées pour suivre leurs sources communes.

## Vérification

Comparaison avant/après de **912 rendus** des fixtures communes : 19 cas,
6 largeurs (288, 328, 358, 382, 600 et 992 px), clair/sombre, avec/sans thème,
polices normales ou nom 18 px/secondaire 17 px et rayons personnalisés.
Styles calculés et dimensions identiques sur cette matrice ; Panel et Hue
sont vérifiés séparément car ils reçoivent les corrections visuelles ciblées.

Les nouveaux tests reproduisent les trois écarts sur la distribution de départ
(Panel, Room valeur, Hue scènes), puis passent sur les distributions corrigées.
Ils vérifient aussi la géométrie commune des switches et les changements CSS
sans réexécution du module ni remplacement des nœuds natifs.
La suite Panel charge Bubble 3.4.1 natif avec un backend simulé pour contrôler
unités, colonnes, commandes, média et mises à jour de thème.

Résultats finaux : distributions reconstruites et vérifiées, **389 tests Node**,
**123 tests Chromium** et **21 tests ciblés des dashboards** réussis, aucun
test sauté dans ces suites. Les huit exports d'installation sont identiques
octet par octet aux distributions ; aucun JSON de dashboard n'est modifié.

Commandes : `npm run build:modules`, `npm run check:modules`, `npm test` et
`npm run test:styles`, avec Chromium et Bubble natif pour les tests concernés.
Ces contrôles Chromium ne constituent pas une validation dans Home Assistant
réel ou Safari/iOS. Aucun gain de fluidité ou de chargement n'est déduit de
cette mutualisation des sources.

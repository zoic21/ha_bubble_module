# Cohérence globale des dashboards et modules — 17 octobre 2026

Audit conjoint de `ha_config` et des sources Bubble : sept dashboards,
1 035 cartes Bubble, 25 graphes statistiques et les composants spécialisés.
Les cartes principales ont toutes une présentation installée, sans mélange
de deux présentations. Les 28 navigations sont autonomes. Les 24 Panels
conservent deux pas et la pleine largeur ; les 34 Squares, 20 Rooms, 200 Headers
et compagnons gardent leur rôle. Les popups, cartes natives et modules sont
contrôlés selon leurs dispositions respectives.

## Corrections livrées

| Élément | Correction | Portée |
|---|---|---|
| Boutons des grands titres | Police secondaire du thème, 13 px/400 ; couleur primaire conservée | Header 1.2.0, 28 en-têtes |
| Noms Compact sur deux lignes | `name_lines: 2`, hauteur liée à l'interligne du thème au lieu de 32 px fixes | Compact 1.5.0, quatre ventilateurs Bambu |
| Durées avec deux-points | `h:mm` / `h:mm:ss` valides au rôle numérique compact, sans modifier le texte | Compact 1.5.0, temps restant du robot piscine |
| Petites mesures de section | `sub_button_styles.*.type: metric`, police de légende, interligne adaptatif, padding horizontal commun de 4 px | Header 1.2.0, trois séparateurs SolarFlow |
| Mode Maison | Suppression de sa police locale 13 px, désormais fournie par Header | Bandeau d'Accueil |
| Squares Gazon et Solaire | `rows: 2` explicite, comme leurs voisines ; la valeur n'est plus coupée dans une ligne de 56 px | Synthèse Extérieure |
| Formulaire Square | Retrait de trois conditions héritées du mode média `activity` supprimé ; rappel de la hauteur minimale | Square 2.0.3 |

Onze cartes changent de configuration dans `lovelace.lovelace` et
`lovelace.dashboard_exterieure`. Le CSS local de huit cartes est supprimé ;
la règle de police du Mode Maison est retirée. Le CSS Bubble local total passe
de **80 471 à 77 905 octets UTF-8** (−2 566 octets). Il s'agit d'une mesure de
source, sans promesse de fluidité ou de temps de chargement.

Les couleurs, seuils, illustrations Jinja, entités, services, conditions,
navigation et métadonnées sont conservés. La comparaison structurelle des
sept JSON ne trouve que 23 champs de présentation modifiés : neuf `styles`,
quatre `name_lines`, huit rôles `metric` et deux hauteurs `rows`.

## Uniformité et exceptions conservées

Surfaces neutres, textes HA, carte de 22 px, icônes de 12 px et contrôles de
14 px restent communs via les tokens existants. Les pilules Compact de 36 px
gardent leur rayon concentrique de 12 px ; les grands boutons Header leur
rayon de 24 px. Les switches et badges restent des formes propres à leur rôle.
Les densités Compact/Square, Room, Panel, Flow et météo ne sont pas uniformisées
à un padding unique. Leurs séparateurs et cibles de survol gardent les règles
partagées et les compensations de bordure déjà testées.

Les 25 graphes statistiques gardent leur bordure de carte activée et leurs
polices liées au thème. Leur CSS appartient à leur composant, pas à Bubble.
Les formulaires de recharge, présences, compteurs de volets/chauffage, aperçu
filament AMS, progression d'arrosage et lecteurs de carte/vidéo conservent leurs
dispositions spécialisées et leur logique. Les adaptations RVB et les seuils
métier ne sont pas remplacés par une palette automatique.

Les nouvelles règles se trouvent dans les modules de présentation existants,
assemblés avec les sources communes. Aucun nouveau module, ressource frontend,
capteur, commande ou abonnement n'est ajouté. Les rôles numériques utilisent
l'observation DOM Compact existante ; le thème continue à agir en CSS.

## Contrôles

- Distributions reconstruites et vérifiées ; 389 tests Node et 126 tests
  Chromium réussis, avec Bubble 3.4.1 natif pour les cas concernés.
  Les 13 exports installables de `ha_config` sont identiques octet par octet
  à leurs distributions sources, y compris les dix modules sans nouvelle version.
- 25 tests ciblés des dashboards réussis, dont les contrats de modules,
  les panneaux, les nouvelles options et les actions des petites mesures.
- 25 tests Python d'illustrations réussis.
- Comparaison structurelle des sept dashboards : aucune modification
  fonctionnelle ni réorganisation des vues/popups.
- Contrôle d'intégration séparé sur 325 configurations réelles, dont
  1 018 évaluations de champs Jinja avant/après avec des états simulés.
  **2 708 rendus Bubble 3.4.1** : chaque configuration en clair/sombre à
  328 px, puis 44 cas représentatifs à 288/358/382/600 px avec/sans thème.
  Aucune exception JavaScript, aucun débordement extérieur de carte et
  aucune différence inattendue ; les écarts sont limités aux titres Header,
  à la durée numérique, au padding harmonisé du pied SolarFlow et aux deux
  Squares dont la hauteur manquait. Les Squares fixes réservent au moins
  deux lignes ; leurs noms, valeurs et secondaires restent dans la carte.

La suite générale `ha_config` garde six échecs reproduits sur le commit de
départ : cinq références absentes de cette copie (Alert Manager et quatre
rapports de seuils), et une assertion ancienne sur le graphe d'air. Les tests
ne sont pas désactivés pour masquer ces échecs. Les tests ciblés ci-dessus
s'ajoutent aux contrôles de présentation ; ils ne réparent pas ces fixtures.

Les fixtures Chromium et le backend simulé ne constituent pas un essai dans
Home Assistant réel ou Safari/iOS. Les images externes et les menus HA réels
restent à vérifier dans l'installation ; aucune validation utilisateur n'est
déduite de cet audit.

## Installation coordonnée

Importer **Compact 1.5.0**, **Header 1.2.0** et **Square 2.0.3**, puis les deux exports existants
`config/.storage/lovelace.lovelace` et
`config/.storage/lovelace.dashboard_exterieure` dans `ha_config`.
Le thème et les cinq autres dashboards n'ont pas de changement de fichier.
Header agit sur leurs boutons de grands titres lorsqu'il est réimporté.

Sources : [Compact](../signature-compact/src), [Header](../signature-header/src),
[contrat de style](../STYLE_GUIDE.md) et
[contrôles des rôles](../styles/test/dashboard-roles.browser.cjs).

# Signature — règles techniques de style

Référence commune de **Signature Compact 1.6.4**, **Square 2.0.6**, **Header 1.2.0**, **Room 1.4.3**, **Panel 1.3.0**, **Flow 3.6.2**, **Weather 1.3.6**, **Wind Rose 1.5.5**, **Navigation 1.0.8**, **Group 1.1.5**, **Hue 1.0.1** et **Irrigation 1.0.0**. Toute modification visuelle de ces modules doit respecter ce contrat et mettre à jour les contrôles concernés. Les distributions `*/dist/*.yaml` constituent le code livré ; [le thème](themes/signature.yaml) définit les valeurs communes en modes clair et sombre.

L'identité visuelle repose sur des surfaces neutres, des arrondis de 22 px, une typographie système, des noms sobres et des valeurs de graisse moyenne. Harmoniser les éléments de même rôle ; conserver les différences de densité et de représentation utiles à chaque module. Les accents explicites de la carte et les couleurs d'état restent prioritaires. Ne pas ajouter une dominante violette par défaut.

**Signature Energy Balance 1.0.0** remplace seulement le contenu d’un bouton
par une barre nette journalière : carte de 50 px, piste de 28 px, retraits de
10 px et rayon commun de 22 px. Les pourcentages utilisent la légende de
12 px, graisse 600 et chiffres tabulaires. Les segments trop étroits masquent
leur texte ; leur infobulle reste accessible à la souris, au toucher et au
clavier. La surface, la bordure et la police utilisent les fragments communs.
Le module ne modifie pas les styles des autres graphiques ou présentations.

Les éditeurs des présentations Signature utilisent un formulaire anonyme (`name: ''`, `type: signature_options`) pour conserver les clés directement sous `signature_square`, `signature_compact`, `signature_room` ou `signature_header`. Le pont enregistre une fois son composant, puis utilise les champs d’objet Bubble et le regroupement `group` dans un `ha-form` natif. Le sélecteur d’objet reste détaché : aucun panneau d’élément ou bouton de suppression de l’objet racine. Les conditions `visible_if` suivent le type natif de carte et masquent les groupes sans champ utile sans supprimer les valeurs précédentes. Conserver les types mixtes compatibles Jinja, les booléens et la structure indexée de `sub_button_styles` ; les guides des présentations précisent les champs YAML intégrés au formulaire. Aucun observateur, abonnement ou polling ne doit être ajouté aux cartes pour gérer l’éditeur.

Flow 3.5.0 applique ce formulaire direct à `signature_flow`, avec des formulaires imbriqués dans les portées existantes `slots`, `slots.1` à `slots.6` et `animation`. Les six sections repliables gardent leurs noms et positions ; aucun emplacement absent ne doit être créé en ouvrant l’éditeur. La case d’activation doit refléter l’absence d’un emplacement et le défaut actif d’un objet déjà configuré. Préserver les valeurs masquées lorsque le bloc, le secondaire ou l’animation est désactivé. Les templates assurent leur propre calcul et formatage : ne présenter multiplicateur/précision que pour les entités directes. Un réglage d’animation vide par emplacement doit hériter du réglage global correspondant, sans injecter un défaut qui l’écrase. Utiliser le sélecteur Lovelace `ui_action` pour conserver les objets d’actions. Les conditions et les groupes ne doivent pas ajouter de calcul ou d’observateur aux cartes ; leurs règles de rendu restent identiques.

Les définitions communes des champs des quatre présentations sont dans `shared/src/editor-fields/presentation.yaml`. Les références `$field` des sources sont résolues uniquement au build ; leurs propriétés locales, notamment `visible_if`, restent prioritaires. Préserver l’ordre des champs et les descriptions spécifiques, sans ajouter d’option interne à la distribution.

Le cycle des formulaires natifs est assemblé depuis `shared/src/editor-base.js` ; les adaptateurs conservent leurs conversions YAML, scopes, listes, booléens et valeurs d’héritage. Les sections des éditeurs Signature, Flow, Weather, Wind Rose et Alert Manager utilisent `ha-form-signature_group`, dérivé du groupe natif Bubble. Conserver son rendu, les avertissements et `flatten` ; adapter seulement son CSS local. Le panneau doit hériter de `--ha-card-border-radius`, avec le repli natif `--ha-border-radius-lg`, au lieu du rayon de 6 px imposé par `bc_group`. Vérifier les panneaux ouverts/fermés et les changements de thème sans JavaScript. Ne pas modifier le composant Bubble d’origine ni les styles des autres formulaires. Ces rayons suivent l’éditeur Home Assistant ; ils ne remplacent pas les variables de style des cartes Signature.

Weather 1.3.4, Wind Rose 1.5.4 et Alert Manager 3.7.0 partagent le formulaire `signature_module_options`, livré dans chaque distribution pour fonctionner seul. Les sous-formulaires restent dans leur portée YAML existante. Conserver les sources météo chaîne/objet, les listes de mesures explicitement vides, les périodes numériques et les valeurs nulles de retour à l’héritage. Les listes natives de packs/entités ne sont qu’une représentation : les valeurs enregistrées restent des objets indexés par ID, avec validation des doublons et conservation des options supplémentaires. Les cases à défaut actif et les sélecteurs d’héritage ne doivent pas être persistés en ouvrant le formulaire ni écraser une politique héritée. Aucun observateur ou abonnement de rendu supplémentaire ne doit être ajouté pour l’éditeur.

## Modules de présentation autonomes

**Signature Compact 1.4.6**, **Square 1.6.2**, **Header 1.1.14** et **Room 1.3.7** reprennent les présentations historiques et appliquent ce même contrat, y compris sans thème et pendant un changement de mode. Un seul module de présentation est utilisé par carte ; le module historique `signature` a été retiré. Toutes les distributions du dépôt sont générées à partir de leurs `src`, des [sources communes de présentation](signature-shared/README.md) et des [fonctions communes](shared/README.md). Ne pas modifier directement `dist` ; utiliser `npm run build:modules` et `npm run check:modules`. Les présentations gardent leur assembleur spécialisé.

Les nouveaux formulaires n’exposent pas `layout` : ils proposent uniquement les options propres au module et suivent les types natifs compatibles. Header choisit l’en-tête ou le titre d’après `button/name` ou `separator`. Conserver l’éditeur direct et les rayons natifs des groupes. Compact prend aussi en charge `media-player` : seuls `color` et `color_background` s’appliquent et sont exposés dans son formulaire. Son habillage média conserve les contrôles, actions, pochette et dimensions natifs, sans imposer la hauteur de 56 px, sans transformation de tuile et sans observateur supplémentaire.

Le thème définit quatre variables supplémentaires pour Header, avec les mêmes valeurs de secours : `signature-header-font-size` 38 px, `signature-header-small-font-size` 32 px, `signature-title-font-size` 18 px et `signature-header-button-border-radius` 24 px. Elles suivent les changements du thème sans exécution du module. Les autres variables gardent leurs noms et leurs rôles.

Sur ordinateur, le grand en-tête conserve son seuil de 900 px de largeur de carte pour placer les sous-boutons sous le titre. Sur mobile (fenêtre de 600 px ou moins), le titre et le conteneur de tous les sous-boutons sont deux éléments flex : une largeur intrinsèque `max-content` conserve le groupe à droite seulement si son contenu et les 24 px de dégagement tiennent. Sur cette même ligne, le titre absorbe l’espace libre avec un facteur de croissance de 100000, contre 1 pour le groupe : la croissance résiduelle du groupe reste inférieure à 0,01 px sur mobile. Les pilules gardent ainsi leur largeur naturelle, alignées à droite avec 8 px d’écart. Sinon, le conteneur entier passe sous le titre, seul sur sa ligne flex, et occupe la largeur disponible ; aucun bouton ne reste à côté du titre. Les pilules remplissent alors chaque ligne avec `flex: 1 0 0`, leur contenu centré, 8 px d’écart fixe et 12 px entre les lignes. Leur minimum `max-content` préserve les libellés : les largeurs sont égales lorsque les contenus tiennent dans ces parts ; un contenu plus long garde sa largeur minimale et peut entraîner une ligne supplémentaire. Une pilule seule sous le titre remplit sa ligne. Aucun nombre de boutons ni largeur fixe n’est imposé. Les séparateurs conservent leur structure native distincte (icône, nom et groupe directement dans le conteneur). Leur groupe passe sous le titre dès qu’il ne tient plus à droite, à toute largeur de fenêtre ; les groupes/pastilles se répartissent dans la colonne avec un écart de 8 px, sans couper les libellés longs. Chaque ligne sous le titre commence au bord gauche de la colonne, y compris une dernière pastille seule ; les pastilles gardent leur largeur naturelle. Le groupe reste ancré à droite lorsqu’il tient à côté du titre. La hauteur devient automatique avec un minimum de 32 px. Préserver les nœuds et masquages natifs, sans mesure, observateur ou JavaScript supplémentaire.

Les contrôles vérifient le contrat des styles calculés de chaque présentation en clair/sombre, avec/sans thème et à plusieurs largeurs. Les tests de comportement couvrent également les valeurs, templates, actions et le nettoyage. Exécuter `npm run check:modules` et `npm run test:styles` après une modification. Ces fixtures Chromium ne prouvent pas un fonctionnement dans Home Assistant ou Safari/iOS.

## Sources CSS communes

Les [fragments de shared/src/styles](shared/src/styles/README.md) sont la source commune des surfaces, rayons, bordures, ombres, rôles typographiques, séparateurs, onglets Weather/Wind Rose et anneaux de focus applicables aux huit modules Signature. Les modules gardent leurs sélecteurs, leur disposition et leurs exceptions. Les propriétés natives Bubble et les priorités `!important` sont paramétrées au build ; aucun helper de style supplémentaire n'est exécuté dans les cartes. Les variables et valeurs de secours restent dans le CSS. Une modification d'un fragment doit actualiser tous ses consommateurs, y compris indirects.

La mutualisation du 5 octobre 2026 conserve les styles calculés sur 304 rendus de fixtures comparés avant/après : clair/sombre, 328/600 px, avec/sans thème et variables personnalisées. Les contrôles de cascade, focus et changements de thème restent couverts par les tests Chromium du dépôt.

## 1. Variables et cascade

Utiliser les propriétés `signature-*` existantes avant de créer une nouvelle valeur fixe pour un rôle partagé. Dans le YAML du thème, écrire `signature-name-font-size`; dans le CSS, écrire `--signature-name-font-size`. Le préfixe nomme les variables, il ne limite pas leur portée : elles sont héritées normalement.

Les variables doivent rester dans le CSS livré, y compris dans les chaînes CSS mises en cache. Le navigateur doit pouvoir changer le thème ou son mode sans nouvelle donnée d'entité ni nouvelle exécution du module. Ne pas remplacer les `var(...)` par des valeurs calculées en JavaScript.

Ordre obligatoire pour les surfaces neutres des quatre modules :

```css
background: var(--signature-card-background,
  var(--ha-card-background, var(--card-background-color, #fff)));
border: 1px solid var(--signature-card-border-color,
  color-mix(in srgb, var(--primary-text-color) 5%, transparent));
box-shadow: var(--signature-card-box-shadow,
  var(--ha-card-box-shadow, 0 2px 10px rgb(0 0 0 / .035)));
border-radius: var(--signature-card-border-radius, 22px);
```

Signature transmet ces valeurs aux variables natives `bubble-*`, et `bubble-media-player-*` pour le lecteur. Flow, Weather et Wind Rose les appliquent au conteneur visible. Le `ha-card` extérieur ne doit pas créer une seconde bordure ou une seconde ombre. Vérifier son style réellement appliqué : Bubble initialise certaines propriétés en ligne.

Les titres de section de Signature Header sont une exception aux surfaces de carte : leur `ha-card` et leur `.bubble-container` restent transparents, sans bordure ni ombre, même si un thème fournit des surfaces Bubble globales. Conserver le minimum de 32 px, le texte de 18 px et les fonds des sous-boutons natifs ; un titre court sans pastille reste à 32 px, les lignes supplémentaires doivent augmenter la hauteur réelle du conteneur.

Signature Navigation est une autre surface intentionnelle : footer flottant de 64 px, fond de carte hérité mélangé à 45 % avec transparent, flou de 18 px saturé à 180 %, une seule ombre extérieure `0 4px 16px rgb(0 0 0 / .10)` et un reflet masqué sur le contour. Le reflet mélange 90 % de la surface de carte héritée avec 10 % de blanc : il reste discret sur une surface sombre et conserve le rendu clair sur une surface blanche. Cette couleur commune suit le thème en CSS et s’applique aussi aux reflets intérieurs de sélection et de survol. Le reflet est lumineux en haut et à droite et s’efface en bas et à gauche ; ne pas ajouter un cadre lumineux uniforme ou un second fond au survol. Les marges mobiles valent 24 px par côté au plus jusqu’à 600 px ; largeur desktop native de 420 px par défaut. Les options documentées peuvent modifier les marges, le flou et l’opacité.

Un `none` explicite pour l'ombre est une valeur valide et doit être conservé. Tester la cascade sans thème Signature, notamment lorsque `ha-card-background` et `card-background-color` diffèrent. Un thème qui fournit toutes les variables peut masquer une divergence de repli.

Limiter les sélecteurs au module ou au layout concerné. Une règle commune de remise à zéro des boutons peut être plus spécifique qu'une classe d'onglet : contrôler la couleur inactive, le focus et la règle tactile dans les styles calculés. Utiliser `!important` uniquement lorsqu'une règle native ou une géométrie Bubble l'exige.

## 2. Typographie

Pile système commune, sans téléchargement de police :

```css
font-family: var(--signature-font-family,
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
```

La présence d'Apple dans la pile ne garantit pas une police Apple sur Android, Windows ou Linux. Le navigateur choisit la première police disponible.

| Rôle | Variable | Valeur par défaut | Graisse |
|---|---|---|---|
| Nom standard, nom média, titre du morceau, nom Flow, nom Weather | `signature-name-font-size` | 14 px | `signature-font-weight-semibold`, 600 |
| Texte secondaire, état média, artiste, état compact standard, onglet de période | `signature-secondary-font-size` | 13 px | `signature-font-weight-normal`, 400 |
| Légende, détail météo, petite mesure, libellé Wind Rose, détail Square et panneau bouton Panel | `signature-caption-font-size` | 12 px | Normale, sauf commande explicitement mise en évidence |
| Titre de mesure Square et panneau bouton Panel | `signature-caption-font-size` + 1 px | 13 px | `signature-font-weight-medium`, 500 |
| Valeur compacte en petit bouton | `signature-name-font-size` / unité `signature-caption-font-size` | 14 px / 12 px | Moyenne 500 / normale 400 |
| Valeur numérique compacte | `signature-compact-value-font-size` | 20 px | `signature-font-weight-medium`, 500 |
| Valeur square et valeur principale Flow | `signature-value-font-size` | 28 px | Moyenne, 500 |
| Température room et température actuelle Weather | `signature-temperature-font-size` | 30 px, avec adaptations ci-dessous | Moyenne, 500 |
| Unité square et unité principale Flow | `signature-value-unit-font-size` | 16 px | Normale, 400 |
| Unité de température room et Weather | `signature-temperature-unit-font-size` | 13 px | Normale, 400 |
| Unité de valeur compacte | `signature-secondary-font-size` | 13 px | Normale, 400 |
| Grand titre de page Signature | Taille propre au header | 38 px / 32 px | `signature-font-weight-bold`, 700 |

Les unités séparées des valeurs principales utilisent la couleur secondaire, une graisse normale et un espacement de lettres nul. Dans les prévisions Weather, le symbole degré fait partie du texte de la température et conserve sa taille et sa graisse. Les noms standards partagent `letter-spacing: -.2px`. Les grandes valeurs square, Flow et les températures principales partagent `-.7px`; les petits textes et les titres possèdent leurs réglages de lisibilité propres. Utiliser `font-variant-numeric: tabular-nums` pour les valeurs principales compact/square, les mesures room/Flow, les températures et mesures Weather et les valeurs Wind Rose. Vérifier cette propriété calculée : une remise à zéro `font: inherit` sur un bouton peut l'annuler malgré une déclaration dans le CSS.

Les onglets de période restent en graisse normale dans les deux états. La sélection est indiquée par la surface, l'ombre et la couleur primaire. Ne pas ajouter du gras uniquement dans l'un des deux modules.

### Opacité et lisibilité

Le texte secondaire ordinaire utilise `secondary-text-color` avec **`opacity: 1`**. Ne pas cumuler cette couleur avec l'opacité native de `.bubble-state` : Bubble Card 3.4.1 y applique `0.7`, ce qui atténue une seconde fois le texte. La correction concerne aussi cover, climate et media.

Dans Header, tous les libellés de sous-boutons et les valeurs `.bubble-range-value` utilisent `primary-text-color`, y compris sans seuils, dans le grand en-tête comme dans les titres de section. La règle porte sur le texte enfant : conserver la couleur du parent pour les icônes et les fonds utilisant `currentColor`. Les styles manuels, templates et couleurs de seuils gardent leurs rôles d’accent ; aucune adaptation de contraste ou branche nuit supplémentaire.

Depuis Header 1.2.0, les boutons des grands en-têtes utilisent le rôle secondaire
de 13 px et le poids normal, avec leur couleur primaire. La taille native Bubble
de 12 px ne doit plus contourner le thème. Les sections gardent leur densité ;
`sub_button_styles.*.type: metric` y centralise les petites mesures à 12 px,
interligne `max(16px, légende × 1,2)` et padding horizontal de 4 px.

Conserver les opacités qui expriment un état fonctionnel : icône désactivée, indisponibilité, interrupteur ou option explicite de l'utilisateur. Une règle destinée au texte ne doit pas réactiver un élément masqué ni rendre une commande indisponible active.

Le thème livré hérite des couleurs de texte et des surfaces Home Assistant. Le contraste dépend donc de la palette native ou personnalisée active ; contrôler la couleur finalement composée, particulièrement sur les surfaces teintées.

### Adaptations intentionnelles

| Élément | Règle de densité conservée |
|---|---|
| Flow, carte inférieure à 382 px | Valeur principale = `max(18px, valeur - 2px)` ; slots 4/6 = `max(16px, valeur - 8px)` ; leurs unités utilisent la légende de 12 px |
| Flow, canvas plus large | Slots 4/6 = `max(16px, valeur - 4px)` ; leurs unités utilisent le secondaire de 13 px |
| Flow, carte inférieure à 490 px | Connexions et positionnement passent au layout étroit ; ce seuil porte sur la carte, pas sur la fenêtre. Les seuils de densité excluent les 8 px gagnés par le retrait horizontal réduit. |
| Weather, conteneur au plus égal à 360 px | Température actuelle = `max(20px, température - 4px)` ; prévision haute = 18 px, ou 15 px dans `ranges` |
| Weather, conteneur plus large | Prévision haute = 20 px dans `ribbon`/`summary`, 16 px dans `ranges` ; prévision basse = secondaire de 13 px |
| Room, température principale | `clamp(20px, 14cqw, température)` ; valeur maximale 30 px par défaut |
| Room, mesures dans l'en-tête | Température de 20 px dans un espace de 82 px ; texte de température non numérique = 15 px |
| Compact, valeur textuelle à droite | 16 px, graisse normale ; conserver la place pour accents et descendantes |
| Room, état natif affiché | 17 px, interligne 22 px ; masque les mesures room redondantes |
| Signature title | Titre de section 18 px ; distinct du grand header et du nom d'une carte |
| Durées composées Signature | Unités de 10 px en compact standard, 13 px en compact valeur, 11 px pour l’état room, 16 px en square ; conserver les espaces entre nombres et unités |

Les nombres Flow trop longs sont ajustés par le mécanisme existant de mesure de largeur, en conservant la taille de l'unité. Chaque texte secondaire reste aligné à gauche sous le nom et la valeur de son emplacement, y compris le slot 3 en disposition étroite ; aucun décalage sous l'icône. Les noms et textes secondaires peuvent être tronqués lorsque le layout le prévoit. Ne pas appliquer cette réduction de police à tous les textes.

Les libellés cardinaux Wind Rose sont des textes SVG dans un `viewBox` de 320 unités : une taille CSS de 12 correspond à 12 unités avant mise à l'échelle. Leur taille physique suit la largeur réelle du SVG, plafonnée par `signature-wind-rose-max-size` (360 px par défaut). La variable reste dans le CSS et peut être définie sur une carte ; le SVG reste carré et rétrécit à la largeur disponible. Ne pas fixer la hauteur du conteneur ni réduire les polices de légende/pied pour modifier le diamètre. Une limite de 348 px réduit de 12 px la hauteur des cartes larges sans modifier les cartes dont le dessin est déjà plus petit. Ne pas présenter cette valeur comme 12 pixels à toutes les largeurs.

Les secteurs Wind Rose peuvent être divisés en quatre plages de vitesse, de la nuance la plus claire au centre à la plus foncée à l’extérieur. La couleur configurée et les changements de thème pilotent les nuances en CSS. La légende horizontale utilise le rôle de légende 12 px, avec des pastilles de 8 px et un retrait de 16 px. Les cercles restent sans chiffres : leurs positions ne représentent pas des pourcentages fixes. L’infobulle affiche direction, fréquence, durée, moyenne pondérée par le temps et maximum de vitesse historique ; elle reste disponible au survol, au toucher et au clavier.

Depuis Wind Rose 1.5.3, le blanc des deux plages claires est remplacé par un mélange de 25 % de surface de carte héritée et 75 % de blanc. Le clair sur surface blanche conserve ses couleurs ; le sombre atténue les reflets pâles. Conserver les proportions d’accent de 42 % / 72 % pour ces plages, puis les mélanges de 94 % / 67 % d’accent avec noir pour les deux plages foncées. Ces variables doivent suivre le thème en CSS sans réexécution du module ; les pastilles de légende et les secteurs utilisent les mêmes couleurs. Le teal par défaut et les accents bleu/rouge contrôlés gardent quatre nuances ordonnées. Les accents personnalisés très lumineux, dont blanc et jaune, peuvent confondre ou inverser les nuances claires ; le contrat ne garantit pas leur séparation sur toute surface.

Le pied de carte Wind Rose affiche la direction dominante à gauche, sa fréquence au centre et la durée de calme à droite, sur une seule ligne. Sans source de vitesse, la durée de calme est masquée et la fréquence reste à droite. La durée utilise un format compact avec les minutes sur deux chiffres (`1 h 05`) sans retour à la ligne, y compris sur une semaine. Un historique de vitesse exploitable sans calme affiche `0 min` ; des données manquantes affichent `—`. Ses libellés utilisent la légende de 12 px ; ses valeurs utilisent `signature-name-font-size` (14 px), la graisse moyenne 500 et des chiffres tabulaires. La fréquence reprend le pourcentage du secteur dominant hors calme et données manquantes ; la période reste dans le sélecteur supérieur.

### Interlignes et changements de taille

Compact 1.5.0 fournit `name_lines: 2` en mode valeur : le nom garde son nœud,
son interligne commun et une limite de deux interlignes, au lieu d'une hauteur
locale fixe de 32 px. Le défaut reste une ligne dans ce mode. Les textes de
durée `h:mm` et `h:mm:ss` valides utilisent le rôle numérique compact sans
réécriture de leur texte ; un libellé ou une date complète garde le rôle textuel.

Panel partage la règle secondaire `max(16px, secondaire * 1.2)`, dans le texte
et la ligne de grille réservée. Ses valeurs utilisent des chiffres tabulaires ;
ses unités partagent la couleur secondaire, le poids normal et l'espacement nul
du fragment `unit.css`, comme les unités de `room_state_as_value`. Les valeurs
des panneaux avec commandes nommées suivent `signature-compact-value-font-size`
(20 px). La carte conserve ses 118 px ; les grandes polices combinées à trois
informations et trois commandes nécessitent toujours de revoir la disposition.

Les noms de scène Hue suivent `signature-secondary-font-size` avec le même
interligne, tout en gardant leur couleur primaire et leur poids de nom.
Le bandeau inférieur réserve au moins 40 px ou deux interlignes. La carte
conserve 112 px : seule la place de la palette décorative s'ajuste. Les petites
lampes gardent leur nom de 14 px/500 et leurs retraits propres à cette grille.

Le titre du morceau et l'artiste du lecteur média utilisent un interligne sans unité de 1,3, résolu selon leur propre taille de police. Le secondaire Signature utilise `max(16px, secondaire * 1.2)`. La dernière ligne de grille square utilise la même formule. Flow réserve au moins 17 / 34 / 16 px à ses trois lignes, puis augmente chacune selon la taille de son texte multipliée par 1,2. Le nom compact utilise `max(16px, nom * 1.1)` et sa limite de deux lignes suit cet interligne.

Ne pas modifier une taille sans vérifier la hauteur de ligne, la ligne de grille, les limites de boîte et les ellipses associées. Les cartes compactes de 56 px et certains espaces room restent contraints : les variables ne promettent pas une adaptation illimitée au grossissement du texte. Pour une augmentation importante, adapter aussi le layout. Le test 18 px pour les noms / 17 px pour le secondaire vérifie les règles partagées, pas l'absence de toute troncature dans une carte compacte.

## 3. Couleurs, fonds et ombres

| Élément | Clair | Sombre |
|---|---|---|
| Surface de carte | `ha-card-background`, sinon `card-background-color` natif | Même cascade native |
| Fond principal | Home Assistant natif | Home Assistant natif |
| Texte primaire | `primary-text-color` natif | `primary-text-color` natif |
| Texte secondaire | `secondary-text-color` natif | `secondary-text-color` natif |
| Bordure de carte | 5 % du texte primaire dans transparent | Même mélange |
| Séparateur | 8 % du texte primaire dans transparent | Même mélange |
| Ombre de carte | `0 2px 10px rgba(0,0,0,.035)` | `0 2px 10px rgba(0,0,0,.20)` |
| Fond de contrôle | 5 % du texte primaire dans la surface de carte | Même mélange |
| Ombre de contrôle | `0 1px 4px rgba(0,0,0,.06)` | `0 1px 4px rgba(0,0,0,.25)` |

Le thème Signature conserve la palette globale de Home Assistant : garder les fonds de page, surfaces, textes, accents, en-tête et barre latérale natifs. Il ajuste la typographie, les arrondis, la bordure et l'ombre des cartes natives. `ha-card-border-color` reprend `signature-card-border-color` et `ha-card-border-width` vaut 1 px : les cartes compatibles partagent ainsi le contour des modules en clair/sombre, sans remplacer `divider-color`. Statistics Graph Chart Card doit conserver `card_border: true` ; un `false` explicite masque la bordure malgré le thème. Ses variables Bubble globales ajustent seulement les arrondis ; ne pas y ajouter un fond, une bordure ou une ombre qui s'appliquerait aussi aux séparateurs. Hors thème, conserver les replis de la section 1. Le fond des groupes de période utilise `signature-control-background`, puis un mélange de 5 % de texte primaire dans la surface neutre. Leur onglet sélectionné reprend la surface de carte.

Le fond d'icône Signature et Flow mélange 16 % de l'accent dans la surface neutre. Les options explicites de couleur et de teinte restent fonctionnelles. Les valeurs météo froides/chaudes utilisent `signature-weather-cool-color` (`#8bc3d2`) et `signature-weather-warm-color` (`#e9ac70`). La rose utilise `signature-wind-rose-color` (`#4db6ac`). Les couleurs des conditions météo et les alertes portent une information ; ne pas les remplacer uniformément par une couleur décorative.

### Espacement des textes Compact — 1.6.2

Conserver **10 px entre le carré d’icône et le texte**, avec ou sans badge de
mode, en standard comme en mode valeur : même écart que le retrait extérieur
de l’icône (10 px, bordure comprise), en haut, en bas et à gauche. Les lignes
flex utilisent une marge d’icône de 10 px ; les grilles gardent leur écart de
8 px entre contrôles et réservent 38 px pour l’icône de 36 px. La grille
repliée suit la même règle. Nom et secondaire partagent la colonne ; ne pas
déplacer les valeurs et commandes de droite ni réduire leurs cibles.
Sans icône, ne pas ajouter de colonne réservée. Le média garde sa disposition
native et un retrait de texte de 10 px. Les petits formats spécialisés Hue
gardent leurs règles propres. Aucun décalage conditionné par le badge.

### Badge de mode sur une icône Compact

Compact 1.6.0 propose `sub_button_styles.*.type: mode_badge` pour une unique
commande native Auto/Manuel nommée d’une carte cover/climate avec icône.
Cible transparente de 44 × 44 px superposée au carré de 36 px, badge de
14 px au coin inférieur droit, lettre de 9 px/600 et bordure de surface neutre.
Les fonds restent des variables CSS héritées ; les couleurs explicites et
l’opacité conservent leur priorité. Le libellé natif complet est masqué
visuellement et reste accessible ; le pseudo-élément affiche sa première lettre.
Conserver les nœuds et handlers natifs, le clic de bascule et l’appui long vers
l’équipement parent ; aucune réduction des commandes de droite. Le mode masqué
reste masqué, les autres sous-boutons restent en place, et le retrait du type
rétablit la géométrie sans écouteur ou observateur supplémentaire. Tester les
clics au centre de l’icône, le badge, l’appui long et les commandes voisines.

### Remplissage compact facultatif

Compact 1.4.3 propose `value_style: button` avec `compact_mode: value` : conserver le nœud d’état natif et sa cible de détails. Petite pastille neutre de 36 px, padding horizontal de 10 px, rayon concentrique `max(0px, rayon carte − 10px)` (12 px), valeur `signature-name-font-size` (14 px), unité `signature-caption-font-size` (12 px). Surface `signature-control-background`, sinon mélange de 4 % du texte primaire dans la surface neutre. Placer la mesure avant les sous-boutons ; les interrupteurs visuels viennent en dernier dans leur groupe natif par CSS, sans déplacer leurs nœuds ni changer les indices/actions. À trois commandes ou plus, conserver la petite valeur et les commandes sur une ligne tant que leurs largeurs intrinsèques tiennent ; sinon replier le groupe entier sous la mesure, avec hauteur automatique. Aucun seuil de 480 px pour ce style depuis Compact 1.6.3. Ce comportement fonctionne avec ou sans remplissage. Avec `value_background: false`, enlever le fond, la bordure et l’ombre de la valeur, et réduire son padding horizontal à 4 px ; garder la cible de 36 px, la typographie, les actions et le placement avant les commandes. Le fond de la jauge et les surfaces des sous-boutons ne sont pas concernés.

Compact 1.4.3 propose `fill` sur les boutons État sans contrôles numériques générés : entité `reference_entity` ou limite fixe `max`. Le fond d’origine n’est jamais remplacé ; un gradient d’accent transparent à 16 % (`signature-fill-tint`, repli 16 %) couvre la part calculée. Garder les textes du thème, l’icône et les badges, les limites visuelles 0–100 %, la distinction zéro/données invalides et l’absence de conversion implicite d’unité. Le mouvement réduit désactive la transition de largeur de 1,5 s. Les couleurs à seuils restent propres aux icônes ; elles ne deviennent pas la couleur du remplissage.

Aucun nœud interactif, observateur, abonnement ou polling ajouté. Les états de l’entité et de sa référence restent lus hors cache ; les styles statiques sont conservés dans le runtime. Ne pas réduire les sous-boutons, switches ni flèches pour faire tenir une jauge. Avec une grande valeur texte à droite et au moins trois sous-boutons configurés, à 480 px ou moins les contrôles natifs passent sous la mesure et se répartissent dans leur groupe existant, avec hauteur automatique. Les petites valeurs `value_style: button` suivent le contenu depuis Compact 1.6.3 : groupe principal et groupe de commandes sont deux éléments flex à largeur intrinsèque ; le premier absorbe presque tout l’espace libre, le second remplit sa ligne lorsqu’il se replie. Garder 10 px entre icône et nom, 8 px entre mesure et commandes et les masquages natifs prioritaires. Aucun nœud déplacé, mesure JS ou observateur supplémentaire. Les autres jauges gardent la hauteur compacte de 56 px. Les conditions natives restent prioritaires et les nœuds conservent leurs handlers. Les fixtures couvrent les sous-boutons plats/groupés, les clics/changements simulés et le badge Alert Manager ; elles ne chargent pas les menus Home Assistant réels.

### Couleurs, templates et précision partagés

Les options de couleur nommées utilisent la même palette native dans les présentations Signature, Flow, Wind Rose et Alert Manager : `blue` signifie `var(--blue-color, #2196f3)` partout. Les autres noms de la palette sont définis dans `shared/src/color.js`. Les noms sont insensibles à la casse ; les valeurs CSS explicites (`#0000ff`, `rgb(...)`, `var(...)`) gardent leur sens. Une couleur invalide revient au défaut propre au rôle, notamment la couleur de vent pour Wind Rose. Ce contrat remplace les noms CSS bruts utilisés auparavant par Flow, Wind Rose et les overrides Alert Manager ; choisir une valeur hexadécimale pour conserver leur ancienne couleur exacte. Les couleurs de gravité par défaut restent rouge/orange.

Le badge Alert Manager conserve ses variables spécifiques. Leur repli suit la surface neutre native et le texte primaire, y compris sans thème Signature ; aucun fond blanc/noir fixe ne doit masquer le mode sombre.

`shared/src/template-source.js` centralise la détection des sources directes, références littérales et appels Jinja utilisant `entity`. Les templates conservent leur propre formatage. L’identification d’une entité reste une heuristique prenant la première référence : conserver les actions explicites, les templates sans cible et les lectures suivies hors cache. L’entité principale est résolue à chaque passage, même si l’analyse du template est en cache.

`shared/src/number-precision.js` cherche la précision dans le registre des entités, puis `suggested_display_precision`, puis l’attribut historique `display_precision`. Une option propre au module conserve la priorité, notamment zéro ; les défauts et bornes restent propres au rôle. Flow conserve son défaut zéro sans métadonnée ; Signature peut inférer les décimales de l’état brut. Weather et Wind Rose gardent leur précision métier. Les formateurs de nombres partagent les préférences de locale sans partager leurs caches ni leurs cycles de données.

### Échelles numériques des icônes et fonds doux

Compact et Square, sur une carte bouton, acceptent `color_thresholds.values` pour le carré et l’icône principale. Compact/Square/Header acceptent aussi des échelles par badge, y compris les séparateurs Header. Ne pas recolorer la surface de carte, la valeur principale, l’accent, un interrupteur visuel ou le badge Alert Manager. Room et les couleurs d’activité du thermostat restent indépendants. Les seuils actifs remplacent `background`, `color` et `icon_color` du seul indicateur, sans changer géométrie, contenu ou actions ; retirer les seuils restitue les styles manuels.

Les points opaques `#RGB`, `#RRGGBB` ou `rgb(r,g,b)` utilisent l’interpolation RGB de Statistics Graph Chart Card, indépendante du cadrage. La couleur brute est portée par l’icône ; le fond mélange **16 %** de cette couleur dans la surface neutre, exactement comme les icônes ordinaires Pluie/Vent. La surface suit le thème et reste sombre en mode sombre, sans couleur pleine ni fond blanc fixe. Deux points égaux délimitent une plage constante. Les données invalides donnent une teinte neutre à 16 % et une icône du thème.

La couleur de l’icône correspond exactement au RGB du trait du graphe. **Aucune gestion de contraste** : pas de bascule noir/blanc, pas de couleur relative XYZ, pas de minimum calculé et pas de branche spécifique nuit. Le texte du badge garde `primary-text-color`. Les opacités natives / explicites restent fonctionnelles. Les couleurs des seuils doivent être choisies visibles dans les thèmes utilisés, comme les accents ordinaires Square.

Le mélange sRGB dans la surface neutre suit les changements de thème sur les mêmes nœuds sans réexécution ni lecture de styles. Les fonds sont doux en clair et sombres dans un thème sombre : c’est la même règle que les icônes standard, pas un autre traitement. Ne pas animer séparément les couleurs des indicateurs afin de conserver la correspondance instantanée avec le graphe. Aucun `getComputedStyle`, abonnement, observateur, polling ou historique supplémentaire. Préparer les points au changement de configuration et garder les lectures d’entité hors cache. Voir le [guide de configuration](signature-shared/doc/COLOR_THRESHOLDS.md).

Les fixtures Chromium comparent les icônes aux couleurs de référence du graphe et les fonds au mélange 16 %, en clair/sombre avec/sans thème ; elles contrôlent aussi l’absence de correction de contraste, les changements de palette sans réexécution, les dimensions, nœuds et actions. Elles ne valident pas Home Assistant réel ou Safari/iOS.

## 4. Arrondis et contrôles

| Élément | Variable ou dérivation | Défaut |
|---|---|---|
| Carte visible | `signature-card-border-radius` | 22 px |
| Icône principale | `signature-icon-border-radius` | 12 px |
| Petite icône Flow | `signature-icon-small-border-radius`, sinon `max(0px, rayon icône - 2px)` | 10 px |
| Boutons natifs cover/media et contrôles Signature | `signature-control-border-radius` via les variables Bubble adaptées | 14 px |
| Pastilles de 36 px et petite valeur Compact | `max(0px, rayon carte - 10px)` ; retrait extérieur de 10 px dans une ligne de 56 px | 12 px |
| Groupe de périodes | `signature-control-border-radius` | 14 px |
| Bouton de période intérieur | `max(0px, rayon contrôle - 3px)` | 11 px |
| Infobulle Wind Rose | `signature-tooltip-border-radius`, sinon rayon d'icône | 12 px |
| Sélection Navigation, survol, focus et ripple | `max(0px, rayon carte - 6px)` ; retrait uniforme de 6 px et largeur de la case native | 16 px |
| Ombre d'infobulle | `signature-tooltip-box-shadow`, sinon `signature-control-box-shadow`, sinon ombre de contrôle claire | Dépend du mode |

Weather et Wind Rose partagent les métriques suivantes : padding du groupe 3 px, écart entre boutons 3 px, padding horizontal d'un bouton 10 px, police secondaire 13 px, hauteur minimale `signature-control-height` de 40 px. Avec `pointer: coarse`, utiliser `signature-control-touch-height` de 44 px. Le groupe Weather est inline ; le groupe Wind Rose occupe sa largeur disponible. Cette différence de placement est intentionnelle. Wind Rose permet de masquer toute sa barre de période avec `show_period_buttons: false`, y compris son padding ; la rose utilise alors la période `hours` configurée. Le sélecteur reste visible par défaut et les autres espacements, secteurs et contrôles de détail sont conservés.

L'état inactif utilise la couleur secondaire ; l'état sélectionné la couleur primaire. Le focus clavier possède un contour visible de 2 px, conserve l'arrondi réglé et ne change pas la taille du bouton. Tester un rayon personnalisé de 9 px : le rayon intérieur doit devenir 6 px, au clavier comme à la souris.

Les mesures Room ont le dégagement horizontal natif de 8 px des sous-boutons Compact. Dans le contenu, leur cible mesure 36 px, autour de l’interligne existant de 32 px ; les textes gardent leurs ancrages à 12 px du bord intérieur et leur position verticale. Le fond de survol reste au-dessus du séparateur : vérifier au moins 2 px d’écart dans le contenu et 4 px dans l’en-tête à deux rangées, en incluant la bordure et la géométrie de `::after`. Les boîtes température/humidité partent à 4 px du bord et leurs limites incluent le padding ; la température réserve 74 px à l’humidité et 12 px aux retraits/écart. À 180 px de largeur intérieure ou moins, le dégagement passe à 4 px comme la petite valeur Compact sans fond : boîtes à 8 px du bord, humidité limitée à 54 px et température limitée à la largeur moins 74 px, avec 4 px d’écart minimum. Dans l’en-tête empilé, la température occupe 26 px et l’humidité 18 px, sans recouvrement avec l’autre mesure ni les commandes ; l’humidité descend pour réserver le dégagement. Un placement local côte à côte doit compenser ses ancrages horizontaux de 8 px et augmenter ses limites de largeur de 16 px, sans comprimer ses textes. Le détail inférieur Square `controls: measure` garde sa hauteur de 24 px et son ancrage de texte à 14 px ; sa boîte ajoute 8 px par côté. Ne pas agrandir le ripple seul en dehors d’un parent natif qui le tronque : le dégagement appartient à la boîte d’action existante.

Les formes circulaires (`50%`), les boutons de contrôle room, les pistes de 6 px, les repères SVG et le switch visuel Signature de 48 × 28 px avec poignée de 24 px ont une géométrie propre. Les pilules du header gardent leur rayon de 24 px. Les petits rayons des zones de focus Flow et de ses nœuds sont internes au diagramme. Ces exceptions ne remplacent pas les rayons des cartes et des groupes partagés.

### Survol et retour natif Bubble

La `.bubble-background` des quatre présentations garde ses actions et son `ha-ripple` natifs. Ancrer sa géométrie avec `inset: 0`, `width: auto` et `height: auto` : les coordonnées automatiques décalent la couche dans les wrappers flex rembourrés ou les grilles. Elle doit remplir le bord intérieur de la carte, y compris en hauteur automatique ; ne pas créer un fond supplémentaire au survol.

Les boîtes `.bubble-content-container` restent traversables par le pointeur. L’icône principale et les valeurs/actions explicites réactivent leurs propres cibles ; les sous-boutons conservent leur retour natif indépendant. Le halo des interrupteurs Signature suit leur piste de 48 × 28 px, avec un retrait de 3 px vertical / 2 px horizontal et un rayon de 14 px, sans réduire la cible native de 52 × 34 px. Room conserve son clip circulaire pour les commandes sans texte. Les contrôles cover/climate/media et les pilules Header restent natifs. Navigation garde son survol propre ; Flow, Weather et Wind Rose masquent leur wrapper natif.

[Les fixtures de survol](styles/test/hover.browser.cjs) vérifient les dimensions de la couche et de son ripple à cinq largeurs, en clair/sombre avec/sans thème, les clics carte/valeur/commande, la sortie du pointeur et le toucher. Elles reproduisent le contrat parent et la surface du ripple ; elles ne chargent pas le composant Home Assistant réel.

Le rayon spécifique `--bubble-button-border-radius` des boutons Compact est fourni par le module depuis 1.4.4 et suit `--dp-radius`. Une ancienne valeur héritée de Bubble ne doit pas nécessiter une règle recopiée dans chaque carte. Les formes propres aux switches et aux sous-boutons restent indépendantes.

## 5. Traits, longueurs et espacements

Les séparateurs horizontaux room, Weather et Wind Rose sont des lignes décoratives de **1 px**, sans interception des événements. Couleur : `signature-divider-color`, sinon mélange de 8 % du texte primaire dans transparent. Leur retrait est `signature-divider-inset`, par défaut **16 px à partir du bord intérieur de la carte**.

La longueur vaut donc `largeur intérieure - 2 × retrait`. Une bordure extérieure de 1 px ajoute 1 px au retrait mesuré depuis l'extérieur : une valeur de 16 px se mesure à 17 px du bord extérieur. `0px` couvre la largeur intérieure ; `24px` raccourcit le trait. Utiliser une longueur CSS non négative.

Les lignes de prévision Weather sont placées dans des lignes déjà rembourrées. Compenser ce padding une seule fois : le retrait final doit rester identique à celui de room et Wind Rose sur mobile comme sur bureau. Ne pas déplacer les textes pour corriger le trait. Un pseudo-élément qui s'étend dans ce padding avec un retrait nul n'est pas un débordement du texte.

| Trait ou repère | Épaisseur | Rôle |
|---|---|---|
| Bordure de carte | 1 px CSS | Surface commune |
| Séparateur horizontal | 1 px CSS | Structure commune |
| Connexion et flèche Flow | 1,7 unité SVG ; ligne d'opacité 0,35 | Flux ; longueur issue des nœuds et de la valeur affichée |
| Grille Wind Rose | 0,7 unité SVG | Repère de lecture |
| Bord de secteur Wind Rose | 0,6 unité SVG ; 1,2 sélectionné/focus | Distribution et sélection |
| Soulignement de prévision Weather | 2 px CSS | Sélection locale |

Ne pas donner une longueur fixe commune aux connexions Flow et aux séparateurs : leurs rôles diffèrent. Flow conserve le dégagement de 12 px après les valeurs des sources horizontales et sa géométrie responsive.

Compact 1.4.3 applique un padding horizontal de 9 px dans le wrapper, auquel s’ajoute la bordure de 1 px : le retrait extérieur vaut 10 px des deux côtés, comme autour des pastilles centrées de 36 px. Les pastilles utilisent localement le rayon de carte moins 10 px ; ne pas modifier le token global de contrôle ni les formes propres aux switches, contrôles cover/climate/number ou lecteurs. La grande valeur sans fond n’ajoute pas de padding à droite. Aucun calcul JavaScript ou observateur n’est requis.

Compact conserve un écart de 8 px entre les informations et les groupes de commandes, dans le wrapper flex, la grille de valeur et les groupes natifs de sous-boutons. Une valeur finale n’utilise plus un écart de 4 px face aux badges. Le padding interne d’une valeur en bouton et les 4 px entre nombre et unité restent distincts de cet écart. Les commandes cover/climate/number conservent leur géométrie propre.

Conserver les densités existantes : 10 px pour Compact et Square avec icône ; Square sans icône garde 10 px verticalement et utilise 12 px horizontalement depuis 2.0.6, comme Panel ; 12 px pour le contenu room, 14 px pour l'enveloppe Flow, généralement 16 px pour les sections Weather et Wind Rose. Depuis Flow 3.5.2, une carte de moins de 490 px conserve 14 px verticalement mais utilise 10 px horizontalement et 8 px entre l'icône et le texte. Déterminer ce retrait depuis la largeur extérieure, indépendante du padding, pour éviter une oscillation au seuil. L'axe central reste fixe ; les unités et tailles de police restent celles de leur rôle, avec l'ajustement des nombres débordants existant. Les adaptations étroites de Weather restent propres à ses sections. Ne pas imposer le même padding à tous les modules.

## 6. Comportement et maintenance

Une correction de style doit conserver les entités, le formatage localisé, les unités, les actions natives, les cibles `more-info`, les conditions d'affichage et les contrôles numériques. Ne pas réactiver `.hidden` ou `[hidden]`. Conserver les nœuds auxquels Bubble attache ses événements ; séparer visuellement une unité sans remplacer une commande par du texte inerte.

Navigation s’utilise seule sur un footer natif `sub-buttons`, avec une rangée plate en bas et aucune commande principale. Elle conserve les nœuds, actions et masquages natifs. L’icône active et le focus clavier utilisent `primary-text-color`, les autres icônes utilisent `secondary-text-color`. Les icônes mesurent 26 px. Le fond actif mélange 12 % de texte primaire dans la surface de carte, puis 65 % de ce résultat dans transparent : visiblement assombri en clair et éclairci en sombre avec les palettes neutres, tout en restant translucide. Son ombre vaut `0 1px 2px rgb(0 0 0 / .025)` et son reflet intérieur est atténué à 25 %. Ces variables restent résolues en CSS lors du changement de thème. Le fond de sélection remplit sa case pour que le premier et le dernier bouton suivent la courbe extérieure. Ne pas réintroduire le carré fixe de 44 px ni le rayon d’icône de 12 px : le retrait vertical et horizontal doit rester uniforme. La hauteur des commandes est de 52 px ; leur largeur dépend du nombre de routes et de l’espace disponible. La sélection compare le segment dashboard des actions `navigate`, sans liste de routes codée dans le module ni listener supplémentaire.

Le footer Navigation hors éditeur utilise `z-index: 3`, sous le fond des popups Bubble (`4`) et leur contenu (`5`). Le footer natif Bubble utilise aussi `5` : ne pas conserver ce niveau qui fait dépendre la superposition de l’ordre des cartes dans le DOM. Le fond des popups doit recevoir les clics hors popup ; la barre redevient directement utilisable à la fermeture. Conserver cette hiérarchie en CSS, sans détection du hash, écouteur, observateur ou polling supplémentaire, et sans modifier la position de l’aperçu dans l’éditeur.

Les modules autonomes Flow, Weather et Wind Rose remplacent leur contenu natif et s'utilisent sans le module de design Signature sur la même carte. Aucun besoin de `card-mod`, de police externe ou d'une dépendance npm dans Home Assistant. Les dépendances du dépôt servent uniquement au développement.

Une variation de thème ne doit déclencher ni abonnement, ni requête d'historique, ni timer supplémentaire. Les abonnements, observateurs, animations et listeners existants doivent être libérés au teardown. Respecter `prefers-reduced-motion` dans Flow. Ne pas ajouter une boucle permanente de lecture des styles pour maintenir l'harmonie ; conserver les mesures de géométrie déjà nécessaires au diagramme.

### Illustration facultative de Square

Square 1.4.2 réserve l’illustration aux cartes explicitement configurées. Le
pseudo-élément décoratif ne reçoit pas les clics ; valeur et secondaire gardent
leurs nœuds et actions natifs. Le titre et la valeur prennent leur largeur
intrinsèque avant celle de l’image (`signature-illustration-size`, 80 px par défaut), laquelle rétrécit sur une
carte étroite ou lorsque la hauteur disponible au-dessus du secondaire est insuffisante. La boîte reste carrée. L’image est ancrée en haut à droite et reste à la même hauteur
avec ou sans secondaire. Le secondaire reste sous la valeur sur sa rangée
dédiée, à pleine largeur et avec son unité.
Les surfaces, la typographie et les cartes sans illustration sont inchangées.
Une image ne représente pas un état valide lorsque son index est absent du
domaine : un index `-1` masque l’illustration. Aucun observateur ni abonnement.

`image_light` et `image_dark` choisissent des images externes selon le booléen
effectif `hass.themes.darkMode`, au passage natif de rendu Bubble. Le choix et
les URLs Jinja sont relus hors cache structurel, même si les entités ne changent
pas. Ne pas utiliser `prefers-color-scheme`, qui peut différer du thème HA forcé.
Une variante absente, vide ou incorrecte revient à `image` ; sans mode HA connu,
`image` est utilisé. Si aucune URL exploitable n’existe, l’illustration est masquée.
Les deux planches partagent exactement leur grille et leur ordre de cases.
Les nombres ou templates Jinja `illustration.offset_x` et `offset_y` corrigent un atlas imparfait : de −50 à 50 % d’une case source, 0 par défaut. Ils déplacent la fenêtre de lecture vers la droite/le bas pour une valeur positive, sans changer sa taille, le zoom ni la boîte décorative. Ils sont ignorés sur un axe à une seule case ; valeurs invalides à 0. Le cadrage reste hors cache structurel et commun à Room/Square, sans CSS dans les cartes ni observateur supplémentaire.
Les couleurs et surfaces héritées restent dans le CSS, sans lecture de style,
timer, écouteur, abonnement ou image intégrée au module.

### Room illustrée (1.1.5)

`room_mode: illustrated` est une variante explicite ; le mode classique reste le défaut. Hauteur de base 148 px (28 px de moins que la première variante illustrée), plus 48 px par rangée de commandes supplémentaire. Le nom sur deux lignes et la température sont à gauche du dessin ; le titre conserve 38 px. Les mesures d’en-tête sont ignorées dans cette variante. La décoration partage `signature-illustration-size` avec Square : 80 px par défaut, réduction sur les cartes étroites pour préserver les textes. Une valeur supérieure à 80 px agrandit la hauteur de base pour dégager les commandes ; le texte secondaire garde sa propre rangée et adapte la hauteur. L’humidité et l’icône principale sont masquées sans supprimer leurs configurations natives. Les valeurs, unités, badges conditionnels, actions et cibles de commandes de 44 px sont conservés.

L’image utilise le même helper que Square : URL locale/HTTPS, sprites, index Jinja, variantes `image_light`/`image_dark` selon HA, sans nouvel observateur ni abonnement. Les images restent extérieures au dépôt des modules. Le badge d’état passe en haut à droite, au-dessus du dessin ; sans illustration, sa place est réservée dans le titre seulement lorsqu’il est visible. La taille partagée reste une variable CSS héritée et suit le thème sans reconstruire le cache ni lire les styles en JavaScript. L’anneau `icon_border_color` est reporté sur la décoration ; `border_color` garde l’ombre de carte et son contour d’alerte. `sub_button_styles.<classe>.icon_outline_color` conserve un contour de glyphe de 1,5 px avec la couleur RGB configurée, sans CSS dans la carte. Les commandes natives nommées disposent d’une grille icône/libellé dans le module. Ses zones `icon` et `label` sont attribuées explicitement aux deux éléments : Bubble crée le libellé avant l’icône et utilise `row-reverse` en flex. Ne pas dépendre de l’ordre du DOM pour le placement en grille ; le libellé utilise la colonne souple, l’icône la colonne de 26/30 px. Les six noms de Jardin restent complets dès 288 px, en clair/sombre, avec ou sans thème, sans modifier les cibles ou les nœuds natifs. L’illustration est centrée verticalement entre le bord intérieur supérieur et le haut du séparateur des commandes. Le calcul CSS utilise la hauteur réelle, la taille responsive et le nombre de rangées du pied ; il suit les changements de thème et les commandes masquées sans lecture de style en JavaScript. Sans commandes visibles ni secondaire, elle est centrée dans la carte entière. Un secondaire conserve son bloc supérieur réservé pour éviter de chevaucher sa ligne à pleine largeur. Les atlas aux marges transparentes inégales doivent fournir un `offset_y` adapté à chaque objet : le centrage du cadre seul ne garantit pas celui de la silhouette. Les réglages masqués restent enregistrés pour le retour au mode classique.

### Badges Room sur l’illustration (1.4.3)

Un sous-bouton natif iconique `default`, sans texte ni rôle de commande ou de
mesure, accepte `sub_button_styles.<classe-ou-index>.type: badge` en mode
illustré. Conserver les nœuds/actions/conditions Bubble. Les icônes de 14 px
partagent une capsule neutre haute de 20 px au coin supérieur droit du dessin,
au-dessus de celui-ci, alignée en haut du titre. Garder son bord droit fixe et
la laisser grandir vers la gauche ; conserver au moins 8 px entre nom et capsule
et l’ordre natif. Sans illustration, garder la capsule 6 px après le nom.
Les boutons natifs gardent leurs cibles de 20 × 20 px,
sans fond individuel par défaut ; l’espacement visuel entre icônes vaut 6 px.
Les 2 px aux extrémités donnent une capsule de 44 px pour deux icônes et de
24 px pour une seule, 64 px pour trois. Aucun contour, séparateur ou ombre
supplémentaire.
Le fond réutilise `control-surface.css` : `signature-control-background`, ou
5 % du texte primaire dans la surface neutre du thème. Les couleurs d’icônes
et fonds individuels explicites restent prioritaires. Sans l’option, garder
le badge historique.

Deux conteneurs de présentation réutilisables regroupent le nom et les badges
natifs en flex ; ne pas cloner les éléments interactifs ni leurs handlers.
Les sélecteurs `:has` libèrent la place des badges `.hidden` / `[hidden]` sans
réexécution. La longueur du texte suffit au placement, sans mesure JavaScript,
lecture de style, abonnement, observateur ou écouteur supplémentaire. Retirer
l’option, changer de mode ou démonter le module restaure les emplacements
natifs et retire les deux conteneurs. Un badge disparu ne laisse pas de vide.
Préserver le rayon, la hauteur, les valeurs et les commandes ; le mode classique n’est pas concerné.
La taille et le centrage du dessin restent indépendants des badges visibles,
y compris sur mobile : aucune limite de 48 px ni déplacement conditionnel.
La capsule recouvre le dessin au lieu de réduire l’espace du titre, qui garde
sa limite native de deux lignes. Une rangée flex pleine largeur aligne le nom
à gauche et la capsule à droite ; le titre peut se réduire sur une carte
extrêmement étroite, sans croiser les icônes. Une couche positionnée place les
badges devant le pseudo-élément décoratif. La réduction responsive ordinaire
et la variable de taille du thème restent applicables. Comparer explicitement
la géométrie du dessin avec zéro/un/deux/trois badges ; couvrir aussi
les changements de nom et de visibilité sans rendu, les mises à jour natives,
le retrait de l’option, le teardown et les thèmes.

## 7. Contrôles obligatoires lors d'une évolution

### Commandes Room facultatives — 1.3.0

Le rôle `sub_button_styles.*.type: command` concerne uniquement les commandes
natives `default` nommées `room-control-N` en mode illustré. Icône de 18 px,
libellé au rôle de légende et grille verticale dans les cibles natives de
44 px ; aucun accroissement des 148 px de la carte. Le fond et le retour de
pression reprennent les rayons et surfaces de contrôle du thème. Le séparateur,
les colonnes, les autres commandes et les badges gardent leurs règles existantes.

`active` et `disabled` restent des valeurs ou templates, jamais des seuils
déduits d’une couleur. Les nœuds et actions natifs sont conservés. Un garde local
en capture bloque aussi `hass-action` : Bubble peut avoir mémorisé son action
avant un changement d’état. Le seul changement de dataset ne suffit donc pas.
Ne pas cloner les commandes ni réécrire leurs services ; nettoyer le garde et
restaurer les attributs ARIA à la suppression de l’option ou au teardown. Une
expression disabled non résolue ne doit pas activer une commande.

`room_state_as_value` est facultatif : rôle de valeur de 28 px avec unité de
13 px, texte sans unité de 22 px au maximum ; états Room ordinaires à 17 px.
Tester positions, états longs, largeur 288–600 px, clair/sombre, avec/sans thème,
clic/clavier/actions en cache et en cours, changements d’état et retrait.

Depuis la racine, avec Node.js 22 ou plus récent :

```sh
npm ci --ignore-scripts
npm test
npx playwright install chromium
npm run test:styles
```

Sur une machine qui possède déjà un Chromium compatible, `BUBBLE_STYLE_BROWSER_PATH` peut fournir son chemin. Les tests navigateur lisent les distributions réelles et exécutent leur code dans un DOM minimal reproduisant les points de cascade natifs concernés. Les palettes de l'hôte sont des fixtures indépendantes du thème ; elles vérifient l'héritage et les changements de mode, sans figer les couleurs d'une version Home Assistant. Les contrôles couvrent aussi les titres transparents avec des surfaces Bubble globales et une surface extérieure en ligne. Les tests fonctionnels vérifient séparément les entités, actions, caches, abonnements et métadonnées.

Utiliser le [socle navigateur commun](styles/README.md) de `styles/test/browser.cjs` : lancement de Chromium, contexte isolé par fixture, contrôle des exceptions de toutes ses pages et nettoyage des cartes avant fermeture. Le rendu commun vérifie aussi les erreurs synchrones capturées pendant l’exécution des modules, même lorsqu’il sert seulement à préparer le test. Conserver les options de contexte et les fixtures propres aux rôles, notamment le footer de Navigation.

| Dimension à contrôler | Cas requis |
|---|---|
| Largeur de carte | 288, 328, 358, 382 et 600 px |
| Thème | Clair, sombre, changement de mode sur les mêmes nœuds |
| Replis | Sans thème Signature, fonds HA contradictoires, ombre HA explicite, ombre `none` |
| Texte | Noms longs/accentués, nombres longs, état indisponible, secondaire présent/absent |
| Personnalisation | Nom 18 px, secondaire 17 px, carte 18 px, icône 8 px, contrôle 9 px, petits rayons explicites |
| Traits | Retraits 0 / 16 / 24 px, y compris lignes Weather déjà rembourrées |
| Interaction | Pointeur fin/grossier, focus clavier, mouvement réduit |
| Modules | Compact standard/valeur, square fixe/auto, room avec/sans contrôles, header/title, média, cover, climate, number, Flow, trois layouts Weather, Wind Rose, boutons cover/media natifs sans module Signature |

Comparer des **styles calculés** et des dimensions réelles, pas seulement des chaînes trouvées dans le YAML. Une capture sert à inspecter l'équilibre, la hiérarchie et les espacements ; elle ne prouve pas à elle seule une valeur exacte. Une fixture minimale ne remplace pas une exécution dans Home Assistant.

Pour un contrôle d'intégration visuelle, importer les distributions et le thème mis à jour dans Home Assistant, puis vérifier les mêmes cartes sur le navigateur et le téléphone utilisés. L'audit initial a aussi utilisé les feuilles natives de [Bubble Card 3.4.1, commit 061ed837](https://github.com/Clooos/Bubble-Card/tree/061ed8376134307ba1086446869d0ab736265fcf) dans des fixtures Chromium. Cela documente la cascade inspectée, sans identifier la version réellement installée chez l'utilisateur. Safari/iOS et une instance Home Assistant réelle ne sont pas couverts par la suite Chromium du dépôt.

Lors d'un changement livré : augmenter la version du module concerné, maintenir sa version interne de runtime lorsqu'elle existe, mettre à jour le tableau du [README](README.md), son guide et ses notes de version. Si une règle commune évolue, modifier ce document et [le guide du thème](themes/README.md) dans le même changement. Vérifier les tests et les jobs GitHub Actions sur le commit publié. Un push GitHub ne met pas à jour les modules déjà importés dans Home Assistant.

## 8. Performances et volume CSS

La [passe de cohérence des styles](docs/STYLE_AUDIT_2026_10.md) centralise les
unités, lignes secondaires, libellés de commande Room/Panel et géométrie des
switches Signature/Hue dans `shared/src/styles`. Les sélecteurs, dispositions,
couleurs d'état et transitions restent locaux. Les fragments sont développés
au build ; aucun module commun supplémentaire n'est à activer dans HA.

La [passe du 17 octobre 2026](docs/MODULE_OPTIMIZATION_2026_10.md) conserve les
styles calculés et les rôles existants. Le CSS d’illustration Square, de petite
valeur Compact et de commande/média Panel n’est émis que pour l’option active ;
les booléens correspondants doivent invalider la clé du cache. Les templates et
lectures suivies ne sont pas mémorisés à leur place. Ne pas retirer les gardes
de visibilité, les replis ou une règle seulement parce qu’une fixture ne la rencontre pas.

Les caches de prévisions Weather, de chemins/descriptions Wind Rose et de
formatage/minuit Panel restent propres au runtime et suivent données, locale,
options et temps nécessaires. Survol/sélection ne recalcule pas un historique
inchangé. Group laisse son ResizeObserver suivre la géométrie des pastilles
inchangées ; conserver la mesure sur contenu modifié et le repli sans observer.
Les versions concernées et les mesures de CSS après nettoyage Bubble sont
précisées dans le bilan ; elles ne mesurent pas la fluidité dans HA réel.

Signature Hue 1.0.0 centralise les cinq gabarits des popups Hue en complément de
Compact, sans service, seuil ou sélection de scène codés dans le module. Les
actions et conditions restent natives, la disponibilité et la coche restent
configurables en Jinja. Conserver les dimensions et rôles de texte existants.
Son CSS de mode est réutilisé par carte ; les variables de thème restent en CSS.

Signature Irrigation 1.0.0 centralise le lecteur calendrier et les jours natifs,
sans commande physique. Ses événements/vues et formateurs sont partagés et
bornés ; la recherche du prochain départ utilise toujours l’heure actuelle.
Préserver l’historique, les départs de durée nulle, le fuseau HA et le masquage
des wrappers de grille. Le dernier démontage arrête immédiatement le timer ;
les réponses API obsolètes ne réactivent pas des données indisponibles.

Le build du 5 octobre 2026 minifie toutes les distributions avec Terser et clean-css, puis compacte les métadonnées YAML. Les noms de propriétés externes, les getters, les unités, les variables de thème et l'ordre des règles sont conservés. Les expressions des templates CSS sont protégées pendant le traitement, puis rétablies sans exécution. Cette passe diminue le volume importé ; elle ne fonctionne jamais dans les cartes et ne constitue pas une mesure de fluidité. Voir le [guide du build](shared/README.md#distributions-minifiées).

Les neuf YAML passent de 385 797 à 250 046 octets UTF-8, soit 35,2 % de réduction par rapport au commit `1e041ce`. Les styles calculés restent identiques dans les 152 rendus comparés sur fixtures Chromium (clair/sombre, avec/sans thème, 328/600 px). Les tests d'import conservent les métadonnées et les valeurs des formulaires. Home Assistant réel et Safari/iOS ne sont pas couverts par cette comparaison.

Mesurer séparément le YAML importé, le CSS retourné par le module et le CSS nettoyé par Bubble. Bubble Card 3.4.1 enlève déjà espaces et commentaires et réutilise un résultat de nettoyage lorsque la chaîne CSS est inchangée. Ajouter un minificateur à chaque exécution ne réduit donc pas le CSS final et ajoute du travail. Une réduction du CSS ne constitue pas une mesure du temps de chargement complet de Home Assistant.

Conserver les caches par carte : ils doivent suivre la configuration, le layout et la géométrie sans interrompre les lectures d'entités suivies par Bubble. Flow réutilise sa chaîne CSS lorsque la hauteur effective est inchangée. Signature ne livre que le layout actif, réutilise la géométrie des interrupteurs et évite de peindre deux fois les couleurs automatiques d'une commande room avec un style explicite. Les règles de typographie secondaire communes ne doivent pas être répétées dans chaque layout.

Les runtimes de Compact, Square, Room, Header, Flow, Weather et Wind Rose portent la version de leur distribution, injectée au build depuis `src/module.yaml`. Un marqueur différent ou absent invalide le runtime et ses caches avant le prochain rendu. Conserver le nettoyage propre au module : contrôles, délais, observateurs, abonnements, actions et nœuds possédés doivent être libérés sans toucher au nouveau runtime. Ce contrôle ne reconstruit pas les caches lors des mises à jour ordinaires et ne fige ni les lectures d’entités ni les variables CSS de thème.

Les modules et cartes possèdent leurs propres portées de style. Des tokens communs répétés dans deux distributions autonomes ne sont pas nécessairement des doublons supprimables. Ne pas ajouter une feuille globale, une requête réseau ou une dépendance de runtime pour quelques déclarations communes. Lors d'un regroupement de sélecteurs, préserver leur spécificité, leur ordre utile et les possibilités de personnalisation.

Mesures du 4 octobre 2026 : octets UTF-8 après le nettoyage réel de Bubble Card 3.4.1, comparés au commit `d31eae6`. Les fixtures utilisent un bouton state natif, une valeur de 2,5 kW, le secondaire `65 %` quand indiqué, cinq commandes room allumées avec une couleur explicite, ou des interrupteurs allumés de couleur teal. Ce tableau mesure les styles d'une carte, avec ces options précises.

| Configuration | Avant | Après | Réduction |
|---|---:|---:|---:|
| Compact standard | 5 249 | 5 249 | 0 % |
| Compact avec secondaire | 5 955 | 5 775 | 3,0 % |
| Square avec secondaire | 5 554 | 5 424 | 2,3 % |
| Room, cinq commandes avec styles | 11 313 | 9 847 | 13,0 % |
| Compact, deux interrupteurs | 7 843 | 7 288 | 7,1 % |
| Compact, quatre interrupteurs | 10 437 | 8 586 | 17,7 % |
| Compact, huit interrupteurs | 15 625 | 11 182 | 28,4 % |

Un seul interrupteur passe de 6 546 à 6 639 octets : les propriétés CSS permettant le regroupement ajoutent 93 octets. Le gain apparaît à partir de deux interrupteurs. Flow conserve un volume CSS identique ; son changement concerne la réutilisation de la chaîne. Les mesures Node de mises à jour sur DOM simulé ne démontrent pas un gain de temps de chargement complet, et ne doivent pas être présentées comme tel.

Les tests vérifient la réutilisation des caches, les lectures suivies, les couleurs et opacités indépendantes des interrupteurs, leurs dimensions et positions de poignée, le changement de thème sans réexécution et le retrait de leurs styles après remplacement de configuration. Cette validation reste limitée aux fixtures et à Chromium ; Home Assistant réel et Safari/iOS restent à contrôler sur l'installation utilisée.

Square 1.4.2 peut placer un unique sous-bouton natif iconique `default` avec
`sub_button_styles.<index-ou-classe>.type: badge` au coin inférieur droit
(24 px, icône 16 px). Le secondaire réserve 32 px uniquement lorsque le bouton
n’est pas masqué. Garder visibilité et actions natives, hauteur et illustration
identiques. Ne pas appliquer ce placement aux boutons nommés, spécialisés,
multiples, à la hauteur automatique, aux commandes de mesure ou au bandeau
summary. Ne créer aucun DOM ou écouteur pour ce badge.

### Optimisation des présentations du 16 octobre 2026

Square/Compact 1.4.5, Room 1.1.6 et Header 1.1.14 n’émettent les règles des badges actifs que si la configuration contient des sous-boutons. Le booléen de présence appartient à la clé de cache CSS ; l’ajout/retrait natif d’une commande ne doit jamais garder les anciennes règles. La taille d’unité `.8em` du socle, toujours remplacée par le rôle propre à chaque présentation, est retirée. Les regroupements `:is(.hidden,[hidden])` et du texte multiligne conservent la spécificité de chaque ancien sélecteur.

Avec au moins deux switches, le préfixe de leur géométrie est factorisé par `:is(.bubble-sub-button.classe,...)`. Tous les arguments possèdent deux classes : la spécificité reste identique. Les règles de couleur, d’opacité et de position sont conservées par commande, ainsi que les caches et les actions. Garder le sélecteur direct pour un seul switch. Aucun minificateur par rendu, feuille globale ou lecture de styles supplémentaire. Mesurer les gains après le nettoyage natif Bubble et comparer les styles calculés avant/après ; ces volumes ne prouvent pas un gain de temps de chargement HA.

Mesures UTF-8 après `cleanCSS` de Bubble Card 3.4.1 (`061ed837`), par rapport au commit `18f7bf3`. Fixtures à 600 px, thème Signature clair ; les cartes sans commande utilisent les options de `styles/test/fixtures.cjs`, les switches des classes distinctes avec états/couleurs propres.

| Configuration | Avant | Après | Réduction |
|---|---:|---:|---:|
| Compact standard, sans commande | 6 348 | 6 010 | 5,3 % |
| Square, sans commande | 6 477 | 6 139 | 5,2 % |
| Room, sans commande | 7 997 | 7 659 | 4,2 % |
| Header, sans commande | 6 201 | 5 863 | 5,5 % |
| Compact, un interrupteur | 7 761 | 7 727 | 0,4 % |
| Compact, deux interrupteurs | 8 576 | 8 304 | 3,2 % |
| Compact, quatre interrupteurs | 10 210 | 9 392 | 8,0 % |
| Compact, huit interrupteurs | 13 206 | 11 296 | 14,5 % |

Les quatre distributions YAML totalisent 318 octets de plus : le gain porte sur le CSS émis pour chaque carte, pas sur leur téléchargement. Comparaison des styles calculés et dimensions identique sur 418 rendus de cartes (288/328/358/382/600 px, clair/sombre, avec/sans thème et polices/rayons personnalisés) et 32 configurations de switches (1/2/4/8, Compact/Square, clair/sombre, 288/600 px). Un test navigateur vérifie aussi l’ajout puis le retrait des commandes sur chacune des quatre présentations, en réutilisant le même runtime. Couverture limitée aux fixtures Chromium, sans validation dans HA réel ni Safari/iOS.


## Groupe de synthèse facultatif

Signature Group 1.0.1 est un module de comportement, compatible avec un bouton Nom et une popup. Il accompagne une présentation existante, sans modifier ses surfaces, entités ou actions. La source est la liste native `cards` de la popup, avec ses conditions ; ne pas recopier cette liste sur le bouton.

Le bouton ajoute une ligne secondaire (13 px, graisse normale, couleur secondaire du thème, interligne commun) et un compteur neutre de 28 px (valeur 14 px, graisse moyenne, chiffres tabulaires). Réserver 54 px à droite pour éviter le chevauchement ; garder l’ellipse sur le résumé et le nom complet dans le titre de survol. Le compteur n’utilise pas une couleur d’alerte. Les thèmes restent résolus en CSS, avec les replis communs. Une source absente donne `—`, une source sans élément donne `0` ; conserver cette distinction.

Les cartes, leurs commandes et leur visibilité restent natives. Le module ne découvre pas de cartes par sélecteur DOM et ne charge pas d’historique. La source utilise `background_update: true` pour être disponible avant la première ouverture. L’Accueil adopte ce comportement sans changer Séjour, Informatique ni les autres vues.

Group 1.0.1 peut masquer une synthèse vide via le contrat natif Home Assistant, sans laisser de case dans la grille et sans déconnecter ses mises à jour. Ne pas ajouter de message vide dans le placeholder de popup en mode édition ; conserver le bouton de synthèse accessible à l’édition. Une source manquante reste distinguée d’une source vide.


### Alignement des mesures — Square 1.6.0 et Compact 1.4.6

Le Square fixe réserve toujours sa ligne secondaire de `max(16px, secondaire ×
1.2)` ; les tuiles classiques, illustrées et les bandeaux à une mesure gardent
leur valeur sur la même ligne avec ou sans détail. Le dessin d’un Square
classique utilise le même plafond vertical dans les deux états. Ne pas
augmenter la hauteur native ; préserver le dimensionnement naturel de
`auto_height`, les titres/détails multiligne des bandeaux et l’ancien détail
réservé des commandes `measure`.

Le rôle Compact `sub_button_styles.*.type: metric` réserve des colonnes
identiques : 80 px, 72 px jusqu’à 382 px de carte, ou la variable CSS héritée
`signature-metric-width`. Padding horizontal 4 px, icône 16 px et chiffres
tabulaires ; aucune couleur ou action remplacée. Les templates natifs
`state_content` gardent la responsabilité du texte, des décimales et des
unités. Le masquage natif et le retrait de l’option restent réversibles sans
remplacement de nœud ni observateur ajouté.


### Synthèse d’activités — Group 1.1.0

`presentation: chips` est facultatif et conserve le cadre natif Compact de
56 px. Aucun titre, icône principale ni compteur total visible. Pastilles
neutres de 36 px, illustration fixe de 32 px, nom à 14 px / graisse 500,
largeur maximale 180 px, écart de 8 px. Rayon concentrique `rayon carte -
10 px` et surface de contrôle partagée, avec les replis Signature habituels.
La flèche de 20 px reste à droite, au retrait intérieur de 9 px ; le `+N`
la précède uniquement si des équipements sont masqués. Les noms suivent
l’ordre de la popup et les dessins reprennent son cadrage et son thème HA.

La quantité ne dépend pas d’un breakpoint : mesurer la piste et les pastilles
pour conserver le plus long préfixe complet, en réservant la largeur réelle
du compteur. Masquer toute pastille qui ne tient pas ; aucune seconde ligne
ou réduction du dessin. Un seul ResizeObserver propre à ce mode et une
frame coalescée suivent la largeur, les noms et la police. Le résumé classique
ne gagne aucun observateur. Nettoyer observer/frame/nœuds au retrait et au
teardown. Les nœuds natifs, handlers, ripple et conditions restent conservés ;
la présentation laisse les appuis traverser vers l’action de carte entière.

Vérifier 0/1/2/3/10/17 éléments à 288/328/358/382/600/992 px, clair/sombre,
avec/sans thème, compteur masqué si tout tient, aucun élément partiel, noms
longs, changement de taille/police/thème, disparition de source et retrait.
Les tests de fixtures ne constituent pas un essai Home Assistant ou Safari/iOS.

## Signature Panel 1.0.0

Le format pleine largeur de deux pas appartient exclusivement à Panel : 118 px visibles, illustration de 80 px à droite centrée sur toute la carte, une à trois informations et jusqu’à trois boutons visibles. Square conserve ses tuiles et Room ses pièces. Ne pas réintroduire leurs variantes d’équipement ou bandeau.

La grille unique appartient à `.bubble-container` ; les wrappers natifs sont sans boîte. Titres, valeurs et détails utilisent les mêmes lignes. Garder `display: flex !important` pour l’état contre le pipeline natif Bubble `-webkit-box`. Les noms partagent 14 px/600, les valeurs 28 px/500, les unités 16 px/400, les secondaires 13 px/400, les états textuels au plus 22 px. Depuis Panel 1.0.3, avec trois informations la valeur commune utilise `clamp(13px, calc(12.5cqw - 20px), min(plafond de valeur, 24px))` : environ 22–24 px sur les cartes de 366–382 px, 24 px au-delà et réduction progressive sur les écrans étroits. Les unités restent de 11 à 13 px par défaut (`signature-secondary-font-size` et `signature-value-unit-font-size` plafonnent leur taille) ; icônes de 14 px, écart icône/nombre de 2 px et nombre/unité de 3 px. Les trois valeurs gardent leur taille et leur alignement communs ; les formats à une et deux informations sont inchangés. Avec commandes nommées, plafond de valeur de 20 px. Conserver les tokens de police, poids, surface, texte et rayon sans thème et lors de changements de thème.

Retraits extérieurs : 12 px horizontalement, 10 px verticalement avec la bordure ; 8 px entre les colonnes. Avec commandes nommées, retrait vertical 8 px, cibles de 44 px et légende commune 11 px. Pas de séparateur ajouté. Carte 22 px, contrôles 14 px. Les textes restent primaires, unités/détails secondaires, icônes accentuées. Les valeurs supplémentaires utilisent les actions déléguées Bubble ; seules les commandes désactivables installent le garde commun testé avec Room.

Les URL, index et cadrages sont fournis par la configuration Jinja. Le lecteur de sprites commun choisit seulement la variante du mode HA effectif. Aucun état métier, image embarquée, nouvel observateur ou abonnement. Les requêtes statistiques restent facultatives et testées pour fuseau, minuit, changement d’heure, sources incomplètes et réponses périmées.

Tester 288/328/358/382/600 px, clair/sombre, avec/sans thème, une/deux/trois informations, détails et 0–3 commandes, mises à jour natives et thème seul, clics/désactivation/teardown et média. `styles/test/panel-native.browser.cjs` utilise le vrai Bubble 3.4.1 avec `BUBBLE_NATIVE_SCRIPT_PATH` ; il vérifie le SHA de la source. Le backend HA est simulé ; ne pas déduire une validation HA réelle ou Safari/iOS.


### Panel 1.1.1 — badges et actions indépendantes

Panel et Room assemblent le même mécanisme de badges natifs depuis
`signature-shared/src/title-badges.js`. Les paramètres de build conservent
les comportements natifs propres aux deux présentations. Dans Panel,
`type: badge` place les boutons iconiques dans une seule pilule neutre de
20 px, avec icônes de 14 px. Sur une carte illustrée, son bord droit est fixé
au coin supérieur droit du dessin ; elle grandit vers la gauche et conserve
au moins 8 px de dégagement du titre. Les badges Alert Manager actifs ou en
attente gardent 24 px réservés dans ce coin. Sans image, conserver la capsule
6 px après le nom. Les classes propres au layout restent séparées. Conserver
les nœuds, handlers, visibilité et restauration au retrait.
Un badge du titre ne doit jamais créer une rangée de commandes au pied ni
changer le centrage des valeurs ou du dessin. Le fond commun suit le thème ;
les icônes peuvent être colorées ou grises sans colorer la capsule.

`signature_panel.tap_action` remplace uniquement le clic de la valeur
principale ; le défaut reste more-info. Les actions explicites des informations
supplémentaires gardent leur priorité et leurs cibles. Les valeurs actionnables
se placent au-dessus du fond natif Bubble (`z-index: 1`) pour recevoir les vrais
clics sur le nombre, l'unité et l'icône. Garder les appuis longs more-info et
le gestionnaire natif ; aucune commande ni événement de service supplémentaire.

Les commandes Panel gardent leurs libellés en texte primaire. Seule l'icône
`aria-pressed=true` utilise son accent configuré ; les autres icônes utilisent
le texte secondaire, avec l'opacité fonctionnelle des commandes désactivées.
Le fond de sélection et les gardes d'action restent conservés. Vérifier les
couleurs calculées et les clics réels avec Bubble, au-delà des seuls datasets.

### Pochette média — Panel 1.1.2 et Group 1.1.4

`illustration.media_artwork: true` est une option explicite des lecteurs.
Le helper source commun lit `entity_picture` à chaque actualisation native ;
URL locale/HTTP(S) valide seulement. La pochette est centrée en `contain`,
sans cadrage d'atlas, dans le cadre inchangé : 80 px Panel, 32 px Group.
Sans attribut exploitable, restaurer le dessin, ses variantes HA et son
cadrage complet. Ne pas modifier la configuration source, les autres modules,
les dimensions, les actions, le thème ou les abonnements. Conserver les mêmes
nœuds lors des changements de morceau ; tester apparition, remplacement,
retrait, données invalides et clair/sombre sur les deux présentations.

### Retouches média — Panel 1.1.3 et Group 1.1.5

Le lecteur Panel retire le fond permanent du bouton lecture/pause et utilise
le texte primaire pour son icône, comme les autres commandes. Conserver sa
cible, son rayon, son ripple natif et les services propres à l'état courant.
Les contrôles Compact et les commandes Panel non média restent identiques.

Seules les pochettes réelles sont arrondies : rayon `max(0px, rayon carte -
10px)` dans le cadre Panel de 80 px, soit 12 px par défaut. Dans Group,
image de 28 px avec 2 px de marge de chaque côté dans le même emplacement
de 32 px, rayon `max(0px, rayon carte - 14px)`, soit 8 px par défaut.
La hauteur de pilule de 36 px, sa largeur et le début du libellé ne changent
pas. Le retrait laisse 4 px au-dessus/dessous de la pochette, contre 2 px
pour l'illustration habituelle. Le retrait de la pochette restaure le dessin
sans arrondi ni marge ajoutés. Les rayons suivent le thème sans réexécution.

### Sous-boutons sans fond — Panel 1.2.3

Le choix natif explicite `show_background: false` conserve un fond transparent
sur les sous-boutons Panel, même avec des seuils numériques ou le rôle
`command`. L'accent de l'icône et l'état actif/désactivé restent conservés.
Les boutons sans ce choix gardent leurs fonds configurés. La règle est limitée
aux sous-boutons concernés ; aucune géométrie, action, souscription ou minuterie
supplémentaire. Vérifier aussi les groupes main/bottom et le retour du fond
après modification de la configuration.

### Métadonnées média sans répétition — Panel 1.2.2

Sur les lecteurs Panel, masquer la ligne artiste/application lorsqu’elle est
identique au titre natif. Retirer du détail les éléments séparés par `·`
qui correspondent entièrement à une ligne native visible, en ignorant casse
et espaces superflus. Conserver les données distinctes, notamment le volume,
sans recherche par sous-chaîne. Lire le texte résolu par Bubble, sans recopier
sa logique de repli application/série, ni ses copies de défilement.
Les données masquées par Bubble ne doivent pas supprimer un détail utile.
Le masquage CSS utilise un attribut du runtime nettoyé au démontage ; ne pas
réécrire les textes ou styles inline natifs. Aucun nouvel observateur,
abonnement, timer ou changement de dimensions. Tester Infuse/TV, mises à jour,
métadonnées absentes, correspondances partielles et conservation des commandes.

### Ligne secondaire des lecteurs — Panel 1.1.4

Sur un lecteur avec `secondary` non vide, réserver la troisième rangée à ce
détail et la deuxième aux métadonnées natives. Leurs tailles de police sont
conservées ; titre/artiste utilisent un interligne compact de 1,15, une seule
ligne native par champ et un retrait vertical de 6 px pour tenir au-dessus
du détail et des commandes, dans les mêmes 118 px. Sans détail,
restaurer le span 2 / 4 et l'interligne de 1,3. Le détail garde le rôle
secondaire commun et une ellipse ; aucun nouveau nœud ni déplacement de
DOM ajouté. Tester les métadonnées présentes/absentes, les titres longs et
la disparition native du détail, avec les mêmes commandes et la même image.

### Détails sur deux lignes — Panel 1.1.5

`secondary_lines: 2` est facultatif et limité aux boutons sans sous-boutons.
Réserver deux interlignes secondaires communs, chacun au moins 16 px, dans les
mêmes 118 px ; conserver la grille des valeurs et le dessin de 80 px centré.
Les détails peuvent revenir à la ligne, avec une limite de deux lignes et une
hauteur maximale liée au token de police. Le mode ordinaire garde son ellipse
et sa seule rangée. Le choix appartient à la clé de cache CSS ; retrait,
média, commandes natives et masquages doivent retrouver leur comportement.
Avec trois informations, adapter le secondaire de 11 px à la taille du thème
avec `clamp(11px, 3.7cqw, taille secondaire)` ; les autres formats gardent la
taille secondaire du thème. Les deux interlignes réservés ne changent pas.
Aucun nouveau nœud, écouteur, abonnement ou mesure de style JavaScript.

### Libellés sobres et centrage du contenu — Panel 1.1.6

Sur les panneaux boutons uniquement, les noms principal et supplémentaires
utilisent le rôle de légende de 12 px, le poids normal 400 et la couleur
secondaire, avec les tokens correspondants et sans abréger les libellés.
Cette règle remplace leur ancien rôle de nom 14 px/600/texte primaire.
Les titres des lecteurs restent à 14 px/600 et les commandes gardent leurs
propres libellés primaires.

Sans commandes visibles au pied, des pistes CSS souples égales encadrent le
groupe titres/valeurs/détails. Centrer son contenu réel plutôt qu’une rangée de
valeurs extensible ; les détails vides ne doivent réserver aucune hauteur.
Les détails présents gardent leur interligne, avec une ou deux lignes selon
l’option existante : les deux lignes ne sont plus réservées si elles sont vides.
Les badges du titre suivent cette même rangée. Préserver la hauteur de 118 px,
le dessin de 80 px centré sur la carte, les tailles de valeurs, unités, retraits
et actions. Avec commandes visibles, conserver la grille du pied et ses cibles ;
les médias ne changent pas. Vérifier les libellés complets à largeur courante,
le centrage avec/sans détail, les trois valeurs alignées et les changements de
thème sans nouvelle exécution. Aucun nouveau DOM ni mesure JavaScript.

### Hiérarchie des titres — Panel 1.1.7 et Square 2.0.4

Les titres des boutons Panel et de toutes les Squares partagent le rôle de
titre de mesure : légende augmentée de 1 px, soit 13 px par défaut, poids moyen
500 et couleur secondaire du thème. Cette règle remplace le 12 px/400 des
titres Panel 1.1.6 et le 14 px/600/texte primaire de Square. Les détails restent
de poids normal 400 ; les titres média gardent leur rôle de nom. Réutiliser
`name.css` avec ses paramètres de taille et de poids au build, sans modifier
les défauts des autres consommateurs. Conserver le centrage Panel, les noms
complets à largeur courante, les illustrations, dimensions, grilles et actions.

### Titre global et contraste — Panel 1.2.0 / Square 2.0.5

Les noms de mesure de 13 px/500 utilisent maintenant la couleur primaire.
Les détails utilisent la légende de 12 px, la couleur secondaire et le poids
normal. Panel ajoute 3 px avant un détail non vide ; Square emploie un écart
de grille de 3 px. Les unités gardent leurs propres rôles, les lecteurs gardent
leurs tailles et leurs couleurs. Les fragments secondaires acceptent une taille
au build et calculent l’interligne avec elle ; leurs défauts de 13 px restent
identiques pour les autres modules, sans nouveau token ni mesure JavaScript.

`signature_panel.title` est facultatif sur les boutons : titre global en haut,
rôle de nom 14 px/600/texte primaire, distinct du nom natif de première mesure.
Son texte est relu avec le rendu existant, jamais interprété en HTML. Le nœud
est réutilisé lors d’un changement de texte, supprimé au retrait/démontage et
ignoré sur les médias. Le titre n’a pas la cible d’action d’une mesure.

En présence de ce titre, la grille conserve les 118 px et l’image de 80 px
centrée : rangée de titre de 18 px, noms de mesure de 16 px, retrait vertical
intérieur standard de 9 px depuis Panel 1.2.1 (10 px avec bordure). Les commandes
nommées conservent leur exception de 7 px. Les badges natifs suivent le titre
global ; sans titre ils retrouvent le nom natif. Le helper de badges partagé paramètre ce nœud au build,
sans changer la distribution Room. Conserver les boutons et leurs handlers,
l’alignement des valeurs, les actions indépendantes et le nettoyage. Les
compositions cumulant titre, détails longs et nombreuses commandes doivent
être allégées pour tenir dans deux pas. Tester titres présents/absents,
badges, mises à jour, retraits, thèmes et largeur de téléphone.

Depuis Panel 1.2.1, `show_name: false` garde le nom natif masqué. Si aucun
nom de mesure n’est visible et non vide, sa rangée se replie en CSS ; les valeurs
restent alignées et centrées sous le titre global. Préserver les retraits
horizontaux de 12 px, le dessin de 80 px, les 118 px et les actions natives.

### Square 2.0.6 — retraits sans icône

Avec `data-dp-icon="no"`, ancrer le titre en haut de sa rangée : retrait
extérieur de 10 px verticalement et de 12 px horizontalement, bordure comprise,
comme le titre global Panel. La rangée de 36 px reste réservée sur les tuiles
fixes pour préserver les valeurs et détails ; seule la position du titre change
verticalement. Avec icône visible, garder le centrage du nom et les retraits
de 10 px. Illustration et secondaire partagent le nouveau retrait horizontal.

En hauteur automatique sans icône, conserver le padding de 9 px vertical et
11 px horizontal, même avec une illustration : sa remise à zéro générique
ne doit pas annuler les retraits. La hauteur naturelle suit alors le contenu.
Tester masquage/rétablissement natifs, classique/illustré, fixe/auto, détails,
clair/sombre et avec/sans thème. Aucun nouveau nœud, observateur ni calcul JS.


### État centré entre titre et commandes — Panel 1.2.4

Les panneaux à commandes nommées utilisent une première rangée de 16 px,
avec un interligne de titre identique, au lieu de 20 px. La valeur reste
centrée dans la piste souple entre ce titre et le pied de commandes. Contrôler
les espacements autour du texte rendu avec des plages DOM ; le seul rectangle
extensible de la valeur ne suffit pas à vérifier le centrage perçu. Les cibles
de 44 px, le pied, les retraits latéraux et le dessin de 80 px restent stables.
Les autres panneaux et les lecteurs gardent leurs pistes habituelles.


### Équilibre optique de l’état seul — Panel 1.2.5

La capture utilisateur après 1.2.4 conserve 18 px entre le titre et le texte
de l’état, contre 12 px entre ce texte et les boutons. Sur les panneaux à
commandes nommées sans détail, remonter seulement le contenu de la valeur de
3 px avec 6 px de padding inférieur dans sa piste extensible. Le titre et le
pied gardent leurs positions de 1.2.4 ; la boîte d’action native reste stable.
La présence d’un détail restaure son centrage habituel. Le rectangle Range
inclut les métriques de police : ne pas assimiler son équilibre à celui de
l’encre visible dans une capture. Aucun calcul de police ou de pixels dans
le module ; conserver les cibles natives, les dimensions et les illustrations.

### Largeur utile de l'illustration — Panel 1.3.0

`illustration.width_ratio` (0 exclu à 1, défaut 1) agit seulement sur la
dernière colonne : taille courante du carré multipliée par le ratio. Garder
le calque carré à `min(signature-illustration-size, 80px)`, son centrage, le
cadrage du sprite et l'échelle du dessin. Les marges transparentes peuvent
déborder du track ; choisir un ratio qui laisse le dessin et ses ombres à
distance des textes dans toutes ses variantes. Ne pas étirer le sprite en
réduisant la largeur de son calque et ne pas mesurer ses pixels au runtime.

Le coefficient est relu hors du cache structurel avec le moteur de templates
existant ; une entrée vide, non finie ou hors limites utilise 1. Les dimensions
du thème restent résolues en CSS et suivent leurs mises à jour sans réexécution.
Conserver la hauteur de 118 px, les fontes, détails, commandes et nœuds natifs.
Les pochettes média réelles gardent leur colonne complète. Sans option, aucune
géométrie existante ne change. Tester une à trois mesures, les coefficients
des quatre synthèses, les petites largeurs, clair/sombre, avec/sans thème,
la mise à jour et le retrait du coefficient, le thème seul et le repli média.

### Horaires et métadonnées Compact — 1.6.4

Les heures `h:mm` / `h:mm:ss` identifiées dans le texte natif exposent
`data-dp-value-clock`. L'observateur existant ajoute/retire cet attribut avec
les mises à jour ; aucun observateur supplémentaire. Le titre et l'heure
utilisent `text-box-trim: trim-both` et `text-box-edge: cap alphabetic` pour
centrer les caractères par leur hauteur de capitale et leur ligne de base.
Le padding de 4 px de l'heure conserve sa cible ; les navigateurs sans cette
propriété gardent le centrage des boîtes. Les textes non horaires reprennent
leur présentation existante. Voir [CSS Inline Layout](https://drafts.csswg.org/css-inline-3/#text-edges).

Dans les lecteurs Compact, titre et artiste tiennent chacun sur une seule
ligne avec ellipse horizontale. Contrer le `display: -webkit-box` et
`white-space: normal` natifs écrits en ligne lorsque `scrolling_effect: false` :
les deux champs repliés sur deux lignes dépassaient ensemble les 56 px.
Les copies de défilement, nœuds, pochettes, boutons, slider de volume et masquages
natifs restent conservés ; aucune transformation du lecteur en tuile.
Tester le composant Bubble réel avec de longues métadonnées, clair/sombre,
avec/sans thème et défilement actif/inactif ; une fixture simplifiée ne reproduit
pas cette écriture en ligne native.

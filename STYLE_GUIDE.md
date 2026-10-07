# Signature — règles techniques de style

Référence commune de **Signature Compact 1.4.2**, **Square 1.1.6**, **Header 1.1.13**, **Room 1.0.8**, **Signature Flow 3.6.0**, **Signature Weather 1.3.4**, **Signature Wind Rose 1.5.0** et **Signature Navigation 1.0.8**. Toute modification visuelle de ces modules doit respecter ce contrat et mettre à jour les contrôles concernés. Les distributions `*/dist/*.yaml` constituent le code livré ; [le thème](themes/signature.yaml) définit les valeurs communes en modes clair et sombre.

L'identité visuelle repose sur des surfaces neutres, des arrondis de 22 px, une typographie système, des noms sobres et des valeurs de graisse moyenne. Harmoniser les éléments de même rôle ; conserver les différences de densité et de représentation utiles à chaque module. Les accents explicites de la carte et les couleurs d'état restent prioritaires. Ne pas ajouter une dominante violette par défaut.

Les éditeurs des présentations Signature utilisent un formulaire anonyme (`name: ''`, `type: signature_options`) pour conserver les clés directement sous `signature_square`, `signature_compact`, `signature_room` ou `signature_header`. Le pont enregistre une fois son composant, puis utilise les champs d’objet Bubble et le regroupement `group` dans un `ha-form` natif. Le sélecteur d’objet reste détaché : aucun panneau d’élément ou bouton de suppression de l’objet racine. Les conditions `visible_if` suivent le type natif de carte et masquent les groupes sans champ utile sans supprimer les valeurs précédentes. Conserver les types mixtes compatibles Jinja, les booléens et la structure indexée de `sub_button_styles` ; les guides des présentations précisent les champs YAML intégrés au formulaire. Aucun observateur, abonnement ou polling ne doit être ajouté aux cartes pour gérer l’éditeur.

Flow 3.5.0 applique ce formulaire direct à `signature_flow`, avec des formulaires imbriqués dans les portées existantes `slots`, `slots.1` à `slots.6` et `animation`. Les six sections repliables gardent leurs noms et positions ; aucun emplacement absent ne doit être créé en ouvrant l’éditeur. La case d’activation doit refléter l’absence d’un emplacement et le défaut actif d’un objet déjà configuré. Préserver les valeurs masquées lorsque le bloc, le secondaire ou l’animation est désactivé. Les templates assurent leur propre calcul et formatage : ne présenter multiplicateur/précision que pour les entités directes. Un réglage d’animation vide par emplacement doit hériter du réglage global correspondant, sans injecter un défaut qui l’écrase. Utiliser le sélecteur Lovelace `ui_action` pour conserver les objets d’actions. Les conditions et les groupes ne doivent pas ajouter de calcul ou d’observateur aux cartes ; leurs règles de rendu restent identiques.

Les définitions communes des champs des quatre présentations sont dans `shared/src/editor-fields/presentation.yaml`. Les références `$field` des sources sont résolues uniquement au build ; leurs propriétés locales, notamment `visible_if`, restent prioritaires. Préserver l’ordre des champs et les descriptions spécifiques, sans ajouter d’option interne à la distribution.

Le cycle des formulaires natifs est assemblé depuis `shared/src/editor-base.js` ; les adaptateurs conservent leurs conversions YAML, scopes, listes, booléens et valeurs d’héritage. Les sections des éditeurs Signature, Flow, Weather, Wind Rose et Alert Manager utilisent `ha-form-signature_group`, dérivé du groupe natif Bubble. Conserver son rendu, les avertissements et `flatten` ; adapter seulement son CSS local. Le panneau doit hériter de `--ha-card-border-radius`, avec le repli natif `--ha-border-radius-lg`, au lieu du rayon de 6 px imposé par `bc_group`. Vérifier les panneaux ouverts/fermés et les changements de thème sans JavaScript. Ne pas modifier le composant Bubble d’origine ni les styles des autres formulaires. Ces rayons suivent l’éditeur Home Assistant ; ils ne remplacent pas les variables de style des cartes Signature.

Weather 1.3.4, Wind Rose 1.5.0 et Alert Manager 3.7.0 partagent le formulaire `signature_module_options`, livré dans chaque distribution pour fonctionner seul. Les sous-formulaires restent dans leur portée YAML existante. Conserver les sources météo chaîne/objet, les listes de mesures explicitement vides, les périodes numériques et les valeurs nulles de retour à l’héritage. Les listes natives de packs/entités ne sont qu’une représentation : les valeurs enregistrées restent des objets indexés par ID, avec validation des doublons et conservation des options supplémentaires. Les cases à défaut actif et les sélecteurs d’héritage ne doivent pas être persistés en ouvrant le formulaire ni écraser une politique héritée. Aucun observateur ou abonnement de rendu supplémentaire ne doit être ajouté pour l’éditeur.

## Modules de présentation autonomes

**Signature Compact 1.4.2**, **Square 1.1.6**, **Header 1.1.13** et **Room 1.0.8** reprennent les présentations historiques et appliquent ce même contrat, y compris sans thème et pendant un changement de mode. Un seul module de présentation est utilisé par carte ; le module historique `signature` a été retiré. Toutes les distributions du dépôt sont générées à partir de leurs `src`, des [sources communes de présentation](signature-shared/README.md) et des [fonctions communes](shared/README.md). Ne pas modifier directement `dist` ; utiliser `npm run build:modules` et `npm run check:modules`. Les présentations gardent leur assembleur spécialisé.

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
| Légende, détail météo, petite mesure, libellé Wind Rose | `signature-caption-font-size` | 12 px | Normale, sauf commande explicitement mise en évidence |
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

Les nombres Flow trop longs sont ajustés par le mécanisme existant de mesure de largeur, en conservant la taille de l'unité. Les noms et textes secondaires peuvent être tronqués lorsque le layout le prévoit. Ne pas appliquer cette réduction de police à tous les textes.

Les libellés cardinaux Wind Rose sont des textes SVG dans un `viewBox` de 320 unités : une taille CSS de 12 correspond à 12 unités avant mise à l'échelle. Leur taille physique suit la largeur réelle du SVG, plafonnée à 360 px. Ne pas présenter cette valeur comme 12 pixels à toutes les largeurs.

Les secteurs Wind Rose peuvent être divisés en quatre plages de vitesse, de la nuance la plus claire au centre à la plus foncée à l’extérieur. La couleur configurée et les changements de thème pilotent les nuances en CSS. La légende horizontale utilise le rôle de légende 12 px, avec des pastilles de 8 px et un retrait de 16 px. Les cercles restent sans chiffres : leurs positions ne représentent pas des pourcentages fixes. L’infobulle affiche direction, fréquence, durée, moyenne pondérée par le temps et maximum de vitesse historique ; elle reste disponible au survol, au toucher et au clavier.

Le pied de carte Wind Rose affiche la direction dominante à gauche et sa fréquence à droite. Ses libellés utilisent la légende de 12 px ; ses valeurs utilisent `signature-name-font-size` (14 px), la graisse moyenne 500 et des chiffres tabulaires. La fréquence reprend le pourcentage du secteur dominant hors calme et données manquantes ; la période reste dans le sélecteur supérieur.

### Interlignes et changements de taille

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

### Remplissage compact facultatif

Compact 1.4.2 propose `value_style: button` avec `compact_mode: value` : conserver le nœud d’état natif et sa cible de détails. Petite pastille neutre de 36 px, padding horizontal de 10 px, rayon concentrique `max(0px, rayon carte − 10px)` (12 px), valeur `signature-name-font-size` (14 px), unité `signature-caption-font-size` (12 px). Surface `signature-control-background`, sinon mélange de 4 % du texte primaire dans la surface neutre. Placer la mesure avant les sous-boutons ; les interrupteurs visuels viennent en dernier dans leur groupe natif par CSS, sans déplacer leurs nœuds ni changer les indices/actions. À trois commandes ou plus, placer le groupe sous la mesure à 480 px ou moins, avec retour à la ligne et hauteur automatique. Ce comportement fonctionne avec ou sans remplissage. Avec `value_background: false`, enlever le fond, la bordure et l’ombre de la valeur, et réduire son padding horizontal à 4 px ; garder la cible de 36 px, la typographie, les actions et le placement avant les commandes. Le fond de la jauge et les surfaces des sous-boutons ne sont pas concernés.

Compact 1.4.2 propose `fill` sur les boutons État sans contrôles numériques générés : entité `reference_entity` ou limite fixe `max`. Le fond d’origine n’est jamais remplacé ; un gradient d’accent transparent à 16 % (`signature-fill-tint`, repli 16 %) couvre la part calculée. Garder les textes du thème, l’icône et les badges, les limites visuelles 0–100 %, la distinction zéro/données invalides et l’absence de conversion implicite d’unité. Le mouvement réduit désactive la transition de largeur de 1,5 s. Les couleurs à seuils restent propres aux icônes ; elles ne deviennent pas la couleur du remplissage.

Aucun nœud interactif, observateur, abonnement ou polling ajouté. Les états de l’entité et de sa référence restent lus hors cache ; les styles statiques sont conservés dans le runtime. Ne pas réduire les sous-boutons, switches ni flèches pour faire tenir une jauge. Avec la valeur à droite et au moins trois sous-boutons configurés, à 480 px ou moins les contrôles natifs passent sous la mesure et se répartissent dans leur groupe existant, avec hauteur automatique. Les autres jauges gardent la hauteur compacte de 56 px. Les conditions natives restent prioritaires et les nœuds conservent leurs handlers. Les fixtures couvrent les sous-boutons plats/groupés, les clics/changements simulés et le badge Alert Manager ; elles ne chargent pas les menus Home Assistant réels.

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

Les formes circulaires (`50%`), les boutons de contrôle room, les pistes de 6 px, les repères SVG et le switch visuel Signature de 48 × 28 px avec poignée de 24 px ont une géométrie propre. Les pilules du header gardent leur rayon de 24 px. Les petits rayons des zones de focus Flow et de ses nœuds sont internes au diagramme. Ces exceptions ne remplacent pas les rayons des cartes et des groupes partagés.

### Survol et retour natif Bubble

La `.bubble-background` des quatre présentations garde ses actions et son `ha-ripple` natifs. Ancrer sa géométrie avec `inset: 0`, `width: auto` et `height: auto` : les coordonnées automatiques décalent la couche dans les wrappers flex rembourrés ou les grilles. Elle doit remplir le bord intérieur de la carte, y compris en hauteur automatique ; ne pas créer un fond supplémentaire au survol.

Les boîtes `.bubble-content-container` restent traversables par le pointeur. L’icône principale et les valeurs/actions explicites réactivent leurs propres cibles ; les sous-boutons conservent leur retour natif indépendant. Le halo des interrupteurs Signature suit leur piste de 48 × 28 px, avec un retrait de 3 px vertical / 2 px horizontal et un rayon de 14 px, sans réduire la cible native de 52 × 34 px. Room conserve son clip circulaire pour les commandes sans texte. Les contrôles cover/climate/media et les pilules Header restent natifs. Navigation garde son survol propre ; Flow, Weather et Wind Rose masquent leur wrapper natif.

[Les fixtures de survol](styles/test/hover.browser.cjs) vérifient les dimensions de la couche et de son ripple à cinq largeurs, en clair/sombre avec/sans thème, les clics carte/valeur/commande, la sortie du pointeur et le toucher. Elles reproduisent le contrat parent et la surface du ripple ; elles ne chargent pas le composant Home Assistant réel.

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

Compact 1.4.2 applique un padding horizontal de 9 px dans le wrapper, auquel s’ajoute la bordure de 1 px : le retrait extérieur vaut 10 px des deux côtés, comme autour des pastilles centrées de 36 px. Les pastilles utilisent localement le rayon de carte moins 10 px ; ne pas modifier le token global de contrôle ni les formes propres aux switches, contrôles cover/climate/number ou lecteurs. La grande valeur sans fond n’ajoute pas de padding à droite. Aucun calcul JavaScript ou observateur n’est requis.

Conserver les densités existantes : 10 px pour le contenu compact/square, 12 px pour le contenu room, 14 px pour l'enveloppe Flow, généralement 16 px pour les sections Weather et Wind Rose. Depuis Flow 3.5.2, une carte de moins de 490 px conserve 14 px verticalement mais utilise 10 px horizontalement et 8 px entre l'icône et le texte. Déterminer ce retrait depuis la largeur extérieure, indépendante du padding, pour éviter une oscillation au seuil. L'axe central reste fixe ; les unités et tailles de police restent celles de leur rôle, avec l'ajustement des nombres débordants existant. Les adaptations étroites de Weather restent propres à ses sections. Ne pas imposer le même padding à tous les modules.

## 6. Comportement et maintenance

Une correction de style doit conserver les entités, le formatage localisé, les unités, les actions natives, les cibles `more-info`, les conditions d'affichage et les contrôles numériques. Ne pas réactiver `.hidden` ou `[hidden]`. Conserver les nœuds auxquels Bubble attache ses événements ; séparer visuellement une unité sans remplacer une commande par du texte inerte.

Navigation s’utilise seule sur un footer natif `sub-buttons`, avec une rangée plate en bas et aucune commande principale. Elle conserve les nœuds, actions et masquages natifs. L’icône active et le focus clavier utilisent `primary-text-color`, les autres icônes utilisent `secondary-text-color`. Les icônes mesurent 26 px. Le fond actif mélange 12 % de texte primaire dans la surface de carte, puis 65 % de ce résultat dans transparent : visiblement assombri en clair et éclairci en sombre avec les palettes neutres, tout en restant translucide. Son ombre vaut `0 1px 2px rgb(0 0 0 / .025)` et son reflet intérieur est atténué à 25 %. Ces variables restent résolues en CSS lors du changement de thème. Le fond de sélection remplit sa case pour que le premier et le dernier bouton suivent la courbe extérieure. Ne pas réintroduire le carré fixe de 44 px ni le rayon d’icône de 12 px : le retrait vertical et horizontal doit rester uniforme. La hauteur des commandes est de 52 px ; leur largeur dépend du nombre de routes et de l’espace disponible. La sélection compare le segment dashboard des actions `navigate`, sans liste de routes codée dans le module ni listener supplémentaire.

Le footer Navigation hors éditeur utilise `z-index: 3`, sous le fond des popups Bubble (`4`) et leur contenu (`5`). Le footer natif Bubble utilise aussi `5` : ne pas conserver ce niveau qui fait dépendre la superposition de l’ordre des cartes dans le DOM. Le fond des popups doit recevoir les clics hors popup ; la barre redevient directement utilisable à la fermeture. Conserver cette hiérarchie en CSS, sans détection du hash, écouteur, observateur ou polling supplémentaire, et sans modifier la position de l’aperçu dans l’éditeur.

Les modules autonomes Flow, Weather et Wind Rose remplacent leur contenu natif et s'utilisent sans le module de design Signature sur la même carte. Aucun besoin de `card-mod`, de police externe ou d'une dépendance npm dans Home Assistant. Les dépendances du dépôt servent uniquement au développement.

Une variation de thème ne doit déclencher ni abonnement, ni requête d'historique, ni timer supplémentaire. Les abonnements, observateurs, animations et listeners existants doivent être libérés au teardown. Respecter `prefers-reduced-motion` dans Flow. Ne pas ajouter une boucle permanente de lecture des styles pour maintenir l'harmonie ; conserver les mesures de géométrie déjà nécessaires au diagramme.

## 7. Contrôles obligatoires lors d'une évolution

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

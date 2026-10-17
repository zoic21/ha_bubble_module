# Signature — règles techniques de style

Référence commune de **Signature Compact 1.4.6**, **Square 1.6.2**, **Header 1.1.14**, **Room 1.3.6**, **Signature Flow 3.6.1**, **Signature Weather 1.3.4**, **Signature Wind Rose 1.5.4** et **Signature Navigation 1.0.8**. Toute modification visuelle de ces modules doit respecter ce contrat et mettre à jour les contrôles concernés. Les distributions `*/dist/*.yaml` constituent le code livré ; [le thème](themes/signature.yaml) définit les valeurs communes en modes clair et sombre.

L'identité visuelle repose sur des surfaces neutres, des arrondis de 22 px, une typographie système, des noms sobres et des valeurs de graisse moyenne. Harmoniser les éléments de même rôle ; conserver les différences de densité et de représentation utiles à chaque module. Les accents explicites de la carte et les couleurs d'état restent prioritaires. Ne pas ajouter une dominante violette par défaut.

Les éditeurs des présentations Signature utilisent un formulaire anonyme (`name: ''`, `type: signature_options`) pour conserver les clés directement sous `signature_square`, `signature_compact`, `signature_room` ou `signature_header`. Le pont enregistre une fois son composant, puis utilise les champs d’objet Bubble et le regroupement `group` dans un `ha-form` natif. Le sélecteur d’objet reste détaché : aucun panneau d’élément ou bouton de suppression de l’objet racine. Les conditions `visible_if` suivent le type natif de carte et masquent les groupes sans champ utile sans supprimer les valeurs précédentes. Conserver les types mixtes compatibles Jinja, les booléens et la structure indexée de `sub_button_styles` ; les guides des présentations précisent les champs YAML intégrés au formulaire. Aucun observateur, abonnement ou polling ne doit être ajouté aux cartes pour gérer l’éditeur.

Flow 3.5.0 applique ce formulaire direct à `signature_flow`, avec des formulaires imbriqués dans les portées existantes `slots`, `slots.1` à `slots.6` et `animation`. Les six sections repliables gardent leurs noms et positions ; aucun emplacement absent ne doit être créé en ouvrant l’éditeur. La case d’activation doit refléter l’absence d’un emplacement et le défaut actif d’un objet déjà configuré. Préserver les valeurs masquées lorsque le bloc, le secondaire ou l’animation est désactivé. Les templates assurent leur propre calcul et formatage : ne présenter multiplicateur/précision que pour les entités directes. Un réglage d’animation vide par emplacement doit hériter du réglage global correspondant, sans injecter un défaut qui l’écrase. Utiliser le sélecteur Lovelace `ui_action` pour conserver les objets d’actions. Les conditions et les groupes ne doivent pas ajouter de calcul ou d’observateur aux cartes ; leurs règles de rendu restent identiques.

Les définitions communes des champs des quatre présentations sont dans `shared/src/editor-fields/presentation.yaml`. Les références `$field` des sources sont résolues uniquement au build ; leurs propriétés locales, notamment `visible_if`, restent prioritaires. Préserver l’ordre des champs et les descriptions spécifiques, sans ajouter d’option interne à la distribution.

Le cycle des formulaires natifs est assemblé depuis `shared/src/editor-base.js` ; les adaptateurs conservent leurs conversions YAML, scopes, listes, booléens et valeurs d’héritage. Les sections des éditeurs Signature, Flow, Weather, Wind Rose et Alert Manager utilisent `ha-form-signature_group`, dérivé du groupe natif Bubble. Conserver son rendu, les avertissements et `flatten` ; adapter seulement son CSS local. Le panneau doit hériter de `--ha-card-border-radius`, avec le repli natif `--ha-border-radius-lg`, au lieu du rayon de 6 px imposé par `bc_group`. Vérifier les panneaux ouverts/fermés et les changements de thème sans JavaScript. Ne pas modifier le composant Bubble d’origine ni les styles des autres formulaires. Ces rayons suivent l’éditeur Home Assistant ; ils ne remplacent pas les variables de style des cartes Signature.

Weather 1.3.4, Wind Rose 1.5.4 et Alert Manager 3.7.0 partagent le formulaire `signature_module_options`, livré dans chaque distribution pour fonctionner seul. Les sous-formulaires restent dans leur portée YAML existante. Conserver les sources météo chaîne/objet, les listes de mesures explicitement vides, les périodes numériques et les valeurs nulles de retour à l’héritage. Les listes natives de packs/entités ne sont qu’une représentation : les valeurs enregistrées restent des objets indexés par ID, avec validation des doublons et conservation des options supplémentaires. Les cases à défaut actif et les sélecteurs d’héritage ne doivent pas être persistés en ouvrant le formulaire ni écraser une politique héritée. Aucun observateur ou abonnement de rendu supplémentaire ne doit être ajouté pour l’éditeur.

## Modules de présentation autonomes

**Signature Compact 1.4.6**, **Square 1.6.2**, **Header 1.1.14** et **Room 1.3.6** reprennent les présentations historiques et appliquent ce même contrat, y compris sans thème et pendant un changement de mode. Un seul module de présentation est utilisé par carte ; le module historique `signature` a été retiré. Toutes les distributions du dépôt sont générées à partir de leurs `src`, des [sources communes de présentation](signature-shared/README.md) et des [fonctions communes](shared/README.md). Ne pas modifier directement `dist` ; utiliser `npm run build:modules` et `npm run check:modules`. Les présentations gardent leur assembleur spécialisé.

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

Les nombres Flow trop longs sont ajustés par le mécanisme existant de mesure de largeur, en conservant la taille de l'unité. Chaque texte secondaire reste aligné à gauche sous le nom et la valeur de son emplacement, y compris le slot 3 en disposition étroite ; aucun décalage sous l'icône. Les noms et textes secondaires peuvent être tronqués lorsque le layout le prévoit. Ne pas appliquer cette réduction de police à tous les textes.

Les libellés cardinaux Wind Rose sont des textes SVG dans un `viewBox` de 320 unités : une taille CSS de 12 correspond à 12 unités avant mise à l'échelle. Leur taille physique suit la largeur réelle du SVG, plafonnée par `signature-wind-rose-max-size` (360 px par défaut). La variable reste dans le CSS et peut être définie sur une carte ; le SVG reste carré et rétrécit à la largeur disponible. Ne pas fixer la hauteur du conteneur ni réduire les polices de légende/pied pour modifier le diamètre. Une limite de 348 px réduit de 12 px la hauteur des cartes larges sans modifier les cartes dont le dessin est déjà plus petit. Ne pas présenter cette valeur comme 12 pixels à toutes les largeurs.

Les secteurs Wind Rose peuvent être divisés en quatre plages de vitesse, de la nuance la plus claire au centre à la plus foncée à l’extérieur. La couleur configurée et les changements de thème pilotent les nuances en CSS. La légende horizontale utilise le rôle de légende 12 px, avec des pastilles de 8 px et un retrait de 16 px. Les cercles restent sans chiffres : leurs positions ne représentent pas des pourcentages fixes. L’infobulle affiche direction, fréquence, durée, moyenne pondérée par le temps et maximum de vitesse historique ; elle reste disponible au survol, au toucher et au clavier.

Depuis Wind Rose 1.5.3, le blanc des deux plages claires est remplacé par un mélange de 25 % de surface de carte héritée et 75 % de blanc. Le clair sur surface blanche conserve ses couleurs ; le sombre atténue les reflets pâles. Conserver les proportions d’accent de 42 % / 72 % pour ces plages, puis les mélanges de 94 % / 67 % d’accent avec noir pour les deux plages foncées. Ces variables doivent suivre le thème en CSS sans réexécution du module ; les pastilles de légende et les secteurs utilisent les mêmes couleurs. Le teal par défaut et les accents bleu/rouge contrôlés gardent quatre nuances ordonnées. Les accents personnalisés très lumineux, dont blanc et jaune, peuvent confondre ou inverser les nuances claires ; le contrat ne garantit pas leur séparation sur toute surface.

Le pied de carte Wind Rose affiche la direction dominante à gauche, sa fréquence au centre et la durée de calme à droite, sur une seule ligne. Sans source de vitesse, la durée de calme est masquée et la fréquence reste à droite. La durée utilise un format compact avec les minutes sur deux chiffres (`1 h 05`) sans retour à la ligne, y compris sur une semaine. Un historique de vitesse exploitable sans calme affiche `0 min` ; des données manquantes affichent `—`. Ses libellés utilisent la légende de 12 px ; ses valeurs utilisent `signature-name-font-size` (14 px), la graisse moyenne 500 et des chiffres tabulaires. La fréquence reprend le pourcentage du secteur dominant hors calme et données manquantes ; la période reste dans le sélecteur supérieur.

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

Compact 1.4.3 propose `value_style: button` avec `compact_mode: value` : conserver le nœud d’état natif et sa cible de détails. Petite pastille neutre de 36 px, padding horizontal de 10 px, rayon concentrique `max(0px, rayon carte − 10px)` (12 px), valeur `signature-name-font-size` (14 px), unité `signature-caption-font-size` (12 px). Surface `signature-control-background`, sinon mélange de 4 % du texte primaire dans la surface neutre. Placer la mesure avant les sous-boutons ; les interrupteurs visuels viennent en dernier dans leur groupe natif par CSS, sans déplacer leurs nœuds ni changer les indices/actions. À trois commandes ou plus, placer le groupe sous la mesure à 480 px ou moins, avec retour à la ligne et hauteur automatique. Ce comportement fonctionne avec ou sans remplissage. Avec `value_background: false`, enlever le fond, la bordure et l’ombre de la valeur, et réduire son padding horizontal à 4 px ; garder la cible de 36 px, la typographie, les actions et le placement avant les commandes. Le fond de la jauge et les surfaces des sous-boutons ne sont pas concernés.

Compact 1.4.3 propose `fill` sur les boutons État sans contrôles numériques générés : entité `reference_entity` ou limite fixe `max`. Le fond d’origine n’est jamais remplacé ; un gradient d’accent transparent à 16 % (`signature-fill-tint`, repli 16 %) couvre la part calculée. Garder les textes du thème, l’icône et les badges, les limites visuelles 0–100 %, la distinction zéro/données invalides et l’absence de conversion implicite d’unité. Le mouvement réduit désactive la transition de largeur de 1,5 s. Les couleurs à seuils restent propres aux icônes ; elles ne deviennent pas la couleur du remplissage.

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

Conserver les densités existantes : 10 px pour le contenu compact/square, 12 px pour le contenu room, 14 px pour l'enveloppe Flow, généralement 16 px pour les sections Weather et Wind Rose. Depuis Flow 3.5.2, une carte de moins de 490 px conserve 14 px verticalement mais utilise 10 px horizontalement et 8 px entre l'icône et le texte. Déterminer ce retrait depuis la largeur extérieure, indépendante du padding, pour éviter une oscillation au seuil. L'axe central reste fixe ; les unités et tailles de police restent celles de leur rôle, avec l'ajustement des nombres débordants existant. Les adaptations étroites de Weather restent propres à ses sections. Ne pas imposer le même padding à tous les modules.

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

### Bandeau Square à une ou deux mesures (1.4.1)

Depuis Square 1.6.0, le Square fixe et le bandeau à une seule mesure conservent trois rangées de texte, y compris sans secondaire. Les positions du nom et de la valeur restent identiques lorsque le secondaire apparaît ou disparaît. L’illustration reste centrée dans le bandeau de 120 px. L’interligne secondaire vaut au moins 16 px ou 1,2 fois sa taille CSS effective ; il suit le thème sans nouveau rendu JavaScript.

Depuis Square 1.4.3, la rangée des noms reprend les 36 px du Square classique, avec le même interligne de 20 px et un centrage vertical. Un nom sur une ligne commence ainsi à 18 px du bord extérieur (bordure 1 px + retrait 9 px + centrage 8 px), en pleine largeur comme en demi-largeur. Les noms longs peuvent toujours agrandir cette rangée ; conserver la hauteur totale de 120 px et le centrage de l’illustration.

Un objet `summary` avec `entity` valide active deux colonnes de mesures, plus une colonne décorative facultative. Il conserve le nombre de lignes natif : deux lignes de 56 px et leur écart de 8 px donnent 120 px, sans hauteur minimale ajoutée. L’illustration suit `signature-illustration-size` mais rétrécit sur les cartes étroites ou trop basses ; elle est centrée verticalement. Les titres, valeurs et détails des deux mesures partagent les trois lignes de grille ; les textes secondaires peuvent revenir à la ligne. Les nombres utilisent `clamp(18px,7cqw,valeur)` et les unités `clamp(12px,4cqw,unité)` pour préserver les quantités sur mobile. Garder les quatre cibles de détails et le gestionnaire délégué Bubble, sans listener/observateur supplémentaire. Les badges d’alerte restent visibles au-dessus de l’illustration lorsque l’icône est masquée. Le bandeau ne s’applique pas à `auto_height` ou `controls: measure` ; utiliser une carte sans sous-boutons.

Un objet `summary: {enabled: true}` sans `entity` utilise le même bandeau avec une seule mesure et sans colonne intermédiaire ni nouveau nœud. La valeur/unité gardent les tailles standard de 28/16 px ; la taille cible de l’image et la hauteur restent les mêmes. `enabled: false` désactive le bandeau. Un objet vide ou une seconde entité invalide ne l’active pas. Les valeurs, unités, actions et secondaires existants sont conservés.

### Room illustrée (1.1.5)

`room_mode: illustrated` est une variante explicite ; le mode classique reste le défaut. Hauteur de base 148 px (28 px de moins que la première variante illustrée), plus 48 px par rangée de commandes supplémentaire. Le nom sur deux lignes et la température sont à gauche du dessin ; le titre conserve 38 px. Les mesures d’en-tête sont ignorées dans cette variante. La décoration partage `signature-illustration-size` avec Square : 80 px par défaut, réduction sur les cartes étroites pour préserver les textes. Une valeur supérieure à 80 px agrandit la hauteur de base pour dégager les commandes ; le texte secondaire garde sa propre rangée et adapte la hauteur. L’humidité et l’icône principale sont masquées sans supprimer leurs configurations natives. Les valeurs, unités, badges conditionnels, actions et cibles de commandes de 44 px sont conservés.

L’image utilise le même helper que Square : URL locale/HTTPS, sprites, index Jinja, variantes `image_light`/`image_dark` selon HA, sans nouvel observateur ni abonnement. Les images restent extérieures au dépôt des modules. Le badge d’état passe en haut à droite, au-dessus du dessin ; sans illustration, sa place est réservée dans le titre seulement lorsqu’il est visible. La taille partagée reste une variable CSS héritée et suit le thème sans reconstruire le cache ni lire les styles en JavaScript. L’anneau `icon_border_color` est reporté sur la décoration ; `border_color` garde l’ombre de carte et son contour d’alerte. `sub_button_styles.<classe>.icon_outline_color` conserve un contour de glyphe de 1,5 px avec la couleur RGB configurée, sans CSS dans la carte. Les commandes natives nommées disposent d’une grille icône/libellé dans le module. Ses zones `icon` et `label` sont attribuées explicitement aux deux éléments : Bubble crée le libellé avant l’icône et utilise `row-reverse` en flex. Ne pas dépendre de l’ordre du DOM pour le placement en grille ; le libellé utilise la colonne souple, l’icône la colonne de 26/30 px. Les six noms de Jardin restent complets dès 288 px, en clair/sombre, avec ou sans thème, sans modifier les cibles ou les nœuds natifs. L’illustration est centrée verticalement entre le bord intérieur supérieur et le haut du séparateur des commandes. Le calcul CSS utilise la hauteur réelle, la taille responsive et le nombre de rangées du pied ; il suit les changements de thème et les commandes masquées sans lecture de style en JavaScript. Sans commandes visibles ni secondaire, elle est centrée dans la carte entière. Un secondaire conserve son bloc supérieur réservé pour éviter de chevaucher sa ligne à pleine largeur. Les atlas aux marges transparentes inégales doivent fournir un `offset_y` adapté à chaque objet : le centrage du cadre seul ne garantit pas celui de la silhouette. Les réglages masqués restent enregistrés pour le retour au mode classique.

### Badges Room après le nom (1.2.3)

Un sous-bouton natif iconique `default`, sans texte ni rôle de commande ou de
mesure, accepte `sub_button_styles.<classe-ou-index>.type: badge` en mode
illustré. Conserver les nœuds/actions/conditions Bubble. Les icônes de 14 px
partagent une capsule neutre haute de 20 px, située 6 px après le texte du nom.
Centrer le groupe verticalement sur le texte, y compris sur deux lignes, et
garder l’ordre natif. Les boutons natifs gardent leurs cibles de 20 × 20 px,
sans fond individuel par défaut ; l’espacement visuel entre icônes vaut 6 px.
Les 2 px aux extrémités donnent une capsule de 44 px pour deux icônes et de
24 px pour une seule. Aucun contour, séparateur ou ombre supplémentaire.
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
Le titre et la capsule partagent l’espace réservé à gauche de l’illustration ;
le nom conserve sa limite native de deux lignes. La réduction responsive
ordinaire et la variable de taille du thème restent applicables. Comparer
explicitement la géométrie du dessin avec zéro/un/deux badges ; couvrir aussi
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

Room 1.3.1 permet `room_show_divider: false` : seule la ligne décorative est
masquée. `room_state_centered: true` utilise une première rangée intrinsèque
pour le titre (au plus deux lignes), puis centre l’état dans l’espace jusqu’au
haut des cibles natives visibles. Opt-in illustré sans secondaire, sans effet
sans état ou commandes visibles. Le dessin conserve exactement sa taille et
son centre antérieurs ; ne pas le centrer dans la nouvelle grille raccourcie.
Hauteur, cibles, badges, actions, modes par défaut et secondaire restent
inchangés. Vérifier les deux longueurs de titre, les commandes masquées par
classe/attribut et le retrait des options. CSS seulement, aucune mesure ou
surveillance JavaScript supplémentaire.

Room 1.3.2 propose `room_compact` pour un équipement illustré avec état, sans
secondaire et une rangée de une à trois commandes nommées `type: command`.
Hauteur 118 px, image carrée toujours à 80 px, centrée dans toute la carte ;
nom sur une ligne et état centré dans l’espace jusqu’aux commandes. La zone
des commandes s’arrête à gauche du dessin, au lieu d’en réserver la hauteur.
Espacement de 3 px entre contrôles, padding horizontal de 0,5 px, libellés de
11 px au maximum (rôle de légende compact), cibles hautes
de 44 px, largeur supérieure à 44 px dès 288 px avec les variables par défaut.
Conserver les libellés entiers Désarmer/Armer/Nuit et le blocage des commandes.
L’image absente libère sa largeur et les masquages natifs libèrent le pied.
Une configuration incompatible revient au gabarit normal ; ne pas compresser
les pièces, leurs deux lignes de nom ou leurs mesures par défaut. Aucun
scale, nouveau nœud, mesure JavaScript ou surveillance.

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


### Seconde mesure issue des statistiques — Square 1.5.0

`summary.statistics` utilise les mêmes nœuds, styles, 28/16 px et grille de deux
lignes que la seconde mesure classique. Aucun style ou DOM distinct pour le
coût : illustration à droite, hauteur native de 120 px et lignes de titres,
valeurs et secondaires communes. Les statistiques manquantes/en erreur restent
`—`, jamais un total partiel ou l’état cumulé brut. La source est facultative ;
les cartes sans statistiques ne font aucune requête. Une requête Recorder au
plus par minute est déclenchée par les mises à jour HA, sans timer, observateur
ou abonnement ajouté. Les réponses périmées sont ignorées au changement de
jour/configuration/module et au nettoyage. Le total de plusieurs statistiques
ne possède pas d’entité more-info fictive ; seules les cibles réellement liées
à une entité restent interactives. Les formulaires et les autres layouts ne
changent pas.


Square 1.5.1 réutilise ce même bandeau pour `operation: remaining_percentage`.
Le titre Autosuffisance et le pourcentage gardent les rôles existants, sans
sous-titre lorsqu’aucun `secondary` n’est configuré. Les sorties d’énergie sont
soustraites avant le ratio ; un dénominateur nul ou une source manquante reste
`—`. La formule et les sources entrent dans la clé du cache journalier.

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


### Bandeaux activité — Square 1.6.0

`activity: true` réserve la partie basse d’un bouton aux sous-boutons natifs,
sans modifier leurs conditions ou actions. Utiliser deux lignes natives et
une pleine largeur (120 px avec le pas standard). Le nom, l’état et le détail
restent en haut à gauche ; l’illustration à droite est limitée à 72 px pour
laisser une rangée de commandes de 30 px. Ce format est opt-in et ne modifie
pas les synthèses énergie. Les cartes media-player nécessitent aussi cette
option ; elles gardent leurs nœuds natifs, piste de volume et gestionnaires.
La pochette native masquée est remplacée par l’illustration décorative ; les
informations de morceau restent natives. Aucune commande n’est recréée.

Sur Square, `illustration.index_dark` et `offset_y_dark` permettent de lire
une variante sombre dans la même planche. Sans ces options, les valeurs
`index` et `offset_y` restent utilisées. Choix selon le thème HA effectif,
sans abonnement supplémentaire. `progress.value` et `progress.color`
affichent une piste de 3 px sur les boutons d’activité : valeur bornée 0–100,
vide/non numérique masqué. Aucun état métier ni action n’est créé.

### Alignements équipements et activité — Room 1.3.3 / Square 1.6.1

`room_inline_metrics: true`, uniquement pour un équipement illustré avec état et 1–2 contrôles de mesure non nommés, aligne les centres des trois cibles sur la ligne basse. Conserver les 148 px, les 80 px du dessin et les cibles de mesure de 44 px ; aucun séparateur dans ce mode. Les commandes nommées et les autres pièces gardent leur placement. Retirer l’option restitue les styles précédents.

Le mode `activity` centre le groupe nom/état dans la zone au-dessus des commandes, avec une troisième ligne uniquement lorsqu’un détail existe. Les autres Square gardent leur ligne secondaire réservée. Garder les mêmes nœuds et le défilement natif Bubble (`scrolling_effect`) ; les textes calculés à faire défiler passent par `state_content` natif. Aucun observateur ou timer de défilement supplémentaire.


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

### Retouche des mesures compactes et du centrage activité — Room 1.3.4 / Square 1.6.2

`room_inline_metrics` combiné à `room_compact` place les trois valeurs à gauche du dessin, sur une carte de 118 px. Le titre reste en haut, le dessin à droite mesure 80 px, les cibles de mesure 44 px. La valeur principale et les deux contrôles partagent le centre de la zone sous le titre. Les mesures seules ne doivent pas hériter de la grille des commandes nommées. Conserver les nœuds et les couleurs ; la version 148 px reste disponible sans compact.

En activité Square, centrer uniquement l’état entre le bas du titre fixe et le haut des informations basses. Si un détail est présent, sa ligne constitue la borne basse du centrage. Les lecteurs centrent le groupe morceau/artiste dans la zone entre titre et commandes. Conserver les 120 px natifs, les dessins, les sous-boutons et le défilement Bubble. Aucun nouveau nœud, timer ou observateur. Vérifier les centres réels, au lieu de centrer le bloc titre/état entier.

### Cadre natif des mesures Room compactes — 1.3.5

Tester le mode `room_inline_metrics` + `room_compact` avec le contrat natif
Bubble `fixed-top` et un conteneur de nom positionné. Une fixture qui omet
`align-self: flex-start`, `min-height: 54px` et ce wrapper ne reproduit pas le
cadre réellement rendu. Fixer explicitement la hauteur intérieure du contenu,
son alignement et ses marges ; retirer le positionnement relatif du wrapper
sans boîte (`display: contents`). L’image de 80 px se centre dans les 118 px.
Les trois cibles partagent le centre de la zone sous le titre et leurs textes
la même typographie 13–22 px, graisse normale, interligne 1,2, unités comprises.
La colonne intermédiaire est plus large pour l’unité et l’icône. Préserver les
entités, couleurs, actions et les autres modes Room.

Les suffixes CSS dynamiques ciblant les enfants utilisent un combinateur
explicite `>` : leur espace descendant initial peut disparaître lors de la
minification d’un fragment isolé. Vérifier le CSS distribué avec les vraies
classes natives, les polices calculées et les boîtes des lignes de texte.

### Repère unique des mesures compactes — Room 1.3.6

La nouvelle capture utilisateur montre que la correction 1.3.5 ne suffit pas
sur son installation. En compact inline, les wrappers de carte/contenu/nom
utilisent `display: contents` et un positionnement statique : l’état, les deux
sous-boutons et l’illustration se positionnent depuis `.bubble-container`.
Le titre a ses propres coordonnées supérieures ; aucune grille intermédiaire
ne doit créer une origine différente pour la puissance. Vérifier directement
que les trois `offsetParent` désignent cette même carte, puis comparer les
boîtes des textes, les tailles, les cibles de 44 px et le centre de l’image.
Garder les variables de police responsive sur le wrapper descendant du
conteneur CSS afin que `cqw` utilise la largeur de la carte.

`room_hover: false` est une exception explicite par carte : transmettre
`--ha-ripple-hover-opacity: 0` aux `ha-ripple` natifs. Ne pas masquer les ripples,
retirer les actions ou neutraliser le retour d’appui. Sans l’option, survol natif
conservé. Tester clics carte/valeur/deux mesures, retrait de l’option et carte
voisine inchangée. Les autres modes Room gardent leur disposition.

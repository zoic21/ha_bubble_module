# Signature Header

Version **1.1.8**. ID YAML : **`signature_header`**. [Distribution complète à importer](../dist/signature-header.yaml).

En-têtes de pages et titres de sections. Le type natif de carte choisit la présentation.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Header**. Les réglages sont en français. Les options restent directement sous `signature_header` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Étage
card_layout: large
show_state: false
modules:
  - signature_header
signature_header:
  color: teal
```

Un titre de section se configure ainsi :

```yaml
type: custom:bubble-card
card_type: separator
name: Vie quotidienne
modules:
  - signature_header
```

## Compatibilité et comportement

Un `button` avec `button_type: name` donne un grand en-tête et des pilules. Un `separator` donne un titre de section de 32 px de haut, transparent et sans trait. Les autres types de carte ne sont pas habillés. Une configuration incompatible ne reçoit aucun style de ce module.

Le séparateur conserve ses sous-boutons et leurs actions natifs ; `sub_button_styles` permet d’appliquer des seuils aux fonds des badges et une préférence `icon_color` à leurs icônes. Les autres options continuent à concerner le grand en-tête. Les pilules passent sous le titre selon la largeur. `sub_button_styles` accepte une classe CSS ou un numéro natif, avec `color`, `background`, `opacity` et `icon`, dont les valeurs peuvent utiliser Jinja.

Sur mobile (fenêtre de 600 px ou moins), tous les sous-boutons restent à droite du titre si l’ensemble tient avec au moins 24 px de dégagement. Sinon, **tout le groupe passe sous le titre** : aucun bouton ne reste à droite. Le conteneur occupe alors toute la largeur et justifie chaque ligne ; les pilules gardent leur largeur et les espaces se répartissent, avec 8 px d’écart minimal. Un bouton seul sur une ligne inférieure reste à gauche. Le navigateur ajuste ce placement en CSS lorsque la largeur ou les libellés changent, sans mesure JavaScript ni observateur supplémentaire. La disposition sur ordinateur et les titres de section restent inchangés.

## Couleurs du fond d’icône selon la valeur

Les sous-boutons du grand en-tête et des titres de section acceptent `color_thresholds` dans `sub_button_styles`. Le fond du badge utilise une teinte douce à 16 % dans la surface du thème ; l’icône porte l’accent du graphe. Le texte garde simplement la couleur du thème ; aucune gestion du contraste. Les seuils actifs remplacent `background`, `color` et `icon_color` de l’indicateur ; retirer les seuils restitue le style ordinaire. Voir le [guide commun et ses exemples](../../signature-shared/doc/COLOR_THRESHOLDS.md).

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Le lecteur multimédia utilise `signature_compact`.

Pour migrer : remplacer `signature` dans `modules` par `signature_header`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

### 1.1.8 — 5 octobre 2026

- Sur mobile, placement automatique de tous les sous-boutons à droite du titre quand ils tiennent avec au moins 24 px de marge.
- Retour du groupe entier sous le titre lorsque l’espace manque, avec justification conservée sur chaque ligne et sans étirer les pilules.
- Adaptation CSS aux largeurs, titres et états longs ; aucun calcul JavaScript, observateur ou polling ajouté. Les groupes masqués restent hors de la disposition.
- Vérification sur fixtures Chromium en clair/sombre, avec/sans thème, au seuil exact de retour à la ligne et après changement de libellés sur les mêmes nœuds.

### 1.1.7 — 5 octobre 2026

- Justification des sous-boutons sur chaque ligne du grand en-tête, uniquement sur une fenêtre mobile de 600 px ou moins.
- Largeur des pilules, ordre, masquages et actions natifs conservés ; aucun changement de disposition sur ordinateur ou pour les titres de section.
- Rendu vérifié sur fixtures Chromium en clair/sombre, avec/sans thème, y compris au seuil mobile et avec des groupes natifs.

### 1.1.6 — 5 octobre 2026

- Couche de survol native ancrée sur les quatre bords, y compris avec marges, grille et hauteur automatique.
- Les boîtes de contenu laissent passer le pointeur ; icône, valeurs et commandes gardent leurs actions distinctes.
- Régression vérifiée sur fixtures Chromium en clair/sombre, avec/sans thème ; aucune nouvelle écoute ni modification de configuration.

### 1.1.5 — 5 octobre 2026

- Fonds à seuils adoucis : mélange 16 % dans la surface du thème, comme Pluie/Vent, au lieu d’une couleur pleine.
- Icônes exactement accordées au RGB du graphe, sans gestion du contraste ; libellés du thème. Les seuils actifs remplacent aussi `icon_color`.
- Clair/sombre et changements de thème suivis en CSS sans observateur. Même configuration des seuils, mêmes dimensions et actions.

### 1.1.4 — 5 octobre 2026

- Invalidation du runtime et des caches lors du remplacement d’une distribution, y compris depuis une version sans marqueur interne. La version est injectée au build depuis `src/module.yaml`.
- Les anciens attributs de présentation et caches de structure/CSS sont retirés avant le nouveau rendu.
- Les mises à jour ordinaires réutilisent les caches et continuent à lire les états et templates ; les variables de thème restent dans le CSS.

- **1.1.3** : Correction des seuils : fond du carré/badge, et non couleur de l’icône. Couleur du thème conservée si lisible, adaptation de contraste en CSS sans lecture de styles ni observateur ; mêmes seuils YAML et couleurs de graphes.

### 1.1.2 — 5 octobre 2026

- Définitions des champs communs assemblées au build depuis `shared/src/editor-fields/presentation.yaml`.
- Libellés, choix, groupes, valeurs par défaut, ordre et conditions de visibilité conservés ; les descriptions particulières restent locales. Aucun changement de configuration ni de code exécuté dans les cartes.

- **1.1.0** : Seuils numériques génériques, interpolation RGB compatible avec le graphique et coloration indépendante des icônes de sous-boutons ; configuration et exemples dans le guide commun.

- **1.0.4** : Règles CSS communes assemblées au build depuis `shared/src/styles` ; styles calculés, configuration et actions conservés.

- **1.0.3** : Distribution minifiée au build : variables JavaScript raccourcies, CSS et métadonnées YAML compactés ; configuration et comportement conservés.

- **1.0.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

### 1.0.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

## Notes de version

### 1.1.1 — 5 October 2026

- Mutualise le socle de l’éditeur, la palette et la validation des couleurs, les sources de templates et les helpers de locale/précision.
- Conserve les options YAML, les actions et la géométrie propres à cette présentation ; la précision native explicite reste prioritaire.

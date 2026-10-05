# Signature Compact

Version **1.1.2**. ID YAML : **`signature_compact`**. [Distribution complète à importer](../dist/signature-compact.yaml).

Lignes compactes de 56 px : informations, switches, volets, thermostats et commandes numériques. Les lecteurs multimédias reçoivent le même habillage de thème en conservant leurs dimensions natives.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Compact**. Les réglages sont en français. Les options restent directement sous `signature_compact` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Température
icon: mdi:thermometer
card_layout: large
modules:
  - signature_compact
signature_compact:
  color: orange
  compact_mode: value
```

## Compatibilité et comportement

Cartes `button` hors `slider`, ainsi que `cover`, `climate` et `media-player`. Les commandes natives restent intactes. `compact_mode: value` concerne les boutons État, ou Nom avec une option `state` personnalisée. Une configuration incompatible ne reçoit aucun style de ce module.

`controls: number` ajoute − / valeur / + pour un bouton État lié à `number` ou `input_number`. Les limites et le pas viennent de l’entité. Les pressions attendent un changement de valeur ou cinq secondes avant de reprendre ; les états invalides désactivent les commandes. Un clic sur la valeur ouvre les détails. `sub_buttons_position: end` place les sous-boutons après les commandes natives.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

### Lecteur multimédia

Sur `media-player`, le module applique les surfaces, les arrondis, l’ombre, la couleur d’icône et la typographie Signature. La pochette, le titre, l’artiste, le volume, les contrôles et les actions restent gérés par Bubble. Aucune grille de tuile ni hauteur de 56 px n’est imposée ; aucun observateur ou contrôle numérique Signature n’est créé.

Seules les options `color` et `color_background` s’appliquent et apparaissent dans le formulaire. Les autres options compactes sont ignorées pour ce type de carte ; les réglages natifs Bubble restent disponibles. Les variables CSS du thème suivent ses changements sans réexécuter le module.

```yaml
type: custom:bubble-card
card_type: media-player
entity: media_player.living_room
modules:
  - signature_compact
signature_compact:
  color: blue
  color_background: false
```

Voir aussi l’[exemple média](../examples/media.yaml).

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `compact_mode` | `default` | Valeur compacte Valeurs : `default`, `value`. |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `controls` | `native` | Commandes Valeurs : `native`, `number`. |
| `sub_buttons_position` | `default` | Position des sous-boutons en compacte Valeurs : `default`, `end`. |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur personnalisée de l’icône |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Les lecteurs multimédias utilisent Compact.

Pour migrer : remplacer `signature` dans `modules` par `signature_compact`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

- **1.1.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

- **1.1.0** : prise en charge de `media-player`, avec le rendu historique Signature et les dimensions, contrôles et actions natifs Bubble. Formulaire limité aux deux options de couleur ; variables de thème conservées dans le CSS.
- **1.0.0** : première distribution autonome de la présentation compacte.

### 1.1.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

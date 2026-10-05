# Signature Square

Version **1.0.1**. ID YAML : **`signature_square`**. [Distribution complète à importer](../dist/signature-square.yaml).

Tuiles carrées avec valeur principale, unité et texte secondaire.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Square**. Les réglages sont en français. Les options restent directement sous `signature_square` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Température
icon: mdi:thermometer
card_layout: large
rows: 2
modules:
  - signature_square
signature_square:
  color: orange
  secondary: sensor.living_room_humidity
```

## Compatibilité et comportement

Cartes `button`, hors boutons `switch` et `slider`. Les volets et thermostats utilisent Signature Compact. La hauteur dépend du nombre de lignes et de la grille Home Assistant. Une configuration incompatible ne reçoit aucun style de ce module.

`controls: measure` repositionne les deux premiers sous-boutons natifs ; il ne les crée pas. `reserve_measure_detail: true` réserve le détail inférieur. `auto_height` adapte la hauteur au contenu ; `multiline` autorise les retours à la ligne.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `controls` | `native` | Commandes Valeurs : `native`, `measure`. |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |
| `auto_height` | `false` | Adapter la hauteur au contenu |
| `reserve_measure_detail` | `false` | Réserver la ligne de détail avec les commandes de mesure |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur personnalisée de l’icône |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Les modules séparés et l’ancien `signature` peuvent coexister sur des cartes différentes. Le lecteur multimédia utilise `signature_compact`, ou le module historique `signature` jusqu’à sa migration.

Pour migrer : remplacer `signature` dans `modules` par `signature_square`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Le build complet génère également le module historique `signature` depuis ses sources. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

- **1.0.1** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

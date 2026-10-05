# Signature Header

Version **1.0.2**. ID YAML : **`signature_header`**. [Distribution complète à importer](../dist/signature-header.yaml).

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

Le séparateur conserve ses sous-boutons, leurs couleurs et leurs actions natifs ; les options de ce module concernent uniquement le grand en-tête. Les pilules passent sous le titre selon la largeur. `sub_button_styles` accepte une classe CSS ou un numéro natif, avec `color`, `background`, `opacity` et `icon`, dont les valeurs peuvent utiliser Jinja.

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

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

- **1.0.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

### 1.0.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

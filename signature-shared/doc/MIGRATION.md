# Migrer vers les modules Signature autonomes

**Signature Compact 1.1.0** et **Square, Room et Header 1.0.0** sont autonomes. Le module historique **Signature 2.3.3** est conservé sans modification de sa distribution. Les dashboards existants continuent de l’utiliser jusqu’à leur migration volontaire.

| Configuration actuelle | Nouveau module | Nouvelle clé des options |
|---|---|---|
| `signature: layout: square` | `signature_square` | `signature_square` |
| `signature: layout: compact`, ou layout absent | `signature_compact` | `signature_compact` |
| `signature: layout: room` | `signature_room` | `signature_room` |
| `signature: layout: header` sur bouton Nom | `signature_header` | `signature_header` |
| `signature: layout: title` sur séparateur | `signature_header` | Aucune option obligatoire |
| Carte `media-player` | `signature_compact` | `signature_compact` |

Les cartes `cover`, `climate` et les boutons `switch` utilisent actuellement la présentation compacte même si un autre layout est demandé : migrer ces cartes vers **Signature Compact**. Un ancien header sur bouton État retombe aussi en compact. Les nouveaux modules refusent les types incompatibles au lieu de changer leur présentation.

Pour un lecteur multimédia, renommer `signature` en `signature_compact` dans `modules` et dans la clé des options ; conserver `color` et `color_background`. Les réglages natifs Bubble, la pochette, les dimensions et les commandes restent identiques. Compact n’applique pas sa hauteur de 56 px au lecteur. Le module historique reste utilisable si la carte n’est pas encore migrée.

1. Importer les nouvelles distributions depuis leurs dossiers `dist`.
2. Sur chaque carte choisie, remplacer le module de présentation dans `modules`.
3. Renommer la clé de ses options et retirer `layout`. Conserver uniquement les options utiles à cette présentation.
4. Conserver les entités, les actions, les sous-boutons et `alert_manager`.
5. Recharger le dashboard, puis vérifier la carte et ses commandes dans Home Assistant.

Avant :

```yaml
modules:
  - signature
  - alert_manager
signature:
  layout: room
  color: teal
  room_control_columns: 4
```

Après :

```yaml
modules:
  - signature_room
  - alert_manager
signature_room:
  color: teal
  room_control_columns: 4
```

Utiliser un seul module de présentation sur chaque carte ; l’ancien `signature` et les nouveaux modules peuvent rester installés simultanément et être utilisés sur des cartes différentes. Leur éditeur conserve les options directement sous la clé du module. Les noms d’options métier restent les mêmes. Les variables du thème conservent leur préfixe `signature-*`.

Le module Header distingue automatiquement un bouton Nom et un séparateur. Il expose la couleur et le style des pilules du grand en-tête ; un séparateur conserve ses réglages natifs Bubble. Le thème fournit aussi `signature-header-font-size`, `signature-header-small-font-size`, `signature-title-font-size` et `signature-header-button-border-radius`. Ces quatre nouvelles variables concernent Signature Header ; elles ne modifient pas le rendu du module historique.

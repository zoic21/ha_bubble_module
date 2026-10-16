# Signature Group

Version **1.0.0**. Module de comportement autonome pour Bubble Card **3.4.1 ou ultérieur**, à ajouter à une popup et à son bouton de synthèse. Les cartes et leurs conditions restent définies une seule fois dans la popup. Le bouton conserve sa présentation et ses actions natives ; `signature_compact` fournit l’apparence des exemples.

Importer [signature-group.yaml](../dist/signature-group.yaml) dans l’éditeur des modules Bubble. Voir l’[exemple complet](../examples/activities.yaml), contenant les deux cartes séparées par `---`.

## Configuration

Sur la popup :

```yaml
type: custom:bubble-card
card_type: pop-up
hash: '#activites'
name: Activités
background_update: true
modules: [signature_group]
cards: [] # Ajouter ici les cartes et leurs conditions visibility habituelles.
```

`background_update: true` initialise le module source même si la popup n’a jamais été ouverte. La source et le bouton doivent se trouver dans la même vue, avec un hash unique. Le module ne recherche pas d’autres cartes dans le DOM ou la configuration Lovelace. La popup reste une popup native et garde la gestion native du cycle de vie de ses cartes.

Sur le bouton :

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Activités
icon: mdi:pulse
show_state: false
scrolling_effect: false
button_action:
  tap_action:
    action: navigate
    navigation_path: '#activites'
modules: [signature_compact, signature_group]
signature_group:
  max_names: 2
```

L’identifiant est repris de l’action native : inutile de le saisir deux fois. Le bouton de synthèse est un bouton Nom, sans sous-boutons ; placer `signature_group` après son module de présentation. Le module ne remplace aucune action, y compris maintien et double appui.

| Option du bouton | Défaut | Rôle |
|---|---|---|
| `popup` | Destination native de l’action tap | Hash explicite si la source n’est pas la destination tap ; ne modifie pas l’action native |
| `max_names` | `2` | De 0 à 5 noms, puis `+N` pour les suivants |

Le compteur inclut chaque carte dont les conditions sont remplies, même si l’équipement est au repos. Avec deux noms autorisés : `H2S, Télévision +2`. Sans élément : `0` et « Aucune activité » ; la popup affiche également ce message. Une source absente ou non initialisée affiche `—` et « Popup non initialisée », sans inventer un zéro.

## Conditions et noms

- Les conditions `visibility` des cartes et de leurs conteneurs sont cumulées. Les cartes natives `conditional` sont dépliées en conservant leurs conditions.
- Les listes `cards` des grilles et piles sont parcourues. Les séparateurs Bubble, titres natifs `heading`, blocs `markdown` et popups imbriquées ne comptent pas. Les autres cartes terminales comptent chacune une fois ; les sous-boutons ne sont pas des activités supplémentaires.
- L’évaluation est déléguée à `checkConditionsMet`, fourni par Bubble, avec les mêmes limites documentées par Bubble pour les conditions côté navigateur. Une condition état/numérique sans entité reprend celle de la carte concernée. Les templates Jinja doivent référencer explicitement leurs entités.
- Le nom utilise `name`, puis `title`, puis le nom convivial de l’entité. Jinja est rendu par le mécanisme natif Bubble avec l’entité de la carte. Le texte est écrit via `textContent` : aucun HTML provenant d’un état ou d’un nom n’est interprété.
- Le nombre correspond aux cartes dont les conditions de configuration sont satisfaites. Un masquage effectué uniquement par du CSS, par le code d’une autre carte ou par un mécanisme dynamique propre à une carte personnalisée n’est pas pris en compte.

## Fonctionnement et style

Un registre en mémoire, limité au chemin de la vue et au hash, relie la source aux boutons. Les boutons lisent les états via le `hass` suivi par Bubble ; aucune requête d’historique, aucun abonnement serveur propre au module, aucun balayage du DOM ni polling n’est ajouté. Les templates utilisent les abonnements déjà fournis par Bubble. Un changement de configuration de la source réveille ses boutons via une microtâche coalescée. Le hook natif `onTeardown` nettoie les références, les rappels et les nœuds à la suppression ou au remplacement d’une distribution.

Le résumé utilise le rôle secondaire Signature, 13 px par défaut, et une ellipse sur une ligne. Le compteur neutre est de 28 px, avec une valeur de 14 px. Les couleurs restent des variables CSS pour suivre le thème sans reconstruction. Aucun équipement, condition métier, helper ou script propre à une installation n’est embarqué dans le module.

Modifier `src`, puis lancer `npm run build:modules`, `npm run check:modules`, `npm test` et `npm run test:styles`. Les suites de fixtures ne constituent pas un essai dans Home Assistant réel ni Safari/iOS.

## Historique

- **1.0.0** : source unique dans une popup, compteur et résumé sur un bouton, conditions natives et états vides, mise à jour avant première ouverture, nettoyage à la suppression.

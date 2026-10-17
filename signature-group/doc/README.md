# Signature Group

Version **1.1.0**. Module autonome pour Bubble Card **3.4.1 ou ultérieur**, à ajouter à une popup et à son bouton de synthèse. Les cartes et leurs conditions restent définies une seule fois dans la popup. Les actions natives sont conservées ; `signature_compact` fournit la surface et la hauteur des exemples.

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
  hide_empty: true
```

L’identifiant est repris de l’action native : inutile de le saisir deux fois. Le bouton de synthèse est un bouton Nom, sans sous-boutons ; placer `signature_group` après son module de présentation. Le module ne remplace aucune action, y compris maintien et double appui.

| Option du bouton | Défaut | Rôle |
|---|---|---|
| `popup` | Destination native de l’action tap | Hash explicite si la source n’est pas la destination tap ; ne modifie pas l’action native |
| `presentation` | `summary` | Résumé classique ou `chips` pour des pastilles illustrées adaptatives |
| `max_names` | `2` | Résumé classique uniquement : de 0 à 5 noms, puis `+N` pour les suivants |
| `hide_empty` | `false` | Masque le bouton et son emplacement lorsqu’aucune carte ne remplit ses conditions, hors mode édition |

Le compteur inclut chaque carte dont les conditions sont remplies, même si l’équipement est au repos. Avec deux noms autorisés : `H2S, Télévision +2`. Sans élément : `0` et « Aucune activité » ; la popup affiche également ce message. Avec `hide_empty: true`, une source connue sans élément masque le bouton via le contrat natif Home Assistant (`hidden`, `connectedWhileHidden` et `card-visibility-changed`). Le bouton reste connecté pour recevoir les changements d’état et réapparaître ; aucun helper ni recopie de conditions n’est nécessaire. En mode édition, le bouton reste disponible et la popup conserve uniquement son placeholder natif : le message vide n’y est pas ajouté. Une source absente ou non initialisée affiche `—` et « Popup non initialisée », sans inventer un zéro.

## Pastilles illustrées adaptatives

Sur le même bouton, utiliser :

```yaml
show_icon: false
show_name: false
signature_group:
  presentation: chips
  hide_empty: true
```

Le module masque le titre, l’icône principale et le compteur total de sa
présentation classique. Les pastilles commencent à gauche ; la flèche reste
à droite. Leur nombre dépend de la largeur réelle, des noms et de la police,
sans seuil téléphone/ordinateur ni nombre maximal arbitraire. Si tout tient,
aucun compteur n’est affiché. Sinon, `+N` compte uniquement les éléments
masqués et précède la flèche : six pastilles et `+4` représentent dix cartes.
Une pastille partiellement visible est entièrement masquée ; si aucune ne
tient, seul `+N` reste à côté de la flèche. L’ordre reste celui de la popup.

Le cadre compact reste haut de 56 px, avec des pastilles de 36 px, des
illustrations fixes de 32 px et 8 px entre pastilles. Les noms longs sont
tronqués dans une pastille limitée à 180 px. La liste complète reste dans
l’infobulle et le libellé accessible. Le message vide ou non initialisé est
conservé ; `hide_empty` continue de gérer le masquage natif de la carte.

Chaque illustration vient de `signature_square.illustration` ou
`signature_room.illustration` sur la carte source. Les URL clair/sombre,
dimensions de planche, index et décalages de cadrage suivent leur contrat
existant ; Square reprend aussi `index_dark` et `offset_y_dark`. Le thème HA
effectif sélectionne la variante. Sans image valide, l’icône de la carte ou
de son entité est utilisée. Les images restent dans les fichiers de
l’installation ; aucune liste ni illustration n’est copiée dans le bouton.

Toutes les pastilles, le compteur et la flèche sont descriptifs : le clic
traverse vers la surface native qui ouvre la popup. Aucun appui ne commande
directement un équipement. Les maintiens et doubles appuis restent natifs.
Un unique `ResizeObserver` local surveille la piste, la liste et le compteur ;
les mesures sont regroupées dans une frame. Aucun polling ni écouteur global.
Le retrait du mode, le remplacement de version et le teardown annulent la
frame, déconnectent l’observateur et retirent les nœuds ajoutés. Le résumé
classique reste le défaut, sans observateur de dimension.

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

- **1.1.0** : présentation `chips`, illustrations héritées de la popup, adaptation à la largeur réelle, compteur des seuls éléments masqués et flèche fixe ; résumé classique conservé par défaut.
- **1.0.1** : option de masquage natif des groupes vides, réapparition aux changements d’état et retrait du message vide dans l’éditeur de popup.
- **1.0.0** : source unique dans une popup, compteur et résumé sur un bouton, conditions natives et états vides, mise à jour avant première ouverture, nettoyage à la suppression.

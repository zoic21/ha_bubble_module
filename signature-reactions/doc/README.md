# Signature Reactions

Version **1.0.1**, Bubble Card **3.4.3 ou plus récent**.

Module facultatif sans élément visuel : exécuter des actions Home Assistant
dans l’interface lorsqu’un template Jinja devient vrai, qu’une entité reçoit
une nouvelle occurrence, qu’un événement arrive ou que l’écran reste inutilisé.
Il fonctionne avec les cartes existantes et peut accompagner Signature Navigation.

## Installation

1. Importer le fichier complet [signature-reactions.yaml](../dist/signature-reactions.yaml)
   dans les modules Bubble.
2. Ajouter `signature_reactions` à une carte Bubble existante sur chaque vue
   concernée, y compris la destination temporaire. Une barre de navigation
   existante est un bon support ; elle conserve son module et son apparence.
3. Dans **Modules → Signature Reactions**, sélectionner les comptes concernés
   et ajouter les règles dans le formulaire français. Les actions utilisent
   le sélecteur natif HA, comme un `tap_action`.
4. Conserver les mêmes `scope` et règles sur les vues concernées, puis recharger.

Ce module ne crée pas de carte, vue vidéo, ressource frontend séparée ou
intégration. L’[exemple tablette](../examples/tablet.yaml) est un fragment à
ajouter à une carte existante : sonnette 60 s, retour Aperçu, inactivité 300 s.
La page Sonnette et ses boutons restent à configurer dans le dashboard.

## Ciblage et coût

`users` contient les **identifiants des utilisateurs HA**, pas leurs noms ou
les entités `person`. Une liste vide ou absente cible toutes les sessions :
choisir explicitement le compte Tablette pour cet usage.

Avant toute lecture d’état, parsing des règles actives, abonnement ou écoute,
le runtime vérifie l’identité courante et le ciblage. Un compte exclu, une
identité non chargée, un module désactivé et une prévisualisation d’éditeur ne
créent aucun abonnement Jinja/événement, écouteur d’interaction ou timer.
`users` et `enabled: false` sont aussi possibles par règle en YAML ; ils sont
filtrés avant les abonnements. L’énumération des comptes est réservée au
formulaire avec un administrateur, jamais au runtime.

Une session partage ses règles par **connexion, utilisateur et `scope`**.
Deux copies identiques n’exécutent pas deux fois l’action ; un même template
ou type d’événement n’a qu’un abonnement dans cette portée. Des copies
différentes dans une portée active sont ignorées avec un avertissement.
Utiliser un autre scope uniquement pour un groupe réellement indépendant.

Les templates suivent les dépendances côté serveur via `render_template`.
Les entités réutilisent les dépendances suivies par Bubble, sans abonnement
global `state_changed` supplémentaire et sans polling. Les interactions ne
modifient qu’un horodatage : un déplacement de pointeur ne reconstruit pas
les timers. Les délais ne sont pas réinitialisés par les mises à jour HA.

## Configuration

```yaml
modules:
  - signature_navigation
  - signature_reactions
signature_reactions:
  users: [TABLET_USER_ID]
  scope: tablet
  rules:
    - id: show-warning
      trigger: template
      template: "{{ is_state('binary_sensor.warning', 'on') }}"
      action:
        action: navigate
        navigation_path: /lovelace/warning
      return_after: 60
      return_mode: previous
```

Chaque règle doit avoir un `id` unique et une `action` au format natif.

| Option | Fonction / valeur par défaut |
|---|---|
| `enabled` | Actif sauf `false` ; possible au niveau du module et de chaque règle |
| `users` | Comptes ciblés ; vide = tous ; une sélection par règle restreint encore celle du module |
| `scope` | Groupe partagé entre vues ; `main` par défaut |
| `rules` | Liste des règles ; absence = aucun travail runtime |
| `trigger` | `template`, `entity`, `event` ou `idle` |
| `template` | Jinja du déclencheur `template` ; variable `user_id` disponible |
| `fire_on_load` | Déclencher si le premier résultat est déjà vrai ; `false` par défaut |
| `entity` | Entité à observer ; sert aussi de cible par défaut aux actions natives |
| `entity_event_type` | Filtre facultatif de l’attribut `event_type` de l’entité, par exemple `ring` |
| `event_type` | Nom de l’événement bus pour `trigger: event` |
| `event_data` | Filtre partiel des données, avec objets imbriqués et valeurs exactes |
| `seconds` | Durée sans interaction pour `idle`, de 1 à 86 400 secondes |
| `action` | Objet au format d’un `tap_action` HA |
| `delay` | Secondes avant l’action ; 0 par défaut ; maximum 86 400 |
| `return_after` | Retour après ce nombre de secondes ; 0/absent = désactivé ; maximum 86 400 |
| `return_mode` | `previous` (défaut, navigation seulement) ou `action` |
| `return_action` | Action native exécutée au retour avec `return_mode: action` |
| `return_on_false` | Retour aussi lorsque le template redevient faux ; `false` par défaut |

### Templates

Déclenchement au passage **faux → vrai**, pas à chaque mise à jour pendant
que la condition est vraie. Les valeurs vraies reconnues sont `true`, `on`,
`yes`, `1` et les booléens/nombres correspondants. Un résultat initial est
une référence, sauf `fire_on_load: true`. Une reconnexion réinitialise cette
référence sans rejouer le résultat déjà vrai. Une erreur de template annule
une action retardée et ne déclenche pas d’action.

### Entités et événements répétés

`trigger: entity` observe un **changement de l’état**, pas seulement des
attributs. L’état d’une entité `event.*` contient l’horodatage de sa dernière
occurrence : deux sonneries `ring` successives sont donc distinctes. Les
entités inexistantes/indisponibles ne déclenchent pas ; leur récupération
fournit une nouvelle référence. Le chargement d’une ancienne valeur ne joue
pas à nouveau une sonnerie. Ce mécanisme convient aussi à un compteur relais.

### Événements bus et relais non administrateur

Un compte administrateur peut utiliser directement :

```yaml
- id: received-bell
  trigger: event
  event_type: signature_reaction
  event_data: {name: doorbell}
  action:
    action: navigate
    navigation_path: /lovelace/sonnette
  return_after: 60
```

HA interdit l’abonnement à un événement bus personnalisé aux comptes non
administrateurs. Le module détecte ce cas **avant toute demande** et indique
d’utiliser le [relais Template natif](../examples/event-relay.yaml).
Un seul capteur relaie tous les événements `signature_reaction` avec un
compteur d’occurrences et leurs données dans `attributes.data`. L’automatisation
continue à émettre des événements ordinaires ; la règle utilise `trigger: entity`.
Le filtre `event_data` s’applique au contenu de `data` du relais ; pour une
entité événement sans cet attribut, il s’applique à ses attributs.

Une chaîne Jinja dans les paramètres d’une action est rendue **une seule fois
au déclenchement**, avec `event.data` et `user_id` disponibles. Les types
renvoyés par HA sont conservés. Exemple :

```yaml
action:
  action: navigate
  navigation_path: "{{ event.data.path }}"
```

Une action sans Jinja ne crée aucun abonnement supplémentaire. Les abonnements
ponctuels sont fermés dès leur résultat, annulation ou expiration de 10 s.
Le relais n’est pas une file de messages : un écran déconnecté ne rejoue pas
une commande ancienne. Les destinations de navigation restent internes à HA.

## Temporisations et retour

Une nouvelle occurrence de la même règle redémarre son `delay` puis son
`return_after`. Si son affichage temporaire est déjà ouvert, la page d’origine
reste celle capturée avant la première occurrence. Un template redevenu faux
annule l’action encore retardée ; `return_on_false` peut également terminer
l’affichage temporaire.

Le retour `previous` mémorise explicitement chemin, paramètres et hash, sans
utiliser aveuglément `history.back()`. Un changement volontaire de destination
annule le retour : l’utilisateur n’est pas ramené ailleurs après avoir quitté
la page. Un retour fixé utilise n’importe quelle `return_action` native.
Pour fermer une popup Bubble, cette action peut naviguer vers `#` ou une vue.
Pour un `more-info`, prévoir une action de retour explicite ; aucune fermeture
arbitraire de dialogue HA n’est inventée.

Une session possède un seul retour temporaire actif : un nouveau le remplace.
L’inactivité est suspendue pendant ce retour, puis repart pour une période
complète à sa fin. Une règle `idle` s’exécute une fois par période d’inactivité,
puis se réarme à la prochaine interaction. Clavier, pointeur, toucher et
défilement comptent ; les mises à jour des entités n’en sont pas.

Les écouteurs sont passifs et ne bloquent aucun geste. Aucun appel ne contourne
les confirmations HA ou les protections d’un module sur la carte porteuse.
Installer de préférence Reactions sur une barre non protégée : une action
interceptée par un PIN n’a pas d’accusé d’exécution permettant d’armer son retour.
L’ouverture d’URL externes, le microphone et d’autres API du navigateur peuvent
demander un geste humain même avec une configuration d’action native.

## Cycle de vie et limites

Les cartes d’une même session se relaient avec une grâce de nettoyage de
20 secondes, comme le cache Jinja natif de Bubble. Sans carte connectée,
aucune nouvelle action n’est exécutée. Sans reprise dans cette fenêtre,
abonnements, écouteurs et timers sont détruits. Une désactivation ou exclusion
du compte nettoie immédiatement la dernière instance. La version, la connexion
et l’utilisateur font partie de l’identité runtime.

Une navigation SPA entre vues portant le module conserve les délais. Un
rechargement complet redémarre la session : pas de timer restauré depuis un
ancien écran. L’application doit rester au premier plan et connectée ; le
module ne réveille pas une app suspendue par iPadOS.

Les actions sont exécutées **par session ciblée**. Le partage élimine les
doublons de cartes, pas ceux de deux appareils connectés avec le même compte.
Pour une commande physique devant se produire une seule fois pour toute la
maison, laisser cette commande à l’automatisation serveur ; Reactions pilote
son affichage. Aucune garantie d’exécution globale unique n’est annoncée.

## Vérification

```sh
npm run build:modules
npm run check:modules
npm run test:signature-reactions
```

Les tests exécutent la distribution minifiée avec horloge contrôlée et
connexion HA simulée : ciblage sans aucun travail, abonnement partagé,
déclenchements, délai, retour, inactivité, données d’événement, révocation,
reconnexion et nettoyage des abonnements asynchrones. Les formulaires utilisent
les helpers de test communs. Ces contrôles ne constituent pas un essai dans
Home Assistant réel ou Safari/iPadOS.

La fixture `styles/test/reactions.browser.cjs` charge aussi Bubble Card 3.4.3
réel avec un backend simulé : compte exclu sans abonnement, partage entre
cartes, actions natives, relais entre vues et dépendances d’une entité. Elle
est exécutée par la CI avec le script Bubble épinglé déjà utilisé par PIN.

### 1.0.1

Une mise à jour d’entité plus ancienne, reçue depuis une autre carte pendant
un changement de vue, est ignorée selon son horodatage HA. Le test de snapshots
intercalés vérifie qu’elle ne rejoue pas une occurrence précédente.

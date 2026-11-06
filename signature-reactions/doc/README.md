# Signature Reactions

Version **2.1.0**, Bubble Card **3.4.3 ou plus récent**.

Module facultatif sans élément visuel : exécuter des actions Home Assistant
dans l’interface lorsqu’un template Jinja devient vrai ou change de valeur, qu’un événement arrive
sur le bus HA pour un administrateur ou que l’écran reste inutilisé.
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
4. Conserver les mêmes règles sur les vues concernées, puis recharger.
   Aucun identifiant, nom, groupe ou indicateur d’activation à renseigner.

Ce module ne crée pas de carte, vue vidéo, ressource frontend séparée ou
intégration. L’[exemple tablette](../examples/tablet.yaml) est un fragment à
ajouter à une carte existante : sonnette 60 s, retour Aperçu, inactivité 300 s.
Cet exemple utilise un **compte administrateur** pour écouter le bus HA.
L’[action événement](../examples/event.yaml) s’ajoute à l’automatisation qui
réagit à la sonnerie ; aucun capteur intermédiaire n’est nécessaire.
L’[exemple Jinja](../examples/template.yaml) fonctionne aussi pour les comptes
non administrateurs. La page Sonnette et ses boutons restent à configurer.

## Ciblage et coût

`users` contient les **identifiants des utilisateurs HA**, pas leurs noms ou
les entités `person`. Une liste vide ou absente cible toutes les sessions :
choisir explicitement le compte Tablette pour cet usage.

Avant tout parsing des règles actives, abonnement ou écoute,
le runtime vérifie l’identité courante et le ciblage. Un compte exclu, une
identité non chargée, un module désactivé et une prévisualisation d’éditeur ne
créent aucun abonnement Jinja/événement, écouteur d’interaction ou timer.
Une sélection `users` par règle peut restreindre celle du module ; elle est
filtrée avant les abonnements. Les règles `event` sont écartées pour les non
administrateurs avant de lire leur nom d’événement ou leurs actions. Un compte
qui n’a aucune règle autorisée ne crée aucun runtime ni écouteur. Ce résultat
est mémorisé tant que la configuration, la connexion et le rôle restent les
mêmes : une mise à jour HA ne reparcourt pas ces règles inactives.
L’énumération des comptes est réservée au formulaire avec un administrateur,
jamais au runtime.

Le partage est **automatique par connexion, utilisateur et contenu des règles**.
Deux copies identiques n’exécutent pas deux fois l’action ; un même template
ou type d’événement n’a qu’un abonnement dans ce groupe. L’ordre des clés YAML
et les anciens identifiants n’interviennent pas ; les règles identiques répétées
sont dédupliquées. Des configurations différentes peuvent coexister. Pour
conserver les délais entre vues, copier la liste complète dans le même ordre.
Deux listes différentes ayant seulement certaines règles en commun restent
indépendantes : elles ne sont pas fusionnées.

Les templates suivent les dépendances côté serveur via `render_template`.
Le module ne suit plus d’entité et ne lit pas leurs états dans le navigateur.
Aucun abonnement global `state_changed` n’est créé implicitement, ni aucun
polling. Les interactions ne modifient qu’un horodatage : un déplacement
de pointeur ne reconstruit pas les timers. Les durées sont calculées une seule fois à la création des règles.
Les gestes ordinaires ne parcourent pas la liste des règles ; un réarmement
après inactivité ne concerne que les règles d’inactivité. Les délais ne sont
pas réinitialisés par les mises à jour HA. Les écouteurs de navigation sont
installés seulement lorsqu’un retour est configuré.

## Configuration

```yaml
modules:
  - signature_navigation
  - signature_reactions
signature_reactions:
  users: [TABLET_USER_ID]
  rules:
    - trigger: template
      template: "{{ is_state('binary_sensor.warning', 'on') }}"
      action:
        action: navigate
        navigation_path: /lovelace/warning
      return_after: 60
```

Chaque règle associe un déclencheur à une `action` au format natif. Aucun
`id`, nom, `scope` ou `enabled` n’est nécessaire : ajouter ou retirer le module
suffit pour activer ou arrêter ses réactions. Le formulaire regroupe les
temporisations et retours dans une section repliable ; les filtres sont avancés.
Le choix du retour est propre au formulaire et n’ajoute aucune clé YAML.

| Option | Fonction / valeur par défaut |
|---|---|
| `users` | Comptes ciblés ; vide = tous ; une sélection par règle restreint encore celle du module |
| `rules` | Liste des règles ; absence = aucun travail runtime |
| `trigger` | `template`, `event` ou `idle` |
| `template` | Jinja du déclencheur `template` ; variable `user_id` disponible |
| `on_change` | Pour un template, déclencher sur une nouvelle valeur texte ou numérique ; `false` par défaut |
| `fire_on_load` | Déclencher si le premier résultat est actif dans le mode choisi ; `false` par défaut |
| `event_type` | Nom de l’événement du bus HA à écouter, administrateur seulement |
| `event_data` | Filtre partiel des données, avec objets imbriqués et valeurs exactes |
| `seconds` | Durée sans interaction pour `idle`, de 1 à 86 400 secondes |
| `action` | Objet au format d’un `tap_action` HA |
| `delay` | Secondes avant l’action ; 0 par défaut ; maximum 86 400 |
| `return_after` | Retour après ce nombre de secondes ; 0/absent = désactivé ; maximum 86 400 |
| `return_action` | Action native du retour ; absente = page précédente, pour une action de navigation |
| `return_on_false` | Retour aussi lorsque le résultat devient faux ou vide selon le mode du template ; `false` par défaut |

### Templates

Par défaut, déclenchement au passage **faux → vrai**, pas à chaque mise à jour pendant
que la condition est vraie. Les valeurs vraies reconnues sont `true`, `on`,
`yes`, `1` et les booléens/nombres correspondants. Un résultat initial est
une référence, sauf `fire_on_load: true`. Une reconnexion réinitialise cette
référence sans rejouer le résultat déjà vrai. Une erreur de template annule
une action retardée et ne déclenche pas d’action.

Avec `on_change: true`, le template déclenche une action à chaque nouveau
texte non vide ou nombre fini. Un premier résultat sert de référence par
défaut. Une valeur vide ou `none` laisse en mémoire la dernière valeur et
annule une action retardée. Après une reconnexion, le premier résultat sert
de nouveau de référence. Un compte non administrateur peut ainsi réagir à
l’horodatage d’une entité `event.*` exposée par une intégration.

### Événements du bus HA — administrateurs

Le déclencheur `event` écoute uniquement le bus général Home Assistant. Le nom
et les données sont libres ; aucune entité source ou commune n’est utilisée.

Une automatisation ou un script peut émettre :

```yaml
- event: signature_reaction
  event_data:
    name: doorbell
    path: /lovelace/sonnette
```

Le module écoute par exemple :

```yaml
- trigger: event
  event_type: signature_reaction
  event_data: {name: doorbell}
  action:
    action: navigate
    navigation_path: /lovelace/sonnette
  return_after: 60
```

`event_data` filtre partiellement les données reçues, y compris les objets
imbriqués. Sans filtre, chaque événement de ce nom est accepté. Deux messages
identiques successifs restent deux occurrences et relancent le délai.

Un compte non administrateur utilise des règles `template` et/ou `idle` :
aucun abonnement au bus ni mécanisme de relais n’est ouvert pour lui. Les
administrateurs peuvent également utiliser les templates. Un changement de
rôle nettoie les abonnements devenus interdits et les actions en attente.

Pour réagir à chaque sonnerie, utiliser le bus avec un administrateur ou un
template `on_change` qui renvoie l’horodatage de chaque appui.

Une chaîne Jinja dans les paramètres d’une action est rendue **une seule fois
au déclenchement**, avec `event.data` et `user_id` disponibles. Les types
renvoyés par HA sont conservés. Exemple :

```yaml
action:
  action: navigate
  navigation_path: "{{ event.data.path }}"
```

La détection Jinja réutilise le helper commun du dépôt et est préparée une
fois pour chaque action. Une action sans Jinja est transmise directement au
gestionnaire natif HA, sans reconstruire ses paramètres à chaque déclenchement.
Le template d’une action de retour n’est rendu que si ce retour est activé.
Les abonnements
ponctuels sont fermés dès leur résultat, annulation ou expiration de 10 s.
Un événement reçu pendant une déconnexion n’est pas rejoué au retour. Les
destinations de navigation restent internes à HA.

## Temporisations et retour

Une nouvelle occurrence de la même règle redémarre son `delay` puis son
`return_after`. Si son affichage temporaire est déjà ouvert, la page d’origine
reste celle capturée avant la première occurrence. Un template redevenu faux
annule l’action encore retardée ; `return_on_false` peut également terminer
l’affichage temporaire.

Sans `return_action`, le retour mémorise explicitement chemin, paramètres et hash, sans
utiliser aveuglément `history.back()`. Un changement volontaire de destination
annule le retour : l’utilisateur n’est pas ramené ailleurs après avoir quitté
la page. Un retour fixé utilise n’importe quelle `return_action` native, sans champ de mode supplémentaire.
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
reconnexion et nettoyage des abonnements asynchrones. Ils vérifient aussi
1 000 mises à jour HA sans relire une configuration inactive, le changement de
carte porteuse, l’annulation d’un ancien rendu Jinja et la poursuite du nettoyage
même lorsqu’une fonction de désabonnement échoue. Les formulaires utilisent
les helpers de test communs. Ces contrôles ne constituent pas un essai dans
Home Assistant réel ou Safari/iPadOS.

La fixture `styles/test/reactions.browser.cjs` charge aussi Bubble Card 3.4.3
réel avec un backend simulé : compte exclu sans abonnement, partage entre
cartes, actions natives, retours entre vues et absence d’abonnement au bus
pour les non-administrateurs. Elle est exécutée par la CI avec le script Bubble épinglé déjà utilisé par PIN.

### 2.1.0 — nouvelle valeur de template

- Les règles Jinja avec `on_change: true` réagissent à chaque nouvelle valeur,
  notamment l’horodatage d’une sonnerie fourni par une intégration.

### 2.0.1 — simplification et coût d’exécution

- Actualisations HA actives ou inactives traitées sans reparcourir les règles ;
  le démarrage de session n’est plus rappelé à chaque mise à jour.
- Gestes ordinaires limités à la vérification du porteur et à l’horodatage ;
  règles d’inactivité indexées, durées précalculées et porteur actif mémorisé.
- Actions statiques réutilisées et détection Jinja commune ; aucun rendu d’une
  action de retour si le retour est désactivé.
- Écouteurs de navigation conditionnels, retrait d’états de retour inutilisés
  et nettoyage des abonnements regroupé et tolérant aux erreurs.
- Format YAML et formulaire inchangés depuis 2.0.0.

### 2.0.0 — migration

- Événements du bus HA réservés aux administrateurs ; templates Jinja et
  inactivité disponibles pour tous les comptes ciblés.
- Suppression de la source entité, du sélecteur de source et de l’exemple de
  capteur commun. Aucune lecture d’état ni suivi d’entité côté navigateur.
- Les abonnements sont initialisés une fois ; les actualisations ordinaires
  n’itèrent plus sur les règles pour observer des états.
- Révocation des abonnements et des actions différées si le compte perd ses
  droits administrateur.

**Les anciennes règles `trigger: entity`, et les règles `event` avec seulement
une source `entity`, ne s’exécutent plus.** Les remplacer par `event_type` et
un compte administrateur, ou par une condition `template` pour un compte non
administrateur. Les paramètres de source d’entité ne font plus partie du
format. L’éditeur les retire lorsque la règle est modifiée.

Les anciens `id`, nom et `scope` restent ignorés. `return_mode` est encore
compris, et un ancien `enabled: false` reste respecté. Réimporter le module puis
recharger l’interface après la migration.

### Versions précédentes

1.1.1 a regroupé les filtres dans `event_data`. 1.1.0 a rendu les règles
anonymes, le partage automatique et les retours déduits de `return_action`.
Ces versions acceptaient encore les sources d’entité, retirées en 2.0.0.

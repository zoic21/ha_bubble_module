# Signature PIN

Version **1.0.1** — Bubble Card **3.4.3 ou plus récent**.

Ajoute le clavier numérique de Signature à **toutes les actions d’une carte**,
avec une sélection facultative des utilisateurs concernés. Peut être combiné
avec les présentations Signature ou utilisé seul sur une carte Bubble native.

## Installation et formulaire

Importer [signature-pin.yaml](../dist/signature-pin.yaml) dans Bubble Card,
puis ajouter **Signature PIN** aux modules de la carte. Son formulaire propose :

| Réglage | Fonction |
|---|---|
| Activer la demande de code | Actif par défaut ; désactiver conserve les autres réglages |
| Code PIN | Champ masqué, chiffres uniquement ; les zéros initiaux sont conservés |
| Demander le code à ces utilisateurs | Sélection multiple des comptes Home Assistant par leur nom ; liste vide = tout le monde |

La liste des comptes est chargée uniquement dans l’éditeur, avec un compte
administrateur. Les identifiants sélectionnés sont enregistrés dans la carte.
Sur la tablette, le module utilise seulement l’identité de la session courante :
aucun droit d’administration ni accès à la liste des comptes n’est nécessaire.
Les identifiants peuvent aussi être saisis manuellement si la liste est indisponible.
L’ouverture du formulaire ne modifie pas la configuration.

## Exemple : uniquement la tablette

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: input_select.mode
modules:
  - signature_compact
  - signature_pin
signature_pin:
  code: "0073"  # Exemple : choisir votre propre code dans le formulaire.
  users:
    - ID_UTILISATEUR_TABLETTE
```

Conserver les entités et les actions réelles de la carte ; l’exemple n’en crée
aucune. Le compte tablette est un **compte de connexion HA**, distinct d’une
entité `person` ou d’un détecteur de présence. Le même compte sur un autre
appareil demandera aussi le code. Les autres comptes gardent l’accès direct.

## Comportement

- Chaque action demande le PIN ; aucune période de déverrouillage et aucun filtre d’action.
- Appui simple, double et long, icône, fond, valeurs et sous-boutons sont concernés, y compris navigation et détails.
- Les commandes natives qui appellent directement HA sont également protégées : boutons de volets et média, listes de choix, thermostat et curseurs.
- Une validation correcte reprend uniquement la commande demandée, avec ses paramètres et sa cible d’origine. Le PIN local n’est pas ajouté aux données du service.
- Un code incorrect conserve la fenêtre ouverte et efface la saisie. Annuler ou Échap avant validation n’exécute rien.
- Une commande en attente n’autorise pas d’autres commandes. Une modification de configuration, d’identité ou une destruction de carte invalide la demande.
- Les automatismes HA, la géolocalisation, les boutons physiques et les autres cartes ne sont pas modifiés.

### Ouverture de « Plus d’infos »

La protection comprend aussi l’action `more-info` et l’événement natif
`hass-more-info`. Pour un utilisateur concerné, le PIN doit être validé avant
l’ouverture de la fenêtre de détails, depuis l’icône, le fond, une valeur ou
un sous-bouton de la carte. Un code incorrect ou une annulation laisse cette
fenêtre fermée. Les utilisateurs exemptés et les cartes dont la protection est
désactivée gardent leur accès direct. Ce comportement est déjà inclus dans
Signature PIN 1.0.1 ; ces précisions ne demandent pas de nouvelle importation.

Le clavier reprend les touches rondes 1–9, puis effacer, 0 et ✓, le champ
masqué, l’œil et la fermeture en haut. Le champ numérique en lecture seule
évite le clavier système de la tablette. Le clavier physique conserve chiffres,
Retour arrière, Suppr et Entrée. Clair/sombre et variables Signature restent
pilotés par le thème en CSS.

## Alarme et migration depuis Panel

À partir de **Panel 1.4.23**, le module de présentation ne gère plus de code.
Retirer `signature_panel.alarm_code` des anciennes cartes, ajouter `signature_pin`
et configurer le PIN et les comptes dans son formulaire. Le clavier et sa
vérification appartiennent exclusivement à Signature PIN, qui reste autonome.

Le nouveau PIN est vérifié **dans le navigateur**. Pour une alarme dont le
template HA exige encore un code, retirer séparément cette exigence après
avoir configuré et vérifié les cartes protégées. Une alarme conservant sa
propre exigence côté serveur continuera à l’appliquer ; ce module ne la supprime
pas et ne lui transmet pas automatiquement le PIN local.

## Portée et contrôles

Le code reste dans la configuration de la carte et peut être retrouvé en
inspectant le navigateur. Ce module est un verrou d’usage du dashboard, pas
un contrôle d’accès serveur. Il ne protège pas les commandes d’une autre carte,
le panneau de détails une fois ouvert, ni du JavaScript personnalisé qui utilise
directement un autre objet HA. Un lecteur média ou curseur produisant plusieurs
requêtes pendant une interaction ne met pas ces requêtes en attente derrière
le clavier : une nouvelle action se fait après fermeture de la demande en cours.

Les contrôles du dépôt exécutent le module livré avec Bubble Card 3.4.3 dans
Chromium, des composants HA simulés et un backend simulé. Ils ne prouvent pas
un essai sur Home Assistant réel ou Safari/iPadOS. Vérifier sur la tablette
après importation du module et sélection de son compte.

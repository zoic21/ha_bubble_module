# Home Assistant Bubble Modules

Modules réutilisables pour [Bubble Card](https://github.com/Clooos/Bubble-Card).

| Module | Version | Distribution | Documentation |
|---|---|---|---|
| Signature — design des cartes | 1.8.26 | [signature.yaml](signature/dist/signature.yaml) | [Guide](signature/doc/README.md) |
| Alert Manager — coloration des alertes | 2.1.0 | [alert_manager.yaml](alert_manager/dist/alert_manager.yaml) | [Guide](alert_manager/doc/README.md) |

Chaque module possède son propre dossier, avec `dist` pour le fichier YAML complet à importer et `doc` pour sa documentation.

## Installation

1. Installer Bubble Card et [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools).
2. Télécharger le fichier YAML du module souhaité dans son dossier `dist`.
3. Dans l’éditeur d’une carte Bubble, ouvrir **Modules** et importer le fichier complet, ou coller son contenu dans l’import manuel.
4. Ajouter l’identifiant du module à la liste `modules` de la carte.
5. Configurer les options décrites dans le guide du module, puis recharger le dashboard si nécessaire.

Les fichiers de distribution comprennent les métadonnées et le code : ce ne sont pas des cartes de dashboard à coller telles quelles dans une vue.

## Identifiants

Les identifiants YAML sont `signature` et `alert_manager`. Le module de design porte le nom **Signature**.

## Mises à jour et magasin

Ce dépôt regroupe les distributions et la documentation. Il ne publie pas automatiquement les modules dans le Module Store.

La publication dans le magasin nécessite une discussion distincte par module dans [Share your Modules](https://github.com/Clooos/Bubble-Card/discussions/categories/share-your-modules), contenant son export complet et une capture d’écran. Les discussions du magasin ne sont pas encore créées.

Pour une installation manuelle, réimporter le nouveau fichier YAML. Pour une publication dans le magasin, actualiser le YAML de la même discussion et augmenter la version. Un commit dans ce dépôt n’actualise pas à lui seul les modules installés dans Home Assistant.

## Configuration

Les deux distributions actuelles ne déclarent pas de schéma `editor`. Leurs options personnalisées se configurent donc dans le YAML de la carte. Les commandes, entités et actions ordinaires restent celles de Bubble Card.

## Vérification

Avec Node.js, lancer `node --test tests/*.test.cjs` depuis la racine du dépôt. Les tests exécutent les distributions et vérifient notamment les sources d’alertes, les filtres, le cache, les traductions et les commandes numériques. Ils ne remplacent pas une vérification du rendu dans Home Assistant.

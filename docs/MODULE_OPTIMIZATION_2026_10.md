# Passe sur les modules — 17 octobre 2026

Audit des treize modules, base `2b46f2d`. Aucun changement d’option publique,
d’entité, d’action, de seuil, de requête métier ou de dimension. Huit modules
évoluent ; Flow, Alert Manager, Navigation, Hue et Irrigation restent inchangés.

## CSS utile au rôle actif

- Square : règles d’illustration seulement lorsque le dessin est exploitable.
  L’activation/désactivation Jinja est dans la clé du cache ; URL et cadrage
  restent relus à chaque passage, hors cache.
- Compact : petite valeur en bouton seulement lorsque ce style est actif.
  L’option appartient à la clé de cache. Deux règles adjacentes de même sélecteur
  sont réunies sans changer leur spécificité ou l’ordre des déclarations.
- Panel : commandes et média isolés dans deux fragments, émis seulement pour
  leur configuration native. Retrait des tailles/poids immédiatement écrasés ;
  la bonne valeur est passée directement au fragment commun.
- Header : retrait des règles d’unités/actions de valeur que ce module ne crée
  jamais. Room et Square : retrait de déclarations déjà fournies par le socle.

Les protections de visibilité native, les replis CSS, les règles tactiles et les
variables du thème sont conservés. Aucun minificateur par rendu, stylesheet
global, observateur ou abonnement supplémentaire. Les règles non rencontrées
dans une fixture ne sont pas considérées mortes sans preuve de leur inutilité.

### CSS réellement retourné, puis nettoyé par Bubble

Octets UTF-8 après le nettoyeur réel de **Bubble 3.4.1**, source vérifiée par son
SHA Git `5fe8799e8070e3169e1b2889c6d5d268632f9082`. Fixtures à 600 px, thème
Signature clair ; les valeurs et options sont celles du socle navigateur commun.
Panel utilise une valeur de 140 W et une illustration, avec/sans commande ou média.

| Configuration | Avant | Après | Gain |
|---|---:|---:|---:|
| Compact valeur, sans petite pastille | 8 226 | 7 219 | 12,2 % |
| Compact standard | 6 010 | 5 975 | 0,6 % |
| Square sans illustration | 6 014 | 4 944 | 17,8 % |
| Square hauteur automatique sans illustration | 7 072 | 6 031 | 14,7 % |
| Header de page | 5 863 | 5 470 | 6,7 % |
| Room sans commande | 7 659 | 7 629 | 0,4 % |
| Panel sans commande nommée | 9 340 | 6 634 | 29,0 % |
| Panel avec commande nommée | 9 340 | 7 999 | 14,4 % |
| Panel média sans commande nommée | 9 340 | 7 825 | 16,2 % |

Les règles nécessaires restent émises quand leur option est active ; leur gain
peut donc être inférieur ou nul sur une autre carte. Weather, Wind Rose et Flow
ont ici un volume CSS inchangé.

Les treize distributions YAML passent de **383 426 à 384 281 octets** (+855,
soit +0,2 %). Les caches et leurs invalidations ajoutent quelques instructions :
le gain porte sur le CSS par carte et le travail évité, pas sur le téléchargement
des YAML. Les sources, métadonnées et huit versions sont livrées avec `dist`.

## Travail évité et invalidation

- Wind Rose sépare les chemins/descriptions issus de l’historique du survol et de
  la sélection. Historique, locale, unité et mode de plages invalident la vue ;
  couleurs et thème restent résolus en CSS. Aucune nouvelle requête.
- Weather réutilise les prévisions parsées/triées et leur échelle de température.
  Nouveau message (même tableau réutilisé par le fournisseur), période, fuseau,
  heure et nombre d’entrées invalident ce cache. Les capteurs locaux restent lus
  à chaque passage et les libellés suivent la locale actuelle.
- Panel ne peint plus une valeur provisoire ensuite immédiatement remplacée par
  la statistique déjà en cache. Les nœuds stables, formateurs et minuit local
  sont réutilisés. Précision, locale, fuseau et jour restent pris en compte ;
  les lectures de sources suivies, resets Recorder et contrôles DST sont gardés.
- Group rend chaque nom une seule fois par passage. Les pastilles inchangées
  ne programment plus de mesure à chaque état HA : ResizeObserver suit déjà
  police, largeur et thème. Le contenu modifié déclenche toujours une frame ;
  le même observateur suit aussi chaque pastille et libère ses cibles retirées,
  pour détecter des variations individuelles même à largeur totale constante.
  Sans ResizeObserver, le repli piloté par les rendus est conservé.

Mesures déterministes Node sur les distributions avant/après, après initialisation
du cache : ce sont des compteurs d’opérations, pas un benchmark de fluidité HA.

| Série | Opération | Avant | Après |
|---|---|---:|---:|
| 30 mises à jour Panel | Créations `Intl.NumberFormat` | 30 | 0 |
| 30 mises à jour Panel | Lectures de parties de date | 120 | 30 |
| 30 mises à jour Panel | Remplacements de la valeur DOM | 60 | 0 |
| 30 sélections/rendus Weather, six prévisions | Conversions de dates de prévision | 180 | 0 |
| 60 entrées/sorties de survol Wind Rose | Recalculs de chemins SVG | 120 | 0 |

## Contrôles et installation

Build reproductible et `check:modules`, **389 tests fonctionnels** et
**118 tests navigateur** réussis, sans test ignoré dans ces deux suites.

Comparaison avant/après des styles calculés et dimensions sur **912 rendus** du
socle commun : six largeurs (288/328/358/382/600/992 px), clair/sombre,
avec/sans thème et avec polices/rayons personnalisés. Aucune différence calculée.
Les tests dédiés vérifient aussi les changements d’options sur les mêmes nœuds,
le suivi des entités, la locale, le temps, les données nouvelles, les actions
et le nettoyage. Les suites Panel natif chargent le vrai code Bubble 3.4.1 avec
un backend HA simulé. Home Assistant réel et Safari/iOS ne sont pas validés.

Réimporter les distributions concernées : Compact **1.4.7**, Square **2.0.1**,
Room **1.4.1**, Header **1.1.15**, Panel **1.0.1**, Group **1.1.2**, Weather
**1.3.5**, Wind Rose **1.5.5**. Aucun dashboard ni thème à modifier.

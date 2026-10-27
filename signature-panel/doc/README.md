# Signature Panel

## 1.4.9 — 27 octobre 2026 — colonnes centrées avec commandes

Les en-têtes avec commandes utilisent une zone centrée par mesure, une pour
le groupe de commandes et une pour l’illustration. La piscine aligne ainsi
température, mode et dessin dans trois zones régulières, dès 350 px. La
température ne reste plus contre le bord. Chaque piste conserve au moins
la largeur intrinsèque de son contenu pour préserver les libellés.

Le même principe s’applique au Jardin avec sa commande de tondeuse : quatre
zones sur grand écran, groupe centré sous les mesures lorsqu’il passe sur
une autre ligne. Une commande masquée libère sa colonne, y compris pour un
sélecteur. Les marges verticales, tailles, cibles et actions sont conservées.

Audit des vingt en-têtes de pièces : Piscine et Jardin sont les deux cas
avec commandes hors badge de scénarios. Les essais Chromium couvrent les
modes Normal/Hivers, les états présent/absent de la tondeuse, le masquage
et le redimensionnement avec Bubble réel et un environnement HA simulé.

Importer uniquement **Signature Panel 1.4.9**, puis recharger le frontend.
Aucun CSS par carte ni nouvelle importation de dashboard.

## 1.4.8 — 27 octobre 2026 — équilibre des marges verticales

Dans les en-têtes illustrés, l’espace disponible sous les mesures est
reporté entre le titre et la ligne des valeurs. La marge sous cette ligne
correspond ainsi à celle au-dessus du titre, sur ordinateur et téléphone.
La hauteur n’augmente pas ; les titres longs et les rangées de commandes
gardent leur place utile. Les alignements horizontaux et le centrage du
mode Piscine restent conservés, ainsi que les cibles natives de 44 px.

Ce réglage est centralisé dans le module, sans CSS par carte, déplacement
de nœud ni mesure JavaScript. Importer uniquement **Signature Panel 1.4.8**,
puis recharger le frontend. Les panneaux classiques, lecteurs et bandeaux
de traitement gardent leur disposition. Les essais Chromium utilisent
Bubble réel et un environnement HA simulé, sans essai HA réel/Safari.

## 1.4.7 — 27 octobre 2026 — mode centré entre valeur et illustration

Avec une seule mesure et un sélecteur natif, le mode est désormais centré
dans l’espace entre la valeur et le dessin dès 350 px, sur ordinateur et
téléphone. Les espaces de part et d’autre du sélecteur sont égaux, au lieu
de garder tout l’espace libre à sa droite. Température, illustration,
hauteur, tailles et commandes conservent leurs réglages. Le repli étroit
sous 350 px reste disponible. Aucun CSS par carte.

Importer uniquement **Signature Panel 1.4.7**, puis recharger le frontend.
Les contrôles Chromium vérifient Normal/Hivers en clair et sombre, de
288 à 1 032 px, avec Bubble réel et environnement HA simulé.

## 1.4.6 — 27 octobre 2026 — mesures rapprochées et mieux réparties

Les en-têtes illustrés suppriment la rangée extensible qui éloignait les
valeurs du titre. Retraits verticaux de **8 px**, écart de **4 px** entre
le titre et les valeurs, cible de mesure conservée à **44 px**. La base
passe à environ **114–116 px sur ordinateur** et **96–100 px sur téléphone**
avec un titre sur une ligne. Un titre long ou des commandes supplémentaires
augmentent seulement la place nécessaire. Le titre mobile utilise aussi
la place libre avant le dessin pour éviter les retours inutiles à la ligne.

Sans commande, chaque mesure et l’illustration occupent une colonne de
largeur égale, avec leur contenu centré. Une seule mesure ne reste plus
collée au bord ; deux mesures et le dessin forment trois zones régulières
sur ordinateur comme sur mobile. Illustration **96 px** sur ordinateur,
**80 px** sur téléphone. Le sélecteur Piscine reste à côté de la température
dès 350 px et les commandes supplémentaires gardent leur repli.

Les seuils de largeur des en-têtes consultent le même conteneur CSS nommé.
Les hauteurs restent automatiques ; pas de déplacement de nœud, calcul de
largeur JavaScript ou CSS local. Les panneaux classiques, lecteurs, bandeaux
de traitement et autres modules gardent leur présentation.

Importer uniquement **Signature Panel 1.4.6**, puis recharger le frontend.
Les contrôles Chromium utilisent Bubble réel avec un environnement HA
simulé ; ils ne constituent pas un essai dans HA réel ou Safari/iOS.

## 1.4.5 — 27 octobre 2026 — sélecteur à côté de la mesure

Sur les en-têtes illustrés avec une seule mesure et un sélecteur natif,
le mode reste à côté de la valeur dès **350 px de largeur de carte**,
y compris sous l’ancien seuil mobile de 520 px. Sous 350 px, le groupe
reste dessous pour préserver les textes, les cibles de 44 px et le dessin.
Les en-têtes à plusieurs mesures et les autres présentations sont conservés.

Le seuil est lu sur un conteneur CSS nommé au niveau de la carte : le
conteneur interne de Bubble et ses retraits ne doivent pas décaler la règle
appliquée au sélecteur par rapport à celle des colonnes. Aucun calcul de
largeur JavaScript, observateur ou CSS de carte supplémentaire.

Importer uniquement **Signature Panel 1.4.5**, puis recharger le frontend.
Les modes, entités et actions natives ne changent pas. Contrôles Chromium
avec Bubble réel et environnement HA simulé, sans essai HA réel/Safari.

## 1.4.4 — 27 octobre 2026 — synthèse réduite

La synthèse illustrée devient plus compacte sur ordinateur : **160 px de
hauteur de base**, valeurs jusqu’à **40 px** (64 px auparavant), illustration
**128 px** (240 px auparavant) et titre **26 px**. La réduction porte sur
le bandeau ; les deux colonnes, la sécurité alignée, les commandes et les
réglages mobiles sont conservés. Les bandeaux sans mesure restent compacts.

Mettre à jour uniquement **Signature Panel 1.4.4**, puis recharger le frontend.
Aucun dashboard, thème ou illustration à réimporter pour ce réglage.

## 1.4.3 — 27 octobre 2026 — synthèse sur toute une page contenue

L’en-tête remplit désormais sa section native, sans plafond isolé à 900 px.
La largeur contenue appartient à la vue Sections : **deux colonnes maximum**,
en-tête et sécurité sur deux colonnes, commandes principales sur une colonne
chacune, placement dense désactivé. Les bords du haut et du bas correspondent.

Le titre passe à 32 px, les valeurs à 32–64 px selon la largeur et le dessin
à 144–240 px. La hauteur réserve au moins 216 px ou le dessin avec 24 px
de dégagement vertical.
Les adaptations mobiles et les formats sans mesure sont conservés. Aucun
changement des panneaux classiques, lecteurs et bandeaux de traitement.

Pour cette organisation de page, importer **Panel 1.4.3**, **Header 1.2.2**,
puis les dashboards. Le rôle `align_section_columns` de Header aligne les
demi-cartes des sections élargies sur les colonnes de commandes. Il garde
le CSS centralisé ; les cartes conservent leurs fonctions et leurs conditions.

## 1.4.2 — 27 octobre 2026 — largeur contenue sur grand écran

Les en-têtes `variant: heading` occupent la largeur disponible jusqu’à
**900 px maximum**, alignés à gauche. Les sections de commandes gardent leur
grille native. Avec mesures, la hauteur revient à **170 px minimum** et le
dessin à 144 px ; le titre utilise 24 px et les valeurs 32 px sur ordinateur.
Les deux mesures se distribuent entre la gauche et le centre. Le sélecteur
d’une mesure unique reste près de sa valeur et à gauche du dessin.

Sur mobile, la carte occupe toute la largeur disponible ; les adaptations des
textes et des commandes sont conservées. Un titre long ou des commandes
supplémentaires peuvent augmenter la hauteur. Le thème peut ajuster le plafond
avec `signature-panel-heading-max-width`, sans CSS dans chaque carte.
Les panneaux classiques, lecteurs et bandeaux de traitement ne changent pas.

Mettre à jour uniquement **Signature Panel 1.4.2**, puis recharger le frontend.
Aucun dashboard, atlas ou thème à réimporter pour cette correction. Les
contrôles Chromium incluent des cartes de 1 568 et 2 000 px et restent des
simulations, sans essai dans Home Assistant réel ni Safari/iOS.

## 1.4.1 — 27 octobre 2026 — proportions des en-têtes

Les en-têtes illustrés réservent une vraie place au dessin (120–280 px sur
ordinateur, 88–136 px sur petite carte). Le titre passe à 28 px sur ordinateur
et 22 px sur mobile ; la valeur principale atteint 36 px sur ordinateur.
La hauteur suit la largeur et réserve le dessin complet, de 156 à 280 px
minimum.

Les sélecteurs restent près des valeurs, sur la même ligne sur ordinateur,
avec un fond discret. Ils passent dessous sur mobile, toujours à gauche du
dessin. Les rangées de l’en-tête sont isolées des règles du panneau classique.
Sans mesure, le bandeau reste compact (112/100 px). Aucun CSS par carte ni
changement des entités, actions ou conditions ; les panneaux classiques,
lecteurs et bandeaux de traitement gardent leur présentation.

Mettre à jour uniquement **Signature Panel 1.4.1**, puis recharger le frontend.
Aucune réimportation de dashboard ni nouvelle image nécessaire.

## 1.4.0 — 27 octobre 2026 — en-têtes et bandeaux de mesures

Deux présentations facultatives réutilisent les mesures et commandes natives.
Le panneau classique et les lecteurs conservent leurs dimensions.

- `variant: heading` : titre de pièce 22 px (20 px sur petite carte), valeurs
  et unités sur une ligne, icônes sans fond et dessin à droite. Minimum 156 px
  avec mesures ; bandeau compact sans mesure. `show_state: false` et une liste
  `information` vide ne créent aucune valeur. Les sélecteurs et états natifs
  restent à gauche du dessin. Un badge natif `type: badge` devient une action
  discrète dans une cible de 44 px en haut à droite ; garder son nom et ses actions.
- `variant: strip` : une à trois mesures dans une seule surface, sans dessin.
  Les commandes natives reçoivent leur colonne par
  `sub_button_styles.<classe>.column` (1 à 3). À 520 px et moins, les mesures
  s’empilent, commandes à droite et hauteur automatique.
  `type: switch` reprend le switch partagé et son état natif.

`metric_icon` ajoute une icône sans fond devant la première valeur ; les autres
icônes restent dans `information[].icon`. `color_thresholds` et `icon_opacity`
sont pris en charge pour chaque mesure. Les seuils colorent seulement les
icônes. `primary_enabled` et `information[].enabled` acceptent un booléen ou
un template produisant `true`/`false` ; une valeur non résolue reste masquée.
Retirer la première mesure décale les suivantes et leurs commandes.
Ces options sont sans effet sur les lecteurs. Utiliser
`grid_options.rows: auto`. Aucun CSS dans les cartes, capteur fictif,
nouvel observateur, abonnement ou timer.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.temperature
name: Chambre
show_name: false
show_icon: false
show_state: true
rows: 2
grid_options:
  columns: full
  rows: auto
modules: [signature_panel]
signature_panel:
  variant: heading
  title: Chambre
  metric_icon: mdi:thermometer
  illustration:
    image: /local/illustrations/chambre.png
  information:
    - entity: sensor.humidity
      icon: mdi:water-percent
```

Les fixtures Chromium utilisent le vrai Bubble 3.4.1 épinglé et un backend HA
simulé : 288/328/358/382/600/1000 px, clair/sombre, zéro/une/deux mesures,
sélecteur, état conditionnel, bandeau à trois mesures et interactions.
Elles ne valident pas Home Assistant réel ni Safari/iOS.


## 1.3.2 — 20 octobre 2026 — pastilles de seuils sans fond

L’option `sub_button_styles.<clé>.color_thresholds.background: false` rend
le fond d’une pastille transparent en gardant la couleur numérique de son
icône. Le défaut reste le fond doux à 16 %. Voir le
[guide des seuils](../../signature-shared/doc/COLOR_THRESHOLDS.md).


Version **1.4.4**. ID YAML : **`signature_panel`**. [Distribution à importer](../dist/signature-panel.yaml).

Carte illustrée pleine largeur, deux pas de hauteur : **118 px visibles** avec le pas standard de 56 px et l’écart de 8 px. L’illustration de 80 px reste à droite et centrée sur toute la hauteur. Une seule grille place les titres, valeurs, détails et commandes ; aucun CSS par carte n’est nécessaire. Utiliser un seul module de présentation par carte.

## Configuration

Le nom, l’entité et l’état natifs forment la première information. `secondary` lui ajoute un détail. `information` est une liste de **zéro à deux informations supplémentaires** ; chaque entrée accepte les mêmes rôles. Les trois valeurs partagent leur ligne et leur typographie. `title` ajoute facultativement un titre global en haut d’un panneau bouton, séparé des libellés de mesure. Sans `title`, le comportement précédent reste disponible : quand les entrées supplémentaires n’ont pas de nom, le nom natif occupe toute la largeur de contenu.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.power
name: Puissance
show_name: false
show_icon: false
show_state: true
rows: 2
card_layout: large
grid_options:
  columns: full
  rows: 2
modules:
  - signature_panel
signature_panel:
  title: Baie informatique
  hover: false
  illustration:
    image: /local/illustrations/infra-rack-v1.webp
  information:
    - entity: sensor.temperature
      icon: mdi:thermometer
      color: orange
      tap_action:
        action: navigate
        navigation_path: "#temperature"
    - entity: sensor.humidity
      icon: mdi:water-percent
      color: teal
```

`information` : `entity`, `name`, `state`, `secondary`, `icon`, `color`, `tap_action`, `statistics`, `secondary_statistics`. `state`, `name`, `secondary`, `icon` et `color` peuvent être des templates Jinja ; `entity` fournit le format numérique HA, l’unité et la cible de détails. `tap_action` remplace seulement l’action de clic de cette information. Une valeur calculée sans entité ne crée pas de cible more-info fictive. `enabled: false` retire une information supplémentaire. Deux entrées au maximum sont rendues ; ne pas utiliser ce format pour plus de trois informations.

Les sous-boutons natifs restent au pied, à gauche de l’illustration : au plus trois visibles. Leurs entités, conditions et actions restent dans `sub_button`. Le rôle `sub_button_styles.<classe-ou-numéro>.type: command` empile icône et libellé dans une cible de 44 px. `active` et `disabled` acceptent booléen ou Jinja. Une désactivation non résolue bloque la commande, y compris une action déjà mémorisée ou un geste commencé avant l’actualisation. Le garde est commun à Room et Panel ; la géométrie est propre à chaque module. Les boutons informatifs conservent leur densité native de 30 px et les lecteurs leurs contrôles/volume natifs.

Depuis Panel **1.2.3**, `sub_button[].show_background: false` impose un fond
transparent, y compris lorsqu'un seuil numérique ou un style `command`
définit un fond coloré. Les couleurs des icônes, les masquages et les actions
restent conservés. Sans ce choix explicite, les fonds habituels restent actifs.

### Titre global facultatif

`title` accepte du texte ou Jinja et ne concerne que les panneaux boutons.
Il utilise le rôle de nom de 14 px/600 en couleur primaire ; les noms de
mesure restent à 13 px/500. Le nom Bubble reste attaché à la première mesure
et peut être masqué avec `show_name: false`, comme dans l’exemple. Quand tous
les noms de mesure sont vides ou masqués, leur rangée se replie et les valeurs
se centrent dans l’espace sous le titre. Le titre global ne reçoit pas la
cible more-info de la mesure.
Le clic dans cette zone suit l’action native de la carte. Les badges rejoignent
la rangée du titre global et gardent leurs actions. Un titre vide ou retiré
supprime son nœud et sa rangée ; le retour sans titre restaure les badges
auprès du nom natif. Le texte reste littéral, sans interprétation HTML.

Le titre ajoute sa rangée dans les mêmes 118 px, avec un retrait vertical
extérieur standard de 10 px (12 px horizontalement), des noms de mesure sur
16 px et le dessin de 80 px toujours centré. Préférer les panneaux de mesures ;
la combinaison d’un titre, de détails
longs et de nombreuses commandes doit être allégée pour tenir dans deux pas.
Les lecteurs ignorent cette option. Aucun abonnement, écouteur ou observateur
supplémentaire n’est créé.

## Actions sur les valeurs et badges du titre

`tap_action` dans les options Panel remplace le clic sur la valeur principale.
Le défaut reste more-info ; l'appui long garde les détails. L'action de la
carte reste indépendante, tout comme `information[].tap_action` pour chaque
mesure supplémentaire. Les nombres, unités et icônes reçoivent la même action.

Un sous-bouton iconique natif avec `sub_button_styles.<classe>.type: badge`
rejoint une seule pilule neutre, comme Room : hauteur 20 px, icône de 14 px,
largeurs de 24, 44 ou 64 px avec une, deux ou trois icônes. Elle se superpose
au coin supérieur droit du dessin, avec un bord droit fixe, et s’allonge vers
la gauche sans toucher le titre (au moins 8 px de dégagement). Sans image,
elle reste à 6 px du nom. Un badge Alert Manager actif ou en attente conserve
sa place dans le coin ; la pilule se décale alors de 24 px vers la gauche.
Masquer le nom, l'état et le fond individuel ; les templates d'icône et les actions restent
natifs. `color` règle son accent et `opacity` son état fonctionnel. Le fond
commun reste neutre. Les badges masqués libèrent leur place ; retirer le rôle
ou démonter le module restaure les nœuds d'origine. Les informations restent
alignées et aucun pied de commandes n'est réservé pour un badge du titre.

```yaml
sub_button:
  main:
    - entity: switch.ventilation
      name: Ventilation
      icon: "{{ 'mdi:fan' if is_state(entity, 'on') else 'mdi:fan-off' }}"
      css_class: ventilation-status
      show_name: false
      show_state: false
      show_background: false
      state_background: false
      tap_action:
        action: navigate
        navigation_path: "#temperature"
signature_panel:
  tap_action:
    action: navigate
    navigation_path: "#power"
  sub_button_styles:
    ventilation-status:
      type: badge
      color: "{{ '#29958A' if is_state(entity, 'on') else '#818181' }}"
      background: transparent
```

Les commandes `type: command` gardent leurs libellés neutres ; seule l'icône
active reprend `color`. Les autres icônes restent secondaires et le fond de
sélection reste teinté. `active` et `disabled` gardent leur comportement.

## Illustrations et Jinja

Les fichiers restent extérieurs au module. `illustration.image` est l’URL de repli, littérale ou Jinja. `image_light` et `image_dark` sont des variantes facultatives selon le mode effectif Home Assistant. Sans variante valide, le module utilise `image`. Aucune liste d’états métier, de véhicules ou d’équipements n’existe dans Panel. Les conditions restent dans la carte :

```yaml
signature_panel:
  illustration:
    image: "{{ '/local/open.webp' if is_state('binary_sensor.door', 'on') else '/local/closed.webp' }}"
    image_light: /local/alarm-day.webp
    image_dark: /local/alarm-night.webp
    columns: 3
    rows: 2
    index: "{{ 0 if is_state(entity, 'disarmed') else 1 }}"
```

Les sprites partagent le lecteur Square/Room : `columns`, `rows`, `index` (base 0), `index_dark`, `offset_x`, `offset_y`, `offset_y_dark`. Les index/cadrages acceptent Jinja ; offsets entre −50 et 50 % d’une case. L’index −1 ou une URL invalide masque le dessin sans déplacer les colonnes. Le mode HA suit les actualisations natives Bubble, sans abonnement ni observateur supplémentaire ; il ne dépend pas du thème du système d’exploitation.

### Largeur réservée au dessin — 1.3.0

`illustration.width_ratio` réduit uniquement la colonne réservée au dessin.
Le calque et le cadrage du sprite restent carrés, à la même échelle et centrés
dans cette colonne. Les marges transparentes peuvent ainsi déborder de la
colonne sans diminuer ni étirer l'illustration. La hauteur reste de 118 px.

```yaml
signature_panel:
  illustration:
    image: /local/illustrations/energy-utilities-day-v1.png
    columns: 2
    rows: 1
    index: 0
    width_ratio: 0.65
```

La valeur doit être supérieure à 0 et au plus égale à 1 ; le défaut est 1.
Un nombre, une chaîne numérique ou un template Jinja est accepté. Une valeur
vide, non numérique ou hors limites restaure 1. Choisir le ratio d'après les
marges transparentes, avec une marge de sécurité pour les ombres et toutes
les variantes du dessin. Le module ne mesure pas les pixels des images.

Avec `width_ratio: 0.75`, le dessin utilise toujours son carré de 80 px mais
la colonne réserve 60 px. Si le thème ramène le carré à 64 px, la colonne
devient 48 px sans nouvelle exécution du module. Les valeurs, unités,
sous-informations, actions et tailles de police ne sont pas modifiées.
Retirer l'option restaure la disposition habituelle. Une pochette média réelle
conserve sa colonne complète ; son illustration de repli peut utiliser le ratio.
Aucun nœud, observateur, abonnement ou calcul de dimensions n'est ajouté.

### Pochette du média — 1.1.2

Sur une carte `media-player`, ajouter `media_artwork: true` dans `illustration`
pour donner priorité à l'attribut HA `entity_picture` du lecteur. Exemple :

```yaml
signature_panel:
  illustration:
    media_artwork: true
    image: /local/illustrations/amplificateur.webp
```

La pochette ou l'affiche garde ses proportions dans les 80 px réservés :
centrée, sans découpe d'atlas ni déformation. Les changements de morceau et
l'apparition/disparition de l'attribut suivent les actualisations natives HA.
Sans URL locale/HTTP(S) exploitable, le dessin configuré reprend exactement
ses variantes clair/sombre et son cadrage. Pas de vérification réseau des
URL : une image dont le serveur renvoie une erreur reste dépendante du lecteur.
Option désactivée par défaut, sans effet sur les cartes bouton. Installer
**Group 1.1.5** pour afficher la même pochette dans la pastille d'activité.
Aucun nouvel abonnement, observateur, nœud ou gestionnaire de commande.

## Statistiques journalières

Une information peut fournir `statistics` au lieu d’une entité : `statistic_ids`, `unit`, `decimals`, `time_zone`, `factor` positif facultatif. `secondary_statistics` affiche le coût sous la consommation avec une requête commune. `subtract_statistic_ids` retire des flux ; `operation: remaining_percentage` et `part_statistic_ids` donnent la part restante, par exemple l’autosuffisance.

```yaml
signature_panel:
  illustration:
    image: /local/network.webp
  information:
    - name: Jour
      statistics:
        statistic_ids: [sensor.energy_hc, sensor.energy_hp]
        unit: kWh
        decimals: 2
        time_zone: Europe/Paris
      secondary_statistics:
        statistic_ids: [sensor.energy_hc_cost, sensor.energy_hp_cost]
        unit: €
        decimals: 2
        time_zone: Europe/Paris
```

Recorder fournit les variations du jour, y compris les remises à zéro. Un résultat incomplet reste `—`, jamais une somme partielle ou le compteur cumulé en direct. L’actualisation native déclenche au plus une requête par minute et par information statistique, sans timer. Changement de jour, de source et teardown invalident les réponses périmées. Les deux informations statistiques éventuelles ont des caches indépendants.

## Style et maintenance

Surfaces, textes, police et rayons utilisent les tokens Signature, y compris sans son thème : carte 22 px, contrôles 14 px, valeur 28 px/500, unité 16 px/400. Sur les cartes bouton, les noms utilisent le même titre de mesure que Square : `signature-caption-font-size` augmenté de 1 px (13 px par défaut), poids moyen 500 et couleur primaire ; les libellés restent complets dans la configuration, sans abréviation. Les détails utilisent la légende de 12 px, poids normal et couleur secondaire, avec 3 px au-dessus lorsqu’ils sont présents. Les titres et détails des lecteurs conservent leurs rôles de nom 14 px/600 et secondaire 13 px/400. Les états textuels sont limités à 22 px. Avec trois informations, la taille commune s’adapte à la largeur ; avec les commandes nommées, le rôle de valeur est de 20 px. Les valeurs et libellés de commandes restent primaires, les unités/détails secondaires ; les icônes gardent leurs accents. Retraits extérieurs des textes : 12 px horizontalement, 10 px verticalement, bordure comprise ; 8 px entre les colonnes. Les commandes de 44 px utilisent un retrait vertical de 8 px pour conserver les deux pas.

Sans commandes visibles au pied, le groupe titres/valeurs/détails est centré
verticalement selon son contenu réel. Un détail vide ne réserve plus de rangée ;
un détail présent garde son interligne et son éventuel retour à la ligne.
Les valeurs restent alignées entre colonnes, le dessin reste centré sur la carte.
Les badges du titre suivent sa rangée sans créer de pied. Avec des commandes
visibles, leur disposition et leurs cibles restent inchangées ; les lecteurs
conservent toute leur disposition et leur typographie.

Avec trois informations, les trois nombres conservent la même taille et le même
alignement. Depuis 1.0.3, ils atteignent environ **22–24 px sur les cartes de
366–382 px** et restent à 24 px au-delà, avec les tokens par défaut. La taille
diminue progressivement jusqu’à 13 px sur les cartes très étroites. Les unités
restent secondaires, de 11 à 13 px ; les icônes de mesure passent à 14 px avec
2 px avant le nombre, et l’unité garde 3 px de séparation. La hauteur de 118 px,
le dessin de 80 px et les retraits extérieurs restent identiques. Les panneaux
à une ou deux informations gardent leurs règles. Ce comportement est automatique
avec deux entrées supplémentaires dans `information`, sans option ni CSS local.
Les tailles plus petites du thème et le plafond des commandes restent prioritaires.
Des valeurs ou unités particulièrement longues peuvent nécessiter une autre disposition.

`hover: false` supprime le survol, pas les actions ni le retour d’appui. `progress: {value: 0..100, color: ...}` ajoute une piste décorative ; une valeur invalide la masque. L’état principal garde le défilement natif Bubble via `state_content` et `scrolling_effect`.

`secondary_lines: 2` autorise deux lignes communes aux détails d’un bouton sans
sous-boutons. Les prévisions et durées peuvent revenir à la ligne ; un texte
plus long reste limité à deux lignes. Les valeurs gardent leur alignement et
le dessin son centrage, dans les mêmes 118 px. L’option vaut une ligne par
défaut et ne s’applique ni aux médias ni aux boutons avec sous-boutons.
Avec trois informations, le texte secondaire s’adapte de 11 px jusqu’à la
taille de légende du thème pour garder les détails lisibles sur écran étroit.
Le retrait de l’option restitue le détail sur une ligne, sans nouveau nœud,
abonnement ou mesure JavaScript.

Les sources sont séparées en présentation, informations, statistiques, commandes et progression. Modifier `src`, puis `npm run build:modules`, `npm run check:modules`, `npm test` et `npm run test:styles`. Le test `panel-native.browser.cjs` charge Bubble **3.4.1** lorsque `BUBBLE_NATIVE_SCRIPT_PATH` pointe vers son script (SHA contrôlé). Cette couverture Chromium avec backend simulé ne valide ni l’installation Home Assistant réelle ni Safari/iOS.

## Migration

Installer Panel avant d’importer les cartes migrées. Remplacer `signature_square` ou `signature_room` dans `modules` et dans la clé d’options par `signature_panel`. `summary` devient `information: [ancien_summary]`. Retirer `activity`, `room_compact`, `room_inline_metrics`, `room_state_centered` et les autres réglages géométriques Room. Conserver `rows: 2` et `grid_options: {columns: full, rows: 2}`. Les Rooms de pièces et les Squares en demi-largeur restent sur leurs modules.

Square **2.0.0** supprime les bandeaux `summary` et `activity`. Room **1.4.0** supprime la géométrie d’équipement double hauteur. Group **1.1.1** sait lire les illustrations Panel des activités pour ses pastilles. Ces mises à jour et la migration des cartes doivent être installées ensemble.


## 1.0.1 — 17 octobre 2026

CSS des commandes et du média limité aux cartes concernées. Suppression des tailles/poids écrasés. Statistiques : pas de double remplacement du DOM ; formateurs et début de journée réutilisés.

Contrôles : tests Node, styles calculés Chromium et comparaison avant/après. Ces fixtures ne valident pas Home Assistant réel ni Safari/iOS. Voir le [bilan de la passe](../../docs/MODULE_OPTIMIZATION_2026_10.md).

## 1.0.2 — 17 octobre 2026 — cohérence des styles

Correction des unités : couleur secondaire, graisse normale et espacement nul. Chiffres tabulaires sur les valeurs ; secondaire et rangée de grille suivent la taille du thème. Valeurs avec commandes nommées au token compact (20 px par défaut), interlignes média proportionnels de 1,3. Les libellés de commandes partagent leur source avec Room. Hauteur de 118 px, illustration et retraits conservés.

Contrôles : tests Node et Chromium, dont les styles calculés et les changements de thème sans nouveau rendu. Voir le [bilan de cohérence](../../docs/STYLE_AUDIT_2026_10.md). Essais Home Assistant réel et Safari/iOS à effectuer après importation.

## 1.0.3 — 17 octobre 2026 — trois mesures plus lisibles

Échelle CSS des valeurs à trois colonnes agrandie sur téléphone courant,
unités et icônes resserrées. Les trois mesures restent de même taille et
alignées sur une seule ligne. Aucun nouveau nœud, observateur, calcul de taille
JavaScript ou option à configurer. Les autres formats, actions, illustrations
et dimensions restent conservés.

Contrôles : build, tests Node et Chromium, dont Bubble 3.4.1 avec backend simulé,
largeurs 288–600 px, modes clair/sombre et avec/sans thème. Le test dédié couvre
des mesures à trois chiffres, l’absence de débordement et le changement de taille
du thème sans réexécution. Home Assistant réel et Safari/iOS restent à vérifier.


## 1.1.0 — 17 octobre 2026 — badges natifs et actions indépendantes

Ajout des badges de titre partagés avec Room, sans changement de son export.
Action principale explicite et rétablissement des cibles supplémentaires
au-dessus du fond de carte. Commandes : seul le mode actif colore son icône ;
les autres icônes et tous les libellés restent neutres. Hauteur de 118 px,
illustrations et trois valeurs agrandies conservées. Configurer uniquement les
cartes qui demandent des badges ou un clic principal différent de more-info.

Les tests Chromium utilisent le vrai pipeline Bubble 3.4.1 avec backend simulé :
clics sur nombres/unités/icônes, actualisations, changements de résultats Jinja,
états de ventilation, commandes d'alarme, retrait des badges et thèmes. Ces
contrôles ne constituent pas un essai Home Assistant réel ou Safari/iOS.

## 1.1.1 — 18 octobre 2026 — pilule sur l’illustration

Les badges natifs partagent une pilule au coin supérieur droit du dessin,
comme Room 1.4.3, sans réduire l’image ni masquer le titre. Les cartes sans
image gardent le placement après le nom. Hauteur de 118 px, mesures, commandes,
couleurs et actions natives conservées. Aucune nouvelle option ni calcul de
taille JavaScript. Réimporter uniquement Panel ; les dashboards déjà configurés
restent compatibles. Les autres distributions ne changent pas.

Contrôles : tests Node et Chromium, dont Bubble Card 3.4.1 avec backend simulé,
un à trois badges, un à trois champs, clair/sombre et avec/sans thème, visibilité,
clics, retrait et réservation du badge Alert Manager. Ces fixtures ne valident
pas Home Assistant réel ni Safari/iOS.

## 1.1.2 — 18 octobre 2026 — pochette du média

Ajout facultatif de `illustration.media_artwork`, partagé avec Group 1.1.4.
Le visuel HA courant remplace le dessin avec ses proportions ; retrait ou
URL invalide rétablit le cadrage et le thème d'origine. La configuration et
les contrôles natifs restent intacts.

## 1.1.3 — 18 octobre 2026 — lecture/pause discret et pochette arrondie

Le bouton lecture/pause garde son comportement et son ripple natifs, avec
un fond transparent et une icône neutre comme les autres commandes.
La pochette actuelle reçoit un rayon de 12 px par défaut dans le cadre de
80 px inchangé ; le rayon suit celui de la carte. Les illustrations de
secours, leur cadrage et les autres types de carte restent identiques.
Les métadonnées morceau/artiste ne sont pas remplacées : certains lecteurs
Denon ne les fournissent pas pendant AirPlay, même avec une pochette.

## 1.1.4 — 18 octobre 2026 — détail indépendant sur les lecteurs

`secondary` peut afficher une donnée fournie par la carte (volume, source,
application), avec le même Jinja et les mêmes cibles more-info. Les métadonnées
morceau/artiste restent natives dans la rangée centrale ; le détail réserve
sa propre ligne au-dessus des commandes. Interligne compact de 1,15 et retrait vertical de 6 px seulement avec ce
détail ; titre et artiste restent sur une ligne chacun, sans changer les
tailles de texte, la hauteur ou l'image.
Sans donnée, la carte retrouve sa disposition média habituelle. Aucun état
métier ni donnée de lecteur n'est codé dans le module.

## 1.1.5 — 18 octobre 2026 — détails facultatifs sur deux lignes

`secondary_lines: 2` garde les prévisions et durées lisibles dans les colonnes
étroites des panneaux boutons sans sous-boutons. Deux lignes secondaires
réservées, hauteur de 118 px et grille des valeurs conservées. Le défaut,
les lecteurs et les commandes restent inchangés ; retrait de l’option et
changement de thème couverts par les contrôles natifs Bubble.

## 1.1.6 — 18 octobre 2026 — libellés sobres et contenu centré

Tous les panneaux boutons partagent des libellés de 12 px, de poids normal
et de couleur secondaire, sans raccourcir les noms. En l’absence de commandes
visibles au pied, titres, valeurs et détails présents forment un groupe centré
verticalement ; les détails vides ne réservent plus de place. Les prévisions
gardent jusqu’à deux lignes avec l’option existante. Aucun changement des
valeurs, calculs, unités, illustrations de 80 px, hauteur de 118 px ou actions.
Les commandes gardent leur géométrie et les médias leur style précédent.
Réimporter uniquement Panel ; aucune modification des dashboards nécessaire.

Contrôles : build, tests Node et Chromium avec Bubble 3.4.1 et backend simulé,
une à trois informations à 288/328/358/382/600 px, clair/sombre, avec/sans thème,
détails absents/présents, badges, commandes et médias. Les libellés longs
peuvent toujours être tronqués sur les écrans très étroits. Home Assistant réel
et Safari/iOS restent à vérifier après importation.

## 1.1.7 — 18 octobre 2026 — titres distingués des détails

Les titres des panneaux boutons gagnent 1 px (13 px par défaut) et utilisent
le poids moyen 500. Ils restent gris secondaires et reprennent exactement le
rôle des titres Square 2.0.4. Les détails gardent leur poids normal, les noms
complets et le centrage introduit en 1.1.6 sont conservés. Le titre
« Consommation » reste lisible à la largeur courante contrôlée de 358 px.
Les lecteurs gardent leur typographie. Réimporter Panel et Square pour adopter
la même hiérarchie sur les deux présentations.

## 1.2.0 — 18 octobre 2026 — titre global et détails discrets

`title` sépare le titre de carte des noms de mesure, en conservant les valeurs,
leurs actions et le badge du titre dans une grille de 118 px. Nœud stable lors
des changements de texte, suppression/restauration au retrait et nettoyage au
démontage ; texte et Jinja passent par le rendu existant, sans interpréter HTML.
Les noms de mesure deviennent primaires, les détails passent à 12 px et reçoivent
3 px de séparation. Même hiérarchie que Square 2.0.5 ; les médias sont conservés.

Tests Node et Chromium avec Bubble 3.4.1/backend simulé : titre présent/absent,
une à trois mesures, badges, clics indépendants, thèmes et largeurs mobiles.
Contrôle de la carte Informatique exportée avec états simulés. Pas de validation
Home Assistant réelle ou Safari/iOS déduite de ces fixtures.

## 1.2.1 — 18 octobre 2026 — retraits du titre et mesures sans libellé

Le titre global retrouve le retrait vertical standard de 10 px avec bordure ;
les commandes nommées gardent leur exception de 8 px. Une rangée sans nom de
mesure visible se replie, notamment avec `show_name: false`. Les valeurs se
centrent sous le titre, sans changer leurs actions, la hauteur ni le dessin.
Contrôles Chromium natifs à cinq largeurs, clair/sombre, avec/sans thème,
nom présent/masqué et badges. Pas d’essai Home Assistant réel ou Safari/iOS.

## 1.2.2 — 18 octobre 2026 — métadonnées média sans répétition

Sur les lecteurs, un artiste/application identique au titre est masqué.
Les morceaux du détail `secondary`, séparés par `·`, ne répètent plus une
ligne native visible : « Infuse » reste une seule fois et
« Volume 48 % · TV » devient « Volume 48 % » si TV figure déjà au-dessus.
Seules les correspondances complètes sont retirées, sans distinction de casse
ou d’espaces ; un artiste, une source ou un volume distinct reste affiché.
Les métadonnées masquées par Bubble ne suppriment pas un détail utile.

Le module lit les textes déjà résolus par Bubble, y compris son repli sur
l’application et la copie originale de son défilement. Aucun texte natif,
attribut HA ou contrôle n’est réécrit ; aucun observateur ni abonnement ajouté.
Le masquage disparaît au changement de média ou au retrait du module.
Importer uniquement **Panel 1.2.2**, puis recharger le frontend : les dashboards
et leurs templates existants restent compatibles.

Contrôles : tests Node et Chromium avec Bubble 3.4.1/backend simulé, cas
Infuse/TV, volume, artiste distinct, correspondance partielle, métadonnées
absentes/masquées, actualisation, défilement, nettoyage, clair/sombre et
avec/sans thème à 288/358/600 px. Pas d’essai Home Assistant réel ou Safari/iOS.


## 1.2.4 — centrage de l’état avec commandes nommées

La rangée du titre et son interligne passent ensemble à 16 px sur les panneaux
à commandes nommées. L’état est centré entre le titre visible et les commandes,
avec environ 2 px de remontée dans la géométrie standard. Le pied et ses cibles
de 44 px restent en place, comme l’illustration de 80 px et la hauteur de 118 px.
Aucune option supplémentaire et aucun CSS local : les cartes Alarme existantes
reprennent la correction après importation du module. Vérifications Chromium
avec et sans thème ; elles ne remplacent pas un essai Home Assistant réel.


## 1.2.5 — ajustement optique de l’état seul

La capture après 1.2.4 montre encore un état trop proche des commandes.
Sur les panneaux à commandes nommées sans détail, seul le texte de la valeur
remonte de 3 px. Le titre, le pied, les cibles d’action, l’image et la hauteur
restent à leur place. Les panneaux avec détail conservent leur disposition.
Importer uniquement le module et recharger ; aucun dashboard à réimporter.
Le correctif vise l’équilibre visuel de la capture utilisateur ; les plages
DOM seules ne prouvent pas le centrage optique d’une police particulière.

### Source du lecteur en deuxième ligne — 1.3.1

Sur un lecteur, `signature_panel.state` remplace les métadonnées natives
en deuxième ligne avec leur typographie (14 px, poids normal). Il accepte
Jinja, par exemple `state: "{{ state_attr('media_player.ampli', 'source') or '' }}"`.
`secondary` reste en troisième ligne pour le volume. Retirer `state` restaure
les métadonnées Bubble ; les commandes et leur visibilité restent natives.

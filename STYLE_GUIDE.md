# Signature — règles techniques de style

Référence commune de **Signature 2.2.4**, **Signature Flow 3.4.1**, **Signature Weather 1.2.1** et **Signature Wind Rose 1.1.2**. Toute modification visuelle de ces modules doit respecter ce contrat et mettre à jour les contrôles concernés. Les distributions `*/dist/*.yaml` constituent le code livré ; [le thème](themes/signature.yaml) définit les valeurs communes en modes clair et sombre.

L'identité visuelle repose sur des surfaces neutres, des arrondis de 22 px, une typographie système, des noms sobres et des valeurs de graisse moyenne. Harmoniser les éléments de même rôle ; conserver les différences de densité et de représentation utiles à chaque module. Les accents explicites de la carte et les couleurs d'état restent prioritaires. Ne pas ajouter une dominante violette par défaut.

## 1. Variables et cascade

Utiliser les propriétés `signature-*` existantes avant de créer une nouvelle valeur fixe pour un rôle partagé. Dans le YAML du thème, écrire `signature-name-font-size`; dans le CSS, écrire `--signature-name-font-size`. Le préfixe nomme les variables, il ne limite pas leur portée : elles sont héritées normalement.

Les variables doivent rester dans le CSS livré, y compris dans les chaînes CSS mises en cache. Le navigateur doit pouvoir changer le thème ou son mode sans nouvelle donnée d'entité ni nouvelle exécution du module. Ne pas remplacer les `var(...)` par des valeurs calculées en JavaScript.

Ordre obligatoire pour les surfaces neutres des quatre modules :

```css
background: var(--signature-card-background,
  var(--ha-card-background, var(--card-background-color, #fff)));
border: 1px solid var(--signature-card-border-color,
  color-mix(in srgb, var(--primary-text-color) 5%, transparent));
box-shadow: var(--signature-card-box-shadow,
  var(--ha-card-box-shadow, 0 2px 10px rgb(0 0 0 / .035)));
border-radius: var(--signature-card-border-radius, 22px);
```

Signature transmet ces valeurs aux variables natives `bubble-*`, et `bubble-media-player-*` pour le lecteur. Flow, Weather et Wind Rose les appliquent au conteneur visible. Le `ha-card` extérieur ne doit pas créer une seconde bordure ou une seconde ombre. Vérifier son style réellement appliqué : Bubble initialise certaines propriétés en ligne.

Les titres de section `layout: title` sont une exception aux surfaces de carte : leur `ha-card` et leur `.bubble-container` restent transparents, sans bordure ni ombre, même si un thème fournit des surfaces Bubble globales. Conserver la hauteur de 32 px, le texte de 18 px et les fonds des sous-boutons natifs.

Un `none` explicite pour l'ombre est une valeur valide et doit être conservé. Tester la cascade sans thème Signature, notamment lorsque `ha-card-background` et `card-background-color` diffèrent. Un thème qui fournit toutes les variables peut masquer une divergence de repli.

Limiter les sélecteurs au module ou au layout concerné. Une règle commune de remise à zéro des boutons peut être plus spécifique qu'une classe d'onglet : contrôler la couleur inactive, le focus et la règle tactile dans les styles calculés. Utiliser `!important` uniquement lorsqu'une règle native ou une géométrie Bubble l'exige.

## 2. Typographie

Pile système commune, sans téléchargement de police :

```css
font-family: var(--signature-font-family,
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
```

La présence d'Apple dans la pile ne garantit pas une police Apple sur Android, Windows ou Linux. Le navigateur choisit la première police disponible.

| Rôle | Variable | Valeur par défaut | Graisse |
|---|---|---|---|
| Nom standard, nom média, titre du morceau, nom Flow, nom Weather | `signature-name-font-size` | 14 px | `signature-font-weight-semibold`, 600 |
| Texte secondaire, état média, artiste, état compact standard, onglet de période | `signature-secondary-font-size` | 13 px | `signature-font-weight-normal`, 400 |
| Légende, détail météo, petite mesure, libellé Wind Rose | `signature-caption-font-size` | 12 px | Normale, sauf commande explicitement mise en évidence |
| Valeur numérique compacte | `signature-compact-value-font-size` | 20 px | `signature-font-weight-medium`, 500 |
| Valeur square et valeur principale Flow | `signature-value-font-size` | 28 px | Moyenne, 500 |
| Température room et température actuelle Weather | `signature-temperature-font-size` | 30 px, avec adaptations ci-dessous | Moyenne, 500 |
| Unité square et unité principale Flow | `signature-value-unit-font-size` | 16 px | Normale, 400 |
| Unité de température room et Weather | `signature-temperature-unit-font-size` | 13 px | Normale, 400 |
| Unité de valeur compacte | `signature-secondary-font-size` | 13 px | Normale, 400 |
| Grand titre de page Signature | Taille propre au header | 38 px / 32 px | `signature-font-weight-bold`, 700 |

Les unités séparées des valeurs principales utilisent la couleur secondaire, une graisse normale et un espacement de lettres nul. Dans les prévisions Weather, le symbole degré fait partie du texte de la température et conserve sa taille et sa graisse. Les noms standards partagent `letter-spacing: -.2px`. Les grandes valeurs square, Flow et les températures principales partagent `-.7px`; les petits textes et les titres possèdent leurs réglages de lisibilité propres. Utiliser `font-variant-numeric: tabular-nums` pour les valeurs principales compact/square, les mesures room/Flow, les températures et mesures Weather et les valeurs Wind Rose. Vérifier cette propriété calculée : une remise à zéro `font: inherit` sur un bouton peut l'annuler malgré une déclaration dans le CSS.

Les onglets de période restent en graisse normale dans les deux états. La sélection est indiquée par la surface, l'ombre et la couleur primaire. Ne pas ajouter du gras uniquement dans l'un des deux modules.

### Opacité et lisibilité

Le texte secondaire ordinaire utilise `secondary-text-color` avec **`opacity: 1`**. Ne pas cumuler cette couleur avec l'opacité native de `.bubble-state` : Bubble Card 3.4.1 y applique `0.7`, ce qui atténue une seconde fois le texte. La correction concerne aussi cover, climate et media.

Conserver les opacités qui expriment un état fonctionnel : icône désactivée, indisponibilité, interrupteur ou option explicite de l'utilisateur. Une règle destinée au texte ne doit pas réactiver un élément masqué ni rendre une commande indisponible active.

Le thème livré hérite des couleurs de texte et des surfaces Home Assistant. Le contraste dépend donc de la palette native ou personnalisée active ; contrôler la couleur finalement composée, particulièrement sur les surfaces teintées.

### Adaptations intentionnelles

| Élément | Règle de densité conservée |
|---|---|
| Flow, canvas inférieur à 352 px | Valeur principale = `max(18px, valeur - 2px)` ; slots 4/6 = `max(16px, valeur - 8px)` ; leurs unités utilisent la légende de 12 px |
| Flow, canvas plus large | Slots 4/6 = `max(16px, valeur - 4px)` ; leurs unités utilisent le secondaire de 13 px |
| Flow, canvas inférieur à 460 px | Connexions et positionnement passent au layout étroit ; ce seuil porte sur le canvas, pas sur la fenêtre |
| Weather, conteneur au plus égal à 360 px | Température actuelle = `max(20px, température - 4px)` ; prévision haute = 18 px, ou 15 px dans `ranges` |
| Weather, conteneur plus large | Prévision haute = 20 px dans `ribbon`/`summary`, 16 px dans `ranges` ; prévision basse = secondaire de 13 px |
| Room, température principale | `clamp(20px, 14cqw, température)` ; valeur maximale 30 px par défaut |
| Room, mesures dans l'en-tête | Température de 20 px dans un espace de 82 px ; texte de température non numérique = 15 px |
| Compact, valeur textuelle à droite | 16 px, graisse normale ; conserver la place pour accents et descendantes |
| Room, état natif affiché | 17 px, interligne 22 px ; masque les mesures room redondantes |
| Signature title | Titre de section 18 px ; distinct du grand header et du nom d'une carte |
| Durées composées Signature | Unités de 10 px en compact standard, 13 px en compact valeur, 11 px pour l’état room, 16 px en square ; conserver les espaces entre nombres et unités |

Les nombres Flow trop longs sont ajustés par le mécanisme existant de mesure de largeur, en conservant la taille de l'unité. Les noms et textes secondaires peuvent être tronqués lorsque le layout le prévoit. Ne pas appliquer cette réduction de police à tous les textes.

Les libellés cardinaux Wind Rose sont des textes SVG dans un `viewBox` de 320 unités : une taille CSS de 12 correspond à 12 unités avant mise à l'échelle. Leur taille physique suit la largeur réelle du SVG, plafonnée à 360 px. Ne pas présenter cette valeur comme 12 pixels à toutes les largeurs.

Le pied de carte Wind Rose affiche la direction dominante à gauche et sa fréquence à droite. Ses libellés utilisent la légende de 12 px ; ses valeurs utilisent `signature-name-font-size` (14 px), la graisse moyenne 500 et des chiffres tabulaires. La fréquence reprend le pourcentage du secteur dominant hors calme et données manquantes ; la période reste dans le sélecteur supérieur.

### Interlignes et changements de taille

Le titre du morceau et l'artiste du lecteur média utilisent un interligne sans unité de 1,3, résolu selon leur propre taille de police. Le secondaire Signature utilise `max(16px, secondaire * 1.2)`. La dernière ligne de grille square utilise la même formule. Flow réserve au moins 17 / 34 / 16 px à ses trois lignes, puis augmente chacune selon la taille de son texte multipliée par 1,2. Le nom compact utilise `max(16px, nom * 1.1)` et sa limite de deux lignes suit cet interligne.

Ne pas modifier une taille sans vérifier la hauteur de ligne, la ligne de grille, les limites de boîte et les ellipses associées. Les cartes compactes de 56 px et certains espaces room restent contraints : les variables ne promettent pas une adaptation illimitée au grossissement du texte. Pour une augmentation importante, adapter aussi le layout. Le test 18 px pour les noms / 17 px pour le secondaire vérifie les règles partagées, pas l'absence de toute troncature dans une carte compacte.

## 3. Couleurs, fonds et ombres

| Élément | Clair | Sombre |
|---|---|---|
| Surface de carte | `ha-card-background`, sinon `card-background-color` natif | Même cascade native |
| Fond principal | Home Assistant natif | Home Assistant natif |
| Texte primaire | `primary-text-color` natif | `primary-text-color` natif |
| Texte secondaire | `secondary-text-color` natif | `secondary-text-color` natif |
| Bordure de carte | 5 % du texte primaire dans transparent | Même mélange |
| Séparateur | 8 % du texte primaire dans transparent | Même mélange |
| Ombre de carte | `0 2px 10px rgba(0,0,0,.035)` | `0 2px 10px rgba(0,0,0,.20)` |
| Fond de contrôle | 5 % du texte primaire dans la surface de carte | Même mélange |
| Ombre de contrôle | `0 1px 4px rgba(0,0,0,.06)` | `0 1px 4px rgba(0,0,0,.25)` |

Le thème Signature ne remplace aucune couleur globale de Home Assistant : conserver les fonds de page, surfaces, textes, accents, en-tête et barre latérale natifs. Il ajuste la typographie, les arrondis et l'ombre des cartes natives. Ses variables Bubble globales ajustent seulement les arrondis ; ne pas y ajouter un fond, une bordure ou une ombre qui s'appliquerait aussi aux séparateurs. Hors thème, conserver les replis de la section 1. Le fond des groupes de période utilise `signature-control-background`, puis un mélange de 5 % de texte primaire dans la surface neutre. Leur onglet sélectionné reprend la surface de carte.

Le fond d'icône Signature et Flow mélange 16 % de l'accent dans la surface neutre. Les options explicites de couleur et de teinte restent fonctionnelles. Les valeurs météo froides/chaudes utilisent `signature-weather-cool-color` (`#8bc3d2`) et `signature-weather-warm-color` (`#e9ac70`). La rose utilise `signature-wind-rose-color` (`#4db6ac`). Les couleurs des conditions météo et les alertes portent une information ; ne pas les remplacer uniformément par une couleur décorative.

## 4. Arrondis et contrôles

| Élément | Variable ou dérivation | Défaut |
|---|---|---|
| Carte visible | `signature-card-border-radius` | 22 px |
| Icône principale | `signature-icon-border-radius` | 12 px |
| Petite icône Flow | `signature-icon-small-border-radius`, sinon `max(0px, rayon icône - 2px)` | 10 px |
| Boutons natifs cover/media et contrôles Signature | `signature-control-border-radius` via les variables Bubble adaptées | 14 px |
| Groupe de périodes | `signature-control-border-radius` | 14 px |
| Bouton de période intérieur | `max(0px, rayon contrôle - 3px)` | 11 px |
| Infobulle Wind Rose | `signature-tooltip-border-radius`, sinon rayon d'icône | 12 px |
| Ombre d'infobulle | `signature-tooltip-box-shadow`, sinon `signature-control-box-shadow`, sinon ombre de contrôle claire | Dépend du mode |

Weather et Wind Rose partagent les métriques suivantes : padding du groupe 3 px, écart entre boutons 3 px, padding horizontal d'un bouton 10 px, police secondaire 13 px, hauteur minimale `signature-control-height` de 40 px. Avec `pointer: coarse`, utiliser `signature-control-touch-height` de 44 px. Le groupe Weather est inline ; le groupe Wind Rose occupe sa largeur disponible. Cette différence de placement est intentionnelle.

L'état inactif utilise la couleur secondaire ; l'état sélectionné la couleur primaire. Le focus clavier possède un contour visible de 2 px, conserve l'arrondi réglé et ne change pas la taille du bouton. Tester un rayon personnalisé de 9 px : le rayon intérieur doit devenir 6 px, au clavier comme à la souris.

Les formes circulaires (`50%`), les boutons de contrôle room, les pistes de 6 px, les repères SVG et le switch visuel Signature de 48 × 28 px avec poignée de 24 px ont une géométrie propre. Les pilules du header gardent leur rayon de 24 px. Les petits rayons des zones de focus Flow et de ses nœuds sont internes au diagramme. Ces exceptions ne remplacent pas les rayons des cartes et des groupes partagés.

## 5. Traits, longueurs et espacements

Les séparateurs horizontaux room, Weather et Wind Rose sont des lignes décoratives de **1 px**, sans interception des événements. Couleur : `signature-divider-color`, sinon mélange de 8 % du texte primaire dans transparent. Leur retrait est `signature-divider-inset`, par défaut **16 px à partir du bord intérieur de la carte**.

La longueur vaut donc `largeur intérieure - 2 × retrait`. Une bordure extérieure de 1 px ajoute 1 px au retrait mesuré depuis l'extérieur : une valeur de 16 px se mesure à 17 px du bord extérieur. `0px` couvre la largeur intérieure ; `24px` raccourcit le trait. Utiliser une longueur CSS non négative.

Les lignes de prévision Weather sont placées dans des lignes déjà rembourrées. Compenser ce padding une seule fois : le retrait final doit rester identique à celui de room et Wind Rose sur mobile comme sur bureau. Ne pas déplacer les textes pour corriger le trait. Un pseudo-élément qui s'étend dans ce padding avec un retrait nul n'est pas un débordement du texte.

| Trait ou repère | Épaisseur | Rôle |
|---|---|---|
| Bordure de carte | 1 px CSS | Surface commune |
| Séparateur horizontal | 1 px CSS | Structure commune |
| Connexion et flèche Flow | 1,7 unité SVG ; ligne d'opacité 0,35 | Flux ; longueur issue des nœuds et de la valeur affichée |
| Grille Wind Rose | 0,7 unité SVG | Repère de lecture |
| Bord de secteur Wind Rose | 0,6 unité SVG ; 1,2 sélectionné/focus | Distribution et sélection |
| Soulignement de prévision Weather | 2 px CSS | Sélection locale |

Ne pas donner une longueur fixe commune aux connexions Flow et aux séparateurs : leurs rôles diffèrent. Flow conserve le dégagement de 12 px après les valeurs des sources horizontales et sa géométrie responsive.

Conserver les densités existantes : 10 px pour le contenu compact/square, 12 px pour le contenu room, 14 px pour l'enveloppe Flow, généralement 16 px pour les sections Weather et Wind Rose. Les adaptations étroites de Weather restent propres à ses sections. Ne pas imposer le même padding à tous les modules.

## 6. Comportement et maintenance

Une correction de style doit conserver les entités, le formatage localisé, les unités, les actions natives, les cibles `more-info`, les conditions d'affichage et les contrôles numériques. Ne pas réactiver `.hidden` ou `[hidden]`. Conserver les nœuds auxquels Bubble attache ses événements ; séparer visuellement une unité sans remplacer une commande par du texte inerte.

Les modules autonomes Flow, Weather et Wind Rose remplacent leur contenu natif et s'utilisent sans le module de design Signature sur la même carte. Aucun besoin de `card-mod`, de police externe ou d'une dépendance npm dans Home Assistant. Les dépendances du dépôt servent uniquement au développement.

Une variation de thème ne doit déclencher ni abonnement, ni requête d'historique, ni timer supplémentaire. Les abonnements, observateurs, animations et listeners existants doivent être libérés au teardown. Respecter `prefers-reduced-motion` dans Flow. Ne pas ajouter une boucle permanente de lecture des styles pour maintenir l'harmonie ; conserver les mesures de géométrie déjà nécessaires au diagramme.

## 7. Contrôles obligatoires lors d'une évolution

Depuis la racine, avec Node.js 22 ou plus récent :

```sh
npm ci --ignore-scripts
npm test
npx playwright install chromium
npm run test:styles
```

Sur une machine qui possède déjà un Chromium compatible, `BUBBLE_STYLE_BROWSER_PATH` peut fournir son chemin. Les 18 tests navigateur lisent les distributions réelles et exécutent leur code dans un DOM minimal reproduisant les points de cascade natifs concernés. Les palettes de l'hôte sont des fixtures indépendantes du thème ; elles vérifient l'héritage et les changements de mode, sans figer les couleurs d'une version Home Assistant. Les contrôles couvrent aussi les titres transparents avec des surfaces Bubble globales et une surface extérieure en ligne. Les tests fonctionnels vérifient séparément les entités, actions, caches, abonnements et métadonnées.

| Dimension à contrôler | Cas requis |
|---|---|
| Largeur de carte | 288, 328, 358, 382 et 600 px |
| Thème | Clair, sombre, changement de mode sur les mêmes nœuds |
| Replis | Sans thème Signature, fonds HA contradictoires, ombre HA explicite, ombre `none` |
| Texte | Noms longs/accentués, nombres longs, état indisponible, secondaire présent/absent |
| Personnalisation | Nom 18 px, secondaire 17 px, carte 18 px, icône 8 px, contrôle 9 px, petits rayons explicites |
| Traits | Retraits 0 / 16 / 24 px, y compris lignes Weather déjà rembourrées |
| Interaction | Pointeur fin/grossier, focus clavier, mouvement réduit |
| Modules | Compact standard/valeur, square fixe/auto, room avec/sans contrôles, header/title, média, cover, climate, number, Flow, trois layouts Weather, Wind Rose, boutons cover/media natifs sans module Signature |

Comparer des **styles calculés** et des dimensions réelles, pas seulement des chaînes trouvées dans le YAML. Une capture sert à inspecter l'équilibre, la hiérarchie et les espacements ; elle ne prouve pas à elle seule une valeur exacte. Une fixture minimale ne remplace pas une exécution dans Home Assistant.

Pour un contrôle d'intégration visuelle, importer les distributions et le thème mis à jour dans Home Assistant, puis vérifier les mêmes cartes sur le navigateur et le téléphone utilisés. L'audit initial a aussi utilisé les feuilles natives de [Bubble Card 3.4.1, commit 061ed837](https://github.com/Clooos/Bubble-Card/tree/061ed8376134307ba1086446869d0ab736265fcf) dans des fixtures Chromium. Cela documente la cascade inspectée, sans identifier la version réellement installée chez l'utilisateur. Safari/iOS et une instance Home Assistant réelle ne sont pas couverts par la suite Chromium du dépôt.

Lors d'un changement livré : augmenter la version du module concerné, maintenir sa version interne de runtime lorsqu'elle existe, mettre à jour le tableau du [README](README.md), son guide et ses notes de version. Si une règle commune évolue, modifier ce document et [le guide du thème](themes/README.md) dans le même changement. Vérifier les tests et les jobs GitHub Actions sur le commit publié. Un push GitHub ne met pas à jour les modules déjà importés dans Home Assistant.

## 8. Performances et volume CSS

Mesurer séparément le YAML importé, le CSS retourné par le module et le CSS nettoyé par Bubble. Bubble Card 3.4.1 enlève déjà espaces et commentaires et réutilise un résultat de nettoyage lorsque la chaîne CSS est inchangée. Ajouter un minificateur à chaque exécution ne réduit donc pas le CSS final et ajoute du travail. Une réduction du CSS ne constitue pas une mesure du temps de chargement complet de Home Assistant.

Conserver les caches par carte : ils doivent suivre la configuration, le layout et la géométrie sans interrompre les lectures d'entités suivies par Bubble. Flow réutilise sa chaîne CSS lorsque la hauteur effective est inchangée. Signature ne livre que le layout actif, réutilise la géométrie des interrupteurs et évite de peindre deux fois les couleurs automatiques d'une commande room avec un style explicite. Les règles de typographie secondaire communes ne doivent pas être répétées dans chaque layout.

Les modules et cartes possèdent leurs propres portées de style. Des tokens communs répétés dans deux distributions autonomes ne sont pas nécessairement des doublons supprimables. Ne pas ajouter une feuille globale, une requête réseau ou une dépendance de runtime pour quelques déclarations communes. Lors d'un regroupement de sélecteurs, préserver leur spécificité, leur ordre utile et les possibilités de personnalisation.

Mesures du 4 octobre 2026 : octets UTF-8 après le nettoyage réel de Bubble Card 3.4.1, comparés au commit `d31eae6`. Les fixtures utilisent un bouton state natif, une valeur de 2,5 kW, le secondaire `65 %` quand indiqué, cinq commandes room allumées avec une couleur explicite, ou des interrupteurs allumés de couleur teal. Ce tableau mesure les styles d'une carte, avec ces options précises.

| Configuration | Avant | Après | Réduction |
|---|---:|---:|---:|
| Compact standard | 5 249 | 5 249 | 0 % |
| Compact avec secondaire | 5 955 | 5 775 | 3,0 % |
| Square avec secondaire | 5 554 | 5 424 | 2,3 % |
| Room, cinq commandes avec styles | 11 313 | 9 847 | 13,0 % |
| Compact, deux interrupteurs | 7 843 | 7 288 | 7,1 % |
| Compact, quatre interrupteurs | 10 437 | 8 586 | 17,7 % |
| Compact, huit interrupteurs | 15 625 | 11 182 | 28,4 % |

Un seul interrupteur passe de 6 546 à 6 639 octets : les propriétés CSS permettant le regroupement ajoutent 93 octets. Le gain apparaît à partir de deux interrupteurs. Flow conserve un volume CSS identique ; son changement concerne la réutilisation de la chaîne. Les mesures Node de mises à jour sur DOM simulé ne démontrent pas un gain de temps de chargement complet, et ne doivent pas être présentées comme tel.

Les tests vérifient la réutilisation des caches, les lectures suivies, les couleurs et opacités indépendantes des interrupteurs, leurs dimensions et positions de poignée, le changement de thème sans réexécution et le retrait de leurs styles après remplacement de configuration. Cette validation reste limitée aux fixtures et à Chromium ; Home Assistant réel et Safari/iOS restent à contrôler sur l'installation utilisée.

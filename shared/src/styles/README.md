# Fragments CSS communs

Les huit modules Signature consomment les fragments utiles à leurs rôles visuels. Le build développe les inclusions dans leurs sources puis minifie le résultat : chaque YAML `dist` reste autonome, sans feuille globale ni fonction de style supplémentaire à exécuter dans Home Assistant.

| Fragment | Rôle et consommateurs |
|---|---|
| `card-surface.css`, `card-frame.css`, `card-radius.css` | Surfaces et valeurs de secours communes ; propriétés natives Bubble pour Square, Compact, Room et Header, propriétés du conteneur pour Flow/Weather/Wind Rose, surface et rayon pour Navigation |
| `font-family.css` | Police commune aux huit modules, y compris titres Header et lecteur Compact |
| `name.css`, `secondary.css`, `value.css`, `unit.css` | Rôles typographiques de Square, Compact, Room, Flow, Weather et Wind Rose ; les tailles particulières restent explicites |
| `divider-color.css`, `divider.css` | Couleur et trait communs à Room, Weather et Wind Rose ; position et visibilité propres au module |
| `control-surface.css`, `period-tabs.css`, `period-tab.css`, `period-tab-selected.css` | Surfaces et états des onglets Weather/Wind Rose ; répartition et disposition locales |
| `focus-ring.css` | Anneaux de focus Compact, Flow, Weather, Wind Rose et Navigation ; accent et retrait adaptés au contrôle |

Les défauts des fragments de contrôle et d’onglets comprennent la cascade complète des surfaces natives ; une inclusion sans paramètre reste utilisable sans thème Signature.

Les sélecteurs restent dans les modules. Header conserve sa transparence ; Navigation conserve son verre et son ombre flottante. Les grilles, hauteurs, seuils responsive, accents, états natifs et actions restent locaux. Alert Manager hérite du style de la carte et conserve son badge et ses couleurs d'alerte ; il n'impose pas de surface Signature.

## Utilisation au build

Une directive occupe sa propre ligne dans un bloc CSS, y compris à l'intérieur d'un template JavaScript :

```css
[data-signature-weather] .sw-tabs {
  display: inline-flex;
  /* @include shared/src/styles/period-tabs.css {"BACKGROUND":"var(--sw-track)"} */
}
```

Les paramètres sont des chaînes JSON sur une ligne. Les noms correspondent aux marqueurs `@@NOM@@` du fragment. La première ligne `/* @defaults {...} */` fournit les valeurs par défaut ; un paramètre transmis remplace seulement la valeur de cette inclusion. Les fragments peuvent inclure d'autres fragments en leur passant explicitement des paramètres. Les valeurs par défaut et directives disparaissent du résultat.

Le build refuse les paramètres manquants, inconnus, non textuels, les directives mal formées, les fichiers absents et les cycles. Il ne lit ni n'évalue les variables du thème : les `var(--signature-*)` et leurs replis restent dans le CSS livré.

`card-frame.css` permet de nommer les propriétés de rayon, bordure et ombre pour les conteneurs ou les variables natives `--bubble-*`. `IMPORTANT` et `SHADOW_IMPORTANT` restent séparés pour préserver la cascade de Flow. La remise à zéro `font: inherit` de Wind Rose reste avant le fragment d'onglet ; les chiffres tabulaires de Weather restent après sa remise à zéro native.

## Modifier un rôle commun

Lire [STYLE_GUIDE.md](../../../STYLE_GUIDE.md), modifier le fragment puis actualiser les versions et guides de tous ses consommateurs, y compris indirects. Les styles de disposition sont dans `signature-*/src/presentation.css` ou `presentation.css.js` ; ceux des titres et du lecteur sont dans `title.js` et `media.js`.

```sh
npm run build:modules
npm run check:modules
npm test
npm run test:styles
```

Le workflow GitHub existant suit déjà `**/src/**` : une modification de ces fragments déclenche la reconstruction des distributions. Les fixtures Chromium vérifient les styles calculés, les changements de thème et les états de contrôle ; elles ne constituent pas un test dans Home Assistant ou Safari/iOS.

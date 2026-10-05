# Signature theme

Module distributions are minified during the repository build. Theme variables remain in the shipped CSS and continue to follow live theme changes; their names and fallback values are preserved. See the [build guide](../shared/README.md#distributions-minifiées).

The eight Signature modules also assemble their common CSS declarations from [shared style fragments](../shared/src/styles/README.md). Theme values and CSS rules therefore have common sources, while module layouts remain independent. Every distribution embeds its applicable fragments and requires no extra stylesheet.

The optional [signature.yaml](signature.yaml) theme provides light and dark modes for Home Assistant, native Bubble cards, and the Signature modules. It keeps Home Assistant's native palette, page backgrounds and card surfaces, while adding system fonts, 22 px card corners, a shared subtle 1 px border and card shadows. The border and control tracks derive from the inherited text color. No card-mod, font download or extra JavaScript is required.

## Installation

1. Copy [signature.yaml](signature.yaml) to `/config/themes/signature.yaml`.
2. Merge the following into the existing `frontend` section in `configuration.yaml`; do not add a second `frontend` key:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

3. Restart Home Assistant if you have just enabled themes. If theme loading was already configured, run `frontend.reload_themes` from Developer tools > Actions.
4. Select **Signature** in your Home Assistant profile and choose light, dark or automatic mode. A view-level or card-level theme override takes precedence for that view or card.
5. Import the current distributions listed in the [module table](../README.md) to enable their shared styling variables. The former combined Signature module has been replaced by Square, Compact, Room and Header. Header keeps section titles transparent, without a border or shadow.

When replacing an earlier Signature theme, replace the whole file rather than merging the old palette keys into this version, then run `frontend.reload_themes`. If the old appearance remains visible, select the theme again or refresh the frontend.

Signature Wind Rose 1.3.0 also uses these variables; import its [distribution](../signature-wind-rose/dist/signature-wind-rose.yaml) when using the wind rose card.

Signature Navigation 1.0.8 uses the shared surface, font and card radius for its floating footer. Import its [distribution](../signature-navigation/dist/signature-navigation.yaml) separately and follow its [guide](../signature-navigation/doc/README.md) to replace the inline navigation styles.

The theme can be used on its own. Older modules retain their hard-coded styles until their updated YAML distributions are imported. Custom cards only honor the theme variables they consume; a theme cannot replace a card's hard-coded CSS or canvas drawing styles. Some Home Assistant appearance variables are internal and can change between frontend versions.

## Global variables and module variables

Home Assistant variables such as `ha-card-border-radius` and `ha-font-family-body` affect compatible native components while this theme is active. The theme inherits native color variables such as `primary-text-color` instead of replacing them. Its `bubble-*` variables adjust corners only; it sets no global Bubble background, border or shadow that could turn a separator into a pill. Cover and media-player buttons explicitly use `signature-control-border-radius` (14 px by default), rather than falling back to the 22 px card radius.

Compatible `ha-card` frames use `ha-card-border-color: var(--signature-card-border-color)` and `ha-card-border-width: 1px`, alongside the existing shared radius and shadow. In Statistics Graph Chart Card, use `card_border: true` (or omit the default-on option); `card_border: false` explicitly removes the border and takes precedence over the theme. Leave custom border color and width unset to inherit the theme. Existing explicit card backgrounds, radii and shadows remain valid overrides. Reload the theme and import the updated dashboards; no module reimport is needed for this theme-only change.

The `signature-*` prefix is a namespace, not a CSS scope. These custom properties are inherited like other theme properties, but only modules that reference them use their values. You can define them in any other theme or in a card's `styles`. Do not include the leading `--` in Home Assistant theme YAML; include it in CSS.

Signature, Flow, Weather and Wind Rose share the same neutral surface, border, shadow and system-font fallbacks, including without this theme. Role-based value sizes and layout density remain distinct. Navigation derives its translucent glass from the shared surface and keeps a directional rim and its own floating shadow. Alert Manager remains usable with native Bubble cards and without Signature. Its neutral badge inherits the native text color and card surface even without this theme; alert colors and explicit card options retain precedence.

The browser resolves the variables directly. Changing the theme or its mode does not require entity changes, JavaScript style lookups, a new subscription, or rebuilding cached module CSS.

## Shared module variables

| Theme key | Purpose | Signature theme value |
|---|---|---|
| `signature-font-family` | Font stack for Signature, Flow, Weather, Wind Rose and Navigation | System fonts, Apple first |
| `signature-font-weight-normal` | Ordinary text and units | `400` |
| `signature-font-weight-medium` | Main numeric values | `500` |
| `signature-font-weight-semibold` | Names and emphasized text | `600` |
| `signature-font-weight-bold` | Large Signature headings | `700` |
| `signature-name-font-size` | Standard compact/square/room, Flow, Weather and Wind Rose names | `14px` |
| `signature-secondary-font-size` | Secondary text, media states and period selectors | `13px` |
| `signature-caption-font-size` | Weather details, rose labels and small measurements | `12px` |
| `signature-value-font-size` | Square and Flow primary values | `28px` |
| `signature-compact-value-font-size` | Compact numeric values | `20px` |
| `signature-temperature-font-size` | Room and current-weather temperatures | `30px`; responsive layouts may reduce it |
| `signature-value-unit-font-size` | Square and primary Flow units | `16px` |
| `signature-temperature-unit-font-size` | Room and current-weather temperature units | `13px` |
| `signature-card-background` | Neutral card surfaces and Navigation glass base | `var(--ha-card-background, var(--card-background-color))` |
| `signature-card-border-radius` | Main card corners and Navigation outline | `22px` |
| `signature-card-border-color` | Subtle main card border | 5% primary text in transparent |
| `signature-card-box-shadow` | Main card shadow | Mode-specific |
| `signature-divider-color` | Room, Weather and Wind Rose dividers | 8% primary text in transparent |
| `signature-divider-inset` | Horizontal divider margin from each card edge | `16px` |
| `signature-icon-border-radius` | Main icon corners | `12px` |
| `signature-icon-small-border-radius` | Small Flow icon corners | Main icon radius minus `2px`, at least zero |
| `signature-control-border-radius` | Signature controls, period groups and native Bubble buttons | `14px` |
| `signature-control-height` | Period buttons with a fine pointer | `40px` |
| `signature-control-touch-height` | Period buttons with a coarse pointer | `44px` |
| `signature-tooltip-border-radius` | Wind Rose tooltip corners | Shared icon radius |
| `signature-tooltip-box-shadow` | Wind Rose tooltip shadow | Shared control shadow |
| `signature-control-background` | Weather and Wind Rose period-control tracks | 5% primary text in the native card surface |
| `signature-control-box-shadow` | Weather and Wind Rose selected-tab shadow | Mode-specific |
| `signature-alert-badge-background` | Alert Manager badge fill | Card surface |
| `signature-alert-badge-neutral-color` | Alert badge when `color_badge: false` | Primary text color |
| `signature-weather-cool-color` | Low end of Weather temperature ranges | `#8bc3d2` |
| `signature-weather-warm-color` | High end of Weather temperature ranges | `#e9ac70` |
| `signature-wind-rose-color` | Single color for wind direction sectors | `#4db6ac` |

Horizontal dividers in Signature room cards, Weather and Wind Rose share a 1 px line with a 16 px inset from each card edge, even without the theme. `signature-divider-inset` changes only the line, not the surrounding text or controls. Weather forecast-row padding is accounted for on desktop and mobile, so the inset is not applied twice. Use a non-negative CSS length such as `24px` for a shorter line, or `0px` to span the card's inner width. Flow and Alert Manager have no horizontal dividers.

Period groups have 3 px padding and gaps; their inner button radius is the shared control radius minus 3 px, at least zero. Weather keeps an inline group and Wind Rose a full-width group. Ordinary secondary text uses its color at full opacity; inactive/disabled icons retain their native state opacity. Other layout dimensions, responsive value sizes, spacing and actions remain module-specific. Font overrides must be checked at narrow widths; fixed compact heights are not an unlimited text-zoom layout. Main and secondary text colors continue to use Home Assistant's `primary-text-color` and `secondary-text-color`. Explicit card accents and borders take precedence as before.

Navigation has a 64 px bar with 52 px route cells and a uniform 6 px inner inset. Its selection and hover use the card radius minus 6 px, at least zero (16 px with this theme), so their corners follow the bar. They do not use the independent icon radius. Its icons measure 26 px. The active icon and keyboard focus inherit `primary-text-color`; the inactive icons inherit `secondary-text-color`. The selection mixes 12% primary text into the card surface and uses that mix at 65% opacity, giving a visible darker tint in light mode and a lighter tint in dark mode with a subtle shadow. The rim and selection/hover reflections mix 90% of the inherited card surface with 10% white, keeping them subdued in dark mode and following live theme changes without rerendering. Mobile margins, glass blur and opacity are configured in the module's editor.

Primary numeric displays use tabular figures. This is applied in the modules, including Weather's temperature and measurement buttons, so their font reset does not cancel it; the theme needs no additional typography variable.

For lighter names across the compatible modules, change `signature-font-weight-semibold` to `500`. For a shadow-free interface, set `signature-card-box-shadow` to `none` in both modes. To affect only one card:

```yaml
styles: |
  ha-card {
    --signature-font-weight-semibold: 500;
    --signature-card-box-shadow: none;
  }
```

## References

- [Home Assistant themes](https://www.home-assistant.io/integrations/frontend/)
- [Signature Compact](../signature-compact/doc/README.md)
- [Signature Square](../signature-square/doc/README.md)
- [Signature Room](../signature-room/doc/README.md)
- [Signature Header](../signature-header/doc/README.md)
- [Signature Flow](../signature-flow/doc/README.md)
- [Signature Weather](../signature-weather/doc/README.md)
- [Signature Wind Rose](../signature-wind-rose/doc/README.md)
- [Signature Navigation](../signature-navigation/doc/README.md)
- [Alert Manager](../alert_manager/doc/README.md)


## Modules de présentation autonomes

Signature Compact 1.2.6, Square et Header 1.1.6 et Room 1.0.8 consomment les mêmes variables `signature-*`. Compact applique aussi ces variables aux lecteurs multimédias natifs, avec les mêmes valeurs de secours et sans changer leurs dimensions ou commandes. Le [guide de migration](../signature-shared/doc/MIGRATION.md) décrit leur configuration. Le thème reste facultatif ; les distributions conservent leurs valeurs de secours.

Les caches de ces quatre présentations sont reconstruits lorsqu’une nouvelle version du module remplace leur runtime sur une carte existante. Les variables de thème restent dans le CSS : un changement de thème ou de mode n’impose aucune invalidation de cache.

| Variable supplémentaire | Défaut | Usage |
|---|---|---|
| `signature-header-font-size` | 38 px | Grand en-tête, largeur supérieure à 600 px |
| `signature-header-small-font-size` | 32 px | Grand en-tête, largeur au plus égale à 600 px |
| `signature-title-font-size` | 18 px | Titre de section natif separator |
| `signature-header-button-border-radius` | 24 px | Pilules du grand en-tête |

Ces quatre variables sont utilisées par Signature Header, sans modifier les autres présentations. Le navigateur les résout à chaque changement de thème.

## Maintenance des modules

Toutes les distributions Bubble sont désormais générées depuis leurs sources et les [fonctions communes](../shared/README.md). Le thème reste un fichier YAML directement modifiable ; ses variables CSS sont conservées dans le code généré et résolues à l’exécution par le navigateur.

## Numeric icons and soft backgrounds

Compact 1.2.6, Square 1.1.6 and Header 1.1.6 support opt-in numeric [color thresholds](../signature-shared/doc/COLOR_THRESHOLDS.md). Icon squares and badges mix 16% of the numeric color into the live card surface, matching ordinary Signature icon styling and becoming dark with the theme. Icons carry the exact graph RGB accent; badge labels retain primary theme text. Contrast adaptation has been removed. Main values, card surfaces and alerts remain unchanged. Active thresholds override manual indicator colors, including `icon_color`. The same sRGB surface mix used by ordinary Square icons follows light/dark themes without style reads, observers or a special night-mode branch. No theme YAML update or dashboard migration is required.

Compact 1.2.6, Square/Header 1.1.6 et Room 1.0.8 ancrent le survol natif sur les bords de la carte ; les interrupteurs Compact/Square gardent leur halo dans la piste visible. Les couleurs de survol continuent à hériter du thème Home Assistant, sans changement des variables YAML. Voir le [contrat de survol](../STYLE_GUIDE.md#survol-et-retour-natif-bubble).

## Named colors

Signature, Flow, Wind Rose and Alert Manager resolve named palette colors through the same native theme variables. For example `blue` uses `blue-color` with fallback `#2196f3`. Flow 3.6.0, Wind Rose 1.3.0 and Alert Manager 3.7.0 replace their former literal CSS-name overrides; use `#0000ff` for literal CSS blue. Explicit CSS colors and semantic defaults remain available. Invalid Wind Rose colors restore its default wind accent.

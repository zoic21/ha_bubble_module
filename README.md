# Home Assistant Bubble Modules

Reusable modules for [Bubble Card](https://github.com/Clooos/Bubble-Card).

| Module | Version | Distribution | Documentation |
|---|---|---|---|
| Signature Square — square tiles | 1.1.7 | [signature-square.yaml](signature-square/dist/signature-square.yaml) | [Guide](signature-square/doc/README.md) |
| Signature Compact — information, control rows and media players | 1.4.3 | [signature-compact.yaml](signature-compact/dist/signature-compact.yaml) | [Guide](signature-compact/doc/README.md) |
| Signature Room — room summaries and controls | 1.0.10 | [signature-room.yaml](signature-room/dist/signature-room.yaml) | [Guide](signature-room/doc/README.md) |
| Signature Header — page headers and section titles | 1.1.13 | [signature-header.yaml](signature-header/dist/signature-header.yaml) | [Guide](signature-header/doc/README.md) |
| Signature Flow — six configurable flow slots | 3.6.0 | [signature-flow.yaml](signature-flow/dist/signature-flow.yaml) | [Guide](signature-flow/doc/README.md) |
| Signature Weather — forecasts and optional local measurements | 1.3.4 | [signature-weather.yaml](signature-weather/dist/signature-weather.yaml) | [Guide](signature-weather/doc/README.md) |
| Signature Wind Rose — wind direction frequencies | 1.5.3 | [signature-wind-rose.yaml](signature-wind-rose/dist/signature-wind-rose.yaml) | [Guide](signature-wind-rose/doc/README.md) |
| Signature Navigation — floating glass footer | 1.0.8 | [signature-navigation.yaml](signature-navigation/dist/signature-navigation.yaml) | [Guide](signature-navigation/doc/README.md) |
| Alert Manager — alert badges and optional card tint | 3.7.0 | [alert_manager.yaml](alert_manager/dist/alert_manager.yaml) | [Guide](alert_manager/doc/README.md) |

The eight Signature modules share [CSS source fragments by visual role](shared/src/styles/README.md), assembled during the build into autonomous distributions.

Each module has its own folder: `src` contains its editable sources, `dist` contains the generated complete YAML file to import and `doc` contains its documentation. Existing modules keep their own `test` folders; the four standalone presentation modules share behavior and build tests in `signature-shared/test`.

The suites share [test helpers](shared/test/README.md) for DOM fixtures, isolated editor environments and distribution loading. Module-specific simulations and assertions stay in their own suites.

## Installation

1. Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools).
2. Download the module's YAML file from its `dist` folder.
3. In the Bubble Card editor, open **Modules** and import the complete file, or paste its contents into the manual import field.
4. Add the module ID to the card's `modules` list.
5. Configure the options described in the module guide, then reload the dashboard if needed.

Distribution files include metadata and code. Import them as modules; they are not dashboard cards to paste directly into a view.

## Module IDs

The YAML IDs are `signature_square`, `signature_compact`, `signature_room`, `signature_header`, `signature_flow`, `signature_weather`, `signature_wind_rose`, `signature_navigation` and `alert_manager`. Standalone Signature folders use hyphens in place of their module ID's underscore.

## Updates and Module Store

This repository contains the distributions and documentation. It does not automatically publish modules to the Module Store.

Publishing to the store requires a separate discussion for each module in [Share your Modules](https://github.com/Clooos/Bubble-Card/discussions/categories/share-your-modules), including its complete export and a screenshot. The store discussions have not been created yet.

For a manual installation, import the updated YAML file again. For a store release, update the YAML in the same discussion and increase the version. A commit in this repository does not, by itself, update modules installed in Home Assistant.

## Standalone Signature presentations

Square, Compact, Room and Header are separate, autonomous modules with French forms limited to their own options. Their module choice replaces `layout`; Header selects page/header or section/title from the native card type. Section titles keep their native badge group beside the label when it fits, or move the whole group below and wrap its badges within the column, on desktop and mobile. Every wrapped row starts at the left edge; badges keep their natural widths. Compact also styles native media-player cards, preserving their artwork, controls and dimensions. Use one presentation module per card, with optional Alert Manager. The legacy `signature` module has been removed after checking the Home Assistant configuration export. Older installations must migrate every card before deleting their installed copy. See the [migration guide](signature-shared/doc/MIGRATION.md) and [shared-source build instructions](signature-shared/README.md).

The optional Signature theme supplies common CSS appearance variables; each module owns its layout and controls. Shared JavaScript and CSS source files are assembled at build time, so no base module or runtime import is needed.

Compact can display its main value as a small clickable button (`value_style: button`): 14px value, 12px unit, placed before native commands, with visual switches last in their native group. Set `value_background: false` to keep that value clickable without a pill background. Compact also supports an optional proportional `fill`: a live reference entity or a fixed maximum, with a soft 16% accent over the theme surface. It preserves native switches, selects and Alert Manager badges; three or more controls wrap below the value on narrow gauge cards. See the [Compact guide](signature-compact/doc/README.md#remplissage-proportionnel).

Compact and Square support numeric `color_thresholds.values` on their main icons; all three modules also support existing sub-button badges, including Header section titles. Surfaces mix only 16% of the threshold color into the live theme surface, just like ordinary Signature icons. Icons match the graph's RGB accent without any contrast adaptation; badge labels keep theme text. Header also keeps theme text on every ordinary badge and button label, including slider values, while preserving their icon colors, fills and functional opacity. See the [shared threshold guide](signature-shared/doc/COLOR_THRESHOLDS.md). Room, native controls and Alert Manager retain their behavior.

## Source maintenance

All nine module YAML distributions are generated and minified: local JavaScript identifiers and expressions, complete embedded stylesheets and YAML metadata. Edit each module’s `src` files and the [common functions](shared/README.md), then run `npm run build:modules` (or `npm run build`) and `npm run check:modules` to test locally. The [automatic build workflow](.github/workflows/build.yml) also rebuilds and validates modules after a source/build/dependency push, then commits changed YAML distributions on the same repository branch. It creates no commit when they are already current. Never edit `dist` directly; versions and documentation remain maintained in the sources. Installation paths and module IDs are unchanged.

## Configuration

Each Signature presentation declares an `editor` schema: open its module in the card editor to configure its options with French labels and collapsible sections. Square, Room and Header expose only their own settings; Compact supports button, cover, climate and media-player cards. Media players expose only their two color options. An inline editor bridge reuses Bubble Card's object-field logic and `visible_if` support without its redundant item header or delete button; it is validated against 3.4.1. Existing YAML configurations remain valid and hidden values are retained. Sub-button style objects, background/opacity scalars and the default-on room color setting use small YAML fields inside the form to preserve their types. Standard controls, entities, and actions remain those provided by Bubble Card.

Signature Flow uses the same inline form under **Modules → Signature Flow**, with common settings and six collapsible slot sections. Values, appearance, formatting, flow entities, global/per-slot animation and native actions are configurable there. Disabled slots, empty secondary text and template values hide irrelevant settings; existing YAML keys and animation inheritance are preserved. It replaces the native button content with a configurable flow diagram; see its [home example](signature-flow/examples/home.yaml). Signature Weather replaces the button content with a forecast ribbon, temperature ranges, or a current-weather summary; see its [local station example](signature-weather/examples/summary-local.yaml).

Signature, Flow, Weather, Wind Rose and Alert Manager editor sections use the native Home Assistant panel radius and follow live theme changes. This styling is scoped to their own groups, preserving native fields, warnings and configuration without changing other Bubble forms.

Signature Wind Rose replaces the button content with a time-weighted, 16-direction wind rose and optional period selector; see its [Ecowitt example](signature-wind-rose/examples/ecowitt.yaml). Set `show_period_buttons: false` to hide the selector and use the configured `hours` period. The footer shows dominant direction, frequency and recorded calm duration when a speed source is configured. Recorded speed history adds four speed bands and a compact legend; sector details show duration, time-weighted mean and maximum speed without duplicating current values from a graph above it.

Weather, Wind Rose and Alert Manager also provide French module forms. Weather exposes all forecast/current settings and ten optional local sources with entity and attribute selectors. Wind Rose exposes sources, history, calm filtering and color. Alert Manager exposes card display, source sensors, colors/icons, activated packs and per-entity exceptions. Repeated pack/entity entries are converted to the existing keyed mappings, retaining inheritance and exclusions. Existing YAML configurations remain valid; automatic defaults are preserved and the visual forms rely on Bubble Card 3.4.1 object helpers.

Signature Navigation styles a native `sub-buttons` footer with a directional glass rim and automatic active-dashboard selection. Icons and navigation actions remain in Bubble's native editor; mobile margins, blur and opacity have their own French module form. It uses a 64 px bar, 26 px icons, concentric selection corners and a visible neutral selection inherited from the light/dark theme. The footer stays below Bubble popups and their backdrop so it cannot cover popup content or intercept clicks through the backdrop. See the [six-route example](signature-navigation/examples/home.yaml) and remove the former navigation `styles` block when adopting it.

## Signature theme

The optional [Signature theme](themes/README.md) provides light and dark modes for Home Assistant and shared CSS variables for the Signature modules and Alert Manager. Compatible native cards share the same 1 px border, radius and shadow; Statistics Graph Chart Card must keep `card_border: true` to show that border. Download [signature.yaml](themes/signature.yaml) and follow the installation guide. No card-mod or additional JavaScript is required.

## Technical style rules

Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before changing the Signature modules or theme. It defines typography roles, exact surface fallbacks, corners, control metrics, divider lengths, intentional layout differences and required computed-style checks.

## Testing

With Node.js 22 or later, run these commands from the repository root:

```sh
npm ci --ignore-scripts
npm run check:modules
npm test
```

Use `npm run test:signature`, `npm run test:signature-flow`, `npm run test:signature-weather`, `npm run test:signature-wind-rose`, `npm run test:signature-navigation` or `npm run test:alert-manager` to test a single existing module. Shared editor round-trip and condition tests are in `editors/test` and read the actual YAML distributions. YAML, Terser and Playwright are development dependencies; none is needed in Home Assistant.

Run `npm run build:modules` after editing any module or common source; `npm run check:modules` rejects stale distributions for all nine modules. See the [shared-source build guide](shared/README.md). `build:signature` and `check:signature` remain available for the four standalone presentations. `npm run test:signature-split` checks the standalone presentation behaviors, editor forms and documentation. `npm run test:styles:split` is a compatibility alias for the full browser suite.

For browser style checks, run `npx playwright install chromium` once, then `npm run test:styles`. These tests load the actual module distributions in a minimal Bubble-shaped DOM and check computed styles, theme switching, keyboard focus, dividers and touch targets. All suites share [browser setup, isolated contexts, error checks and cleanup](styles/README.md). They do not run Home Assistant itself.

GitHub Actions runs the unit tests on Node.js 22 and 24 and browser style checks on Chromium for every push and pull request, and can also be triggered manually. It checks alert sources, filters, caching, translations, numeric controls, metadata, YAML examples, and local documentation links. It does not replace checking the rendered cards in Home Assistant.

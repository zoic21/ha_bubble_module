# Signature theme

The optional [signature.yaml](signature.yaml) theme provides light and dark modes for Home Assistant, native Bubble cards, and the Signature modules. It uses system fonts, 22 px card corners, subtle borders and shadows, white surfaces in light mode, and charcoal surfaces in dark mode. No card-mod, font download or extra JavaScript is required.

## Installation

1. Copy [signature.yaml](signature.yaml) to `/config/themes/signature.yaml`.
2. Merge the following into the existing `frontend` section in `configuration.yaml`; do not add a second `frontend` key:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

3. Restart Home Assistant if you have just enabled themes. If theme loading was already configured, run `frontend.reload_themes` from Developer tools > Actions.
4. Select **Signature** in your Home Assistant profile and choose light, dark or automatic mode. A view-level or card-level theme override takes precedence for that view or card.
5. Import the updated modules to enable their shared styling variables: Signature 2.1.1, Signature Flow 3.1.0, Signature Weather 1.1.1, and Alert Manager 3.5.0.

The theme can be used on its own. Older modules retain their hard-coded styles until their updated YAML distributions are imported. Custom cards only honor the theme variables they consume; a theme cannot replace a card's hard-coded CSS or canvas drawing styles. Some Home Assistant appearance variables are internal and can change between frontend versions.

## Global variables and module variables

Home Assistant variables such as `primary-text-color`, `ha-card-border-radius` and `ha-font-family-body` affect compatible native components while this theme is active. `bubble-*` variables also style compatible native Bubble components.

The `signature-*` prefix is a namespace, not a CSS scope. These custom properties are inherited like other theme properties, but only modules that reference them use their values. You can define them in any other theme or in a card's `styles`. Do not include the leading `--` in Home Assistant theme YAML; include it in CSS.

Module CSS retains its existing values as fallbacks. Without these custom properties, module geometry, font weights and shadows remain as before. Alert Manager remains usable with native Bubble cards and without Signature. The theme adjusts its neutral badge color and background for dark mode; alert colors and explicit card options retain precedence.

The browser resolves the variables directly. Changing the theme or its mode does not require entity changes, JavaScript style lookups, a new subscription, or rebuilding cached module CSS.

## Shared module variables

| Theme key | Purpose | Signature theme value |
|---|---|---|
| `signature-font-family` | Font stack for Signature, Flow and Weather | System fonts, Apple first |
| `signature-font-weight-normal` | Ordinary text and units | `400` |
| `signature-font-weight-medium` | Main numeric values | `500` |
| `signature-font-weight-semibold` | Names, emphasized text and selection | `600` |
| `signature-font-weight-bold` | Large Signature headings | `700` |
| `signature-name-font-size` | Standard compact/square/room, Flow and Weather names | `14px` |
| `signature-secondary-font-size` | Secondary text where the module exposes that role | `13px` |
| `signature-card-background` | Neutral card surfaces | `var(--card-background-color)` |
| `signature-card-border-radius` | Main card corners | `22px` |
| `signature-card-border-color` | Subtle main card border | Mode-specific |
| `signature-card-box-shadow` | Main card shadow | Mode-specific |
| `signature-divider-color` | Room and Weather dividers | Mode-specific |
| `signature-divider-inset` | Horizontal divider margin from each card edge | `16px` |
| `signature-icon-border-radius` | Main icon corners | `12px` |
| `signature-control-border-radius` | Signature and native Bubble button corners | `14px` |
| `signature-control-background` | Weather segmented-control track | Mode-specific |
| `signature-control-box-shadow` | Weather selected-tab shadow | Mode-specific |
| `signature-alert-badge-background` | Alert Manager badge fill | Card surface |
| `signature-alert-badge-neutral-color` | Alert badge when `color_badge: false` | Primary text color |
| `signature-weather-cool-color` | Low end of Weather temperature ranges | `#8bc3d2` |
| `signature-weather-warm-color` | High end of Weather temperature ranges | `#e9ac70` |

Horizontal dividers in Signature room cards and Weather share a 1 px line with a 16 px inset from each card edge, even without the theme. `signature-divider-inset` changes only the line, not the surrounding text or controls. Weather forecast-row padding is accounted for on desktop and mobile, so the inset is not applied twice. Use a non-negative CSS length such as `24px` for a shorter line, or `0px` to span the card's inner width. Flow and Alert Manager have no horizontal dividers.

Other layout dimensions, responsive value sizes, spacing, units and actions remain module-specific. Main and secondary text colors continue to use Home Assistant's `primary-text-color` and `secondary-text-color`. Explicit card accents and borders take precedence as before.

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
- [Signature](../signature/doc/README.md)
- [Signature Flow](../signature-flow/doc/README.md)
- [Signature Weather](../signature-weather/doc/README.md)
- [Alert Manager](../alert_manager/doc/README.md)

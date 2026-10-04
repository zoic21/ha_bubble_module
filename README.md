# Home Assistant Bubble Modules

Reusable modules for [Bubble Card](https://github.com/Clooos/Bubble-Card).

| Module | Version | Distribution | Documentation |
|---|---|---|---|
| Signature — card design | 2.1.0 | [signature.yaml](signature/dist/signature.yaml) | [Guide](signature/doc/README.md) |
| Signature Flow — six configurable flow slots | 3.2.0 | [signature-flow.yaml](signature-flow/dist/signature-flow.yaml) | [Guide](signature-flow/doc/README.md) |
| Signature Weather — forecasts and optional local measurements | 1.1.0 | [signature-weather.yaml](signature-weather/dist/signature-weather.yaml) | [Guide](signature-weather/doc/README.md) |
| Alert Manager — alert badges and optional card tint | 3.5.0 | [alert_manager.yaml](alert_manager/dist/alert_manager.yaml) | [Guide](alert_manager/doc/README.md) |

Each module has its own folder: `dist` contains the complete YAML file to import, `doc` contains its documentation, and `test` contains its tests.

## Installation

1. Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools).
2. Download the module's YAML file from its `dist` folder.
3. In the Bubble Card editor, open **Modules** and import the complete file, or paste its contents into the manual import field.
4. Add the module ID to the card's `modules` list.
5. Configure the options described in the module guide, then reload the dashboard if needed.

Distribution files include metadata and code. Import them as modules; they are not dashboard cards to paste directly into a view.

## Module IDs

The YAML IDs are `signature`, `signature_flow`, `signature_weather` and `alert_manager`. The Signature Flow and Signature Weather folders are named `signature-flow` and `signature-weather`.

## Updates and Module Store

This repository contains the distributions and documentation. It does not automatically publish modules to the Module Store.

Publishing to the store requires a separate discussion for each module in [Share your Modules](https://github.com/Clooos/Bubble-Card/discussions/categories/share-your-modules), including its complete export and a screenshot. The store discussions have not been created yet.

For a manual installation, import the updated YAML file again. For a store release, update the YAML in the same discussion and increase the version. A commit in this repository does not, by itself, update modules installed in Home Assistant.

## Configuration

The distributions do not declare an `editor` schema, so custom options are configured in the card's YAML. Standard controls, entities, and actions remain those provided by Bubble Card. Signature Flow replaces the native button content with a configurable flow diagram; see its [home example](signature-flow/examples/home.yaml). Signature Weather replaces it with a forecast ribbon, temperature ranges, or a current-weather summary; see its [local station example](signature-weather/examples/summary-local.yaml).

## Signature theme

The optional [Signature theme](themes/README.md) provides light and dark modes for Home Assistant and shared CSS variables for all four modules. Download [signature.yaml](themes/signature.yaml) and follow the installation guide. No card-mod or additional JavaScript is required.

## Testing

With Node.js 22 or later, run these commands from the repository root:

```sh
npm ci --ignore-scripts
npm test
```

Use `npm run test:signature`, `npm run test:signature-flow`, `npm run test:signature-weather` or `npm run test:alert-manager` to test a single module. Tests are stored in each module's `test` folder and read the actual YAML distributions. The only npm dependency parses YAML during testing; it is not needed in Home Assistant.

GitHub Actions runs the tests on Node.js 22 and 24 for every push and pull request, and can also be triggered manually. It checks alert sources, filters, caching, translations, numeric controls, metadata, YAML examples, and local documentation links. It does not replace checking the rendered cards in Home Assistant.

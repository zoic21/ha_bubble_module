# Home Assistant Bubble Modules

Reusable modules for [Bubble Card](https://github.com/Clooos/Bubble-Card).

| Module | Version | Distribution | Documentation |
|---|---|---|---|
| Signature — card design | 1.8.28 | [signature.yaml](signature/dist/signature.yaml) | [Guide](signature/doc/README.md) |
| Alert Manager — alert colors | 3.2.1 | [alert_manager.yaml](alert_manager/dist/alert_manager.yaml) | [Guide](alert_manager/doc/README.md) |

Each module has its own folder: `dist` contains the complete YAML file to import, `doc` contains its documentation, and `test` contains its tests.

## Installation

1. Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools).
2. Download the module's YAML file from its `dist` folder.
3. In the Bubble Card editor, open **Modules** and import the complete file, or paste its contents into the manual import field.
4. Add the module ID to the card's `modules` list.
5. Configure the options described in the module guide, then reload the dashboard if needed.

Distribution files include metadata and code. Import them as modules; they are not dashboard cards to paste directly into a view.

## Module IDs

The YAML IDs are `signature` and `alert_manager`. The design module is named **Signature**.

## Updates and Module Store

This repository contains the distributions and documentation. It does not automatically publish modules to the Module Store.

Publishing to the store requires a separate discussion for each module in [Share your Modules](https://github.com/Clooos/Bubble-Card/discussions/categories/share-your-modules), including its complete export and a screenshot. The store discussions have not been created yet.

For a manual installation, import the updated YAML file again. For a store release, update the YAML in the same discussion and increase the version. A commit in this repository does not, by itself, update modules installed in Home Assistant.

## Configuration

Neither current distribution declares an `editor` schema, so custom options are configured in the card's YAML. Standard controls, entities, and actions remain those provided by Bubble Card.

## Testing

With Node.js 22 or later, run these commands from the repository root:

```sh
npm ci --ignore-scripts
npm test
```

Use `npm run test:signature` or `npm run test:alert-manager` to test a single module. Tests are stored in `signature/test` and `alert_manager/test` and read the actual YAML distributions. The only npm dependency parses YAML during testing; it is not needed in Home Assistant.

GitHub Actions runs the tests on Node.js 22 and 24 for every push and pull request, and can also be triggered manually. It checks alert sources, filters, caching, translations, numeric controls, metadata, YAML examples, and local documentation links. It does not replace checking the rendered cards in Home Assistant.

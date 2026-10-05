# Tests navigateur communs

Les suites dans `test/*.browser.cjs` utilisent Node.js 22 ou plus récent et Playwright Chromium. Elles exécutent les distributions réelles dans des fixtures de forme Bubble ; elles ne lancent pas Home Assistant et ne valident pas Safari/iOS.

La lecture des distributions utilise le même [helper YAML](../shared/test/README.md) que les tests fonctionnels. Les éléments et événements navigateur restent ceux de Chromium.

```sh
npm ci --ignore-scripts
npm run build:modules
npx playwright install chromium
npm run test:styles
```

`npm run test:styles:split` est un alias de la suite navigateur complète. Pour cibler une suite, utiliser par exemple `node --test styles/test/navigation.browser.cjs`. `BUBBLE_STYLE_BROWSER_PATH` permet d’utiliser un Chromium déjà installé ; sinon Playwright utilise son navigateur installé par la commande ci-dessus.

## Ajouter un contrôle

[test/browser.cjs](test/browser.cjs) centralise le lancement et la fermeture de Chromium. Node isole les fichiers de tests ; chaque suite possède son navigateur, chaque appel à `fixture` crée un contexte neuf. Les cookies, pages et éléments personnalisés ne passent pas d’une fixture à l’autre.

```js
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');

test('les rayons suivent le contrat en mode sombre tactile', async t => {
  const page = await fixture(t, {hasTouch: true});
  const result = await render(page, {mode: 'dark', plain: true, width: 328});
  const compact = result.cards.find(card => card.id === 'compact');
  assert.equal(compact.styles['.bubble-container'].borderRadius, '22px');
});
```

La taille par défaut du navigateur est de 1400 × 1400 px. Les options de contexte Playwright, dont `viewport` et `hasTouch`, restent explicites lorsqu’une suite en a besoin. Navigation utilise `prepare: null` puis son propre DOM de footer et ses routes simulées. Les autres suites utilisent par défaut la préparation de [test/fixtures.cjs](test/fixtures.cjs), puis `render` pour choisir le mode, la largeur des cartes et les variables de thème.

## Erreurs et nettoyage

- Une exception JavaScript non gérée dans le contexte fait échouer le test, y compris sur une page secondaire.
- `render` vérifie systématiquement les erreurs capturées pendant l’exécution des modules. Un appel utilisé seulement pour préparer un scénario ne peut plus les ignorer.
- À la fin du test, le socle attend les fonctions `teardown` des cartes de la page principale, puis ferme le contexte et toutes ses pages. La fermeture reste assurée si la préparation, une assertion ou le nettoyage échoue.

[test/browser-harness.browser.cjs](test/browser-harness.browser.cjs) vérifie l’isolation, les options tactiles, le nettoyage et la fermeture des pages. Il lance aussi un processus de test séparé avec deux erreurs intentionnelles : ce processus doit échouer pour que le contrôle du socle passe. Ces vérifications complètent les scénarios visuels propres aux modules.

La CI utilise le même point d’entrée `npm run test:styles`. Les tests fonctionnels restent dans `npm test` et ne demandent pas de navigateur installé.

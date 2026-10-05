# Helpers communs des tests

Les suites gardent leurs scénarios et leurs assertions dans le dossier du module. Ce dossier partage uniquement la préparation réutilisable ; il est chargé par Node.js, jamais par les distributions Bubble.

| Helper | Usage |
|---|---|
| [dom.cjs](dom.cjs) | Éléments HTML/SVG, texte et fragments, déplacement et suppression, classes, styles, sélecteurs simples et événements simulés |
| [editor-environment.cjs](editor-environment.cjs) | Registre des composants, chargement tardif, montage des formulaires, contexte VM et file de microtâches isolés par environnement |
| [module.cjs](module.cjs) | Lecture des YAML livrés, résolution de leur identifiant et vérification de la présence du code |
| [editor-bootstrap.cjs](editor-bootstrap.cjs) | Enregistrement de l’éditeur par exécution de la distribution complète sur une carte détachée |

## DOM des tests unitaires

`createDocument()` fournit les fabriques HTML/SVG, texte et fragments. Il accepte une classe d’élément dérivée : Flow ajoute ses animations et sa géométrie, Wind Rose ses compteurs d’écriture et son état de connexion. [signature-shared/test/dom.cjs](../../signature-shared/test/dom.cjs) ajoute les clics qui attendent les appels de service et les stubs propres aux présentations.

Les déplacements retirent le nœud de son ancien parent ; `textContent`, `replaceChildren`, `remove` et `replaceWith` détachent les anciens nœuds. Les clones conservent les attributs, classes, styles et données, sans copier les listeners. `className`, l’attribut `class` et `classList` restent synchronisés.

Les sélecteurs supportés sont les tags, classes, combinaisons tag/classes et descendants. Un sélecteur non supporté fait échouer le test explicitement. Les événements simulés appellent les listeners de l’élément concerné ; ils ne simulent pas la propagation DOM, les gestes ou le rendu CSS. Les styles sont des valeurs stockées, sans calcul de cascade ni validation. Ces comportements restent couverts par les [fixtures Chromium](../../styles/README.md).

## Éditeurs et distributions

Chaque appel à `editorEnvironment()` crée son propre registre, contexte VM et file de microtâches. `evaluate(source)` exécute l’éditeur et `flush()` applique les mises à jour en attente. Les événements utilisent `EventTarget` et `CustomEvent` de Node. La simulation des règles Bubble (`Engine`), des valeurs par défaut, groupes, listes et conversions reste dans chaque suite.

`loadModule('signature-flow')` lit `signature-flow/dist/signature-flow.yaml` et retourne `signature_flow`. Un second argument permet de choisir un autre fichier, notamment pour tester Alert Manager. La lecture vérifie l’identifiant attendu et un champ `code` non vide ; elle ne conserve pas de cache et ne compile pas le code. Les tests de build gardent leur propre lecture des sources et sorties générées pour contrôler leur correspondance.

Les tests des helpers vérifient les opérations dont dépendent les modules : détachement, conservation du contenu lors du clonage, classes, sélecteurs, listeners, isolation des éditeurs, chargement tardif et rejet de distributions incomplètes. `npm test` les exécute avec les suites fonctionnelles existantes. Ils ne constituent pas une exécution Home Assistant.

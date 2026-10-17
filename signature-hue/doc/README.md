# Signature Hue 1.0.1

Compagnon de présentation des commandes Hue natives, sans logique de contrôle.
Importer `signature-hue/dist/signature-hue.yaml`, puis placer `signature_hue`
**après** `signature_compact` dans `modules`. Sur une popup, utiliser seulement
`signature_hue` en complément des éventuels modules de popup déjà présents.
Aucune dépendance frontend supplémentaire ; aucun listener, observateur,
abonnement ou polling.

```yaml
modules: [signature_compact, signature_hue]
signature_hue:
  mode: scene
  palette: '#6A2790, #D8662D, #FFBB43'
  status: >-
    {{ {'available': states[entity] is not none and not is_state(entity, 'unavailable'),
        'selected': is_state('select.salon_hue_scene', 'Sourires rayonnants') and is_state('light.salon_hue_ambiance', 'on')} | to_json }}
```

| `mode` | Usage |
|---|---|
| `light` | Petite tuile carrée, minimum 88 px, nom 14 px sur deux lignes, état 13 px, icône RGB conservée |
| `scene` | Aperçu de 112 px, palette illustrative et coche de sélection |
| `brightness` | Commandes natives `hue-brightness-step` et `hue-brightness-value` sur une ligne |
| `animation` | Habillage des commandes natives `hue-animation-start`, `hue-animation-stop`, `hue-animation-disabled` |
| `popup` | Arrondis Signature et grille de lampes à trois colonnes jusqu’à 320 px |

`available` accepte un booléen ou Jinja, défaut `true`. `selected` accepte un
booléen ou Jinja, défaut `false`. Une expression non résolue n’active ni commande
ni coche. `status` est facultatif et prioritaire sur ces deux champs : objet JSON
avec `available` et `selected`, ou template Jinja produisant ce JSON. Il permet
de partager un seul abonnement HA pour les deux conditions liées d’une scène.
Un statut invalide ferme les deux indicateurs. `palette` accepte trois couleurs opaques `#RRGGBB`, séparées par des
virgules, ou un template ; une palette invalide reste transparente. Ces couleurs
ne sont jamais envoyées aux lampes. Les conditions des sous-boutons, les services
et les cibles restent dans le dashboard. Ne pas remplacer les commandes par des
nœuds créés dans le module.

La popup doit conserver son ordre de contenu : commande Éclairage, titre Lampes,
grille de lampes (troisième enfant), puis scènes. Les autres grilles ne changent
pas de nombre de colonnes. Les sous-boutons de luminosité et d’animation gardent
les classes ci-dessus et leurs actions natives.

Le CSS de chaque mode est mis en cache par carte et version ; les templates sont
relus à chaque rendu. Les couleurs de texte, surfaces et rayons restent des
variables CSS, y compris lors d’un changement de thème sans nouveau rendu.

## 1.0.0 — 17 octobre 2026

Extraction des cinq gabarits déjà utilisés dans les dashboards, sans changement
de dimensions ou de commande. Tests Node et styles Chromium ; Home Assistant
réel et Safari/iOS restent à vérifier après importation.

## 1.0.1 — 17 octobre 2026 — cohérence des styles

Noms de scène reliés à `signature-secondary-font-size` (13 px par défaut) ; leur bandeau réserve au moins deux interlignes dans les 112 px existants. État des lampes et géométrie des interrupteurs utilisent les fragments partagés. Palettes, couleurs actives, actions et conditions conservées.

Contrôles : tests Node et Chromium, dont les styles calculés et les changements de thème sans nouveau rendu. Voir le [bilan de cohérence](../../docs/STYLE_AUDIT_2026_10.md). Essais Home Assistant réel et Safari/iOS à effectuer après importation.

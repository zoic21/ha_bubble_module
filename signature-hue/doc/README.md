# Signature Hue 1.1.2

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
| `brightness` | Luminosité avec slider natif pleine largeur en bas et pourcentage en haut ; les anciennes commandes `hue-brightness-step` / `hue-brightness-value` sur une ligne restent compatibles |
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

La popup conserve son ordre de contenu : commande Éclairage, grille de lampes,
titre Scènes puis grille de scènes. Le titre Lampes est facultatif depuis
1.1.2 : la grille reste à trois colonnes jusqu’à 320 px, qu’elle soit le
deuxième ou le troisième enfant. Les autres grilles gardent leurs colonnes.
Retirer la carte de titre du dashboard supprime aussi la hauteur qu’elle
réservait. Les sous-boutons de luminosité et d’animation gardent les classes
ci-dessus et leurs actions natives.

## Slider de luminosité sans interrupteur — 1.1.0

La commande Éclairage utilise un bouton État Compact, un sous-bouton de
pourcentage `hue-brightness-value` dans `sub_button.main` et un slider natif
dans `sub_button.bottom`. Aucun bouton marche/arrêt n’est nécessaire :
`allow_light_slider_to_0: true` autorise l’extinction à 0 %, puis un réglage
positif rallume le groupe. Le titre et le pourcentage gardent leurs actions
`more-info` vers les réglages de couleur et de température.

```yaml
sub_button:
  main:
    - entity: light.salon_hue_ambiance
      css_class: hue-brightness-value
      show_icon: false
      show_background: false
      show_state: true
      state_content: >-
        {% if not has_value(entity) %}—{% elif is_state(entity, 'off') %}0 %{% elif state_attr(entity, 'brightness') is number %}{{ (state_attr(entity, 'brightness') / 255 * 100) | round(0) | int }} %{% else %}—{% endif %}
      tap_action: {action: more-info}
  bottom:
    - entity: light.salon_hue_ambiance
      sub_button_type: slider
      always_visible: true
      fill_width: true
      custom_height: 36
      show_button_info: false
      slider_value_position: hidden
      allow_light_slider_to_0: true
      relative_slide: false
      tap_to_slide: true
      slider_live_update: false
      use_accent_color: true
```

La carte mesure 104 px : en-tête de 56 px et slider natif de 36 px, avec les
retraits Signature. L’icône reste visible sur téléphone. Le slider reprend
l’accent configuré et son repère suit les couleurs du thème. Lorsqu’une
entité est indisponible, le slider est grisé et non interactif ; le texte
de repli reste défini dans le dashboard. Le module habille les nœuds Bubble
existants ; il n’ajoute aucun contrôleur, abonnement ou gestionnaire de geste.
Le slider envoie la commande native uniquement à la fin du geste.

La version 1.1.1 ancre explicitement la rangée inférieure au bord du wrapper
natif pour conserver 10 px de chaque côté, sans cumuler le padding de l’en-tête.

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

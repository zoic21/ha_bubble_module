# Signature Irrigation 1.0.0

Lecteur du calendrier OpenSprinkler et présentation des jours d’arrosage.
Importer `signature-irrigation/dist/signature-irrigation.yaml` et ajouter
`signature_irrigation` **après** `signature_compact`. Aucune commande d’arrosage,
entité, ressource frontend ou automatisation n’est ajoutée.

```yaml
modules: [signature_compact, signature_irrigation]
signature_irrigation:
  calendar: calendar.opensprinkler_schedule
  stations: [Potager]
  popup: '#potager-details'
  role: next
  logging_entity: switch.opensprinkler_enabled
  logging_attribute: logging_enabled  # défaut
```

Les IDs, noms exacts/alias de stations et hash sont configurés dans la carte,
pas dans le module. La comparaison des noms ignore la casse et les espaces
extérieurs. Le champ natif `entity` reste le calendrier pour les détails HA.

| `role` | Présentation et options |
|---|---|
| `next` | Compact État, `compact_mode: value`, prochain départ avec date/heure |
| `history` | Compact Nom, sans icône/état ; tableau d’historique remplaçant visuellement le conteneur |
| `empty` | Compact Nom multiligne, secondaire initial `Lecture du calendrier` ; état de chargement/absence/erreur |
| `weekdays` | Compact Nom sans icône ; jours natifs répartis sur la largeur, cibles tactiles de 44 px minimum ; aucune option calendrier nécessaire |

Conserver les boutons et conditions natifs des jours. Pour les autres rôles,
`calendar`, `stations` et `popup` sont requis ; l’historique n’est montré que si
`logging_entity` porte un attribut de journalisation actif (`true`, `1`, `on`,
`yes`). Les prévisions du jour et les commandes manuelles n’apparaissent dans
l’historique que le lendemain, comme dans le calendrier OpenSprinkler.

## Lecture et cache

Les trois rôles partagent requête, événements et vues filtrées par connexion,
calendrier et source de journalisation. Fenêtre : sept journées terminées et
366 prochains jours. Historique : sessions d’au moins 60 secondes, toutes les
lignes conservées. Les départs futurs de durée nulle restent valides. Les dates
suivent le fuseau HA, y compris les changements d’heure ; le texte est français.

Lecture au plus tard toutes les 15 minutes, invalidation par les états
OpenSprinkler, la journalisation ou le jour local, délai de 30 secondes entre
lectures, retry après une minute en erreur. Le garde de délai précède le parcours
des états HA. Les événements sont triés une fois par réponse, les vues
station/jour et les formateurs de dates sont réutilisés et leurs caches bornés.
Le prochain départ est recherché avec l’heure courante, jamais figé dans le cache.

Une seule boucle de rafraîchissement par minute est active pour les cartes de la
popup ouverte (ou l’éditeur). Références faibles et nettoyage `onTeardown` :
retrait de la table, restauration du masquage de grille et arrêt immédiat du
dernier timer. Une réponse API devenue obsolète ne remplace pas un calendrier
indisponible. Aucune requête ne déclenche de commande physique.

## 1.0.0 — 17 octobre 2026

Extraction du lecteur précédemment copié dans douze cartes et du gabarit des
jours. Tests Node : requête partagée, données manquantes, cache, zéro durée,
historique, fuseaux/DST, démontage et réponses tardives. Les fixtures Chromium
ne remplacent pas une validation dans Home Assistant réel ou Safari/iOS.

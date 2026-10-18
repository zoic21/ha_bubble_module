# Signature Energy Balance

Version **1.0.0**. ID : `signature_energy_balance`.
[Distribution à importer](../dist/signature-energy-balance.yaml).

Remplace le contenu d’un bouton Bubble par une barre journalière de 28 px,
dans une carte neutre de 50 px avec 10 px de retrait et un rayon de 22 px.
Trois contributions, dans cet ordre : Réseau, Solaire, Batterie. Les noms et
couleurs peuvent être personnalisés avec `segments`.

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Répartition maison
show_icon: false
show_state: false
scrolling_effect: false
rows: 1
card_layout: large
modules: [signature_energy_balance]
button_action:
  tap_action: {action: none}
  hold_action: {action: none}
  double_tap_action: {action: none}
signature_energy_balance:
  imports: [sensor.energy_hc, sensor.energy_hp]
  solar: [sensor.energy_roof, sensor.energy_balcony]
  discharges: [sensor.battery_discharge]
  charges: [sensor.battery_charge]
  exports: [sensor.grid_export]
  time_zone: Europe/Paris
  unit: kWh
  segments:
    - {name: Réseau, color: '#4F91C5'}
    - {name: Solaire, color: '#D29A36'}
    - {name: Batterie, color: '#246B50'}
```

Les listes contiennent des compteurs d’énergie dans la même unité, pas des
puissances ni les états courants de compteurs cumulés. Groupes absents : liste
vide. Seize sources distinctes au maximum ; une source ne doit pas appartenir
à deux groupes. Une configuration invalide ne lance aucune requête.

## Bilan et convention d’attribution

Le module additionne les variations Recorder depuis minuit dans le fuseau
configuré, avec les périodes `5minute` et le champ `change`, comme Panel :

`consommation = imports + solaire + décharges − injection − charges`.

La part hors réseau vaut `max(0, min(100, 100 × (1 − imports / consommation)))`.
Elle est identique à `remaining_percentage` de Panel avec les mêmes neuf
sources. La barre ne normalise plus les apports bruts, qui comptaient aussi
du solaire stocké ou injecté comme s’il alimentait directement la maison.

Pour conserver trois parts positives qui totalisent exactement cette
consommation, le réseau est plafonné au total maison ; la batterie est créditée
de ses décharges dans la limite du reste ; le solaire représente le solde.
Cela déduit la charge et l’injection du solaire avant de réduire, si nécessaire,
la contribution batterie puis réseau. En charge réseau importante, la barre
peut afficher 100 % réseau, conformément au pourcentage borné de Panel.

C’est une **convention de bilan journalier**. Ces compteurs ne permettent pas
de retracer l’origine solaire/réseau de chaque kWh stocké, ni d’attribuer avec
certitude une injection à la batterie ou au solaire. Les contributions nettes
de cette barre ne remplacent pas les charges/décharges et productions brutes
des popups dédiés. Cette limite est commune à l’indicateur actuel de Panel.

Un compteur manquant, une réponse échouée, une variation négative ou une
consommation nulle/négative affiche `—`, jamais une répartition partielle.
Les mises à jour HA déclenchent au plus une requête par minute ; pas de timer,
polling ni observateur supplémentaire. Deux cartes indépendantes peuvent
conserver un léger décalage pendant l’actualisation Recorder. Minuit, un
changement de sources et le démontage invalident les réponses périmées.

## Interactions et style

Infobulle au survol, au toucher ou au focus clavier : nom, contribution nette
en énergie et pourcentage. Échap, perte du focus ou toucher extérieur ferment
l’infobulle. Aucun clic/appui long/double appui n’ouvre More info ni ne déclenche
une commande Bubble. Les petits segments gardent leur cible même si le texte
ne tient pas. Le style suit les variables Signature et le thème HA en direct.

Tests : bilans simulés comparés au calcul réel de Panel, cas charge réseau,
injection, décharge stockée avant minuit, zéro et données manquantes ; rendu
Bubble 3.4.1 en Chromium, tailles mobile/desktop, modes clair/sombre et actions.
Ces fixtures ne valident pas Home Assistant réel ni Safari/iOS.

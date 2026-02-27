# PvRouter NRI — Installation & Configuration


## 1. Installation manuelle du plugin

1. Copier le dossier `pvrouter` dans `config/custom_components/`
2. **Redémarrer Home Assistant** (obligatoire)

  ou

1. Aller dans **Paramètres → Appareils & Services → Ajouter une intégration**
2. Rechercher **PvRouter NRI**
3. Saisir le **préfixe MQTT** de votre routeur (ex: `PVROUTER005`)

---

## 2. Prérequis

- L'intégration **MQTT** doit être configurée dans Home Assistant
- Le broker MQTT doit être accessible et le PvRouter connecté

---

## 3. Structure des fichiers installés

```
config/custom_components/pvrouter/
  __init__.py
  config_flow.py
  coordinator.py
  sensor.py
  switch.py
  button.py
  const.py
  manifest.json
  strings.json
  translations/
    fr.json
  www/
    pvrouter-card.js    ← carte Lovelace (chargée automatiquement)
    solar.png
    ballon.png
    house.png
    reseau.png
    charge.png
    battery.png
    pvrouter.png
    [vos icones personnalisées...]
```

---

## 4. Carte Lovelace

La carte **pvrouter-card** est enregistrée automatiquement au démarrage.
Elle apparaît dans le sélecteur de cartes sous **"PvRouter NRI"**.

### Ajout manuel (YAML)

```yaml
type: custom:pvrouter-card
entity_prefix: pvrouter
home_entity: "sensor.home_conso_live"
outputs:
  - id: "1"
    name: "Ballon 1"
    icon: "ballon.png"
    enabled: true
  - id: "1.1"
    name: "Ballon 2"
    icon: "ballon.png"
    enabled: false
  - id: "2"
    name: "Sortie 2"
    icon: "charge.png"
    enabled: false
```

---

## 5. Paramètres de la carte

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `entity_prefix` | string | `pvrouter` | Préfixe des entités HA |
| `home_entity` | string | `sensor.home_conso_live` | Entité conso maison (en kW) |
| `outputs` | liste | — | Configuration des sorties |

### Paramètres par sortie

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `id` | string | — | **Obligatoire** : `"1"`, `"1.1"` ou `"2"` |
| `name` | string | `"Sortie X"` | Nom affiché sous l'icône |
| `icon` | string | `"ballon.png"` | Fichier image dans `www/` |
| `enabled` | boolean | `true` | `false` pour masquer la sortie |

### IDs de sortie

| ID | Sortie physique | Données | Actif quand |
|----|----------------|---------|-------------|
| `"1"` | Sortie 1 — appareil 0 | P1 / LOAD10 / LOAD1 | statusout1=True ET ballon=0 (ou mode simple) |
| `"1.1"` | Sortie 1 — appareil 1 | P1 / LOAD11 | statusout1=True ET ballon=1 |
| `"2"` | Sortie 2 | P2 / LOAD2 | statusout2=True |

> Le mode dual (2 appareils sur sortie 1) est détecté automatiquement
> si `LOAD10` et `LOAD11` sont présents et > 0 dans le JSON MQTT.

### Logique de calcul puissance affichée

| STATUS | SATURED | Valeur affichée |
|--------|---------|-----------------|
| False | — | 0 W |
| True | False | P1 ou P2 (routage partiel) |
| True | True | LOAD (charge max atteinte) |

### Flèches animées

| Situation | Direction | Couleur |
|-----------|-----------|---------|
| Sortie active | ◀◀ vers l'appareil | Bleu |
| Import réseau | ◀◀ vers le routeur | Rouge |
| Export réseau | ▶▶ vers le réseau | Vert |
| Conso maison | ▶▶ vers la maison | Orange |
| Solaire → routeur | ▼▼ vers le bas | Jaune |
| Valeur ≤ 5W | masquée | — |

---

## 6. Icônes disponibles

| Fichier | Usage suggéré |
|---------|---------------|
| `ballon.png` | Chauffe-eau, ballon d'eau chaude |
| `charge.png` | Borne de recharge véhicule électrique |
| `house.png` | Maison, consommation générale |
| `reseau.png` | Réseau électrique EDF |
| `battery.png` | Batterie de stockage |
| `solar.png` | Panneaux solaires |
| `pvrouter.png` | Routeur PV (centre de la carte) |

### Ajouter une icône personnalisée

1. Déposer votre `.png` dans `config/custom_components/pvrouter/www/`
2. Référencer son nom dans le YAML :
```yaml
outputs:
  - id: "2"
    name: "Piscine"
    icon: "piscine.png"
    enabled: true
```

---

## 7. Entités créées par le plugin

### Capteurs (sensor)

| Entité | Clé JSON | Unité | Description |
|--------|----------|-------|-------------|
| `sensor.pvrouter_vin` | VIN | V | Tension entrée |
| `sensor.pvrouter_cin` | CIN | A | Courant entrée |
| `sensor.pvrouter_pin` | PIN | W | Puissance entrée réseau |
| `sensor.pvrouter_inject` | INJECT | kWh | Énergie injectée totale |
| `sensor.pvrouter_inject_i` | INJECT_I | W | Puissance injection instantanée |
| `sensor.pvrouter_cout` | COUT | A | Courant sortie |
| `sensor.pvrouter_pout` | POUT | W | Puissance sortie totale |
| `sensor.pvrouter_p1` | P1 | W | Puissance routée sortie 1 |
| `sensor.pvrouter_p2` | P2 | W | Puissance routée sortie 2 |
| `sensor.pvrouter_load_1` | LOAD1 | W | Charge max sortie active |
| `sensor.pvrouter_load_2` | LOAD2 | W | Charge max sortie 2 |
| `sensor.pvrouter_load_10` | LOAD10 | W | Charge max appareil 0 (sortie 1) |
| `sensor.pvrouter_load_11` | LOAD11 | W | Charge max appareil 1 (sortie 1) |
| `sensor.pvrouter_saved_power` | SAVED_POWER | kWh | Énergie économisée |
| `sensor.pvrouter_total_power` | TOTAL_POWER | kWh | Énergie totale routée |
| `sensor.pvrouter_total_s` | TOT_S | kWh | Énergie totale (compteur S) |
| `sensor.pvrouter_production` | PROD | W | Production solaire instantanée |
| `sensor.pvrouter_total_production` | TOT_PROD | kWh | Production totale |
| `sensor.pvrouter_ev_power` | EVPOWER | W | Puissance borne VE |
| `sensor.pvrouter_efficiency` | EFF | % | Efficacité du routeur |
| `sensor.pvrouter_temp_1` | TEMP1 | °C | Température sonde 1 |
| `sensor.pvrouter_temp_2` | TEMP2 | °C | Température sonde 2 (si présente) |
| `sensor.pvrouter_temp_ref` | REF_T | °C | Température de référence |
| `sensor.pvrouter_temp_interne` | T_RTC | °C | Température interne du routeur |
| `sensor.pvrouter_status_out_1` | STATUS_OUT1 | — | Statut sortie 1 |
| `sensor.pvrouter_status_out_2` | STATUS_OUT2 | — | Statut sortie 2 |
| `sensor.pvrouter_load_1_satured` | LOAD1_SATURED | — | Sortie 1 saturée |
| `sensor.pvrouter_load_2_satured` | LOAD2_SATURED | — | Sortie 2 saturée |
| `sensor.pvrouter_ballon_actif` | BALLON | — | Appareil actif sur sortie 1 (0 ou 1) |
| `sensor.pvrouter_night` | NIGHT | — | Mode nuit |
| `sensor.pvrouter_ecomax` | ECOMAX | — | Mode EcoMax |
| `sensor.pvrouter_boost` | BOOST | — | Mode Boost |
| `sensor.pvrouter_bacteria` | BACT | — | Mode anti-légionellose |
| `sensor.pvrouter_suffi` | SUFFI | — | Suffisance |
| `sensor.pvrouter_auto_c` | AUTO_C | — | Auto commande |
| `sensor.pvrouter_mode_info` | MODEINFO | — | Code mode actuel |
| `sensor.pvrouter_display` | DISPLAY | — | Affichage LCD |
| `sensor.pvrouter_time` | TIME | — | Heure du routeur |
| `sensor.pvrouter_wifi_level` | WIFI | dBm | Niveau signal WiFi |
| `sensor.pvrouter_ssid` | SSID | — | Réseau WiFi connecté |
| `sensor.pvrouter_mqtt_status` | MQTT | — | Statut connexion MQTT |
| `sensor.pvrouter_model` | MODEL | — | Modèle du routeur |
| `sensor.pvrouter_firmware` | Version | — | Version firmware |

### Switches

| Entité | Description | Topic MQTT |
|--------|-------------|------------|
| `switch.pvrouter_switch_ballon` | Bascule entre les 2 appareils sur sortie 1 | `PREFIX/SWITCH` |
| `switch.pvrouter_mode_automatique` | Mode automatique (code 11) | `PREFIX/SETMODE` |
| `switch.pvrouter_activation_forcee` | Activation forcée toutes sorties (code 22) | `PREFIX/SETMODE` |
| `switch.pvrouter_desactiver_sorties` | Désactiver toutes les sorties (code 00) | `PREFIX/SETMODE` |
| `switch.pvrouter_activation_forcee_sortie_1` | Forcer sortie 1 (code 32/33) | `PREFIX/SETMODE` |

### Boutons

| Entité | Description | Payload |
|--------|-------------|---------|
| `button.pvrouter_reboot` | Redémarre le routeur | `1` → `PREFIX/RESET` |
| `button.pvrouter_switch_ballon_touch` | Bascule manuelle ballon | `1` → `PREFIX/SWITCH` |

---

## 8. Exemples de configuration carte

```yaml
# Configuration complète — 2 ballons + borne VE
type: custom:pvrouter-card
entity_prefix: pvrouter
home_entity: "sensor.home_conso_live"
outputs:
  - id: "1"
    name: "Ballon Cuisine"
    icon: "ballon.png"
    enabled: true
  - id: "1.1"
    name: "Ballon SDB"
    icon: "ballon.png"
    enabled: true
  - id: "2"
    name: "Borne VE"
    icon: "charge.png"
    enabled: true
```

```yaml
# Configuration simple — 1 ballon uniquement
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Chauffe-eau"
    icon: "ballon.png"
    enabled: true
  - id: "1.1"
    enabled: false
  - id: "2"
    enabled: false
```

```yaml
# Sans entité maison personnalisée (utilise le defaut)
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Chauffe-eau"
    icon: "ballon.png"
    enabled: true
  - id: "2"
    name: "Piscine"
    icon: "charge.png"
    enabled: true
```

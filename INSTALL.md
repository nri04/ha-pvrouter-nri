# PvRouter NRI — Installation & Configuration

## 1. Installation

### Via HACS (recommandé)

1. Ouvrir **HACS** dans Home Assistant
2. Cliquer sur les 3 points en haut à droite → **Dépôts personnalisés**
3. Ajouter l'URL : `https://github.com/nri04/ha-pvrouter-nri` — catégorie : **Intégration**
4. Cliquer **Installer**
5. **Redémarrer Home Assistant**
6. Aller dans **Paramètres → Appareils & Services → Ajouter une intégration**
7. Rechercher **PvRouter NRI**
8. Saisir le **préfixe MQTT** (Router Name défini dans l'interface du routeur, ex: `PVR-XXXX`)

### Installation manuelle

1. Copier le dossier `pvrouter` dans `config/custom_components/`
2. **Redémarrer Home Assistant**
3. Suivre les étapes 6 à 8 ci-dessus

---

## 2. Prérequis

- L'intégration **MQTT** doit être configurée dans Home Assistant
- Le broker MQTT doit être accessible et le PvRouter connecté

### Le topic MQTT

Le préfixe correspond au **Router Name** défini dans les paramètres du routeur.
Par exemple, si le Router Name est `PVR-XX`, le topic sera `PVR-XX/DATA`.

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
    [vos icônes personnalisées...]
```

---

## 4. Carte Lovelace

La carte **pvrouter-card** est enregistrée automatiquement au démarrage.
Elle apparaît dans le sélecteur de cartes sous **"PvRouter NRI"**.

### Layout de la carte

```
[Sortie 1]  ◀◀ ──┐                        ┌── ▶▶ [Réseau]
                  │   [Solaire]            │
[Sortie 1.1]◀◀ ──┤       ▼▼               │
                  │   [Routeur]            │
[Sortie 2]  ◀◀ ──┘   [Efficacité]         └── ▶▶ [Maison]
                      [T° interne]
```

### Configuration YAML minimale

```yaml
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Ballon"
    icon: "ballon.png"
    enabled: true
  - id: "1.1"
    enabled: false
  - id: "2"
    enabled: false
```

### Configuration complète

```yaml
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Ballon Cuisine"
    icon: "ballon.png"
    enabled: true
    temp_entity: "sensor.temperature_ballon_cuisine"
  - id: "1.1"
    name: "Ballon SDB"
    icon: "ballon.png"
    enabled: true
    temp_entity: "sensor.temperature_ballon_sdb"
  - id: "2"
    name: "Borne VE"
    icon: "charge.png"
    enabled: true
```

---

## 5. Paramètres de la carte

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `entity_prefix` | string | `pvrouter` | Préfixe des entités HA |
| `outputs` | liste | — | Configuration des sorties (voir ci-dessous) |

> **Note :** La consommation maison est calculée automatiquement : `PROD + PIN - POUT`. La température interne du routeur (`T_RTC`) est affichée automatiquement sous l'efficacité si disponible. Aucune entité externe n'est nécessaire pour ces valeurs.

### Paramètres par sortie

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `id` | string | — | **Obligatoire** : `"1"`, `"1.1"` ou `"2"` |
| `name` | string | `"Sortie X"` | Nom affiché sous l'icône |
| `icon` | string | `"ballon.png"` | Fichier image dans `www/` |
| `enabled` | boolean | `true` | `false` pour masquer la sortie |
| `temp_entity` | string | — | Entité HA de température optionnelle (ex: `sensor.temp_ballon`). Peut être n'importe quel capteur HA, interne ou externe au plugin. |

### IDs de sortie

| ID | Sortie physique | Actif quand |
|----|----------------|-------------|
| `"1"` | Sortie 1 — appareil 0 | STATUS_OUT1=True ET ballon=0 (ou mode simple) |
| `"1.1"` | Sortie 1 — appareil 1 | STATUS_OUT1=True ET ballon=1 (mode dual uniquement) |
| `"2"` | Sortie 2 | STATUS_OUT2=True |

> Le **mode dual** (2 appareils sur sortie 1) est détecté automatiquement si `LOAD10` et `LOAD11` sont présents et > 0 dans le JSON MQTT. Sans mode dual, la sortie `1.1` n'est jamais active même si `enabled: true`.

### Logique de calcul puissance affichée

Identique à l'application mobile SmartPvRouter :

| STATUS_OUT1 | LOAD1_SATURED | POUT vs LOAD1 | Valeur affichée |
|-------------|---------------|---------------|-----------------|
| False | — | — | 0 W |
| True | False | POUT ≤ LOAD1 | POUT (routage partiel) |
| True | False | POUT > LOAD1 | LOAD1 (ballon) + reste pour sortie 2 |
| True | True | — | 0 W (ballon), sortie 2 = min(POUT, LOAD2) |

Consommation maison : `PROD + PIN - POUT`

### Affichages automatiques (sans configuration)

| Zone | Valeur | Source |
|------|--------|--------|
| Solaire | Production instantanée | `PROD` |
| Routeur | Efficacité | `EFF` |
| Routeur | Température interne | `T_RTC` (masqué si indisponible) |
| Réseau | Puissance + Import/Export | `PIN` |
| Maison | Consommation calculée | `PROD + PIN - POUT` |

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
| `sensor.pvrouter_pin` | PIN | W | Puissance entrée réseau (négatif = export) |
| `sensor.pvrouter_inject` | INJECT | kWh | Énergie injectée totale |
| `sensor.pvrouter_inject_i` | INJECT_I | W | Puissance injection instantanée |
| `sensor.pvrouter_cout` | COUT | A | Courant sortie |
| `sensor.pvrouter_pout` | POUT | W | Puissance sortie totale routée |
| `sensor.pvrouter_p1` | P1 | W | Puissance routée sortie 1 |
| `sensor.pvrouter_p2` | P2 | W | Puissance routée sortie 2 |
| `sensor.pvrouter_load_1` | LOAD1 | W | Charge max sortie active |
| `sensor.pvrouter_load_2` | LOAD2 | W | Charge max sortie 2 |
| `sensor.pvrouter_load_10` | LOAD10 | W | Charge max appareil 0 (sortie 1, mode dual) |
| `sensor.pvrouter_load_11` | LOAD11 | W | Charge max appareil 1 (sortie 1, mode dual) |
| `sensor.pvrouter_saved_power` | SAVED_POWER | kWh | Énergie économisée |
| `sensor.pvrouter_total_power` | TOTAL_POWER | kWh | Énergie totale routée |
| `sensor.pvrouter_total_s` | TOT_S | kWh | Énergie totale compteur S |
| `sensor.pvrouter_production` | PROD | W | Production solaire instantanée |
| `sensor.pvrouter_total_production` | TOT_PROD | kWh | Production totale |
| `sensor.pvrouter_ev_power` | EVPOWER | W | Puissance borne VE |
| `sensor.pvrouter_efficiency` | EFF | % | Efficacité du routeur |
| `sensor.pvrouter_temp_1` | TEMP1 | °C | Température sonde 1 |
| `sensor.pvrouter_temp_2` | TEMP2 | °C | Température sonde 2 |
| `sensor.pvrouter_temp_ref` | REF_T | °C | Température de référence |
| `sensor.pvrouter_temp_interne` | T_RTC | °C | Température interne du routeur (affichée automatiquement dans la carte) |
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
# 1 ballon simple avec température
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Chauffe-eau"
    icon: "ballon.png"
    enabled: true
    temp_entity: "sensor.temp_chauffe_eau"
  - id: "1.1"
    enabled: false
  - id: "2"
    enabled: false
```

```yaml
# 2 ballons (mode dual) + borne VE avec températures
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Ballon Cuisine"
    icon: "ballon.png"
    enabled: true
    temp_entity: "sensor.temp_ballon_cuisine"
  - id: "1.1"
    name: "Ballon SDB"
    icon: "ballon.png"
    enabled: true
    temp_entity: "sensor.temp_ballon_sdb"
  - id: "2"
    name: "Borne VE"
    icon: "charge.png"
    enabled: true
```

```yaml
# Sortie 1 + sortie 2, sans température
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
    name: "Piscine"
    icon: "charge.png"
    enabled: true
```

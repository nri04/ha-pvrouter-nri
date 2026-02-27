# PvRouter NRI — Installation & Configuration

## 1. Installation du plugin

1. Copier le dossier `pvrouter_utf8` dans `config/custom_components/`
2. **Renommer** le dossier en `pvrouter`
3. **Redémarrer Home Assistant** (obligatoire)
4. Aller dans **Paramètres → Appareils & Services → Ajouter une intégration**
5. Rechercher **PvRouter NRI**
6. Saisir le **préfixe MQTT** de votre routeur (ex: `PVROUTER005`)

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

Dans un tableau de bord, ajouter une carte manuelle :

```yaml
type: custom:pvrouter-card
entity_prefix: pvrouter
outputs:
  - id: "1"
    name: "Ballon Cuisine"
    icon: "ballon.png"
    enabled: true
  - id: "1.1"
    name: "Ballon SDB"
    icon: "ballon.png"
    enabled: false
  - id: "2"
    name: "Borne VE"
    icon: "charge.png"
    enabled: false
```

---

## 5. Paramètres de la carte

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `entity_prefix` | string | `pvrouter` | Préfixe des entités HA (doit correspondre au MQTT prefix) |
| `outputs` | liste | voir ci-dessous | Configuration des sorties affichées |

### Paramètres par sortie (`outputs`)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `id` | string | — | **Obligatoire.** Identifiant de la sortie : `"1"`, `"1.1"` ou `"2"` |
| `name` | string | `"Sortie X"` | Nom affiché sous l'icône |
| `icon` | string | `"ballon.png"` | Nom du fichier image dans le dossier `www/` |
| `enabled` | boolean | `true` | `false` pour masquer la sortie sans la supprimer |

### IDs de sortie disponibles

| ID | Sortie physique | Données utilisées | Actif quand |
|----|----------------|-------------------|-------------|
| `"1"` | Sortie 1 — appareil 0 | P1 / LOAD / LOAD1 | statusout1=True ET ballon_actif=0 (ou mode simple) |
| `"1.1"` | Sortie 1 — appareil 1 | P1 / LOAD0 | statusout1=True ET ballon_actif=1 |
| `"2"` | Sortie 2 | P2 / LOAD2 | statusout2=True |

> **Note :** Les IDs `"1"` et `"1.1"` partagent la même sortie physique.
> Le mode dual (2 appareils sur sortie 1) est détecté automatiquement
> si les capteurs `LOAD10` et `LOAD11` sont présents et > 0.

---

## 6. Icônes disponibles

Les icônes suivantes sont fournies dans `www/` :

| Fichier | Usage suggéré |
|---------|---------------|
| `ballon.png` | Chauffe-eau, ballon d'eau chaude |
| `charge.png` | Borne de recharge véhicule électrique |
| `house.png` | Maison, consommation générale |
| `battery.png` | Batterie de stockage |
| `solar.png` | Panneaux solaires |
| `pvrouter.png` | Routeur PV (affiché au centre) |

### Ajouter une icône personnalisée

1. Déposer votre fichier `.png` dans `config/custom_components/pvrouter/www/`
2. Référencer son nom dans le YAML de la carte :
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
| `sensor.pvrouter_inject` | INJECT | kWh | Énergie injectée |
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
| `sensor.pvrouter_production` | PROD | W | Production solaire |
| `sensor.pvrouter_total_production` | TOT_PROD | kWh | Production totale |
| `sensor.pvrouter_efficiency` | EFF | % | Efficacité du routeur |
| `sensor.pvrouter_temp_1` | TEMP1 | °C | Température sonde 1 |
| `sensor.pvrouter_temp_2` | TEMP2 | °C | Température sonde 2 |
| `sensor.pvrouter_status_out_1` | STATUS_OUT1 | — | Statut sortie 1 (True/False) |
| `sensor.pvrouter_status_out_2` | STATUS_OUT2 | — | Statut sortie 2 (True/False) |
| `sensor.pvrouter_load_1_satured` | LOAD1_SATURED | — | Sortie 1 saturée (True/False) |
| `sensor.pvrouter_load_2_satured` | LOAD2_SATURED | — | Sortie 2 saturée (True/False) |
| `sensor.pvrouter_ballon_actif` | BALLON | — | Appareil actif sur sortie 1 (0 ou 1) |
| `sensor.pvrouter_night` | NIGHT | — | Mode nuit |
| `sensor.pvrouter_time` | TIME | — | Heure du routeur |
| `sensor.pvrouter_display` | DISPLAY | — | Affichage LCD |
| `sensor.pvrouter_mode_info` | MODEINFO | — | Code mode actuel |
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

## 8. Exemple configuration complète

```yaml
# Carte avec 2 ballons sur sortie 1 + borne VE sur sortie 2
type: custom:pvrouter-card
entity_prefix: pvrouter
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
# Carte simple — 1 seul ballon, pas de sortie 2
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

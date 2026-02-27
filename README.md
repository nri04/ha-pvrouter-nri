# NRI PvRouter pour Home Assistant

Intégration personnalisée pour superviser et piloter le **Smart Pv-Router** et le **CapSoLux** de smart electromation technology.

## Pré-requis
- Un broker MQTT (Mosquitto) fonctionnel sur Home Assistant.
- Votre PvRouter configuré pour publier sur le topic `PVROUTER005` (ou votre préfixe personnalisé).

## Installation
### Via HACS (Recommandé)
1. Ouvrez HACS dans Home Assistant.
2. Cliquez sur les 3 points en haut à droite -> **Dépôts personnalisés**.
3. Ajoutez l'URL de ce dépôt et sélectionnez la catégorie **Intégration**.
4. Cliquez sur **Installer**.
5. Redémarrez Home Assistant.

### Configuration
1. Allez dans **Paramètres** -> **Appareils et Services** -> **Ajouter une intégration**.
2. Cherchez **PvRouter NRI**.

3. Entrez le préfixe MQTT de votre appareil (ex: `PVROUTER005`).

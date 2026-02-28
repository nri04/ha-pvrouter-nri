# NRI PvRouter pour Home Assistant

Intégration personnalisée pour superviser et piloter les routeurs solaires **Smart Pv-Router** et **CapSoLux** de smart electromation technology.
[SMARTELECTROMATION](https://smartelectromation.com).

[![Lien Fabricant](https://smartelectromation.com/wp-content/uploads/2025/11/boitier_sar-1-268x300.jpg)](https://github.com/loraraspi91/PV-Router)

<a href="https://github.com/loraraspi91/PV-Router">
  <img src="https://www.noelrecton.com/PvRouter/Sans%20titre-3.jpg" width="100" alt="Lien Fabricant">
</a>
## Pré-requis
- Un broker MQTT (Mosquitto) fonctionnel sur Home Assistant.
- Votre PvRouter configuré pour publier sur le topic PVR-XXXX (remplacer le PVROUTER NAME).

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

3. Entrez le préfixe MQTT de votre appareil (ex: `PVR-XXX`).







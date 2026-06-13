# Ollama Chat - Cockpit Modul

Ein leichtgewichtiges, eigenständiges Cockpit-Modul, um direkt in der Webkonsole mit lokalen Ollama-Modellen zu chatten und Linux-Systembefehle auszuführen. Durch die strikte Trennung von HTML, CSS und JavaScript erfüllt dieses Modul die strengen Sicherheitsrichtlinien (Content Security Policy) moderner Cockpit-Installationen.

## Features
* **Nahtlose Integration:** Lädt blitzschnell direkt im linken Seitenmenü deiner Cockpit-Webkonsole.
* **Dynamische Modell-Auswahl:** Liest beim Start automatisch alle auf dem System installierten Ollama-Modelle aus.
* **💻 Integrierte Befehlskonsole:** Führt Linux-Befehle nativ auf dem Server aus, wenn der Nachricht ein `/` vorangestellt wird.
* **Sicher & Lokal:** Der Datenverkehr wird intern getunnelt. Keine HTTPS/HTTP-Konflikte (`Mixed Content`).
* **Session-Reset:** Ein „Neuer Chat“-Button leert das Fenster für eine frische Konversation.

---

## Installation

1. **Ordner kopieren:**
   Kopiere den gesamten Repository-Ordner in das Cockpit-Systemverzeichnis (hierzu werden Root-Schreibrechte benötigt):
   ```bash
   sudo cp -r ../ollama-chat /usr/share/cockpit/

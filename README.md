# Ollama Chat - Cockpit Modul

Ein leichtgewichtiges, eigenständiges Cockpit-Modul, um direkt in der Webkonsole mit lokalen Ollama-Modellen zu chatten. Durch die strikte Trennung von HTML, CSS und JavaScript erfüllt dieses Modul die strengen Sicherheitsrichtlinien (Content Security Policy) moderner Cockpit-Installationen.

## Features
* **Nahtlose Integration:** Lädt blitzschnell direkt im selben Cockpit-Fenster.
* **Dynamische Modell-Auswahl:** Liest beim Start automatisch alle installierten Ollama-Modelle aus.
* **Sicher & Lokal:** Der Datenverkehr wird intern getunnelt. Keine HTTPS/HTTP-Konflikte (`Mixed Content`).
* **Session-Reset:** Ein „Neuer Chat“-Button leert das Fenster für eine frische Konversation.

---

## Installation

1. **Ordner kopieren:**
   Kopiere den gesamten Repository-Ordner in das Cockpit-Systemverzeichnis:
```bash
   sudo cp -r ../ollama-chat /usr/share/cockpit/
2. **WICHTIG: Dateirechte setzen (Schreib-/Leserechte)**
   Cockpit benötigt zwingend globale Leserechte für die Modul-Dateien, um sie im Browser korrekt auszuliefern. Da die Dateien beim Kopieren oft dem Benutzer root zugeordnet werden, muss dieser Befehl zwingend ausgeführt werden:
```bash
   sudo chmod -R 755 /usr/share/cockpit/ollama-chat
   Achtung: Ohne diesen Schritt bleibt das Modul entweder im Cockpit-Menü unsichtbar oder lädt ohne Design (was zu einem Absturz des JavaScripts und zu einem MIME-Type-Fehler 'text/html' statt 'text/css' in der Browser-Konsole führt).


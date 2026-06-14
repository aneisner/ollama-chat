# Ollama Cockpit Chat-Agent & Terminal CLI 🚀

Ein sicherer, rein faktenbasierter und hochperformanter KI-System-Agent zur Serveradministration. Dieses Projekt bietet zwei nahtlose Schnittstellen: Eine elegante Web-Erweiterung für das **Cockpit Project Panel** und einen blitzschnellen **Python-Kommandozeilen-Client (CLI)** für das Terminal. Beide Systeme ermöglichen es, Linux durch natürliche Sprache zu steuern, Systemzustände zu analysieren und Aufgaben automatisiert auszuführen – bei voller Kontrolle über die Sicherheit.

---

## 🌟 Key Features

* **🛡️ Interaktiver Sicherheits-Check:** Bevor ein von der KI generierter Befehl ausgeführt wird, fängt das System (sowohl in der Web-UI als auch im Terminal) diesen ab und verlangt eine manuelle Freigabe. Kein unbefugter Blindflug auf dem Server!
* **🧠 Anti-Halluzinations-Schutz ("Märchen-Killer"):** Durch die Fixierung der Modell-Temperatur auf `0.0` arbeitet die lokale KI absolut logisch, mathematisch stur und rein faktenbasiert.
* **🔑 Echte Root-Privilegien:** Über die Cockpit-Bridge (`superuser: "require"`) oder durch Aufruf des Python-Skripts mit `sudo` führt der Agent freigegebene Befehle mit echten administrativen Rechten aus.
* **🛑 Asynchroner Stop-Button:** Hängt die KI, kann der Prozess im Web über den roten Stop-Button oder im Terminal per `Strg+C` sofort sauber und ohne Absturz gekillt werden.
* **📊 Optionale KI-Ergebnis-Interpretation:** Nach der Befehlsausführung wird das echte Terminal-Ergebnis empfangen. Du wirst danach gefragt, ob du eine detaillierte Analyse der Daten benötigst.
* **💻 Python Terminal-Client (`agent.py`):** Ein nativer CLI-Modus mit ANSI-Farben, interaktiver Menüführung und der Möglichkeit, Modelle on-the-fly per `/modelle` Befehl zu wechseln.
* **🎨 Modernes PatternFly-Design (Web):** Der gesamte Verlauf in der Cockpit-UI fügt sich in eleganten Chatblasen in das native Design von Ubuntu/Fedora Cockpit ein.

---

## 📁 Dateistruktur

```text
~/ollama-chat/
├── index.html     # Die UI-Struktur mit Sidebar, Chatbox und Buttons
├── index.css      # Modernes CSS für Chatblasen und Sicherheitsbox
├── index.js       # Kern-Logik für Ollama-API, Cockpit-Spawn und Root-Rechte
├── agent.py       # Der interaktive Python-Terminal-Client (CLI)
├── manifest.json  # Die Registrierungsdatei für das Cockpit-System-Menü
└── README.md      # Diese Dokumentation

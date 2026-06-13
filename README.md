# Ollama Cockpit Chat-Agent 🚀

Ein sicherer, rein faktenbasierter und hochperformanter KI-System-Agent zur Serveradministration, nahtlos integriert als Erweiterung für das **Cockpit Project Panel**. Das Modul ermöglicht es, Linux-Systeme durch natürliche Sprache zu steuern, Systemzustände zu analysieren und administrative Aufgaben automatisiert auszuführen – bei voller Kontrolle über die Sicherheit.

---

## 🌟 Key Features

* **🛡️ Interaktiver Sicherheits-Check:** Bevor ein von der KI generierter Befehl ausgeführt wird, fängt die UI diesen ab und präsentiert ihn in einer dezenten, hellgrauen Warnbox zur manuellen Freigabe. Kein unbefugter Blindflug auf dem Server!
* **🧠 Anti-Halluzinations-Schutz ("Märchen-Killer"):** Durch die harte Fixierung der Modell-Temperatur auf `options: { temperature: 0.0 }` arbeitet die lokale KI absolut logisch, mathematisch stur und rein faktenbasiert. Kein Erfinden von Dateien oder Logeinträgen.
* **🔑 Echte Root-Privilegien:** Über die Cockpit-Bridge (`{ superuser: "require" }`) führt der Agent freigegebene Befehle mit echten administrativen Rechten aus. Zugriff auf geschützte Systempfade wie `/root/` oder `/etc/shadow` klappt fehlerfrei.
* **🛑 Asynchroner Stop-Button:** Wenn die KI sich verrennt oder ein Terminal-Befehl zu lange braucht, verwandelt sich der Senden-Button in ein Alarmsignal-Rot. Ein Klick bricht den HTTP-Stream oder den Linux-Bash-Prozess im Hintergrund sofort sauber ab.
* **📊 Optionale KI-Ergebnis-Interpretation:** Nach der Befehlsausführung wird das echte, nackte Terminal-Ergebnis in einer Monospace-Blase ausgegeben. Eine blaue Infobox fragt dich optional per Mausklick, ob du eine detaillierte Analyse der KI benötigst. Das spart Rechenleistung und Zeit.
* **📂 Chat-Verlauf (Sidebar):** Integrierte Seitenleiste mit Chat-Historie, persistiert im `localStorage` deines Browsers inklusive Schnellstart-Funktion für neue Sitzungen.
* **🎨 Modernes PatternFly-Design:** Keine hässlichen, schwarzen DOS-Konsolen-Kästen mehr. Der gesamte Verlauf fügt sich in eleganten, sauberen Chatblasen nahtlos in das native Design von Ubuntu/Fedora Cockpit ein.

---

## 📁 Dateistruktur

```text
~/ollama-chat/
├── index.html     # Die UI-Struktur mit Sidebar, Chatbox und Buttons (v=5 Cache-Breaker)
├── index.css      # Modernes CSS für Chatblasen, Stop-Button und Hellgrau-Sicherheitsbox
├── index.js       # Kern-Logik für Ollama-API, Cockpit-Spawn, Root-Rechte und Prozess-Kill
├── manifest.json  # Die Registrierungsdatei für das Cockpit-System-Menü
└── README.md      # Diese Dokumentation (mit Entwickler-Stempel)

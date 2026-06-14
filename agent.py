#!/usr/bin/env python3
# Erstellt von Toni & KI | Modul: Ollama CLI Agent | Beschreibung: Terminal-Client mit Root-Befehlen, dynamischem User, Modellauswahl und /exec Shortcut

import requests
import json
import subprocess
import sys
import re
import os
import getpass

# Holt den echten Benutzernamen, auch wenn das Skript mit "sudo" ausgeführt wird
CURRENT_USER = os.environ.get("SUDO_USER", os.environ.get("USER", getpass.getuser()))

# Terminal-Farben für die schicke Ausgabe
C_BLUE = '\033[94m'
C_GREEN = '\033[92m'
C_RED = '\033[91m'
C_YELLOW = '\033[93m'
C_END = '\033[0m'

OLLAMA_API_BASE = "http://127.0.0.1:11434/api"
DEFAULT_MODEL = "qwen2.5-coder:3b"

# Militärischer Prompt MIT Regel für die Ergebnis-Analyse
SYSTEM_PROMPT = {
    "role": "system",
    "content": f"""Du bist ein technischer Linux-System-Agent auf dem Server von {CURRENT_USER}. Du bist KEIN Chatbot, du bist eine Maschine!
    
    STRIKTE REGELN:
    1. Wenn {CURRENT_USER} eine Aktion, Datei oder Systeminfo anfragt, antwortest du AUSSCHLIESSLICH mit dem Befehl.
    2. Das Format für Befehle muss exakt so aussehen: [[EXEC: dein_linux_befehl]]
    3. BEISPIEL:
       User: "zeige mir den inhalt vom etc verzeichnis"
       Du: [[EXEC: ls -la /etc]]
    4. INTERPRETATION: Wenn deine Eingabe mit "[System-Ergebnis des ausgeführten Befehls]" beginnt, ist der Befehl BEREITS ERFOLGREICH AUSGEFÜHRT. Du darfst dann NIEMALS einen neuen [[EXEC]]-Tag generieren! Analysiere stattdessen die Daten sachlich und erkläre sie als normalen Text.
    5. Nur wenn {CURRENT_USER} chattet (ohne Systembezug), antwortest du normal und kurz."""
}

messages = [SYSTEM_PROMPT]

def list_and_select_model(current_model):
    """Holt die Liste der Modelle von Ollama und lässt den Benutzer wählen."""
    try:
        response = requests.get(f"{OLLAMA_API_BASE}/tags")
        response.raise_for_status()
        models = response.json().get("models", [])
    except requests.exceptions.RequestException as e:
        print(f"{C_RED}Fehler beim Abrufen der Modelle: {e}{C_END}")
        return current_model

    if not models:
        print(f"{C_YELLOW}Keine Modelle gefunden. Bitte erst Modelle über Ollama herunterladen.{C_END}")
        return current_model

    print(f"\n{C_BLUE}--- Verfügbare Ollama Modelle ---{C_END}")
    for i, m in enumerate(models):
        name = m.get("name", "Unbekannt")
        marker = f" {C_GREEN}(aktuell aktiv){C_END}" if name == current_model else ""
        print(f"[{i+1}] {name}{marker}")
    
    print(f"[{len(models)+1}] Abbrechen und aktuelles Modell behalten")

    choice = input(f"\n{C_YELLOW}Wähle eine Nummer (1-{len(models)+1}): {C_END}").strip()
    
    try:
        choice_idx = int(choice) - 1
        if 0 <= choice_idx < len(models):
            new_model = models[choice_idx].get("name")
            print(f"{C_GREEN}✅ Modell erfolgreich auf '{new_model}' gewechselt!{C_END}\n")
            return new_model
        else:
            print(f"{C_YELLOW}Auswahl abgebrochen. Behalte '{current_model}'.{C_END}\n")
            return current_model
    except ValueError:
        print(f"{C_YELLOW}Ungültige Eingabe. Behalte '{current_model}'.{C_END}\n")
        return current_model

def ask_ollama(messages_list, model_name):
    """Sendet die Anfrage an Ollama und streamt die Antwort live ins Terminal."""
    payload = {
        "model": model_name,
        "messages": messages_list,
        "stream": True,
        "options": {
            "temperature": 0.0, 
            "num_ctx": 1500 # CPU Entlastung
        }
    }
    
    print(f"\n{C_BLUE}Agent überlegt...{C_END}")
    
    try:
        response = requests.post(f"{OLLAMA_API_BASE}/chat", json=payload, stream=True)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"{C_RED}Fehler bei der Verbindung zu Ollama: {e}{C_END}")
        sys.exit(1)

    full_response = ""
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            chunk = data.get("message", {}).get("content", "")
            full_response += chunk
            sys.stdout.write(chunk)
            sys.stdout.flush()
    
    print() 
    return full_response

def main():
    current_model = DEFAULT_MODEL
    print(f"{C_GREEN}=== Ollama Terminal Agent gestartet ==={C_END}")
    print(f"Willkommen, {CURRENT_USER}! Aktuelles Modell: {C_BLUE}{current_model}{C_END}")
    print("Tipps: 'exit' = Beenden | '/modelle' = Modell wechseln | '/exec <aufgabe>' = Befehl erzwingen\n")
    
    while True:
        try:
            user_input = input(f"{C_YELLOW}{CURRENT_USER}:~${C_END} ").strip()
            if not user_input:
                continue
                
            if user_input.lower() in ['exit', 'quit']:
                break
                
            if user_input.lower() in ['/modelle', '/model']:
                current_model = list_and_select_model(current_model)
                continue
            
            # NEU: Der /exec Shortcut-Filter
            if user_input.lower().startswith('/exec '):
                task = user_input[6:].strip()
                enforced_prompt = f"SYSTEM-OVERRIDE: Übersetze die folgende Aufgabe zwingend in einen Linux-Befehl. Antworte AUSSCHLIESSLICH im Format [[EXEC: <befehl>]]. Kein Vorwort, keine Erklärungen!\nAufgabe: {task}"
                messages.append({"role": "user", "content": enforced_prompt})
            else:
                messages.append({"role": "user", "content": user_input})
            
            ai_text = ask_ollama(messages, current_model)
            messages.append({"role": "assistant", "content": ai_text})
            
            exec_match = re.search(r'\[\[EXEC:\s*(.*?)(?=\s*\]\])', ai_text)
            
            if exec_match:
                command = exec_match.group(1).strip()
                print(f"\n{C_RED}⚠️ SICHERHEITS-CHECK: Die KI möchte folgenden Befehl ausführen:{C_END}")
                print(f"{C_BLUE}Befehl:{C_END} {command}")
                
                auth = input(f"Ausführen? (j/n): ").strip().lower()
                if auth == 'j':
                    print(f"{C_GREEN}Führe aus...{C_END}")
                    result = subprocess.run(command, shell=True, capture_output=True, text=True)
                    output = result.stdout if result.stdout else result.stderr
                    
                    if not output.strip():
                        output = "[Befehl erfolgreich ohne Rückgabe ausgeführt]"
                        
                    print(f"\n{C_YELLOW}--- Terminal Ergebnis ---{C_END}\n{output.strip()}\n{C_YELLOW}-------------------------{C_END}")
                    
                    messages.append({"role": "user", "content": f"[System-Ergebnis des ausgeführten Befehls]:\n{output}"})
                    
                    interpret = input(f"{C_BLUE}Soll ich das Ergebnis für dich analysieren? (j/n): {C_END}").strip().lower()
                    if interpret == 'j':
                        ans = ask_ollama(messages, current_model)
                        messages.append({"role": "assistant", "content": ans})
                else:
                    print(f"{C_RED}🛑 Befehl abgelehnt.{C_END}")
                    messages.append({"role": "user", "content": "Der Benutzer hat die Ausführung des Befehls aus Sicherheitsgründen abgelehnt."})

        except KeyboardInterrupt:
            print(f"\n{C_RED}🛑 Vorgang durch Benutzer abgebrochen (Strg+C).{C_END}")
            continue

if __name__ == "__main__":
    main()

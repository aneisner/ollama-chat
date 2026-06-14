#!/usr/bin/env python3
# Erstellt von aneisner | Modul: Ollama CLI Agent | Beschreibung: Terminal-Client mit Root-Befehlsausführung und Modellauswahl

import requests
import json
import subprocess
import sys
import re

# Terminal-Farben für die schicke Ausgabe
C_BLUE = '\033[94m'
C_GREEN = '\033[92m'
C_RED = '\033[91m'
C_YELLOW = '\033[93m'
C_END = '\033[0m'

OLLAMA_API_BASE = "http://127.0.0.1:11434/api"
DEFAULT_MODEL = "qwen2.5-coder:3b" # Startmodell

SYSTEM_PROMPT = {
    "role": "system",
    "content": """Du bist ein unbestechlicher, rein faktenbasierter Linux-System-Agent auf Tonis Server.
    
    DEIN PROTOKOLL:
    1. Wenn Toni eine Aufgabe stellt, die eine Aktion auf dem Server erfordert: Nenne NUR kurz den Befehl im Format [[EXEC: dein_befehl]]. Keinen weiteren Text!
    2. Wenn Toni nur chattet: Antworte ihm ganz normal und kurz als Text. Verwende dann NIEMALS den [[EXEC]]-Tag!
    3. Wenn du ein echtes Terminal-Ergebnis erhältst, erklärst du Toni sachlich, was dort steht."""
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
        "options": {"temperature": 0.0, "num_ctx": 1500}
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
    print(f"Aktuelles Modell: {C_BLUE}{current_model}{C_END}")
    print("Tippe 'exit' zum Beenden oder '/modelle' um das Modell zu wechseln.\n")
    
    while True:
        try:
            user_input = input(f"{C_YELLOW}Toni:~${C_END} ").strip()
            if not user_input:
                continue
                
            if user_input.lower() in ['exit', 'quit']:
                break
                
            # NEU: Befehl zum Wechseln des Modells abfangen
            if user_input.lower() == '/modelle' or user_input.lower() == '/model':
                current_model = list_and_select_model(current_model)
                continue
            
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
            # Verhindert, dass das gesamte Skript bei Strg+C abstürzt
            continue

if __name__ == "__main__":
    main()

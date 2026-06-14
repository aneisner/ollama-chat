#!/usr/bin/env python3
# Erstellt von aneisner | Modul: Ollama CLI Agent | Beschreibung: Terminal-Client mit Root-Befehlsausführung

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

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "qwen2.5-coder:3b" # Hier dein bevorzugtes Modell eintragen

SYSTEM_PROMPT = {
    "role": "system",
    "content": """Du bist ein unbestechlicher, rein faktenbasierter Linux-System-Agent auf Tonis Server.
    
    DEIN PROTOKOLL:
    1. Wenn Toni eine Aufgabe stellt, die eine Aktion auf dem Server erfordert: Nenne NUR kurz den Befehl im Format [[EXEC: dein_befehl]]. Keinen weiteren Text!
    2. Wenn Toni nur chattet: Antworte ihm ganz normal und kurz als Text. Verwende dann NIEMALS den [[EXEC]]-Tag!
    3. Wenn du ein echtes Terminal-Ergebnis erhältst, erklärst du Toni sachlich, was dort steht."""
}

messages = [SYSTEM_PROMPT]

def ask_ollama(messages_list):
    """Sendet die Anfrage an Ollama und streamt die Antwort live ins Terminal."""
    payload = {
        "model": MODEL,
        "messages": messages_list,
        "stream": True,
        "options": {"temperature": 0.0, "num_ctx": 1500}
    }
    
    print(f"\n{C_BLUE}Agent überlegt...{C_END}")
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, stream=True)
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
            # Live-Ausgabe ohne Zeilenumbruch
            sys.stdout.write(chunk)
            sys.stdout.flush()
    
    print() # Zeilenumbruch am Ende
    return full_response

def main():
    print(f"{C_GREEN}=== Ollama Terminal Agent gestartet (Modell: {MODEL}) ==={C_END}")
    print("Tippe 'exit' oder 'quit' um zu beenden. (Abbruch mit Strg+C)\n")
    
    while True:
        try:
            user_input = input(f"{C_YELLOW}Toni:~${C_END} ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit']:
                break
            
            messages.append({"role": "user", "content": user_input})
            
            # KI antworten lassen
            ai_text = ask_ollama(messages)
            messages.append({"role": "assistant", "content": ai_text})
            
            # Prüfen, ob ein Befehl ausgeführt werden soll
            exec_match = re.search(r'\[\[EXEC:\s*(.*?)(?=\s*\]\])', ai_text)
            
            if exec_match:
                command = exec_match.group(1).strip()
                print(f"\n{C_RED}⚠️ SICHERHEITS-CHECK: Die KI möchte folgenden Befehl ausführen:{C_END}")
                print(f"{C_BLUE}Befehl:{C_END} {command}")
                
                auth = input(f"Ausführen? (j/n): ").strip().lower()
                if auth == 'j':
                    print(f"{C_GREEN}Führe aus...{C_END}")
                    # Befehl im System ausführen
                    result = subprocess.run(command, shell=True, capture_output=True, text=True)
                    output = result.stdout if result.stdout else result.stderr
                    
                    if not output.strip():
                        output = "[Befehl erfolgreich ohne Rückgabe ausgeführt]"
                        
                    print(f"\n{C_YELLOW}--- Terminal Ergebnis ---{C_END}\n{output.strip()}\n{C_YELLOW}-------------------------{C_END}")
                    
                    # Ergebnis zur Interpretation an KI zurücksenden
                    messages.append({"role": "user", "content": f"[System-Ergebnis des ausgeführten Befehls]:\n{output}"})
                    
                    interpret = input(f"{C_BLUE}Soll ich das Ergebnis für dich analysieren? (j/n): {C_END}").strip().lower()
                    if interpret == 'j':
                        ans = ask_ollama(messages)
                        messages.append({"role": "assistant", "content": ans})
                else:
                    print(f"{C_RED}🛑 Befehl abgelehnt.{C_END}")
                    messages.append({"role": "user", "content": "Der Benutzer hat die Ausführung des Befehls aus Sicherheitsgründen abgelehnt."})

        except KeyboardInterrupt:
            # Das ist dein "Stop-Button" fürs Terminal!
            print(f"\n{C_RED}🛑 Vorgang durch Benutzer abgebrochen (Strg+C).{C_END}")
            break

if __name__ == "__main__":
    main()

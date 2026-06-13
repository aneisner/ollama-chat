// Cockpit-Netzwerktunnel zu Ollama öffnen
const ollama = cockpit.http(11434);
const modelSelect = document.getElementById("model-select");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");

// Modelle beim Start abrufen
ollama.get("/api/tags")
    .then(data => {
        const response = JSON.parse(data);
        modelSelect.innerHTML = "";
        response.models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.name;
            opt.innerText = m.name;
            modelSelect.appendChild(opt);
        });
    })
    .catch(err => { 
        console.error("Ollama Fehler:", err);
        modelSelect.innerHTML = "<option>Fehler: Ollama blockiert</option>"; 
    });

function sendMessage() {
    const text = userInput.value.trim();
    const selectedModel = modelSelect.value;
    if (!text) return;

    // Hilfsfunktion zum Entsperren der UI
    function uiAusgeben() {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // FALL A: Es ist ein Linux-Befehl (beginnt mit /)
    if (text.startsWith('/')) {
        const command = text.substring(1).trim(); // Das "/" abschneiden
        if (!command) return;

        // User-Eingabe im Chat anzeigen
        chatBox.innerHTML += `<div class="msg user-msg" style="background: #23272a;">💻 Befehl: ${command}</div>`;
        userInput.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;

        // UI sperren während der Ausführung
        sendBtn.disabled = true;
        userInput.disabled = true;

        // Terminal-Box für die Ausgabe vorbereiten
        const cmdId = "cmd-" + Date.now();
        chatBox.innerHTML += `<div class="msg ai-msg" id="${cmdId}" style="font-family: monospace; white-space: pre-wrap; background: #1c1d22; color: #39d353; border-color: #30363d; width: 90%; max-width: 100%;"><i>Führe Befehl aus...</i></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        // Befehl nativ auf dem Server ausführen via Cockpit-Bridge
        cockpit.spawn(["bash", "-c", command])
            .done(output => {
                document.getElementById(cmdId).innerText = output || "[Befehl erfolgreich ausgeführt (Keine Rückgabe)]";
                uiAusgeben();
            })
            .fail(error => {
                document.getElementById(cmdId).innerHTML = `<span style='color:#ff6b6b;'><b>Fehler (Code ${error.exit_code || error.status}):</b>\n${error.message || 'Befehl fehlgeschlagen'}</span>`;
                uiAusgeben();
            });

        return; // Beendet die Funktion hier, damit es nicht an Ollama gesendet wird
    }

    // FALL B: Normale KI-Anfrage (kein / am Anfang)
    if (!selectedModel) return;

    chatBox.innerHTML += `<div class="msg user-msg">${text}</div>`;
    userInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    sendBtn.disabled = true;
    userInput.disabled = true;
    const aiMessageDivId = "ai-" + Date.now();
    chatBox.innerHTML += `<div class="msg ai-msg" id="${aiMessageDivId}"><i>Überlege...</i></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    ollama.post("/api/generate", JSON.stringify({ model: selectedModel, prompt: text, stream: false }))
        .then(response => {
            const data = JSON.parse(response);
            document.getElementById(aiMessageDivId).innerText = data.response;
        })
        .catch(err => { 
            console.error("Chat Fehler:", err);
            document.getElementById(aiMessageDivId).innerHTML = "<span style='color:red;'>Fehler beim Abruf.</span>"; 
        })
        .then(() => {
            uiAusgeben();
        });
}

function resetChat() {
    chatBox.innerHTML = `<div class="msg ai-msg">Hallo Toni! Ich bin dein lokaler Ollama-Assistent im Cockpit. Wie kann ich helfen? <br><br><small><i>Tipp: Tippe <b>/befehl</b> (z.B. <code>/uname -a</code>), um Linux-Befehle direkt auszuführen.</i></small></div>`;
    userInput.value = "";
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
}

// Event-Listener binden
sendBtn.addEventListener("click", sendMessage);
newChatBtn.addEventListener("click", resetChat);
userInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

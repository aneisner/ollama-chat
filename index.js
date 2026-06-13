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
        const command = text.substring(1).trim();
        if (!command) return;

        chatBox.innerHTML += `<div class="msg user-msg cmd-user-msg">💻 Befehl: ${command}</div>`;
        userInput.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;

        sendBtn.disabled = true;
        userInput.disabled = true;

        const cmdId = "cmd-" + Date.now();
        chatBox.innerHTML += `<div class="msg ai-msg cmd-ai-msg" id="${cmdId}"><i>Führe Befehl aus...</i></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        cockpit.spawn(["bash", "-c", command])
            .done(output => {
                document.getElementById(cmdId).innerText = output || "[Befehl erfolgreich ausgeführt (Keine Rückgabe)]";
                uiAusgeben();
            })
            .fail(error => {
                document.getElementById(cmdId).innerHTML = `<span class="text-danger"><b>Fehler (Code ${error.exit_code || error.status}):</b>\n${error.message || 'Befehl fehlgeschlagen'}</span>`;
                uiAusgeben();
            });

        return;
    }

    // FALL B: Normale KI-Anfrage mit Live-Streaming
    if (!selectedModel) return;

    chatBox.innerHTML += `<div class="msg user-msg">${text}</div>`;
    userInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    sendBtn.disabled = true;
    userInput.disabled = true;

    const aiMessageDivId = "ai-" + Date.now();
    chatBox.innerHTML += `<div class="msg ai-msg" id="${aiMessageDivId}"><i>Überlege...</i></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const aiMessageDiv = document.getElementById(aiMessageDivId);
    let isFirstChunk = true;
    let buffer = "";

    const request = ollama.request({
        method: "POST",
        path: "/api/generate",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, prompt: text, stream: true })
    });

    request.stream(function(data) {
        buffer += data;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        lines.forEach(line => {
            if (line.trim() === "") return;
            try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                    if (isFirstChunk) {
                        aiMessageDiv.innerText = "";
                        isFirstChunk = false;
                    }
                    aiMessageDiv.innerText += parsed.response;
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            } catch (e) {
                console.error("Fehler beim Live-Parsen einer Zeile:", e);
            }
        });
    });

    request.done(function() {
        if (buffer.trim() !== "") {
            try {
                const parsed = JSON.parse(buffer);
                if (parsed.response) {
                    if (isFirstChunk) aiMessageDiv.innerText = "";
                    aiMessageDiv.innerText += parsed.response;
                }
            } catch(e){}
        }
        uiAusgeben();
    });

    request.fail(function(err) {
        console.error("Streaming Chat Fehler:", err);
        if (isFirstChunk) {
            aiMessageDiv.innerHTML = "<span class='text-danger'>Fehler beim Abruf. (Verbindung abgebrochen)</span>";
        } else {
            aiMessageDiv.innerHTML += "<br><span class='text-danger'>[Stream abgebrochen]</span>";
        }
        uiAusgeben();
    });
}

function resetChat() {
    chatBox.innerHTML = `<div class="msg ai-msg">Hallo Toni! Ich bin dein lokaler Ollama-Assistent im Cockpit. Wie kann ich helfen? <br><br><small class="text-muted"><i>Tipp: Tippe <b>/befehl</b> (z.B. <code>/uname -a</code>), um Linux-Befehle direkt auszuführen.</i></small></div>`;
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

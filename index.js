const ollama = cockpit.http(11434);
const modelSelect = document.getElementById("model-select");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const historyList = document.getElementById("history-list");

// Status-Variablen für den Verlauf
let chats = JSON.parse(localStorage.getItem("ollama_cockpit_chats")) || [];
let currentChatId = null;
let currentMessages = [];

// Modelle abrufen
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

function saveToLocalStorage() {
    localStorage.setItem("ollama_cockpit_chats", JSON.stringify(chats));
}

function renderSidebar() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = "history-item";
        if (chat.id === currentChatId) item.className += " active";
        item.innerText = chat.title;
        item.addEventListener("click", () => loadChat(chat.id));
        historyList.appendChild(item);
    });
}

function loadChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    
    currentChatId = chat.id;
    currentMessages = chat.messages;
    renderSidebar();
    
    chatBox.innerHTML = "";
    currentMessages.forEach(m => {
        if (m.role === 'user') {
            chatBox.innerHTML += `<div class="msg user-msg">${m.content}</div>`;
        } else if (m.role === 'assistant') {
            chatBox.innerHTML += `<div class="msg ai-msg">${m.content}</div>`;
        } else if (m.role === 'command-user') {
            chatBox.innerHTML += `<div class="msg user-msg cmd-user-msg">💻 Befehl: ${m.content}</div>`;
        } else if (m.role === 'command-assistant') {
            chatBox.innerHTML += `<div class="msg ai-msg cmd-ai-msg">${m.content}</div>`;
        }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

function resetChat() {
    currentChatId = "chat_" + Date.now();
    currentMessages = [];
    renderSidebar();

    chatBox.innerHTML = `
        <div class="msg ai-msg">
            Hallo Toni! Ich bin dein lokaler Ollama-Assistent im Cockpit. Wie kann ich helfen?
            <br><br>
            <small class="text-muted">
                💡 <b>Tipp:</b> Tippe ein <b><code>/</code></b> direkt gefolgt von einem Linux-Befehl 
                (z. B. <code>/podman ps</code> oder <code>/df -h</code>), um ihn direkt auf dem Server auszuführen.
            </small>
        </div>`;
    userInput.value = "";
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
}

function sendMessage() {
    const text = userInput.value.trim();
    const selectedModel = modelSelect.value;
    if (!text) return;

    function uiAusgeben() {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // FALL A: Linux-Befehl
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

        currentMessages.push({ role: 'command-user', content: command });

        cockpit.spawn(["bash", "-c", command])
            .done(output => {
                const resText = output || "[Erfolgreich ausgeführt]";
                document.getElementById(cmdId).innerText = resText;
                currentMessages.push({ role: 'command-assistant', content: resText });
                
                // Chat in Liste updaten oder neu erstellen
                updateChatInList(text);
                uiAusgeben();
            })
            .fail(error => {
                const errText = `Fehler (Code ${error.exit_code || error.status}):\n${error.message || 'Befehl fehlgeschlagen'}`;
                document.getElementById(cmdId).innerHTML = `<span class="text-danger">${errText}</span>`;
                currentMessages.push({ role: 'command-assistant', content: errText });
                
                updateChatInList(text);
                uiAusgeben();
            });

        return;
    }

    // FALL B: Normale Streaming KI-Anfrage via /api/chat
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

    // Nachricht zum aktuellen Verlauf hinzufügen
    currentMessages.push({ role: 'user', content: text });

    // Nur echte user/assistant Nachrichten an Ollama senden (Befehle filtern!)
    const ollamaPayload = currentMessages.filter(m => m.role === 'user' || m.role === 'assistant');

    const request = ollama.request({
        method: "POST",
        path: "/api/chat",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: ollamaPayload, stream: true })
    });

    request.stream(function(data) {
        buffer += data;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        lines.forEach(line => {
            if (line.trim() === "") return;
            try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                    if (isFirstChunk) {
                        aiMessageDiv.innerText = "";
                        isFirstChunk = false;
                    }
                    aiMessageDiv.innerText += parsed.message.content;
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            } catch (e) {
                console.error("Fehler beim Parsen:", e);
            }
        });
    });

    request.done(function() {
        let finalAiText = aiMessageDiv.innerText;
        currentMessages.push({ role: 'assistant', content: finalAiText });
        
        updateChatInList(text);
        uiAusgeben();
    });

    request.fail(function(err) {
        console.error("Streaming Fehler:", err);
        aiMessageDiv.innerHTML += "<br><span class='text-danger'>[Stream abgebrochen]</span>";
        uiAusgeben();
    });
}

function updateChatInList(firstText) {
    const existingChat = chats.find(c => c.id === currentChatId);
    if (existingChat) {
        existingChat.messages = currentMessages;
    } else {
        // Neuen Verlauf-Eintrag oben anfügen. Titel basiert auf der ersten Nachricht
        const title = firstText.startsWith('/') ? "💻 " + firstText.substring(1, 20) : firstText.substring(0, 22);
        chats.unshift({
            id: currentChatId,
            title: title + (firstText.length > 22 ? "..." : ""),
            messages: currentMessages
        });
    }
    saveToLocalStorage();
    renderSidebar();
}

// Start-Steuerung
newChatBtn.addEventListener("click", resetChat);
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

// Beim ersten Laden der App
renderSidebar();
if (chats.length > 0) {
    loadChat(chats[0].id); // Lade den letzten Chat automatisch
} else {
    resetChat();
}

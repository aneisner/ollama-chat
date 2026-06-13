const ollama = cockpit.http(11434);
const modelSelect = document.getElementById("model-select");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn"); // Neu
const newChatBtn = document.getElementById("new-chat-btn");
const historyList = document.getElementById("history-list");

let chats = [];
try {
    chats = JSON.parse(localStorage.getItem("ollama_cockpit_chats")) || [];
    if (!Array.isArray(chats)) chats = [];
} catch (e) {
    chats = [];
}

let currentChatId = null;
let currentMessages = [];
let currentActiveProcess = null;  // Hält den aktiven Stream oder System-Prozess
let wasIntentionalStop = false;  // Verhindert hässliche rote Error-Blöcke bei manuellem Abbruch

const SYSTEM_PROMPT = {
    role: 'system',
    content: `Du bist ein unbestechlicher, rein faktenbasierter Linux-System-Agent auf Tonis Server. 
    Du darfst NIEMALS Vermutungen anstellen, Ergebnisse im Voraus erfinden oder Verzeichnisse simulieren! Du kennst die Daten erst, wenn du das Terminal-Ergebnis siehst.
    
    DEIN PROTOKOLL:
    1. In der ersten Antwort nennst du NUR kurz den Befehl im Format [[EXEC: dein_befehl]]. Keinen weiteren Text, keine erfundenen Tabellen!
    2. Wenn du das echte Ergebnis als System-Nachricht erhältst, analysierst du stur NUR diese Daten und erklärst Toni sachlich, was dort steht.`
};

// Hilfsfunktion: Steuert das nahtlose Swappen von Senden- und Stop-Button
function toggleControls(isActive) {
    if (isActive) {
        sendBtn.style.display = "none";
        stopBtn.style.display = "block";
        userInput.disabled = true;
    } else {
        sendBtn.style.display = "block";
        stopBtn.style.display = "none";
        userInput.disabled = false;
        userInput.focus();
    }
}

// Modelle beim Start abrufen
ollama.get("/api/tags")
    .then(data => {
        const response = JSON.parse(data);
        modelSelect.innerHTML = "";
        if (response.models && response.models.length > 0) {
            response.models.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m.name;
                opt.innerText = m.name;
                modelSelect.appendChild(opt);
            });
        } else {
            modelSelect.innerHTML = "<option>Keine Modelle gefunden</option>";
        }
    })
    .catch(err => { 
        modelSelect.innerHTML = "<option>Fehler: Ollama blockiert</option>"; 
    });

function saveToLocalStorage() {
    localStorage.setItem("ollama_cockpit_chats", JSON.stringify(chats));
}

function renderSidebar() {
    if (!historyList) return;
    historyList.innerHTML = "";
    chats.forEach(chat => {
        if (!chat || !chat.id) return;
        const item = document.createElement("div");
        item.className = "history-item";
        if (chat.id === currentChatId) item.className += " active";
        item.innerText = chat.title || "Unbenannter Chat";
        item.addEventListener("click", () => loadChat(chat.id));
        historyList.appendChild(item);
    });
}

function loadChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    currentChatId = chat.id;
    currentMessages = Array.isArray(chat.messages) ? chat.messages : [];
    renderSidebar();
    
    chatBox.innerHTML = "";
    currentMessages.forEach(m => {
        if (!m || !m.role) return;
        if (m.role === 'user') {
            chatBox.insertAdjacentHTML('beforeend', `<div class="msg user-msg">${m.content || ''}</div>`);
        } else if (m.role === 'assistant') {
            chatBox.insertAdjacentHTML('beforeend', `<div class="msg ai-msg">${m.content || ''}</div>`);
        } else if (m.role === 'command-user') {
            chatBox.insertAdjacentHTML('beforeend', `<div class="msg user-msg cmd-user-msg">💻 Agent-Befehl: ${m.content || ''}</div>`);
        } else if (m.role === 'command-assistant') {
            chatBox.insertAdjacentHTML('beforeend', `<div class="msg ai-msg cmd-ai-msg">${m.content || ''}</div>`);
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
            Hallo Toni! Ich bin dein KI-System-Agent. Du kannst mich jetzt bitten, Aufgaben auf dem Server zu erledigen!
            <br><br>
            <small class="text-muted">Probiere mal: <i>"Zeig mir den Inhalt von /home/toni/development/ollama-chat/"</i></small>
        </div>`;
    userInput.value = "";
    toggleControls(false);
}

function fetchAiResponse() {
    toggleControls(true);
    wasIntentionalStop = false;

    const aiMessageDivId = "ai-" + Date.now();
    chatBox.insertAdjacentHTML('beforeend', `<div class="msg ai-msg" id="${aiMessageDivId}"><i>Überlege...</i></div>`);
    chatBox.scrollTop = chatBox.scrollHeight;

    const aiMessageDiv = document.getElementById(aiMessageDivId);
    let isFirstChunk = true;
    let buffer = "";

    const ollamaPayload = [SYSTEM_PROMPT];
    currentMessages.forEach(m => {
        if (m.role === 'user' || m.role === 'assistant') {
            ollamaPayload.push(m);
        } else if (m.role === 'command-user') {
            ollamaPayload.push({ role: 'user', content: `[System-Meldung]: Führe Befehl aus: /${m.content}` });
        } else if (m.role === 'command-assistant') {
            ollamaPayload.push({ role: 'user', content: `[System-Ergebnis des ausgeführten Befehls]:\n${m.content}` });
        }
    });

    const selectedModel = modelSelect.value;
    
    const request = ollama.request({
        method: "POST",
        path: "/api/chat",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            model: selectedModel, 
            messages: ollamaPayload, 
            stream: true,
            options: { temperature: 0.0 }
        })
    });

    currentActiveProcess = request; // Für den Abbruch-Handle registrieren

    request.stream(function(data) {
        buffer += data;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        lines.forEach(line => {
            if (line.trim() === "") return;
            try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                    if (isFirstChunk) { aiMessageDiv.innerText = ""; isFirstChunk = false; }
                    aiMessageDiv.innerText += parsed.message.content;
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            } catch (e) {}
        });
    });

    request.done(function() {
        currentActiveProcess = null;
        let finalAiText = aiMessageDiv.innerText;
        currentMessages.push({ role: 'assistant', content: finalAiText });
        
        const firstUserMsg = currentMessages.find(m => m.role === 'user');
        updateChatInList(firstUserMsg ? firstUserMsg.content : "System-Agent");

        const execMatch = finalAiText.match(/\[\[EXEC:\s*(.*?)(?=\s*\]\])/);
        if (execMatch && execMatch[1]) {
            const detectedCommand = execMatch[1].trim();
            aiMessageDiv.innerText = finalAiText.replace(/\[\[EXEC:.*?\]\]/g, "").trim();
            
            const btnId = "auth-btn-" + Date.now();
            const proposalHtml = `
                <div class="msg ai-msg cmd-proposal-box">
                    ⚠️ <b>Sicherheits-Check:</b> KI möchte eine Aktion ausführen:
                    <br><code>${detectedCommand}</code>
                    <br><br>
                    <button id="${btnId}" class="exec-confirm-btn">🛡️ Befehl bestätigen & ausführen</button>
                </div>`;
            
            chatBox.insertAdjacentHTML('beforeend', proposalHtml);
            chatBox.scrollTop = chatBox.scrollHeight;

            // Da ein EXEC-Befehl auf Freigabe wartet, geben wir die Buttons wieder frei
            toggleControls(false);

            const confirmBtn = document.getElementById(btnId);
            confirmBtn.addEventListener("click", function() {
                confirmBtn.disabled = true;
                confirmBtn.innerText = "⏳ Ausführung läuft...";
                
                executeSystemCommand(detectedCommand, function() {
                    confirmBtn.innerText = "✅ Befehl ausgeführt";
                    
                    const analysisBtnId = "analysis-btn-" + Date.now();
                    const analysisHtml = `
                        <div class="msg ai-msg cmd-proposal-box" style="border-left: 5px solid #0066cc !important; background: #f0f6ff !important;">
                            💡 <b>Ergebnis empfangen.</b> Möchtest du, dass ich die Daten für dich interpretiere?
                            <br><br>
                            <button id="${analysisBtnId}" class="exec-confirm-btn" style="background: #0066cc; color: white; border-color: #0056b3;">📊 Ergebnis interpretieren</button>
                        </div>`;
                    
                    chatBox.insertAdjacentHTML('beforeend', analysisHtml);
                    chatBox.scrollTop = chatBox.scrollHeight;
                    
                    toggleControls(false);
                    
                    document.getElementById(analysisBtnId).addEventListener("click", function() {
                        this.disabled = true;
                        this.innerText = "⏳ Analysiere...";
                        fetchAiResponse();
                    });
                });
            });
        } else {
            toggleControls(false);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    request.fail(function(err) {
        currentActiveProcess = null;
        if (wasIntentionalStop) return; // Unterdrückt Fehlermeldung bei manuellem Stop
        aiMessageDiv.innerHTML += "<br><span class='text-danger'>[Fehler beim Abruf]</span>";
        toggleControls(false);
    });
}

function sendMessage() {
    const text = userInput.value.trim();
    const selectedModel = modelSelect.value;
    if (!text) return;

    if (text.startsWith('/')) {
        const command = text.substring(1).trim();
        if (!command) return;
        chatBox.insertAdjacentHTML('beforeend', `<div class="msg user-msg cmd-user-msg">💻 Manueller Befehl: ${command}</div>`);
        userInput.value = "";
        
        toggleControls(true);
        
        executeSystemCommand(command, function() {
            toggleControls(false);
            chatBox.scrollTop = chatBox.scrollHeight;
        });
        return;
    }

    if (!selectedModel) return;

    chatBox.insertAdjacentHTML('beforeend', `<div class="msg user-msg">${text}</div>`);
    userInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    currentMessages.push({ role: 'user', content: text });
    fetchAiResponse();
}

function executeSystemCommand(command, callback) {
    toggleControls(true);
    wasIntentionalStop = false;

    const cmdId = "cmd-" + Date.now();
    chatBox.insertAdjacentHTML('beforeend', `<div class="msg ai-msg cmd-ai-msg" id="${cmdId}"><i>Führe Befehl aus...</i></div>`);
    chatBox.scrollTop = chatBox.scrollHeight;

    currentMessages.push({ role: 'command-user', content: command });

    const proc = cockpit.spawn(["bash", "-c", command], { superuser: "require" });
    currentActiveProcess = proc; // Für den Abbruch-Handle registrieren

    proc.done(output => {
        currentActiveProcess = null;
        const resText = output || "[Befehl erfolgreich ohne Rückgabe ausgeführt]";
        document.getElementById(cmdId).innerText = resText;
        currentMessages.push({ role: 'command-assistant', content: resText });
        saveToLocalStorage();
        callback();
    })
    proc.fail(error => {
        currentActiveProcess = null;
        if (wasIntentionalStop) return; // Unterdrückt Fehlermeldung bei manuellem Stop
        const errText = `Fehler (Code ${error.exit_code || error.status}):\n${error.message || 'Befehl fehlgeschlagen'}`;
        document.getElementById(cmdId).innerHTML = `<span class="text-danger">${errText}</span>`;
        currentMessages.push({ role: 'command-assistant', content: errText });
        saveToLocalStorage();
        callback();
    });
}

// DER AKTION-TRIGGER FÜR DEN STOP-BUTTON
stopBtn.addEventListener("click", function() {
    if (currentActiveProcess) {
        wasIntentionalStop = true;
        currentActiveProcess.close(); // Killt den HTTP-Stream oder den Linux-Bash-Prozess augenblicklich!
        currentActiveProcess = null;
    }
    
    // Sucht das letzte wartende Element im Chat und markiert es als abgebrochen
    const activeThinking = chatBox.querySelector('.ai-msg:last-child');
    if (activeThinking && (activeThinking.innerText.includes("Überlege...") || activeThinking.innerText.includes("Führe Befehl aus..."))) {
        activeThinking.innerHTML = `<span class="text-danger">🛑 Vorgang vom Benutzer abgebrochen.</span>`;
    } else {
        chatBox.insertAdjacentHTML('beforeend', `<div class="msg ai-msg text-danger">🛑 Vorgang vom Benutzer abgebrochen.</div>`);
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
    toggleControls(false); // Macht die Eingabe und den Senden-Button sofort wieder bereit!
});

function updateChatInList(firstText) {
    if (!firstText) firstText = "Neuer Chat";
    const existingChat = chats.find(c => c.id === currentChatId);
    if (existingChat) {
        existingChat.messages = currentMessages;
    } else {
        const title = firstText.startsWith('/') ? "💻 " + firstText.substring(1, 20) : firstText.substring(0, 22);
        chats.unshift({ id: currentChatId, title: title + "...", messages: currentMessages });
    }
    saveToLocalStorage();
    renderSidebar();
}

newChatBtn.addEventListener("click", resetChat);
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

renderSidebar();
if (chats.length > 0 && chats[0] && chats[0].id) loadChat(chats[0].id);
else resetChat();

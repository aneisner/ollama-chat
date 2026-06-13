// Cockpit-Netzwerktunnel zu Ollama öffnen
const ollama = cockpit.http(11434);
const modelSelect = document.getElementById("model-select");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

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
    if (!text || !selectedModel) return;

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
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
            chatBox.scrollTop = chatBox.scrollHeight;
        });
}

// Event-Listener binden (Wichtig für die CSP-Richtlinie!)
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

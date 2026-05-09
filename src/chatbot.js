const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotClose = document.getElementById("chatbotClose");

const chatbotInput = document.getElementById("chatbotInput");
const chatbotForm = document.getElementById("chatbotForm");

const chatbotMessages = document.getElementById("chatbotMessages");

/* =========================
   OPEN / CLOSE
========================= */

chatbotToggle.addEventListener("click", () => {
    chatbotPanel.classList.toggle("hidden");
});

chatbotClose.addEventListener("click", () => {
    chatbotPanel.classList.add("hidden");
});

/* =========================
   FORM SUBMIT
========================= */

chatbotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = chatbotInput.value.trim();

    if (!message) return;

    addMessage(message, "user");

    chatbotInput.value = "";

    try {
        const res = await fetch("/api/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        addMessage(data.reply || "No response received.", "bot");

    } catch (error) {

        console.error(error);

        addMessage(
            "Sorry, I could not connect to the chatbot server.",
            "bot"
        );
    }
});

/* =========================
   ADD MESSAGE
========================= */

function addMessage(text, sender) {

    const div = document.createElement("div");

    div.className = `chatbot-message ${sender}`;

    div.textContent = text;

    chatbotMessages.appendChild(div);

    chatbotMessages.scrollTop =
        chatbotMessages.scrollHeight;
}
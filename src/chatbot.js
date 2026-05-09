const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotBox = document.getElementById("chatbotBox");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotSend = document.getElementById("chatbotSend");
const chatbotMessages = document.getElementById("chatbotMessages");

chatbotToggle.addEventListener("click", () => {
  chatbotBox.classList.toggle("hidden");
});

chatbotClose.addEventListener("click", () => {
  chatbotBox.classList.add("hidden");
});

chatbotSend.addEventListener("click", sendMessage);

chatbotInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

async function sendMessage() {
  const message = chatbotInput.value.trim();

  if (!message) return;

  addMessage(message, "user-message");
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
    addMessage(data.reply, "bot-message");
  } catch (err) {
    console.error(err);
    addMessage("Sorry, I could not connect to the chatbot server.", "bot-message");
  }
}

function addMessage(text, className) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
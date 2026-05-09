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

const res = await fetch("/api/chatbot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message })
});

const data = await res.json();
addMessage(data.reply, "bot-message");
}

function addMessage(text, className) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function getSimpleReply(message) {
  const text = message.toLowerCase();

  if (text.includes("appointment") || text.includes("book")) {
    return "You can book an appointment from the Book an Appointment page.";
  }

  if (text.includes("service")) {
    return "We provide tax return, business advisory, payroll support, auditing, and general consultation services.";
  }

  if (text.includes("contact") || text.includes("phone")) {
    return "You can contact Constant & Co at 03 9466 3688.";
  }

  if (text.includes("agent")) {
    return "You can select an available agent when booking an appointment.";
  }

  return "Thanks for your message. Please contact our team or book an appointment for detailed support.";
}
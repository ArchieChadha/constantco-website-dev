document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';
    const toggle = document.getElementById('chatbotToggle');
    const panel = document.getElementById('chatbotPanel');
    const close = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    if (!toggle || !panel) return;
    // Force chatbot to start closed
    panel.classList.add('hidden');
    toggle.addEventListener('click', () => {
        panel.classList.toggle('hidden');
    });
    close?.addEventListener('click', () => {
        panel.classList.add('hidden');
    });
    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `chatbot-message ${type}`;
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = input.value.trim();
        if (!userMessage) return;
        addMessage(userMessage, 'user');
        input.value = '';
        try {
            const res = await fetch(`${API_BASE}/api/ai-chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Chatbot failed');
            }
            addMessage(data.reply, 'bot');
        } catch (err) {
            console.error(err);
            addMessage('Sorry, I could not respond right now.', 'bot');
        }
    });
});
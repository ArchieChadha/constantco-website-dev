// contact.js — submit contact form to backend (robust)
document.addEventListener('DOMContentLoaded', () => {
    // Use absolute URL in dev; empty string in prod if you deploy behind same origin.
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const ENDPOINT = `${API_BASE}/api/contact`;

    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('contactSubmit');
    const statusEl = document.getElementById('contactStatus');
    const consentEl = document.getElementById('consent');

    if (!form) return;

    function setStatus(msg, ok = false) {
        statusEl.textContent = msg || '';
        statusEl.style.color = ok ? '#1a7f37' : '#b00020'; // green / red
    }

    function setBusy(busy) {
        submitBtn.disabled = busy;
        submitBtn.textContent = busy ? 'Sending…' : 'Send Message';
    }

    function markInvalid(el, invalid) {
        if (!el) return;
        el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
        el.classList.toggle('input-error', !!invalid); // add .input-error { border-color: #e57373 } if you want
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('');
        setBusy(true);

        const data = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            subject: form.subject.value.trim(),
            message: form.message.value.trim(),
            consent: !!consentEl?.checked,
        };

        // Minimal client validation
        const emailOk = /^\S+@\S+\.\S+$/.test(data.email);
        markInvalid(form.name, !data.name);
        markInvalid(form.email, !emailOk);
        markInvalid(form.subject, !data.subject);
        markInvalid(form.message, !data.message);
        markInvalid(consentEl, !data.consent);

        if (!data.name || !emailOk || !data.subject || !data.message || !data.consent) {
            setStatus('Please fill all required fields.', false);
            setBusy(false);
            return;
        }

        // Timeout guard
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 15000); // 15s

        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal,
            });

            clearTimeout(t);

            let payload = {};
            try { payload = await res.json(); } catch { }

            if (!res.ok) {
                throw new Error(payload.error || payload.message || `Request failed (${res.status})`);
            }

            setStatus(payload.message || 'Thanks! We’ll be in touch shortly.', true);
            form.reset();
            // clear invalid state after reset
            ['name', 'email', 'subject', 'message'].forEach(id => markInvalid(form[id], false));
            markInvalid(consentEl, false);
        } catch (err) {
            if (err.name === 'AbortError') {
                setStatus('Request timed out. Please try again.', false);
            } else {
                setStatus(`Sorry, something went wrong. ${err.message}`, false);
            }
        } finally {
            setBusy(false);
        }
    });
});

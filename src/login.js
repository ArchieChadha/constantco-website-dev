// login.js — robust client-portal login
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const status = document.getElementById('loginStatus');
    const submit = form?.querySelector('button[type="submit"]');

    if (!form) return;

    // Pick API base for file:// and localhost use
    const API_BASE =
        (location.protocol === 'file:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const ENDPOINT = `${API_BASE}/api/login`;

    function setStatus(msg = '', color = '') {
        if (!status) return;
        status.textContent = msg;
        status.style.color = color;
    }

    function setBusy(busy) {
        if (submit) submit.disabled = busy;
        if (submit) {
            if (busy) {
                submit.dataset._label = submit.textContent;
                submit.textContent = 'Logging in…';
            } else {
                submit.textContent = submit.dataset._label || 'Login';
                delete submit.dataset._label;
            }
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('');
        setBusy(true);

        const email = form.email?.value.trim() || '';
        const password = form.password?.value || '';

        // Minimal client-side validation
        const emailOk = /^\S+@\S+\.\S+$/.test(email);
        if (!emailOk) {
            setStatus('Please enter a valid email address.', '#b00020');
            form.email?.focus();
            setBusy(false);
            return;
        }
        if (!password) {
            setStatus('Please enter your password.', '#b00020');
            form.password?.focus();
            setBusy(false);
            return;
        }

        // 12s timeout so a hung server doesn't hang the UI
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 12000);

        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                signal: controller.signal,
            });
            clearTimeout(to);

            // Try to parse JSON; if it fails, make a friendly error
            let data = {};
            try { data = await res.json(); } catch { data = {}; }

            if (!res.ok || !data?.ok) {
                const msg = data?.error || data?.message || `Login failed (HTTP ${res.status})`;
                throw new Error(msg);
            }

            // Success — store what you need
            const client = data.client || {};
            sessionStorage.setItem('clientName', client.name || 'Client');
            sessionStorage.setItem('clientEmail', client.email || email);

            setStatus('Login successful!', '#1a7f37');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'client-dashboard.html';
            }, 700);
        } catch (err) {
            if (err.name === 'AbortError') {
                setStatus('Login timed out. Please try again.', '#b00020');
            } else {
                setStatus(`Error: ${err.message}`, '#b00020');
            }
            console.error('Login error:', err);
        } finally {
            setBusy(false);
        }
    });
});

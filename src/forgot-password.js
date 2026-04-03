(function () {
    const API_BASE =
        location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    const form = document.getElementById('forgotPasswordForm');
    const statusEl = document.getElementById('forgotStatus');
    const devBox = document.getElementById('devResetHint');

    if (!form) return;

    function setStatus(msg, ok = false) {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.style.color = ok ? '#1a7f37' : '#b00020';
    }

    function setBusy(busy) {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = busy;
        btn.dataset._label ??= btn.textContent;
        btn.textContent = busy ? 'Sending…' : btn.dataset._label;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = (document.getElementById('reset-email') || {}).value.trim();

        if (!email) {
            setStatus('Please enter your email address.');
            return;
        }

        setBusy(true);
        setStatus('');
        if (devBox) {
            devBox.hidden = true;
            devBox.textContent = '';
        }

        try {
            const res = await fetch(`${API_BASE}/api/request-password-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Request failed');
            }

            setStatus(data.message || 'Check your email for next steps.', true);
            if (data.devResetLink && devBox) {
                devBox.hidden = false;
                devBox.textContent = '';
                const lead = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = 'Local demo: ';
                lead.appendChild(strong);
                lead.appendChild(
                    document.createTextNode(
                        'Email is not wired up yet. Use this link to set a new password: '
                    )
                );
                const a = document.createElement('a');
                a.href = data.devResetLink;
                a.textContent = data.devResetLink;
                lead.appendChild(a);
                devBox.appendChild(lead);
            }
        } catch (err) {
            console.error(err);
            const isNetwork =
                err &&
                (err.name === 'TypeError' ||
                    /load failed|failed to fetch/i.test(String(err.message || '')));
            setStatus(
                isNetwork
                    ? 'Unable to reach the server. Make sure the API is running on port 3001.'
                    : err.message || 'Something went wrong.'
            );
        } finally {
            setBusy(false);
        }
    });
})();

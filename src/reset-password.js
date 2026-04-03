(function () {
    const API_BASE =
        location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    const params = new URLSearchParams(window.location.search);
    const token = (params.get('token') || '').trim();

    const form = document.getElementById('resetPasswordForm');
    const statusEl = document.getElementById('resetStatus');
    const noTokenEl = document.getElementById('noTokenMessage');
    const flowEl = document.getElementById('resetFlow');

    if (!form) return;

    if (!token) {
        if (flowEl) flowEl.hidden = true;
        if (noTokenEl) noTokenEl.hidden = false;
        return;
    }

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
        btn.textContent = busy ? 'Updating…' : btn.dataset._label;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = (document.getElementById('newPassword') || {}).value || '';
        const confirm = (document.getElementById('confirmPassword') || {}).value || '';

        if (password !== confirm) {
            setStatus('Passwords do not match.');
            return;
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) {
            setStatus(
                'Password must be at least 8 characters and include at least one number and one of: ! @ # $ % ^ & *'
            );
            return;
        }

        setBusy(true);
        setStatus('');

        try {
            const res = await fetch(`${API_BASE}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Reset failed');
            }

            setStatus(data.message || 'Password updated.', true);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);
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
            setBusy(false);
        }
    });
})();

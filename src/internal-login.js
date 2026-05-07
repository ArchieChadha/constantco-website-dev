(function () {
    const API_BASE =
        (location.protocol === 'file:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const form = document.getElementById('internalLoginForm');
    const statusEl = document.getElementById('loginStatus');

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
        btn.textContent = busy ? 'Signing in…' : btn.dataset._label;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = (document.getElementById('loginEmail') || {}).value.trim();
        const password = (document.getElementById('loginPassword') || {}).value.trim();

        if (!email || !password) {
            setStatus('Please enter your email and password.');
            return;
        }

        setBusy(true);
        setStatus('');

        try {
            const res = await fetch(`${API_BASE}/api/internal-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            sessionStorage.setItem('internalUserId', data.user.id);
            sessionStorage.setItem('internalUserName', data.user.name || '');
            sessionStorage.setItem('internalUserEmail', data.user.email || '');
            sessionStorage.setItem('internalUserRole', data.user.role || '');

            setStatus('Login successful!', true);

            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'super-admin-portal.html';
                } else {
                    window.location.href = 'staff-portal.html';
                }
            }, 500);

        } catch (err) {
            console.error('Internal login error:', err);
            setStatus(err.message || 'Login failed');
        } finally {
            setBusy(false);
        }
    });
})();
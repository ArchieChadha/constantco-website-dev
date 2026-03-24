(function () {
  const API_BASE =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:3001'
      : '';

  const form = document.getElementById('loginForm');
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

    const email = (document.getElementById('email') || {}).value.trim();
    const password = (document.getElementById('password') || {}).value.trim();

    if (!email || !password) {
      setStatus('Please enter your email and password.');
      return;
    }

    setBusy(true);
    setStatus('');

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      sessionStorage.setItem('clientId', data.client.id);
      sessionStorage.setItem('clientName', data.client.name);

      setStatus('Login successful!', true);
      setBusy(false);

      setTimeout(() => {
        window.location.href = 'client-dashboard.html';
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      setStatus(err.message || 'Login failed');
      setBusy(false);
    }
  });
})();
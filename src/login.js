(function () {
  const API_BASE =
    (location.protocol === 'file:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1')
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

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned an invalid response');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store client session details
      sessionStorage.setItem('clientId', data.client.id);
      sessionStorage.setItem('clientName', data.client.name || '');
      sessionStorage.setItem('clientEmail', data.client.email || '');
      sessionStorage.setItem('clientPhone', data.client.phone || '');
      sessionStorage.setItem('clientType', data.client.client_type || '');
      sessionStorage.setItem('clientService', data.client.service || '');

      setStatus('Login successful!', true);
      setBusy(false);

      setTimeout(() => {
        window.location.href = 'client-dashboard.html';
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      const isNetworkError =
        err && (err.name === 'TypeError' || /load failed|failed to fetch/i.test(String(err.message || '')));
      if (isNetworkError) {
        setStatus('Unable to reach login server. Please make sure the backend is running on port 3001.');
      } else {
        setStatus(err.message || 'Login failed');
      }
      setBusy(false);
    }
  });
})();
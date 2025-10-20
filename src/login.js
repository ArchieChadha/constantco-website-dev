(function () {
  const form = document.getElementById('loginForm');
  const statusEl = document.getElementById('loginStatus');

  if (!form) return;

  function setStatus(msg) {
    if (statusEl) {
      statusEl.textContent = msg || '';
    } else {
      if (msg) console.log(msg);
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const role = (document.getElementById('role') || {}).value || '';
    const email = (document.getElementById('email') || {}).value.trim();
    const password = (document.getElementById('password') || {}).value.trim();

    if (!email || !password) {
      setStatus('Please enter your email and password.');
      alert('Please enter your email and password.');
      return;
    }

    // Redirects depending on selected role
    const redirects = (window.LOGIN_REDIRECTS || {
      client: 'client-dashboard.html',
      admin: 'admin-dashboard.html'
    });

    const target = redirects[role] || (role === 'admin' ? 'admin-dashboard.html' : 'client-dashboard.html');
    setStatus('Signing in…');
    window.location.href = target;
  });
})();

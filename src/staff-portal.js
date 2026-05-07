(async function () {
    const API_BASE = 'http://localhost:3001';

    const staffId = sessionStorage.getItem('internalUserId');
    const role = sessionStorage.getItem('internalUserRole');

    if (!staffId || role !== 'staff') {
        window.location.href = 'admin-portal.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/staff/me?id=${staffId}`);
        const data = await res.json();

        // Fill UI
        document.querySelector('.portal-banner h1').textContent =
            `Welcome, ${data.name}`;

    } catch (err) {
        console.error('Failed to load staff data', err);
    }
})();

(function () {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            sessionStorage.removeItem('internalUserId');
            sessionStorage.removeItem('internalUserName');
            sessionStorage.removeItem('internalUserEmail');
            sessionStorage.removeItem('internalUserRole');

            window.location.href = 'admin-portal.html';
        });
    }
})();
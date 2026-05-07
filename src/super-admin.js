(function () {

    const role = sessionStorage.getItem('internalUserRole');
    const name = sessionStorage.getItem('internalUserName');

    // Protect page
    if (role !== 'admin') {
        window.location.href = 'admin-portal.html';
        return;
    }

    // Set welcome name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `Welcome, ${name || 'Admin'}`;
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            sessionStorage.clear();
            window.location.href = 'admin-portal.html';
        };
    }

    // ===== TEMP DATA (replace later with DB) =====
    const appointments = [
        { client: "John Doe", date: "2026-05-10", time: "10:00", service: "Tax Return", status: "Confirmed" },
        { client: "Jane Smith", date: "2026-05-11", time: "2:00", service: "Audit", status: "Pending" }
    ];

    const table = document.getElementById('appointmentsTable');

    if (table) {
        table.innerHTML = appointments.map(a => `
      <tr>
        <td>${a.client}</td>
        <td>${a.date}</td>
        <td>${a.time}</td>
        <td>${a.service}</td>
        <td>${a.status}</td>
      </tr>
    `).join('');
    }

    document.addEventListener('DOMContentLoaded', function () {

        const logoutBtn = document.getElementById('logoutBtn');

        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'admin-portal.html';
        });

    });
})();


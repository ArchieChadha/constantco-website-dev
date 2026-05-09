(async function () {
    const API_BASE = 'http://localhost:3001';

    const staffId = sessionStorage.getItem('internalUserId');
    const role = sessionStorage.getItem('internalUserRole');

    if (!staffId || role !== 'staff') {
        window.location.href = 'admin-portal.html';
        return;
    }

    function formatDate(date) {
        return date ? new Date(date).toLocaleDateString('en-AU') : '-';
    }

    function formatTime(time) {
        return time ? String(time).slice(0, 5) : '-';
    }

    try {
        const staffRes = await fetch(`${API_BASE}/api/staff/me?id=${staffId}`);
        const staff = await staffRes.json();

        document.getElementById('staffName').textContent =
            `Welcome, ${staff.full_name || 'Staff'}`;

        const emailEl = document.getElementById('staffEmail');
        if (emailEl) emailEl.textContent = staff.email || '';

        const appRes = await fetch(`${API_BASE}/api/staff/appointments?staffId=${staffId}`);
        const appData = await appRes.json();

        const appointments = appData.appointments || [];

        document.getElementById('staffAppointments').textContent = appointments.length;

        const table = document.getElementById('staffAppointmentsTable');

        if (!appointments.length) {
            table.innerHTML = `<tr><td colspan="5">No appointments found</td></tr>`;
        } else {
            table.innerHTML = appointments.map(app => `
                <tr>
                    <td>${app.client_name || app.registered_client_name || '-'}</td>
                    <td>${formatDate(app.appointment_date)}</td>
                    <td>${formatTime(app.appointment_time)}</td>
                    <td>${app.service_name || '-'}</td>
                    <td>${app.booking_status || '-'}</td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Failed to load staff portal data', err);
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
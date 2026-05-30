document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminDashboard();
});

async function loadAdminDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/dashboard`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load admin dashboard');
        }

        document.getElementById('adminTotalClients').textContent =
            data.totalClients || 0;

        document.getElementById('adminTotalStaff').textContent =
            data.totalStaff || 0;

        document.getElementById('adminUpcomingAppointments').textContent =
            data.upcomingAppointments || 0;

        document.getElementById('adminTotalRevenue').textContent =
            formatMoney(data.totalRevenue || 0);

        document.getElementById('adminPendingTransfers').textContent =
            data.pendingTransfers || 0;

        document.getElementById('adminPendingLeave').textContent =
            data.pendingLeave || 0;

        renderRecentAppointments(data.recentAppointments || []);

    } catch (err) {
        console.error(err);
    }
}

function renderRecentAppointments(appointments) {
    const table = document.getElementById('adminRecentAppointmentsTable');

    if (!table) return;

    if (!appointments.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5">No appointments found.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = appointments.map(item => `
        <tr>
            <td>${escapeHTML(item.client_name || '')}</td>
            <td>${escapeHTML(item.staff_name || '')}</td>
            <td>${escapeHTML(item.service_name || '')}</td>
            <td>${formatDate(item.appointment_date)}</td>
            <td>${escapeHTML(item.booking_status || '')}</td>
        </tr>
    `).join('');
}
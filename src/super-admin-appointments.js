document.addEventListener('DOMContentLoaded', loadAdminAppointments);

async function loadAdminAppointments() {
    const table = document.getElementById('adminAppointmentsTable');

    if (!table) {
        console.error('adminAppointmentsTable not found');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/appointments`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        const appointments = data.appointments || [];

        if (!appointments.length) {
            table.innerHTML = '<tr><td colspan="6">No appointments found.</td></tr>';
            return;
        }

        table.innerHTML = appointments.map(app => `
            <tr>
                <td>${escapeHTML(app.client_name || '')}</td>
                <td>${escapeHTML(app.staff_name || '')}</td>
                <td>${escapeHTML(app.service_name || '')}</td>
                <td>${formatDate(app.appointment_date)}</td>
                <td>${escapeHTML(String(app.appointment_time || '').slice(0, 5))}</td>
                <td>${escapeHTML(app.booking_status || '')}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Admin appointments error:', err);

        table.innerHTML = `
            <tr>
                <td colspan="6">Failed to load appointments.</td>
            </tr>
        `;
    }
}
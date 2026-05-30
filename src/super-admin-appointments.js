document.addEventListener('DOMContentLoaded', loadAdminAppointments);
async function loadAdminAppointments() {
    const upcomingTable = document.getElementById('adminUpcomingAppointmentsTable');
    const pastTable = document.getElementById('adminPastAppointmentsTable');
    try {
        const res = await fetch(`${API_BASE}/api/admin/appointments`);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }
        const appointments = data.appointments || [];
        const upcoming = appointments.filter(app =>
            app.booking_status !== 'Pending Payment' &&
            app.booking_status !== 'Completed' &&
            app.booking_status !== 'Cancelled'
        );
        const past = appointments.filter(app =>
            app.booking_status === 'Completed' ||
            app.booking_status === 'Cancelled'
        );
        renderAppointmentsTable(upcomingTable, upcoming, 'No upcoming appointments found.');
        renderAppointmentsTable(pastTable, past, 'No completed or cancelled appointments found.');
    } catch (err) {
        console.error(err);
        upcomingTable.innerHTML = '<tr><td colspan="6">Failed to load appointments.</td></tr>';
        pastTable.innerHTML = '<tr><td colspan="6">Failed to load appointments.</td></tr>';
    }
}
function renderAppointmentsTable(table, appointments, emptyMessage) {
    if (!table) return;
    if (!appointments.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">${emptyMessage}</td>
            </tr>
        `;
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
}
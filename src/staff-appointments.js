document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffAppointments();
});

async function loadStaffAppointments() {

    try {

        const res = await fetch(
            `${API_BASE}/api/staff/appointments?staffId=${staffId}`
        );

        const data = await res.json();

        const appointments =
            data.appointments || [];

        renderAppointmentsTable(appointments);

    } catch (err) {
        console.error(err);
    }
}

function renderAppointmentsTable(appointments) {

    const tableBody =
        document.getElementById('staffAppointmentsTable');

    if (!tableBody) return;

    if (!appointments.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    No appointments found
                </td>
            </tr>
        `;

        return;
    }

    function getAppointmentDisplayStatus(app) {
        if (app.booking_status === 'Cancelled') {
            return 'Cancelled';
        }

        const appointmentDateTime = new Date(
            `${String(app.appointment_date).slice(0, 10)}T${String(app.appointment_time).slice(0, 5)}`
        );

        const now = new Date();

        if (appointmentDateTime < now) {
            return 'Completed';
        }

        return 'Scheduled';
    }

    tableBody.innerHTML = appointments.map(app => `

        <tr>

            <td>
                ${escapeHTML(app.client_name || '')}
            </td>

            <td>
                ${formatDate(app.appointment_date)}
            </td>

            <td>
                ${formatTime(app.appointment_time)}
            </td>

            <td>
                ${escapeHTML(app.service_name || '')}
            </td>

            <td>
                ${escapeHTML(app.booking_status || 'Confirmed')}
            </td>

        </tr>

    `).join('');
}
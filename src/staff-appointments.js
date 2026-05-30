document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffAppointments();
});

async function loadStaffAppointments() {
    try {
        const res = await fetch(
            `${API_BASE}/api/staff/appointments?staffId=${staffId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        const appointments = data.appointments || [];

        const upcomingAppointments = [];
        const pastAppointments = [];

        appointments.forEach(app => {
            const displayStatus = getAppointmentDisplayStatus(app);

            const appointmentWithDisplayStatus = {
                ...app,
                display_status: displayStatus
            };

            if (
                displayStatus === 'Completed' ||
                displayStatus === 'Cancelled'
            ) {
                pastAppointments.push(appointmentWithDisplayStatus);
            } else {
                upcomingAppointments.push(appointmentWithDisplayStatus);
            }
        });

        renderAppointmentsTable(
            upcomingAppointments,
            'upcomingStaffAppointmentsTable',
            'No upcoming appointments found.'
        );

        renderAppointmentsTable(
            pastAppointments,
            'pastStaffAppointmentsTable',
            'No completed or cancelled appointments found.'
        );

    } catch (err) {
        console.error(err);

        const upcomingTable = document.getElementById('upcomingStaffAppointmentsTable');
        const pastTable = document.getElementById('pastStaffAppointmentsTable');

        if (upcomingTable) {
            upcomingTable.innerHTML = `
                <tr>
                    <td colspan="5">Failed to load appointments.</td>
                </tr>
            `;
        }

        if (pastTable) {
            pastTable.innerHTML = `
                <tr>
                    <td colspan="5">Failed to load appointments.</td>
                </tr>
            `;
        }
    }
}

function renderAppointmentsTable(appointments, tableId, emptyMessage) {
    const tableBody = document.getElementById(tableId);

    if (!tableBody) {
        return;
    }

    if (!appointments.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">${emptyMessage}</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = appointments.map(app => `
        <tr>
            <td>${escapeHTML(app.client_name || app.full_name || '')}</td>
            <td>${escapeHTML(app.service_name || '')}</td>
            <td>${formatDate(app.appointment_date)}</td>
            <td>${formatTime(app.appointment_time)}</td>
            <td>${escapeHTML(app.display_status || app.booking_status || 'Confirmed')}</td>
        </tr>
    `).join('');
}

function getAppointmentDisplayStatus(app) {
    const status = String(app.booking_status || '').trim();

    if (status === 'Cancelled') {
        return 'Cancelled';
    }

    if (status === 'Completed') {
        return 'Completed';
    }

    const appointmentDate = String(app.appointment_date || '').slice(0, 10);
    const appointmentTime = String(app.appointment_time || '').slice(0, 5);

    if (!appointmentDate || !appointmentTime) {
        return status || 'Confirmed';
    }

    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();

    if (!Number.isNaN(appointmentDateTime.getTime()) && appointmentDateTime < now) {
        return 'Completed';
    }

    return status || 'Confirmed';
}

function getCurrentStaffName() {
    const sidebarName = document.getElementById('staffNameSidebar');

    if (sidebarName && sidebarName.textContent.trim()) {
        return sidebarName.textContent.trim();
    }

    return 'Assigned Staff';
}
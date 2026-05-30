document.addEventListener('DOMContentLoaded', loadStaffAppointmentsPage);

async function loadStaffAppointmentsPage() {
    const params = new URLSearchParams(window.location.search);
    const staffId = params.get('staffId');

    const heading = document.getElementById('staffAppointmentHeading');
    const table = document.getElementById('staffAppointmentsTable');

    if (!staffId) {
        heading.textContent = 'No staff member selected.';
        table.innerHTML = '<tr><td colspan="8">No staff member selected.</td></tr>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/staff/${staffId}/appointments`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        heading.textContent = `Viewing appointments for ${data.staff.full_name}`;

        const appointments = data.appointments || [];

        if (!appointments.length) {
            table.innerHTML = '<tr><td colspan="8">No appointments found.</td></tr>';
            return;
        }

        table.innerHTML = appointments.map(item => `
            <tr>
                <td>${escapeHTML(item.client_name || '')}</td>
                <td>${escapeHTML(item.client_email || '')}</td>
                <td>${escapeHTML(item.service_name || '')}</td>
                <td>${formatDate(item.appointment_date)}</td>
                <td>${escapeHTML(formatTime(item.appointment_time))}</td>
                <td>${escapeHTML(item.meeting_type || '')}</td>
                <td>${escapeHTML(item.booking_status || '')}</td>
                <td>${escapeHTML(item.payment_status || 'Not billed')}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error(err);

        heading.textContent = 'Failed to load staff appointments.';
        table.innerHTML = '<tr><td colspan="8">Failed to load appointments.</td></tr>';
    }
}

function formatDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleDateString('en-AU');
}

function formatTime(value) {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 5);
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
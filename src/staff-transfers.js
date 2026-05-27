document.addEventListener('DOMContentLoaded', async () => {
    await loadTransferAppointments();
    setupTransferRequestForm();
});

async function loadTransferAppointments() {
    const select = document.getElementById('transferAppointmentSelect');

    if (!select) return;

    select.innerHTML = '<option value="">Loading appointments...</option>';

    try {
        const res = await fetch(
            `${API_BASE}/api/staff/appointments?staffId=${staffId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        const appointments = (data.appointments || []).filter(app =>
            app.booking_status !== 'Cancelled'
        );

        if (!appointments.length) {
            select.innerHTML = '<option value="">No appointments found</option>';
            return;
        }

        select.innerHTML = `
            <option value="">Select appointment</option>
            ${appointments.map(app => `
                <option
                    value="${app.id}"
                    data-client-id="${app.client_id}">
                    ${escapeHTML(app.client_name || app.full_name || '')}
                    -
                    ${escapeHTML(app.service_name || '')}
                    -
                    ${formatDate(app.appointment_date)}
                    ${formatTime(app.appointment_time)}
                </option>
            `).join('')}
        `;

    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="">Failed to load appointments</option>';
    }
}

function setupTransferRequestForm() {
    const form = document.getElementById('transferRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const appointmentSelect = document.getElementById('transferAppointmentSelect');
        const reasonInput = document.getElementById('transferReason');

        const selectedOption =
            appointmentSelect.options[appointmentSelect.selectedIndex];

        const appointmentId = appointmentSelect.value;
        const clientId = selectedOption?.dataset?.clientId;
        const reason = reasonInput.value.trim();

        if (!appointmentId || !clientId || !reason) {
            alert('Please select an appointment and enter a reason.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/staff/client-transfer-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appointmentId,
                    clientId,
                    fromStaffId: staffId,
                    reason
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit transfer request');
            }

            alert('Transfer request submitted successfully.');

            form.reset();

        } catch (err) {
            console.error(err);
            alert(err.message || 'Failed to submit transfer request.');
        }
    });
}
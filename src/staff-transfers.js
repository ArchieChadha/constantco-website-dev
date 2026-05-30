document.addEventListener('DOMContentLoaded', async () => {
    await loadTransferAppointments();
    await loadMyTransferRequests();
    setupTransferRequestForm();
});

/*-----Load Staff Appointments For Transfer Request-----*/
async function loadTransferAppointments() {
    const select = document.getElementById('transferAppointmentSelect');

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Loading appointments...</option>';

    try {
        const res = await fetch(
            `${API_BASE}/api/staff/appointments?staffId=${staffId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        const appointments = (data.appointments || []).filter(app => {
            const status = String(app.booking_status || '').toLowerCase();

            return (
                status !== 'cancelled' &&
                status !== 'completed' &&
                status !== 'pending payment' &&
                isFutureAppointment(app)
            );
        });

        if (!appointments.length) {
            select.innerHTML = '<option value="">No transferable appointments found</option>';
            return;
        }

        select.innerHTML = `
            <option value="">Select appointment</option>
            ${appointments.map(app => `
                <option
                    value="${app.id}"
                    data-client-id="${app.client_id}"
                    data-service-name="${escapeHTML(app.service_name || '')}">
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
        console.error('Transfer appointments load error:', err);
        select.innerHTML = '<option value="">Failed to load appointments</option>';
    }
}

/*-----Load Staff Transfer Request History-----*/
async function loadMyTransferRequests() {
    const table = document.getElementById('staffTransferRequestsTable');

    if (!table) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/staff/transfer-requests?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load transfer requests');
        }

        const requests = data.requests || [];

        if (!requests.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8">No transfer requests submitted yet.</td>
                </tr>
            `;
            return;
        }

        table.innerHTML = requests.map(item => `
            <tr>
                <td>${escapeHTML(item.client_name || '')}</td>
                <td>${escapeHTML(item.service_name || '')}</td>
                <td>
                    ${formatDate(item.appointment_date)}
                    ${formatTime(item.appointment_time)}
                </td>
                <td>${escapeHTML(item.reason_type || '')}</td>
                <td>${escapeHTML(item.reason_text || '')}</td>
                <td>${escapeHTML(item.to_staff_name || 'Not assigned yet')}</td>
                <td>
                    <span class="status-badge ${getTransferStatusClass(item.status)}">
                        ${escapeHTML(formatStatus(item.status || 'Pending'))}
                    </span>
                </td>
                <td>${item.reviewed_at ? formatDateTime(item.reviewed_at) : 'Not reviewed yet'}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Transfer request history error:', err);

        table.innerHTML = `
            <tr>
                <td colspan="8">Failed to load transfer requests.</td>
            </tr>
        `;
    }
}

/*-----Submit Transfer Request-----*/
function setupTransferRequestForm() {
    const form = document.getElementById('transferRequestForm');

    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const appointmentSelect = document.getElementById('transferAppointmentSelect');
        const reasonTypeInput = document.getElementById('transferReasonType');
        const reasonTextInput = document.getElementById('transferReason');

        const selectedOption =
            appointmentSelect.options[appointmentSelect.selectedIndex];

        const appointmentId = appointmentSelect.value;
        const clientId = selectedOption?.dataset?.clientId || '';
        const reasonType = reasonTypeInput ? reasonTypeInput.value.trim() : 'General';
        const reasonText = reasonTextInput.value.trim();

        if (!appointmentId || !clientId || !reasonText) {
            showTransferMessage('Please select an appointment and enter a reason.', true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/staff/client-transfer-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appointmentId: appointmentId,
                    clientId: clientId,
                    requestedByStaffId: staffId,
                    reasonType: reasonType,
                    reasonText: reasonText
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit transfer request');
            }

            showTransferMessage('Transfer request submitted successfully.', false);

            form.reset();

            await loadTransferAppointments();
            await loadMyTransferRequests();

        } catch (err) {
            console.error('Transfer request submit error:', err);
            showTransferMessage(err.message || 'Failed to submit transfer request.', true);
        }
    });
}

/*-----Show Transfer Message-----*/
function showTransferMessage(text, isError) {
    const message = document.getElementById('transferMessage');

    if (!message) {
        alert(text);
        return;
    }

    message.textContent = text;
    message.classList.toggle('error-message', Boolean(isError));
}

/*-----Only Allow Future Appointments To Be Transferred-----*/
function isFutureAppointment(app) {
    const appointmentDate = String(app.appointment_date || '').slice(0, 10);
    const appointmentTime = String(app.appointment_time || '').slice(0, 5);

    if (!appointmentDate || !appointmentTime) {
        return false;
    }

    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();

    if (Number.isNaN(appointmentDateTime.getTime())) {
        return false;
    }

    return appointmentDateTime > now;
}

function getTransferStatusClass(status) {
    const cleanStatus = String(status || '').toLowerCase();

    if (cleanStatus === 'approved') {
        return 'status-approved';
    }

    if (cleanStatus === 'rejected') {
        return 'status-rejected';
    }

    return 'status-pending';
}

function formatStatus(status) {
    return String(status || '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDateTime(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}
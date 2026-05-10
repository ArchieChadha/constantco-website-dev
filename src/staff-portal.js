const API_BASE = 'http://localhost:3001';

const staffId = sessionStorage.getItem('internalUserId');
const role = sessionStorage.getItem('internalUserRole');

let staffAppointments = [];
let staffClients = [];

if (!staffId || role !== 'staff') {
    window.location.href = 'admin-portal.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    setupLogout();

    await loadStaffProfile();
    await loadStaffAppointments();
    await loadStaffClients();
    await loadPaymentHistory();
    await loadStaffMessages();
    await setupStaffReplyForm();
    await loadReplyClients();

    setupDocumentRequestForm();
    setupAvailabilityRequestForm();
    setupTransferRequestForm();
});

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('internalUserId');
        sessionStorage.removeItem('internalUserName');
        sessionStorage.removeItem('internalUserEmail');
        sessionStorage.removeItem('internalUserRole');

        window.location.href = 'admin-portal.html';
    });
}

async function loadStaffProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/staff/me?id=${staffId}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load staff profile');
        }

        const staffNameEl = document.getElementById('staffName');

        if (staffNameEl) {
            staffNameEl.textContent = `Welcome, ${data.full_name || data.name || 'Staff'}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function loadStaffAppointments() {
    try {
        const res = await fetch(`${API_BASE}/api/staff/appointments?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load appointments');
        }

        staffAppointments = data.appointments || [];

        renderAppointmentsTable();
        populateAppointmentDropdowns();

        const countEl = document.getElementById('staffAppointments');

        if (countEl) {
            countEl.textContent = staffAppointments.length;
        }

    } catch (err) {
        console.error(err);
    }
}

function renderAppointmentsTable() {
    const tableBody = document.getElementById('staffAppointmentsTable');

    if (!tableBody) return;

    if (!staffAppointments.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">No appointments found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = staffAppointments.map(app => `
        <tr>
            <td>${escapeHTML(app.client_name || '')}</td>
            <td>${formatDate(app.appointment_date)}</td>
            <td>${formatTime(app.appointment_time)}</td>
            <td>${escapeHTML(app.service_name || '')}</td>
        </tr>
    `).join('');
}

function populateAppointmentDropdowns() {
    const documentAppointmentSelect = document.getElementById('documentAppointmentSelect');
    const transferAppointmentSelect = document.getElementById('transferAppointmentSelect');

    const options = staffAppointments.map(app => `
        <option
            value="${app.id}"
            data-client-id="${app.client_id || ''}"
            data-service-name="${escapeHTML(app.service_name || '')}">
            ${escapeHTML(app.client_name || '')} - 
            ${escapeHTML(app.service_name || '')} - 
            ${formatDate(app.appointment_date)} ${formatTime(app.appointment_time)}
        </option>
    `).join('');

    if (documentAppointmentSelect) {
        documentAppointmentSelect.innerHTML = `
            <option value="">Select appointment</option>
            ${options}
        `;
    }

    if (transferAppointmentSelect) {
        transferAppointmentSelect.innerHTML = `
            <option value="">Select appointment</option>
            ${options}
        `;
    }
}

async function loadStaffClients() {
    try {
        const res = await fetch(`${API_BASE}/api/staff/clients?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load clients');
        }

        staffClients = data.clients || [];

        renderClientsTable();
        populateClientDropdown();

    } catch (err) {
        console.error(err);
    }
}

function renderClientsTable() {
    const tableBody = document.getElementById('staffClientsTable');

    if (!tableBody) return;

    if (!staffClients.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">No clients found for this staff member</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = staffClients.map(client => `
        <tr>
            <td>${escapeHTML(client.client_name || '')}</td>
            <td>${escapeHTML(client.email || '')}</td>
            <td>${escapeHTML(client.phone || '')}</td>
            <td>${escapeHTML(client.client_type || '')}</td>
            <td>${escapeHTML(client.service_name || '')}</td>
        </tr>
    `).join('');
}

function populateClientDropdown() {
    const select = document.getElementById('documentClientSelect');

    if (!select) return;

    select.innerHTML = `
        <option value="">Select client</option>
        ${staffClients.map(client => `
            <option value="${client.client_id}">
                ${escapeHTML(client.client_name || '')} - ${escapeHTML(client.email || '')}
            </option>
        `).join('')}
    `;
}

function setupDocumentRequestForm() {
    const form = document.getElementById('documentRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const clientId = document.getElementById('documentClientSelect').value;
        const appointmentSelect = document.getElementById('documentAppointmentSelect');
        const appointmentId = appointmentSelect.value || null;
        const selectedAppointmentOption = appointmentSelect.options[appointmentSelect.selectedIndex];

        const serviceName = selectedAppointmentOption?.dataset?.serviceName || '';
        const documentTitle = document.getElementById('documentTitle').value.trim();
        const message = document.getElementById('documentMessage').value.trim();
        const statusEl = document.getElementById('documentRequestStatus');

        if (!clientId || !documentTitle) {
            setStatus(statusEl, 'Please select a client and enter document title.', false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/staff/document-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId,
                    clientId,
                    appointmentId,
                    serviceName,
                    documentTitle,
                    message
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to request document');
            }

            form.reset();
            setStatus(statusEl, 'Document request sent successfully.', true);

        } catch (err) {
            console.error(err);
            setStatus(statusEl, err.message, false);
        }
    });
}

function setupAvailabilityRequestForm() {
    const form = document.getElementById('availabilityRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const startDate = document.getElementById('availabilityStartDate').value;
        const endDate = document.getElementById('availabilityEndDate').value;
        const reason = document.getElementById('availabilityReason').value.trim();
        const statusEl = document.getElementById('availabilityRequestStatus');

        if (!startDate || !endDate) {
            setStatus(statusEl, 'Please select start and end dates.', false);
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            setStatus(statusEl, 'End date cannot be before start date.', false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/staff/availability-change-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId,
                    startDate,
                    endDate,
                    reason
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit availability request');
            }

            form.reset();
            setStatus(statusEl, 'Availability request submitted for admin approval.', true);

        } catch (err) {
            console.error(err);
            setStatus(statusEl, err.message, false);
        }
    });
}

function setupTransferRequestForm() {
    const form = document.getElementById('transferRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const appointmentSelect = document.getElementById('transferAppointmentSelect');
        const appointmentId = appointmentSelect.value;
        const selectedOption = appointmentSelect.options[appointmentSelect.selectedIndex];
        const clientId = selectedOption?.dataset?.clientId;
        const reason = document.getElementById('transferReason').value.trim();
        const statusEl = document.getElementById('transferRequestStatus');

        if (!appointmentId || !clientId || !reason) {
            setStatus(statusEl, 'Please select an appointment and enter reason.', false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/staff/client-transfer-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            form.reset();
            setStatus(statusEl, 'Transfer request submitted for admin approval.', true);

        } catch (err) {
            console.error(err);
            setStatus(statusEl, err.message, false);
        }
    });
}

async function loadStaffMessages() {
    try {
        const staffId = sessionStorage.getItem('internalUserId');

        const res = await fetch(
            `${API_BASE}/api/staff/messages?staffId=${staffId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load messages');
        }

        const messages = data.messages || [];

        const container =
            document.getElementById('staffMessagesList');

        if (!container) return;

        if (!messages.length) {
            container.innerHTML =
                '<p>No messages found.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="record-item">

                <strong>
                    ${escapeHTML(msg.subject || 'No Subject')}
                </strong>

                <br>

                <small>
                    ${escapeHTML(msg.client_name || 'Client')}
                    ·
                    ${formatDateTime(msg.created_at)}
                </small>

                <p>
                    ${escapeHTML(msg.message || '')}
                </p>

            </div>
        `).join('');

    } catch (err) {
        console.error(err);
    }
}

async function loadPaymentHistory() {
    try {
        const res = await fetch(`${API_BASE}/api/staff/payment-history?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load payment history');
        }

        const payments = data.payments || [];

        renderPaymentHistory(payments);

        const totalEl = document.getElementById('staffPayments');

        if (totalEl) {
            const total = payments.reduce((sum, payment) => {
                return sum + Number(payment.amount || 0);
            }, 0);

            totalEl.textContent = `$${(total / 100).toFixed(2)}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function loadReplyClients() {
    try {

        const staffId =
            sessionStorage.getItem('internalUserId');

        const res = await fetch(
            `${API_BASE}/api/staff/clients?staffId=${staffId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.error || 'Failed to load clients'
            );
        }

        const clients = data.clients || [];

        const select =
            document.getElementById(
                'replyClientId'
            );

        if (!select) return;

        select.innerHTML =
            '<option value="">Select Client</option>';

        clients.forEach(client => {

            select.innerHTML += `
                <option value="${client.client_id}">
                    ${client.client_name}
                </option>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}

async function setupStaffReplyForm() {

    const form =
        document.getElementById(
            'staffReplyForm'
        );

    if (!form) return;

    form.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();

            try {

                const clientId =
                    document.getElementById(
                        'replyClientId'
                    ).value;

                const subject =
                    document.getElementById(
                        'replySubject'
                    ).value;

                const message =
                    document.getElementById(
                        'replyMessage'
                    ).value;

                const staffId =
                    sessionStorage.getItem(
                        'internalUserId'
                    );

                const res = await fetch(
                    `${API_BASE}/api/staff/messages`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            clientId,
                            staffId,
                            subject,
                            message
                        })
                    }
                );

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data.error ||
                        'Failed to send'
                    );
                }

                form.reset();

                await loadStaffMessages();

            } catch (err) {
                console.error(err);
            }
        }
    );
}

function renderPaymentHistory(payments) {
    const tableBody = document.getElementById('paymentHistoryTable');

    if (!tableBody) return;

    if (!payments.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">No payment history found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${escapeHTML(payment.client_name || '')}</td>
            <td>${escapeHTML(payment.service_name || '')}</td>
            <td>$${(Number(payment.amount || 0) / 100).toFixed(2)} ${escapeHTML((payment.currency || 'AUD').toUpperCase())}</td>
            <td>${escapeHTML(payment.status || '')}</td>
            <td>${formatDateTime(payment.payment_date)}</td>
        </tr>
    `).join('');
}

function setStatus(element, message, ok) {
    if (!element) return;

    element.textContent = message;
    element.style.color = ok ? '#1a7f37' : '#b00020';
}

function formatDate(value) {
    if (!value) return '';

    return new Date(value).toLocaleDateString('en-AU');
}

function formatTime(value) {
    if (!value) return '';

    return String(value).slice(0, 5);
}

function formatDateTime(value) {
    if (!value) return '';

    return new Date(value).toLocaleString('en-AU');
}

function escapeHTML(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


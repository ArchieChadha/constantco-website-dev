let staffAppointments = [];
let staffClients = [];

document.addEventListener('DOMContentLoaded', async () => {

    await loadClients();
    await loadAppointments();

    setupDocumentRequestForm();
});

async function loadClients() {

    try {

        const res = await fetch(
            `${API_BASE}/api/staff/clients?staffId=${staffId}`
        );

        const data = await res.json();

        staffClients = data.clients || [];

        populateClientDropdown();

    } catch (err) {
        console.error(err);
    }
}

async function loadAppointments() {

    try {

        const res = await fetch(
            `${API_BASE}/api/staff/appointments?staffId=${staffId}`
        );

        const data = await res.json();

        staffAppointments =
            data.appointments || [];

        populateAppointmentDropdown();

    } catch (err) {
        console.error(err);
    }
}

function populateClientDropdown() {

    const select =
        document.getElementById('documentClientSelect');

    if (!select) return;

    select.innerHTML = `

        <option value="">
            Select client
        </option>

        ${staffClients.map(client => `

            <option value="${client.client_id}">

                ${escapeHTML(client.client_name || '')}

            </option>

        `).join('')}
    `;
}

function populateAppointmentDropdown() {

    const select =
        document.getElementById('documentAppointmentSelect');

    if (!select) return;

    select.innerHTML = `

        <option value="">
            Select appointment
        </option>

        ${staffAppointments.map(app => `

            <option
                value="${app.id}"
                data-service-name="${escapeHTML(app.service_name || '')}">

                ${escapeHTML(app.client_name || '')}
                -
                ${escapeHTML(app.service_name || '')}

            </option>

        `).join('')}
    `;
}

function setupDocumentRequestForm() {

    const form =
        document.getElementById('documentRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {

        event.preventDefault();

        try {

            const clientId =
                document.getElementById('documentClientSelect').value;

            const appointmentSelect =
                document.getElementById('documentAppointmentSelect');

            const appointmentId =
                appointmentSelect.value;

            const selectedOption =
                appointmentSelect.options[
                appointmentSelect.selectedIndex
                ];

            const serviceName =
                selectedOption?.dataset?.serviceName || '';

            const documentTitle =
                document.getElementById('documentTitle').value.trim();

            const message =
                document.getElementById('documentMessage').value.trim();

            const res = await fetch(
                `${API_BASE}/api/staff/document-requests`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        staffId,
                        clientId,
                        appointmentId,
                        serviceName,
                        documentTitle,
                        message
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    'Failed to send request'
                );
            }

            form.reset();

            setStatus(
                document.getElementById('documentRequestStatus'),
                'Document request sent.',
                true
            );

        } catch (err) {
            console.error(err);

            setStatus(
                document.getElementById('documentRequestStatus'),
                err.message,
                false
            );
        }
    });
}
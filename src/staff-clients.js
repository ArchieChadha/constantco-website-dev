document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffClients();
});

async function loadStaffClients() {

    try {

        const res = await fetch(
            `${API_BASE}/api/staff/clients?staffId=${staffId}`
        );

        const data = await res.json();

        renderClientsTable(data.clients || []);

    } catch (err) {
        console.error(err);
    }
}

function renderClientsTable(clients) {

    const tableBody =
        document.getElementById('staffClientsTable');

    if (!tableBody) return;

    if (!clients.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    No clients found
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = clients.map(client => `

        <tr>

            <td>${escapeHTML(client.client_name || '')}</td>

            <td>${escapeHTML(client.email || '')}</td>

            <td>${escapeHTML(client.phone || '')}</td>

            <td>
    ${escapeHTML(
        (client.client_type || '')
            .charAt(0)
            .toUpperCase()

        +

        (client.client_type || '')
            .slice(1)
            .toLowerCase()
    )}
</td>

            <td>${escapeHTML(client.service_name || '')}</td>

        </tr>

    `).join('');
}
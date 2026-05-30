document.addEventListener('DOMContentLoaded', loadAdminClients);

async function loadAdminClients() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/clients`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load clients');
        }
        const table = document.getElementById('adminClientsTable');
        const clients = data.clients || [];

        if (!clients.length) {
            table.innerHTML = '<tr><td colspan="5">No clients found.</td></tr>';
            return;
        }

        table.innerHTML = clients.map(client => `
            <tr>
                <td>${escapeHTML(client.client_name || client.name || '')}</td>
                <td>${escapeHTML(client.email || '')}</td>
                <td>${escapeHTML(client.phone || '')}</td>
                <td>${escapeHTML(formatStatus(client.client_type || ''))}</td>
                <td>${escapeHTML(client.service_name || client.service || '')}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

function formatStatus(value) {
    return String(value || '')
        .replaceAll('_', ' ')
        .split(' ')
        .filter(Boolean)
        .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');
}

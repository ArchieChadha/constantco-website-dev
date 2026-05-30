document.addEventListener('DOMContentLoaded', loadAdminTransfers);

async function loadAdminTransfers() {
    try {
        const data = await fetchJson(`${API_BASE}/api/admin/transfers`);
        const table = document.getElementById('adminTransfersTable');
        const transfers = data.transfers || [];

        if (!transfers.length) {
            table.innerHTML = '<tr><td colspan="7">No transfer requests found.</td></tr>';
            return;
        }

        table.innerHTML = transfers.map(item => `
            <tr>
                <td>${escapeHTML(item.client_name || '')}</td>
                <td>${escapeHTML(item.service_name || '')}</td>
                <td>${escapeHTML(item.from_staff_name || '')}</td>
                <td>${escapeHTML(item.to_staff_name || 'Not assigned')}</td>
                <td>${escapeHTML(item.reason || '')}</td>
                <td>${escapeHTML(formatStatus(item.status || ''))}</td>
                <td>
                    <button class="btn btn-primary" onclick="updateTransfer(${item.id}, 'Approved')">Approve</button>
                    <button class="btn btn-ghost" onclick="updateTransfer(${item.id}, 'Rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function updateTransfer(id, status) {
    try {
        await fetchJson(`${API_BASE}/api/admin/transfers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        await loadAdminTransfers();
    } catch (err) {
        alert(err.message);
    }
}

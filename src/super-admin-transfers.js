document.addEventListener('DOMContentLoaded', loadAdminTransfers);

async function loadAdminTransfers() {
    const table = document.getElementById('adminTransfersTable');

    try {
        const data = await fetchJson(`${API_BASE}/api/admin/transfers`);
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
                <td>${escapeHTML(item.to_staff_name || 'Auto assign on approval')}</td>
                <td>${escapeHTML(item.reason || item.reason_type || '')}</td>
                <td>${escapeHTML(formatStatus(item.status || ''))}</td>
                <td>
                    ${item.status === 'Pending'
                ? `
                                <button class="btn btn-primary" onclick="updateTransfer(${item.id}, 'Approved')">
                                    Approve
                                </button>
                                <button class="btn btn-ghost" onclick="updateTransfer(${item.id}, 'Rejected')">
                                    Reject
                                </button>
                              `
                : `<span>${escapeHTML(formatStatus(item.status || ''))}</span>`
            }
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error(err);

        table.innerHTML = `
            <tr>
                <td colspan="7">No transfer requests found.</td>
            </tr>
        `;
    }
}

async function updateTransfer(id, status) {
    const confirmMessage = status === 'Approved'
        ? 'Approve this transfer? The system will automatically assign another available staff member.'
        : 'Reject this transfer request?';

    const confirmed = confirm(confirmMessage);

    if (!confirmed) {
        return;
    }

    try {
        const data = await fetchJson(`${API_BASE}/api/admin/transfers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (status === 'Approved' && data.assigned_staff) {
            alert(`Transfer approved. Appointment assigned to ${data.assigned_staff.full_name}.`);
        } else {
            alert(`Transfer ${status.toLowerCase()} successfully.`);
        }

        await loadAdminTransfers();

    } catch (err) {
        alert(err.message || 'Failed to update transfer request.');
    }
}
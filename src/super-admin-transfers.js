document.addEventListener('DOMContentLoaded', loadAdminTransfers);

/*-----Load Admin Transfer Requests-----*/
async function loadAdminTransfers() {
    const table = document.getElementById('adminTransfersTable');

    if (!table) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/transfers`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load transfer requests');
        }

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

                <td>
                    ${item.status === 'Pending'
                ? `
                                <select 
                                    class="input-sm transfer-staff-select" 
                                    id="transferStaffSelect-${item.id}"
                                    data-transfer-id="${item.id}">
                                    <option value="">Loading staff...</option>
                                </select>
                              `
                : escapeHTML(item.to_staff_name || 'Not assigned')
            }
                </td>

                <td>${escapeHTML(item.reason || item.reason_type || '')}</td>
                <td>${escapeHTML(formatStatus(item.status || ''))}</td>

                <td>
                    ${item.status === 'Pending'
                ? `
                                <button 
                                    type="button" 
                                    class="btn btn-primary" 
                                    onclick="updateTransfer(${item.id}, 'Approved')">
                                    Approve
                                </button>

                                <button 
                                    type="button" 
                                    class="btn btn-ghost" 
                                    onclick="updateTransfer(${item.id}, 'Rejected')">
                                    Reject
                                </button>
                              `
                : `<span>${escapeHTML(formatStatus(item.status || ''))}</span>`
            }
                </td>
            </tr>
        `).join('');

        await loadAvailableStaffForPendingTransfers(transfers);

    } catch (err) {
        console.error('Admin transfer load error:', err);

        table.innerHTML = `
            <tr>
                <td colspan="7">Failed to load transfer requests.</td>
            </tr>
        `;
    }
}

/*-----Load Available Staff For Each Pending Transfer-----*/
async function loadAvailableStaffForPendingTransfers(transfers) {
    const pendingTransfers = transfers.filter(item => item.status === 'Pending');

    for (const transfer of pendingTransfers) {
        const select = document.getElementById(`transferStaffSelect-${transfer.id}`);

        if (!select) {
            continue;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/transfers/${transfer.id}/available-staff`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load available staff');
            }

            const staff = data.staff || [];

            if (!staff.length) {
                select.innerHTML = '<option value="">No available staff</option>';
                continue;
            }

            select.innerHTML = `
                <option value="">Select staff</option>
                ${staff.map(member => `
                    <option value="${member.id}">
                        ${escapeHTML(member.full_name)}
                    </option>
                `).join('')}
            `;

        } catch (err) {
            console.error('Available staff load error:', err);
            select.innerHTML = '<option value="">Failed to load staff</option>';
        }
    }
}

/*-----Approve Or Reject Transfer Request-----*/
async function updateTransfer(id, status) {
    let selectedStaffId = null;

    if (status === 'Approved') {
        const staffSelect = document.getElementById(`transferStaffSelect-${id}`);
        selectedStaffId = staffSelect ? staffSelect.value : '';

        if (!selectedStaffId) {
            alert('Please select a staff member before approving the transfer.');
            return;
        }
    }

    const confirmMessage = status === 'Approved'
        ? 'Approve this transfer and assign it to the selected staff member?'
        : 'Reject this transfer request?';

    const confirmed = confirm(confirmMessage);

    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/transfers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                requestedToStaffId: selectedStaffId
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to update transfer request');
        }

        if (status === 'Approved' && data.assigned_staff) {
            alert(`Transfer approved. Appointment assigned to ${data.assigned_staff.full_name}.`);
        } else {
            alert(`Transfer ${status.toLowerCase()} successfully.`);
        }

        await loadAdminTransfers();

    } catch (err) {
        console.error('Transfer update error:', err);
        alert(err.message || 'Failed to update transfer request.');
    }
}

/*-----Format Status Text-----*/
function formatStatus(status) {
    return String(status || '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

/*-----Escape HTML Safely-----*/
function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
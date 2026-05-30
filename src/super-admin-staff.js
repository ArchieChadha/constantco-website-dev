document.addEventListener('DOMContentLoaded', loadAdminStaff);

async function loadAdminStaff() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/staff`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load staff');
        }
        const table = document.getElementById('adminStaffTable');
        const staff = data.staff || [];

        if (!staff.length) {
            table.innerHTML = '<tr><td colspan="5">No staff found.</td></tr>';
            return;
        }

        table.innerHTML = staff.map(item => `
            <tr>
                <td>${escapeHTML(item.full_name || '')}</td>
                <td>${escapeHTML(item.email || '')}</td>
                <td>${escapeHTML(item.phone || '')}</td>
                <td>${escapeHTML(item.services || '')}</td>
                <td>${escapeHTML(item.verified ? 'Yes' : 'No')}</td>
                <td>
                    <button class="toggle-activation-btn" data-id="${item.id}" data-active="${item.active}">
                        ${item.active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.offboard-staff-btn')
            .forEach(button => {

                button.addEventListener('click', async () => {

                    const confirmed = confirm(
                        'Are you sure you want to offboard this staff member?'
                    );

                    if (!confirmed) return;

                    try {

                        const res = await fetch(
                            `${API_BASE}/api/admin/staff/${button.dataset.id}/offboard`,
                            {
                                method: 'PUT'
                            }
                        );

                        const data = await res.json();

                        if (!res.ok) {
                            throw new Error(data.error || 'Failed to offboard');
                        }

                        await loadAdminStaff();

                    } catch (err) {

                        console.error(err);

                        alert(
                            err.message || 'Failed to offboard staff'
                        );
                    }
                });
            });
    } catch (err) {
        console.error(err);
    }
}

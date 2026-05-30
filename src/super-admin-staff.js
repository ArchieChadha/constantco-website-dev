document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminStaffForm');

    if (form) {
        form.addEventListener('submit', onboardAdminStaff);
    }

    loadAdminStaff();
});

/*-----Load Staff List-----*/
async function loadAdminStaff() {
    const table = document.getElementById('adminStaffTable');

    try {
        const res = await fetch(`${API_BASE}/api/admin/staff`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load staff');
        }

        const staff = data.staff || [];

        if (!staff.length) {
            table.innerHTML = '<tr><td colspan="7">No staff found.</td></tr>';
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
                    ${item.active
                ? `<button 
                                    type="button" 
                                    class="toggle-activation-btn" 
                                    data-id="${item.id}">
                                    Deactivate
                               </button>`
                : `<span>Inactive</span>`
            }
                </td>

                <td>
                    <button 
                        type="button" 
                        class="btn btn-ghost view-appointments-btn" 
                        data-id="${item.id}">
                        View Appointments
                    </button>
                </td>
            </tr>
        `).join('');

        attachStaffButtonEvents();

    } catch (err) {
        console.error(err);

        table.innerHTML = `
            <tr>
                <td colspan="7">Failed to load staff.</td>
            </tr>
        `;
    }
}

/*-----Onboard Staff-----*/
async function onboardAdminStaff(event) {
    event.preventDefault();

    const fullName = document.getElementById('staffFullName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const phone = document.getElementById('staffPhone').value.trim();
    const password = document.getElementById('staffPassword').value.trim();

    const servicesSelect = document.getElementById('staffServices');
    const services = Array.from(servicesSelect.selectedOptions).map(option => option.value);

    if (!fullName || !email || !password || services.length === 0) {
        alert('Please enter full name, email, password and select at least one service.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                phone: phone,
                password: password,
                services: services
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to onboard staff');
        }

        alert('Staff onboarded successfully.');

        event.target.reset();

        await loadAdminStaff();

    } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to onboard staff');
    }
}

/*-----Attach Button Events After Table Renders-----*/
function attachStaffButtonEvents() {
    document.querySelectorAll('.toggle-activation-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const staffId = button.dataset.id;

            const confirmed = confirm('Are you sure you want to deactivate this staff member?');

            if (!confirmed) {
                return;
            }

            await offboardStaff(staffId);
        });
    });

    document.querySelectorAll('.view-appointments-btn').forEach(button => {
        button.addEventListener('click', () => {
            const staffId = button.dataset.id;
            viewStaffAppointments(staffId);
        });
    });
}

/*-----Offboard / Deactivate Staff-----*/
async function offboardStaff(staffId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/staff/${staffId}/offboard`, {
            method: 'PUT'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to offboard staff');
        }

        alert('Staff deactivated successfully.');

        await loadAdminStaff();

    } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to deactivate staff');
    }
}

/*-----Open Staff Appointments Page-----*/
function viewStaffAppointments(staffId) {
    window.location.href = `super-admin-staff-appointments.html?staffId=${staffId}`;
}

/*-----Escape HTML To Keep Table Safe-----*/
function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
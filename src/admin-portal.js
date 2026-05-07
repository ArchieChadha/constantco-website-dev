(function () {

    const API_BASE = 'http://localhost:3001';

    const userId = sessionStorage.getItem('internalUserId');
    const role = sessionStorage.getItem('internalUserRole');
    const name = sessionStorage.getItem('internalUserName');

    if (!userId || role !== 'admin') {
        window.location.href = 'admin-portal.html';
        return;
    }

    // Set UI
    document.getElementById('userName').textContent = name || 'Admin';
    document.getElementById('userAvatar').textContent =
        name ? name.charAt(0).toUpperCase() : 'A';

    // Logout
    document.getElementById('logoutBtn').onclick = () => {
        sessionStorage.clear();
        window.location.href = 'admin-portal.html';
    };

    let appointments = [];

    async function loadAppointments() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/appointments`);
            const data = await res.json();

            appointments = data.appointments || [];

            renderAppointments();

        } catch (err) {
            console.error(err);
        }
    }

    function renderAppointments() {
        const table = document.getElementById('appointmentsTable');
        if (!table) return;

        if (!appointments.length) {
            table.innerHTML = `<tr><td colspan="6">No appointments</td></tr>`;
            return;
        }

        table.innerHTML = appointments.map(a => `
      <tr>
        <td>${a.full_name}</td>
        <td>${a.appointment_date}</td>
        <td>${a.appointment_time}</td>
        <td>${a.service_name}</td>
        <td>${a.booking_status}</td>
        <td>
          <button onclick="deleteAppointment('${a.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
    }

    window.deleteAppointment = async function (id) {
        if (!confirm("Delete this appointment?")) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/appointments/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');

            loadAppointments();

        } catch (err) {
            alert(err.message);
        }
    };

    loadAppointments();

})();
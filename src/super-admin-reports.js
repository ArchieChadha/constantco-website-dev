document.addEventListener('DOMContentLoaded', loadAdminReports);

async function loadAdminReports() {
    try {
        const data = await fetchJson(`${API_BASE}/api/admin/reports`);

        document.getElementById('reportRevenue').textContent = formatMoney(data.totalRevenue || 0);
        document.getElementById('reportAppointments').textContent = data.totalAppointments || 0;
        document.getElementById('reportClients').textContent = data.totalClients || 0;
        document.getElementById('reportStaff').textContent = data.totalStaff || 0;

        const table = document.getElementById('reportServicesTable');
        const services = data.serviceBreakdown || [];

        if (!services.length) {
            table.innerHTML = '<tr><td colspan="2">No service data found.</td></tr>';
            return;
        }

        table.innerHTML = services.map(item => `
            <tr>
                <td>${escapeHTML(item.service_name || '')}</td>
                <td>${item.total || 0}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

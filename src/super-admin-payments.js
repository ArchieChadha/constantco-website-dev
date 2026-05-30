document.addEventListener('DOMContentLoaded', loadAdminPayments);

async function loadAdminPayments() {
    try {
        const data = await fetchJson(`${API_BASE}/api/admin/payments`);
        const table = document.getElementById('adminPaymentsTable');
        const payments = data.payments || [];

        if (!payments.length) {
            table.innerHTML = '<tr><td colspan="6">No payments found.</td></tr>';
            return;
        }

        table.innerHTML = payments.map(payment => `
            <tr>
                <td>${escapeHTML(payment.client_name || '')}</td>
                <td>${escapeHTML(payment.service_name || '')}</td>
                <td>${formatMoney(payment.amount || 0)}</td>
                <td>${escapeHTML(String(payment.currency || 'AUD').toUpperCase())}</td>
                <td>${escapeHTML(formatStatus(payment.status || ''))}</td>
                <td>${formatDateTime(payment.payment_date || payment.created_at)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

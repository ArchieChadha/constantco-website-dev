document.addEventListener('DOMContentLoaded', loadAdminPayments);

/*-----Load Admin Payments-----*/
async function loadAdminPayments() {
    const table = document.getElementById('adminPaymentsTable');

    if (!table) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/payments`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load payments');
        }

        const payments = data.payments || [];

        if (!payments.length) {
            table.innerHTML = '<tr><td colspan="9">No payments found.</td></tr>';
            return;
        }

        table.innerHTML = payments.map(payment => `
            <tr>
                <td>${escapeHTML(payment.client_name || '')}</td>
                <td>${escapeHTML(payment.client_email || '')}</td>
                <td>${escapeHTML(payment.service_name || '')}</td>
                <td>${escapeHTML(payment.staff_name || 'Not assigned')}</td>
                <td>${formatMoney(payment.amount || 0, payment.currency || 'AUD')}</td>
                <td>${formatMoney(payment.total_charge || 0, payment.currency || 'AUD')}</td>
                <td>${formatMoney(payment.amount_due || 0, payment.currency || 'AUD')}</td>
                <td>${escapeHTML(formatStatus(payment.payment_status || payment.status || ''))}</td>
                <td>${formatDateTime(payment.payment_date)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error(err);

        table.innerHTML = `
            <tr>
                <td colspan="9">Failed to load payments.</td>
            </tr>
        `;
    }
}

/*-----Format Money From Cents-----*/
function formatMoney(amount, currency = 'AUD') {
    const cents = Number(amount) || 0;

    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: String(currency || 'AUD').toUpperCase()
    }).format(cents / 100);
}

/*-----Format Status Text-----*/
function formatStatus(status) {
    if (!status) {
        return '';
    }

    return String(status)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

/*-----Format Date And Time-----*/
function formatDateTime(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

/*-----Basic HTML Escape Helper-----*/
function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
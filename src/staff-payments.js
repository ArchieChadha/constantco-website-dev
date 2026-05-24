document.addEventListener('DOMContentLoaded', async () => {
    await loadPaymentHistory();
});

async function loadPaymentHistory() {

    try {

        const res = await fetch(
            `${API_BASE}/api/staff/payment-history?staffId=${staffId}`
        );

        const data = await res.json();

        renderPaymentHistory(data.payments || []);

    } catch (err) {
        console.error(err);
    }
}

function renderPaymentHistory(payments) {

    const tableBody =
        document.getElementById('paymentHistoryTable');

    if (!tableBody) return;

    if (!payments.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    No payment history found
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = payments.map(payment => `

        <tr>

            <td>
                ${escapeHTML(payment.client_name || '')}
            </td>

            <td>
                ${escapeHTML(payment.service_name || '')}
            </td>

            <td>
                $${(Number(payment.amount || 0) / 100).toFixed(2)}
            </td>

            <td>
                ${escapeHTML(payment.status || '')}
            </td>

            <td>
                ${formatDateTime(payment.payment_date)}
            </td>

        </tr>

    `).join('');
}
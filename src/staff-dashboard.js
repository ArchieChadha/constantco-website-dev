document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardStats();
});

async function loadDashboardStats() {

    try {

        const [
            appointmentsRes,
            clientsRes,
            paymentsRes,
            messagesRes
        ] = await Promise.all([

            fetch(`${API_BASE}/api/staff/appointments?staffId=${staffId}`),

            fetch(`${API_BASE}/api/staff/clients?staffId=${staffId}`),

            fetch(`${API_BASE}/api/staff/payment-history?staffId=${staffId}`),

            fetch(`${API_BASE}/api/staff/messages?staffId=${staffId}`)
        ]);

        const appointmentsData = await appointmentsRes.json();
        const clientsData = await clientsRes.json();
        const paymentsData = await paymentsRes.json();
        const messagesData = await messagesRes.json();

        const appointments =
            appointmentsData.appointments || [];

        const clients =
            clientsData.clients || [];

        const payments =
            paymentsData.payments || [];

        const messages =
            messagesData.messages || [];

        document.getElementById('staffAppointments').textContent =
            appointments.length;

        document.getElementById('staffClientsCount').textContent =
            clients.length;

        document.getElementById('staffMessages').textContent =
            messages.length;

        const totalPayments = payments.reduce((sum, item) => {
            return sum + Number(item.amount || 0);
        }, 0);

        document.getElementById('staffPayments').textContent =
            `$${(totalPayments / 100).toFixed(2)}`;

    } catch (err) {
        console.error(err);
    }
}
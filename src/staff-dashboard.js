document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        const [
            appointmentsRes,
            clientsRes,
            messagesRes
        ] = await Promise.all([
            fetch(`${API_BASE}/api/staff/appointments?staffId=${staffId}`),
            fetch(`${API_BASE}/api/staff/clients?staffId=${staffId}`),
            fetch(`${API_BASE}/api/staff/messages?staffId=${staffId}`)
        ]);

        const appointmentsData = await appointmentsRes.json();
        const clientsData = await clientsRes.json();
        const messagesData = await messagesRes.json();

        if (!appointmentsRes.ok) {
            throw new Error(appointmentsData.error || 'Failed to load appointments');
        }

        if (!clientsRes.ok) {
            throw new Error(clientsData.error || 'Failed to load clients');
        }

        if (!messagesRes.ok) {
            throw new Error(messagesData.error || 'Failed to load messages');
        }

        const appointments = appointmentsData.appointments || [];
        const clients = clientsData.clients || [];
        const messages = messagesData.messages || [];

        /*
            Important:
            Transfer history or joins can accidentally return the same appointment more than once.
            This keeps only one record per appointment.
        */
        const uniqueAppointments = Array.from(
            new Map(
                appointments.map(app => [
                    String(app.id || app.appointment_id),
                    app
                ])
            ).values()
        );

        const activeAppointments = uniqueAppointments.filter(app => {
            const status = String(app.booking_status || '').toLowerCase();

            if (
                status === 'cancelled' ||
                status === 'completed' ||
                status === 'pending payment'
            ) {
                return false;
            }

            return isFutureAppointment(app);
        });

        const unreadMessages = messages.filter(message => {
            if (!message.id) {
                return false;
            }

            const senderType = String(message.sender_type || '').toLowerCase();

            return (
                senderType !== 'staff' &&
                message.read_by_staff !== true
            );
        });

        setDashboardValue('staffAppointments', activeAppointments.length);
        setDashboardValue('staffClientsCount', clients.length);
        setDashboardValue('staffMessages', unreadMessages.length);

    } catch (err) {
        console.error('Staff dashboard stats error:', err);

        setDashboardValue('staffAppointments', 0);
        setDashboardValue('staffClientsCount', 0);
        setDashboardValue('staffMessages', 0);
    }
}

function setDashboardValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function isFutureAppointment(app) {
    const appointmentDate = String(app.appointment_date || '').slice(0, 10);
    const appointmentTime = String(app.appointment_time || '').slice(0, 5);

    if (!appointmentDate || !appointmentTime) {
        return false;
    }

    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();

    if (Number.isNaN(appointmentDateTime.getTime())) {
        return false;
    }

    return appointmentDateTime >= now;
}
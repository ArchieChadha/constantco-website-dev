document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';
    const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
    const messageEl = document.getElementById('bookingSuccessMessage');
    function setMessage(msg) {
        if (messageEl) messageEl.textContent = msg;
    }
    if (!pendingBooking) {
        setMessage('Payment successful, but no pending booking was found.');
        return;
    }
    try {
        const appointmentRes = await fetch(`${API_BASE}/api/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingBooking)
        });
        const appointmentData = await appointmentRes.json();
        if (!appointmentRes.ok) {
            throw new Error(appointmentData.error || 'Failed to save appointment.');
        }
        const appointmentId = appointmentData.appointment.id;
        const clientId = pendingBooking.clientId;
        const billingRes = await fetch(`${API_BASE}/api/create-booking-billing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointmentId,
                clientId,
                serviceName: pendingBooking.serviceName,
                bookingFee: pendingBooking.bookingFee
            })
        });
        const billingData = await billingRes.json();
        if (!billingRes.ok && billingRes.status !== 409) {
            throw new Error(billingData.error || 'Failed to create billing record.');
        }
        sessionStorage.removeItem('pendingBooking');
        setMessage('Payment successful. Your appointment has been confirmed and saved.');
    } catch (err) {
        console.error('Booking confirmation error:', err);
        setMessage('Payment was successful, but the appointment could not be saved. Please contact support.');
    }
});
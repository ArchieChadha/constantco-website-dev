document.addEventListener('DOMContentLoaded', async () => {

    const API_BASE =

        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')

            ? 'http://localhost:3001'

            : '';

    const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));

    if (!pendingBooking) {

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

            throw new Error(appointmentData.error || 'Failed to create appointment after payment.');

        }

        sessionStorage.removeItem('pendingBooking');

    } catch (err) {

        console.error('Payment successful but appointment was not saved:', err);

        alert('Payment was successful, but the appointment could not be saved. Please contact support.');

    }

});

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';
    const clientId = sessionStorage.getItem('clientId');
    const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
    const messageEl = document.getElementById('payment-message');
    const form = document.getElementById('payment-form');
    const submitBtn = document.getElementById('submit-payment');
    const paymentServiceEl = document.getElementById('paymentService');
    const paymentBookingFeeEl = document.getElementById('paymentBookingFee');
    const paymentServiceChargeEl = document.getElementById('paymentServiceCharge');
    const paymentStatusEl = document.getElementById('paymentStatus');
    const paymentTotalDueEl = document.getElementById('paymentTotalDue');
    function setMessage(msg, ok = false) {
        if (!messageEl) return;
        messageEl.textContent = msg || '';
        messageEl.style.color = ok ? '#1a7f37' : '#b00020';
    }
    function formatText(text) {
        return text
            ? text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            : '';
    }
    if (!clientId) {
        setMessage('Session expired. Please log in again.');
        return;
    }
    if (!pendingBooking) {
        setMessage('No pending booking found. Please book an appointment first.');
        return;
    }
    const bookingFee = Number(pendingBooking.bookingFee || 0);
    if (paymentServiceEl) paymentServiceEl.textContent = formatText(pendingBooking.serviceName || 'Not assigned');
    if (paymentBookingFeeEl) paymentBookingFeeEl.textContent = `$${(bookingFee / 100).toFixed(2)} AUD`;
    if (paymentServiceChargeEl) paymentServiceChargeEl.textContent = `$0.00 AUD`;
    if (paymentStatusEl) paymentStatusEl.textContent = 'Pending';
    if (paymentTotalDueEl) paymentTotalDueEl.textContent = `$${(bookingFee / 100).toFixed(2)} AUD`;
    if (bookingFee <= 0) {
        setMessage('No booking fee found.');
        return;
    }
    let stripe;
    let elements;
    try {
        const res = await fetch(`${API_BASE}/api/create-pending-booking-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: pendingBooking.clientId,
                staffId: pendingBooking.staffId,
                fullName: pendingBooking.fullName,
                email: pendingBooking.email,
                phone: pendingBooking.phone,
                company: pendingBooking.company,
                serviceName: pendingBooking.serviceName,
                meetingType: pendingBooking.meetingType,
                appointmentDate: pendingBooking.appointmentDate,
                appointmentTime: pendingBooking.appointmentTime,
                notes: pendingBooking.notes,
                bookingFee: pendingBooking.bookingFee
            })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to initialise payment.');
        }
        stripe = Stripe(data.publishableKey);
        elements = stripe.elements({
            clientSecret: data.clientSecret
        });
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
    } catch (err) {
        console.error(err);
        setMessage(err.message || 'Could not load payment form.');
        return;
    }
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        setMessage('');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `http://127.0.0.1:5500/src/booking-payment-success.html`
            }
        });
        if (error) {
            setMessage(error.message || 'Payment failed.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
        }
    });
});
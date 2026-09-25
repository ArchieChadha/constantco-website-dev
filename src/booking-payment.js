document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    let pendingBooking = null;

    try {
        pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking') || 'null');
    } catch (_e) {
        pendingBooking = null;
    }

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

    function stripeBookingSuccessReturnUrl() {
        const { origin, pathname } = window.location;
        const dir = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]+$/, '');
        return `${origin}${dir}booking-payment-success.html`;
    }

    if (!pendingBooking) {
        setMessage('No pending booking found. Please book an appointment first.');
        return;
    }

    const bookingFee = Number(pendingBooking.bookingFee || 0);

    if (paymentServiceEl) {
        paymentServiceEl.textContent = formatText(pendingBooking.serviceName || 'Not assigned');
    }

    if (paymentBookingFeeEl) {
        paymentBookingFeeEl.textContent = `$${(bookingFee / 100).toFixed(2)} AUD`;
    }

    if (paymentServiceChargeEl) {
        paymentServiceChargeEl.textContent = '$0.00 AUD';
    }

    if (paymentStatusEl) {
        paymentStatusEl.textContent = 'Pending';
    }

    if (paymentTotalDueEl) {
        paymentTotalDueEl.textContent = `$${(bookingFee / 100).toFixed(2)} AUD`;
    }

    if (bookingFee <= 0) {
        setMessage('No booking fee found. Please return to the appointment page and select a consultation type again.');
        return;
    }

    let stripe;
    let elements;

    try {
        setMessage('Loading secure payment form...', true);

        const res = await fetch(`${API_BASE}/api/create-pending-booking-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: pendingBooking.clientId || null,
                staffId: pendingBooking.staffId,
                fullName: pendingBooking.fullName,
                email: pendingBooking.email,
                phone: pendingBooking.phone,
                company: pendingBooking.company || '',
                serviceName: pendingBooking.serviceName,
                meetingType: pendingBooking.meetingType,
                appointmentDate: pendingBooking.appointmentDate,
                appointmentTime: pendingBooking.appointmentTime,
                notes: pendingBooking.notes || '',
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

        setMessage('');

    } catch (err) {
        console.error('Payment init error:', err);
        setMessage(err.message || 'Could not load payment form.');
        return;
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        setMessage('');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
        }

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: stripeBookingSuccessReturnUrl()
            }
        });

        if (error) {
            setMessage(error.message || 'Payment failed.');

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Pay Now';
            }
        }
    });
});
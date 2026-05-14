document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';
    const clientId = sessionStorage.getItem('clientId');
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

    function stripePortalPaymentSuccessReturnUrl() {
        const { origin, pathname } = window.location;
        const dir = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]+$/, '');
        return `${origin}${dir}payment-success.html`;
    }

    let stripe;
    let elements;
    try {
        const chargeRes = await fetch(`${API_BASE}/api/charges?clientId=${encodeURIComponent(clientId)}`);
        const chargeData = await chargeRes.json();
        if (!chargeRes.ok) {
            throw new Error(chargeData.error || 'Failed to load charge details.');
        }
        if (paymentServiceEl) paymentServiceEl.textContent = formatText(chargeData.serviceName || 'Not assigned');
        if (paymentBookingFeeEl) paymentBookingFeeEl.textContent = `$${(Number(chargeData.bookingFee || 0) / 100).toFixed(2)} AUD`;
        if (paymentServiceChargeEl) paymentServiceChargeEl.textContent = `$${(Number(chargeData.serviceCharge || 0) / 100).toFixed(2)} AUD`;
        if (paymentStatusEl) paymentStatusEl.textContent = formatText(chargeData.status || 'Pending');
        if (paymentTotalDueEl) paymentTotalDueEl.textContent = `$${(Number(chargeData.totalDue || 0) / 100).toFixed(2)} AUD`;
        if (Number(chargeData.totalDue || 0) <= 0) {
            setMessage('No outstanding balance to pay.', true);
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'No Payment Due';
            }
            return;
        }
        const res = await fetch(`${API_BASE}/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId })
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
                return_url: stripePortalPaymentSuccessReturnUrl()
            }
        });
        if (error) {
            setMessage(error.message || 'Payment failed.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
        }
    });
});
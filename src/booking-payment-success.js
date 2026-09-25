document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    const messageEl = document.getElementById('bookingSuccessMessage');
    const viewSummaryLink = document.getElementById('viewBookingSummaryLink');

    let pendingBooking = null;

    try {
        pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking') || 'null');
    } catch (_e) {
        pendingBooking = null;
    }

    function setMessage(msg) {
        if (messageEl) {
            messageEl.textContent = msg;
        }
    }

    function buildSnapshotFromPending(pb) {
        return {
            fullName: pb.fullName,
            email: pb.email,
            phone: pb.phone,
            company: pb.company || '',
            service: pb.serviceName,
            meetingType: pb.meetingType,
            appointmentDate: pb.appointmentDate,
            appointmentTime: pb.appointmentTime,
            bookingCost: pb.bookingFee
                ? `$${(Number(pb.bookingFee) / 100).toFixed(2)} AUD`
                : '',
            notes: pb.notes || '',
            clientId: pb.clientId != null ? pb.clientId : null,
            staffId: pb.staffId != null ? pb.staffId : null,
            managementToken: ''
        };
    }

    if (!pendingBooking) {
        setMessage('Payment successful. Your booking is being confirmed. Please check your email for the booking confirmation.');
        if (viewSummaryLink) {
            viewSummaryLink.href = './booking-summary.html';
        }
        return;
    }

    const snapshot = buildSnapshotFromPending(pendingBooking);

    try {
        sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(snapshot));
        localStorage.setItem('constantCoAppointment', JSON.stringify(snapshot));
        sessionStorage.setItem('expectBookingToken', '1');
    } catch (_e) {
        // Ignore storage errors
    }

    if (viewSummaryLink) {
        viewSummaryLink.href = './booking-summary.html';
    }

    setMessage(
        'Payment successful. Your booking is being confirmed. You can open “View booking summary” now, and your confirmation email will include the final booking link.'
    );

    /*
        Important:
        The real appointment is created by the Stripe webhook on the backend.
        Do not create appointment/billing here again.
    */

    setTimeout(() => {
        sessionStorage.removeItem('pendingBooking');
    }, 3000);
});
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
        if (messageEl) messageEl.textContent = msg;
    }

    function formatDisplayDate(dateStr) {
        if (!dateStr) return 'N/A';
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr).trim());
        if (!match) return String(dateStr);
        const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return d.toLocaleDateString('en-AU', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
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
            appointment_date: pb.appointmentDate,
            appointmentTime: pb.appointmentTime,
            appointment_time: pb.appointmentTime,
            bookingCost: pb.bookingFee ? `$${(Number(pb.bookingFee) / 100).toFixed(2)} AUD` : '',
            notes: pb.notes || '',
            clientId: pb.clientId != null ? pb.clientId : null,
            staffId: pb.staffId != null ? pb.staffId : null,
            managementToken: ''
        };
    }

    function buildSnapshotFromAppointment(apt, pb) {
        const dateRaw = apt.appointment_date || pb?.appointmentDate || '';
        const timeRaw = apt.appointment_time || pb?.appointmentTime || '';
        return {
            fullName: apt.full_name || pb?.fullName || '',
            email: apt.email || pb?.email || '',
            phone: apt.phone || pb?.phone || '',
            company: apt.company || pb?.company || '',
            service: apt.service_name || pb?.serviceName || '',
            meetingType: apt.meeting_type || pb?.meetingType || '',
            appointmentDate: dateRaw,
            appointment_date: dateRaw,
            appointmentTime: timeRaw,
            appointment_time: timeRaw,
            bookingCost:
                apt.booking_fee != null
                    ? `$${(Number(apt.booking_fee) / 100).toFixed(2)} AUD`
                    : pb?.bookingFee
                      ? `$${(Number(pb.bookingFee) / 100).toFixed(2)} AUD`
                      : '',
            notes: apt.notes || pb?.notes || '',
            clientId: apt.client_id != null ? apt.client_id : pb?.clientId ?? null,
            staffId: apt.staff_id != null ? apt.staff_id : pb?.staffId ?? null,
            managementToken: apt.management_token || ''
        };
    }

    if (!pendingBooking) {
        setMessage('Payment successful, but no pending booking was found.');
        return;
    }

    const snapshot = buildSnapshotFromPending(pendingBooking);
    try {
        sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(snapshot));
        localStorage.setItem('constantCoAppointment', JSON.stringify(snapshot));
        sessionStorage.setItem('expectBookingToken', '1');
    } catch (_e) {
        /* ignore */
    }
    if (viewSummaryLink) {
        viewSummaryLink.href = './booking-summary.html';
        viewSummaryLink.style.pointerEvents = 'none';
        viewSummaryLink.style.opacity = '0.6';
        viewSummaryLink.setAttribute('aria-disabled', 'true');
    }
    setMessage('Saving your booking confirmation… Please wait before opening the summary.');

    try {
        const params = new URLSearchParams(window.location.search);
        const paymentIntentId = params.get('payment_intent');
        if (!paymentIntentId) {
            throw new Error('Missing payment reference from Stripe.');
        }

        sessionStorage.setItem('bookingPaymentIntentId', paymentIntentId);

        const confirmRes = await fetch(`${API_BASE}/api/confirm-pending-booking-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId })
        });
        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) {
            throw new Error(confirmData.error || 'Failed to confirm booking.');
        }

        const apt = confirmData.appointment || {};
        const snap = buildSnapshotFromAppointment(apt, pendingBooking);
        const token = apt.management_token || '';

        if (token) {
            sessionStorage.setItem('bookingManagementToken', token);
            snap.managementToken = token;
        }

        sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(snap));
        localStorage.setItem('constantCoAppointment', JSON.stringify(snap));
        sessionStorage.removeItem('pendingBooking');
        sessionStorage.removeItem('expectBookingToken');
        sessionStorage.removeItem('bookingPaymentIntentId');

        if (viewSummaryLink) {
            viewSummaryLink.href = token
                ? `./booking-summary.html?token=${encodeURIComponent(token)}`
                : './booking-summary.html';
            viewSummaryLink.style.pointerEvents = '';
            viewSummaryLink.style.opacity = '';
            viewSummaryLink.removeAttribute('aria-disabled');
        }

        setMessage(
            `Payment successful. Your booking is confirmed for ${formatDisplayDate(snap.appointmentDate)}. Open “View booking summary” for details — reschedule and cancel appear there when your appointment is at least 24 hours away (Melbourne time).`
        );
    } catch (err) {
        console.error('Booking confirmation error:', err);
        sessionStorage.removeItem('expectBookingToken');
        setMessage(
            'Payment was successful, but we could not confirm the appointment in the system. You can still open “View booking summary” for what you entered; please contact support to finalise your booking.'
        );
    }
});

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
            bookingCost: pb.bookingFee ? `$${(Number(pb.bookingFee) / 100).toFixed(2)} AUD` : '',
            notes: pb.notes || '',
            clientId: pb.clientId != null ? pb.clientId : null,
            staffId: pb.staffId != null ? pb.staffId : null,
            managementToken: ''
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
    }
    setMessage('Saving your booking confirmation… You can open “View booking summary” anytime.');

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
        const apt = appointmentData.appointment || {};
        const appointmentId = apt.id;
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

        const token = apt.management_token || '';
        if (token) {
            sessionStorage.setItem('bookingManagementToken', token);
            try {
                const snap = { ...snapshot, managementToken: token };
                sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(snap));
                localStorage.setItem('constantCoAppointment', JSON.stringify(snap));
            } catch (_e) {
                /* ignore */
            }
        }

        sessionStorage.removeItem('pendingBooking');
        sessionStorage.removeItem('expectBookingToken');
        setMessage(
            'Payment successful. Your booking is saved. Open “View booking summary” for your details — reschedule and cancel appear there only when your appointment is at least 24 hours away (Melbourne time).'
        );
    } catch (err) {
        console.error('Booking confirmation error:', err);
        sessionStorage.removeItem('expectBookingToken');
        setMessage(
            'Payment was successful, but we could not confirm the appointment in the system. You can still open “View booking summary” for what you entered; please contact support to finalise your booking.'
        );
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    const manageLoad = document.getElementById('manageLoad');
    const manageError = document.getElementById('manageError');
    const manageErrorText = document.getElementById('manageErrorText');
    const manageCard = document.getElementById('manageCard');
    const manageDetails = document.getElementById('manageDetails');
    const manageActions = document.getElementById('manageActions');
    const manageClosed = document.getElementById('manageClosed');
    const manageStatus = document.getElementById('manageStatus');
    const rescheduleDate = document.getElementById('rescheduleDate');
    const rescheduleSlots = document.getElementById('rescheduleSlots');
    const rescheduleBtn = document.getElementById('rescheduleBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    const params = new URLSearchParams(window.location.search);
    let token = (params.get('token') || '').trim();
    if (!token) {
        token = (sessionStorage.getItem('bookingManagementToken') || '').trim();
    }

    let booking = null;
    let canModify = false;
    let selectedSlot = '';

    function setStatus(msg, ok = false) {
        if (!manageStatus) return;
        manageStatus.textContent = msg || '';
        manageStatus.style.color = ok ? '#1a7f37' : '#c62828';
    }

    function formatDateDisplay(d) {
        if (!d) return '';
        const s = String(d).slice(0, 10);
        const dt = new Date(`${s}T00:00:00`);
        if (Number.isNaN(dt.getTime())) return s;
        return dt.toLocaleDateString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    function formatTime(t) {
        if (t == null) return '';
        const s = String(t);
        return s.length >= 5 ? s.slice(0, 5) : s;
    }

    function renderDetails() {
        if (!booking) return;
        const time = formatTime(booking.appointment_time);
        const dateLine = formatDateDisplay(booking.appointment_date);
        manageDetails.innerHTML = `
            <p><strong>Service</strong><br>${escapeHtml(booking.service_name || '')}</p>
            <p><strong>Consultation</strong><br>${escapeHtml(booking.meeting_type || '')}</p>
            <p><strong>Provider</strong><br>${escapeHtml(booking.staff_full_name || 'Assigned staff')}</p>
            <p><strong>Date</strong><br>${escapeHtml(dateLine)}</p>
            <p><strong>Time</strong><br>${escapeHtml(time)}</p>
            <p><strong>Status</strong><br>${escapeHtml(booking.booking_status || '')}</p>
        `;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function loadBooking() {
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            manageLoad.hidden = true;
            manageError.hidden = false;
            manageErrorText.textContent =
                'This page needs a valid booking link from your confirmation email.';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/booking/manage/${encodeURIComponent(token)}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Could not load booking.');
            }
            booking = data.booking;
            canModify = Boolean(data.can_modify);
            manageLoad.hidden = true;
            manageCard.hidden = false;
            renderDetails();

            if (canModify) {
                manageActions.hidden = false;
                manageClosed.hidden = true;
            } else {
                manageActions.hidden = true;
                manageClosed.hidden = false;
                if (booking.booking_status === 'Cancelled') {
                    manageClosed.textContent = 'This appointment has been cancelled.';
                } else {
                    manageClosed.textContent =
                        'Online reschedule and cancel are only available when your appointment is at least 24 hours away (Melbourne time). For help, please contact Constant & Co.';
                }
            }
        } catch (err) {
            console.error(err);
            manageLoad.hidden = true;
            manageError.hidden = false;
            manageErrorText.textContent = err.message || 'Could not load booking.';
        }
    }

    flatpickr(rescheduleDate, {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disable: [
            function (date) {
                const day = date.getDay();
                return day === 0 || day === 6;
            }
        ],
        onChange: async () => {
            selectedSlot = '';
            rescheduleBtn.disabled = true;
            await loadSlotsForDate();
        }
    });

    async function loadSlotsForDate() {
        if (!booking || !rescheduleDate.value) {
            rescheduleSlots.innerHTML =
                '<p class="small" style="margin:0;">Pick a date to see available times.</p>';
            return;
        }
        rescheduleSlots.innerHTML = '<p class="small" style="margin:0;">Loading times…</p>';
        try {
            const qs = new URLSearchParams({
                service: booking.service_name,
                providerId: String(booking.staff_id),
                date: rescheduleDate.value
            });
            if (booking.id != null && String(booking.id).trim() !== '') {
                qs.set('excludeAppointmentId', String(booking.id));
            }
            const res = await fetch(`${API_BASE}/api/booking-slots?${qs.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load slots');
            const slots = data.slots || [];
            if (!slots.length) {
                rescheduleSlots.innerHTML = '<p class="small" style="margin:0;">No times for this date.</p>';
                return;
            }
            rescheduleSlots.innerHTML = slots
                .map(
                    (slot) =>
                        `<button type="button" class="booking-slot-btn" data-slot="${slot.time}">${slot.time}</button>`
                )
                .join('');
            rescheduleSlots.querySelectorAll('.booking-slot-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    rescheduleSlots.querySelectorAll('.booking-slot-btn').forEach((b) =>
                        b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedSlot = btn.dataset.slot || '';
                    rescheduleBtn.disabled = !selectedSlot;
                });
            });
        } catch (err) {
            console.error(err);
            rescheduleSlots.innerHTML = `<p class="small" style="margin:0;color:#c62828;">${escapeHtml(
                err.message || 'Could not load times'
            )}</p>`;
        }
    }

    rescheduleBtn.addEventListener('click', async () => {
        if (!token || !rescheduleDate.value || !selectedSlot) return;
        setStatus('');
        rescheduleBtn.disabled = true;
        try {
            const res = await fetch(
                `${API_BASE}/api/booking/manage/${encodeURIComponent(token)}/reschedule`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentDate: rescheduleDate.value,
                        appointmentTime: selectedSlot
                    })
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reschedule failed.');
            setStatus('Your appointment has been updated. A confirmation email has been sent.', true);
            const check = await fetch(`${API_BASE}/api/booking/manage/${encodeURIComponent(token)}`);
            const fresh = await check.json();
            if (check.ok && fresh.booking) {
                booking = fresh.booking;
                canModify = Boolean(fresh.can_modify);
                renderDetails();
                if (!canModify) {
                    manageActions.hidden = true;
                    manageClosed.hidden = false;
                    manageClosed.textContent =
                        'Your new time is less than 24 hours before the appointment. Online changes are closed; please call us if you need help.';
                }
            } else {
                booking = {
                    ...booking,
                    appointment_date: data.appointment.appointment_date,
                    appointment_time: data.appointment.appointment_time,
                    booking_status: data.appointment.booking_status
                };
                renderDetails();
            }
            selectedSlot = '';
            rescheduleDate.value = '';
            rescheduleSlots.innerHTML =
                '<p class="small" style="margin:0;">Pick a date to see available times.</p>';
            rescheduleBtn.disabled = true;
        } catch (err) {
            console.error(err);
            setStatus(err.message || 'Reschedule failed.');
        } finally {
            rescheduleBtn.disabled = !selectedSlot;
        }
    });

    cancelBtn.addEventListener('click', async () => {
        if (!token) return;
        if (
            !window.confirm(
                'Cancel this appointment? This cannot be undone from the website (you can book again separately).'
            )
        ) {
            return;
        }
        setStatus('');
        cancelBtn.disabled = true;
        try {
            const res = await fetch(
                `${API_BASE}/api/booking/manage/${encodeURIComponent(token)}/cancel`,
                { method: 'POST' }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancel failed.');
            setStatus(data.message || 'Cancelled.', true);
            booking.booking_status = 'Cancelled';
            canModify = false;
            renderDetails();
            manageActions.hidden = true;
            manageClosed.hidden = false;
            manageClosed.textContent = 'This appointment has been cancelled.';
        } catch (err) {
            console.error(err);
            setStatus(err.message || 'Cancel failed.');
        } finally {
            cancelBtn.disabled = false;
        }
    });

    loadBooking();
});

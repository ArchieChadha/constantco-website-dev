document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

    function validToken(t) {
        return typeof t === 'string' && /^[a-f0-9]{64}$/i.test(t.trim());
    }

    let data = null;

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = (urlParams.get('token') || '').trim();

    if (validToken(tokenFromUrl)) {
        try {
            const res = await fetch(`${API_BASE}/api/booking/manage/${encodeURIComponent(tokenFromUrl)}`);
            const d = await res.json();
            if (res.ok && d.booking) {
                const b = d.booking;
                const feeRaw = b.booking_fee;
                const fee =
                    feeRaw != null && feeRaw !== ''
                        ? String(feeRaw)
                        : 'N/A';
                data = {
                    fullName: b.full_name || '',
                    email: b.email || '',
                    phone: b.phone || '',
                    company: b.company || '',
                    service: b.service_name,
                    service_name: b.service_name,
                    meetingType: b.meeting_type,
                    meeting_type: b.meeting_type,
                    appointmentDate: b.appointment_date,
                    appointment_date: b.appointment_date,
                    appointmentTime: b.appointment_time,
                    appointment_time: b.appointment_time,
                    notes: b.notes || '',
                    clientId: b.client_id != null ? b.client_id : '',
                    staffId: b.staff_id,
                    bookingCost: fee,
                    booking_cost: fee,
                    bookingStatus: b.booking_status,
                    managementToken: tokenFromUrl,
                    management_token: tokenFromUrl
                };
                try {
                    localStorage.setItem('constantCoAppointment', JSON.stringify(data));
                    sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(data));
                    sessionStorage.setItem('bookingManagementToken', tokenFromUrl);
                } catch (_e) {
                    /* ignore */
                }
                try {
                    const u = new URL(window.location.href);
                    u.searchParams.delete('token');
                    const qs = u.searchParams.toString();
                    history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}`);
                } catch (_e) {
                    /* ignore */
                }
            }
        } catch (_e) {
            /* fall through to cached snapshot */
        }
    }

    if (!data) {
        try {
            data = JSON.parse(localStorage.getItem('constantCoAppointment') || 'null');
        } catch (_e) {
            data = null;
        }
    }
    if (!data) {
        try {
            data = JSON.parse(sessionStorage.getItem('bookingSummarySnapshot') || 'null');
        } catch (_e) {
            data = null;
        }
    }

    if (!data) {
        window.location.href = './appointment.html';
        return;
    }

    function applyDataToDom(d) {
        document.getElementById('summaryName').textContent = d.fullName || 'N/A';
        document.getElementById('summaryEmail').textContent = d.email || 'N/A';
        document.getElementById('summaryPhone').textContent = d.phone || 'N/A';
        document.getElementById('summaryCompany').textContent = d.company || 'N/A';
        document.getElementById('summaryService').textContent = d.service || d.service_name || 'N/A';
        document.getElementById('summaryMeetingType').textContent = d.meetingType || d.meeting_type || 'N/A';
        document.getElementById('summaryDate').textContent = d.appointmentDate || d.appointment_date || 'N/A';
        const t = d.appointmentTime || d.appointment_time;
        document.getElementById('summaryTime').textContent =
            t != null && String(t).length >= 5 ? String(t).slice(0, 5) : t || 'N/A';
        document.getElementById('summaryCost').textContent = d.bookingCost || d.booking_cost || 'N/A';
        document.getElementById('summaryNotes').textContent = d.notes || 'N/A';
    }

    applyDataToDom(data);

    const manageWrap = document.getElementById('manageBookingWrap');
    const manageBtn = document.getElementById('manageBookingBtn');
    const manageClosedNote = document.getElementById('manageClosedNote');

    function hideManageSections() {
        if (manageWrap) manageWrap.style.display = 'none';
        if (manageClosedNote) manageClosedNote.style.display = 'none';
        if (manageBtn) {
            manageBtn.onclick = null;
        }
    }

    function managePageUrl(token) {
        return new URL(`booking-manage.html?token=${encodeURIComponent(token)}`, window.location.href).href;
    }

    function persistData() {
        try {
            localStorage.setItem('constantCoAppointment', JSON.stringify(data));
            sessionStorage.setItem('bookingSummarySnapshot', JSON.stringify(data));
        } catch (_e) {
            /* ignore */
        }
    }

    async function applyServerBooking(b, manageTokenFallback) {
        const base = data || {};
        const merged = {
            ...base,
            fullName: b.full_name,
            email: b.email,
            phone: b.phone,
            company: b.company || '',
            service: b.service_name,
            meetingType: b.meeting_type,
            appointmentDate: b.appointment_date,
            appointmentTime: b.appointment_time,
            notes: b.notes || '',
            clientId: b.client_id != null ? b.client_id : base.clientId,
            staffId: b.staff_id != null ? b.staff_id : base.staffId,
            bookingCost: b.booking_fee != null && b.booking_fee !== '' ? String(b.booking_fee) : base.bookingCost,
            booking_cost: b.booking_fee != null && b.booking_fee !== '' ? String(b.booking_fee) : base.booking_cost,
            managementToken:
                base.managementToken ||
                base.management_token ||
                (typeof manageTokenFallback === 'string' ? manageTokenFallback : '') ||
                ''
        };
        data = merged;
        applyDataToDom(merged);
        persistData();
    }

    function canModifyFromApi(d) {
        return Boolean(d && (d.can_modify === true || d.can_modify === 'true' || d.can_modify === 't'));
    }

    async function refreshManageEligibilityWithToken(token) {
        hideManageSections();
        try {
            const res = await fetch(`${API_BASE}/api/booking/manage/${encodeURIComponent(token)}`);
            const d = await res.json();
            if (!res.ok) return;

            if (d.booking) await applyServerBooking(d.booking, token);

            if (d.booking && d.booking.booking_status === 'Cancelled') {
                if (manageClosedNote) {
                    manageClosedNote.style.display = '';
                    manageClosedNote.querySelector('p').textContent =
                        'This appointment has been cancelled.';
                }
                return;
            }

            if (canModifyFromApi(d)) {
                if (manageWrap && manageBtn) {
                    manageWrap.style.display = '';
                    const url = managePageUrl(token);
                    manageBtn.onclick = () => {
                        window.location.assign(url);
                    };
                }
                return;
            }

            const pastLike =
                d.appointment_in_past === true ||
                String(d.booking?.booking_status || '').trim() === 'Completed';
            if (pastLike) {
                return;
            }

            if (d.booking && manageClosedNote) {
                manageClosedNote.style.display = '';
                manageClosedNote.querySelector('p').textContent =
                    'Online reschedule and cancel are only available when your appointment is at least 24 hours away (Melbourne time). Please call us if you need help.';
            }
        } catch (_e) {
            /* ignore */
        }
    }

    async function tryResolveTokenFromServer() {
        const email = (data.email || '').trim();
        const date = (data.appointmentDate || data.appointment_date || '').trim().slice(0, 10);
        const timeRaw = data.appointmentTime || data.appointment_time;
        const time = timeRaw != null ? String(timeRaw).trim().slice(0, 5) : '';
        if (!email || !date || !time) return null;

        try {
            const res = await fetch(`${API_BASE}/api/booking/resolve-manage-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    appointmentDate: date,
                    appointmentTime: time,
                    clientId: data.clientId != null && data.clientId !== '' ? data.clientId : null
                })
            });
            const out = await res.json();
            if (!res.ok || !out.token || !validToken(out.token)) return null;
            const tok = out.token.trim();
            sessionStorage.setItem('bookingManagementToken', tok);
            data = { ...data, managementToken: tok };
            persistData();
            return tok;
        } catch (_e) {
            return null;
        }
    }

    async function bootstrapManage() {
        let token = (sessionStorage.getItem('bookingManagementToken') || '').trim();
        if (!validToken(token)) {
            token = (data.managementToken || data.management_token || '').trim();
        }
        if (!validToken(token)) {
            token = (await tryResolveTokenFromServer()) || '';
        }
        if (!validToken(token) && sessionStorage.getItem('expectBookingToken') === '1') {
            for (let i = 0; i < 45; i += 1) {
                await new Promise((r) => setTimeout(r, 1000));
                token = (sessionStorage.getItem('bookingManagementToken') || '').trim();
                if (validToken(token)) break;
            }
            sessionStorage.removeItem('expectBookingToken');
        }
        if (validToken(token)) {
            await refreshManageEligibilityWithToken(token);
        }
    }

    await bootstrapManage();

    document.getElementById('backHomeBtn').addEventListener('click', () => {
        window.location.href = './index.html';
    });
});

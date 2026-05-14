document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const form = document.getElementById('appointmentForm');
    const service = document.getElementById('service');
    const meetingType = document.getElementById('meetingType');
    const appointmentDate = document.getElementById('appointmentDate');
    const appointmentTime = document.getElementById('appointmentTime');
    const availableAgent = document.getElementById('availableAgent');
    const slotPicker = document.getElementById('slotPicker');
    const statusText = document.getElementById('appointmentStatus');
    const bookingCost = document.getElementById('bookingCost');
    const bookingCostWrap = document.getElementById('bookingCostWrap');

    const state = {
        selectedProviderChoice: '',
        selectedProviderId: '',
        selectedTime: '',
        providers: []
    };

    const feeTable = {
        'Tax Return': {
            'Individual Tax Return': '$120',
            'Business Tax Return': '$150',
            'Tax Planning': '$180'
        },
        'Business Advisory': {
            'Strategy Session': '$180',
            'Cashflow Advisory': '$170',
            'Growth Planning': '$190'
        },
        'Payroll Support': {
            'Payroll Setup': '$140',
            'STP Support': '$130',
            'Ongoing Payroll Help': '$150'
        },
        'Auditing': {
            'Compliance Audit': '$220',
            'Internal Audit Review': '$200',
            'Risk Assessment': '$210'
        },
        'General Consultation': {
            'In Person': '$100',
            'Phone Call': '$80',
            'Video Meeting': '$90'
        }
    };

    const consultationByService = {
        'Tax Return': ['Individual Tax Return', 'Business Tax Return', 'Tax Planning'],
        'Business Advisory': ['Strategy Session', 'Cashflow Advisory', 'Growth Planning'],
        'Payroll Support': ['Payroll Setup', 'STP Support', 'Ongoing Payroll Help'],
        'Auditing': ['Compliance Audit', 'Internal Audit Review', 'Risk Assessment'],
        'General Consultation': ['In Person', 'Phone Call', 'Video Meeting']
    };

    function setStatus(msg, ok = false) {
        statusText.textContent = msg || '';
        statusText.style.color = ok ? '#1a7f37' : '#c62828';
    }

    function setBusy(message = 'Loading...') {
        setStatus(message, true);
    }

    function clearStatus() {
        setStatus('');
    }

    function updateCost() {
        const selectedService = service.value;
        const selectedMeetingType = meetingType.value;
        const fee = feeTable[selectedService]?.[selectedMeetingType] || '$0';
        bookingCost.textContent = fee;
        bookingCostWrap.hidden = !(selectedService && selectedMeetingType);
    }

    function rebuildConsultationTypes() {
        const selectedService = service.value;
        const options = consultationByService[selectedService] || ['In Person', 'Phone Call', 'Video Meeting'];
        meetingType.innerHTML = `<option value="">Select Consultation Type</option>${options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join('')}`;
    }

    function formatDisplayDate(dateStr) {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('en-AU', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
        });
    }

    function renderProviders() {
        if (!state.providers.length) {
            availableAgent.innerHTML = '<p>No providers currently available for this service.</p>';
            return;
        }

        availableAgent.innerHTML = state.providers.map((provider) => {
            const checked = String(provider.id) === String(state.selectedProviderChoice) ? 'checked' : '';
            const nextAvailability = provider.next_available_date && provider.next_available_time
                ? `${formatDisplayDate(provider.next_available_date)} at ${provider.next_available_time.slice(0, 5)}`
                : 'No open times in the next 30 days';
            const subtitle = provider.is_any_provider
                ? 'We will assign the first available provider for your selected slot.'
                : `Next available: ${nextAvailability}`;

            return `
                <label class="agent-card booking-provider-card">
                    <input type="radio" name="selectedStaff" value="${provider.id}" ${checked} required>
                    <strong>${provider.full_name}</strong>
                    <p>${subtitle}</p>
                </label>
            `;
        }).join('');
    }

    async function loadServices() {
        const fallback = Object.keys(feeTable);
        try {
            const res = await fetch(`${API_BASE}/api/booking-services`);
            const data = await res.json();
            const services = Array.isArray(data.services) && data.services.length ? data.services : fallback;
            service.innerHTML = `<option value="">Select Service</option>${services.map((item) =>
                `<option value="${item}">${item}</option>`).join('')}`;
        } catch (_err) {
            service.innerHTML = `<option value="">Select Service</option>${fallback.map((item) =>
                `<option value="${item}">${item}</option>`).join('')}`;
        }
    }

    async function loadProviders() {
        const selectedService = service.value;
        state.selectedProviderChoice = '';
        state.selectedProviderId = '';
        state.selectedTime = '';
        appointmentTime.value = '';
        slotPicker.innerHTML = '<p>Select a provider and date to view available times.</p>';

        if (!selectedService) {
            availableAgent.innerHTML = '<p>Select a service to view available providers.</p>';
            return;
        }

        try {
            setBusy('Loading providers...');
            const res = await fetch(`${API_BASE}/api/booking-providers?service=${encodeURIComponent(selectedService)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load providers');
            state.providers = data.providers || [];
            renderProviders();
            clearStatus();
        } catch (err) {
            console.error(err);
            availableAgent.innerHTML = '<p>Could not load providers right now.</p>';
            setStatus(err.message || 'Failed to load providers');
        }
    }

    async function loadSlots() {
        const selectedService = service.value;
        const selectedDate = appointmentDate.value;
        if (!selectedService || !selectedDate || !state.selectedProviderChoice) {
            slotPicker.innerHTML = '<p>Select service, provider and date to view available times.</p>';
            return;
        }

        try {
            setBusy('Loading times...');
            const qs = new URLSearchParams({
                service: selectedService,
                providerId: String(state.selectedProviderChoice),
                date: selectedDate
            });
            const res = await fetch(`${API_BASE}/api/booking-slots?${qs.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load time slots');

            const slots = data.slots || [];
            if (!slots.length) {
                slotPicker.innerHTML = '<p>No available times for this date.</p>';
                appointmentTime.value = '';
                state.selectedTime = '';
                clearStatus();
                return;
            }

            slotPicker.innerHTML = slots.map((slot) => {
                const label = slot.provider_name
                    ? `${slot.time} (${slot.provider_name})`
                    : slot.time;
                return `
                <button type="button" class="booking-slot-btn" data-slot="${slot.time}" data-provider-id="${slot.provider_id}">
                    ${label}
                </button>
            `;
            }).join('');

            slotPicker.querySelectorAll('.booking-slot-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    slotPicker.querySelectorAll('.booking-slot-btn').forEach((item) =>
                        item.classList.remove('active'));
                    btn.classList.add('active');
                    state.selectedTime = btn.dataset.slot || '';
                    state.selectedProviderId = btn.dataset.providerId || state.selectedProviderChoice;
                    appointmentTime.value = state.selectedTime;
                });
            });
            clearStatus();
        } catch (err) {
            console.error(err);
            slotPicker.innerHTML = '<p>Could not load times right now.</p>';
            setStatus(err.message || 'Failed to load time slots');
        }
    }

    flatpickr(appointmentDate, {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disable: [
            function (date) {
                const day = date.getDay();
                return day === 0 || day === 6;
            }
        ]
    });

    service.addEventListener('change', async () => {
        rebuildConsultationTypes();
        updateCost();
        await loadProviders();
    });

    meetingType.addEventListener('change', updateCost);

    availableAgent.addEventListener('change', async (event) => {
        const selected = event.target.closest('input[name="selectedStaff"]');
        if (!selected) return;
        state.selectedProviderChoice = selected.value;
        state.selectedProviderId = selected.value === 'any' ? '' : selected.value;
        state.selectedTime = '';
        appointmentTime.value = '';
        await loadSlots();
    });

    appointmentDate.addEventListener('change', loadSlots);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus();

        const selectedStaff = document.querySelector('input[name="selectedStaff"]:checked');
        const consent = document.getElementById('consent');
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const company = document.getElementById('company').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!service.value || !meetingType.value || !appointmentDate.value || !appointmentTime.value) {
            setStatus('Please select service, consultation type, provider, date and time.');
            return;
        }

        if (!selectedStaff) {
            setStatus('Please select a provider.');
            return;
        }

        if (!state.selectedProviderId) {
            setStatus('Please select an available time so we can assign a provider.');
            return;
        }

        if (!fullName || !email || !phone || !consent.checked) {
            setStatus('Please complete your details and consent.');
            return;
        }

        try {

            const feeNumber =
                Number(
                    (bookingCost.textContent || '$0')
                        .replace('$', '')
                ) * 100;

            const payload = {
                clientId:
                    sessionStorage.getItem('clientId') || null,

                staffId:
                    state.selectedProviderId,

                fullName,
                email,
                phone,
                company,

                serviceName:
                    service.value,

                meetingType:
                    meetingType.value,

                appointmentDate:
                    appointmentDate.value,

                appointmentTime:
                    appointmentTime.value,

                notes,

                bookingFee:
                    feeNumber
            };

            sessionStorage.setItem(
                'pendingBooking',
                JSON.stringify(payload)
            );

            window.location.href =
                './booking-payment.html';

        } catch (err) {

            console.error(err);

            setStatus(
                err.message || 'Failed to continue to payment'
            );
        }


    });

    loadServices();
    rebuildConsultationTypes();
    updateCost();
    availableAgent.innerHTML = '<p>Select a service to view available providers.</p>';
    slotPicker.innerHTML = '<p>Select service, provider and date to view available times.</p>';
});
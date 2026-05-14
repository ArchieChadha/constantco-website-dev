document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const clientId = sessionStorage.getItem('clientId');

    // ================================
    // FORMAT HELPERS
    // ================================
    function formatText(text) {
        return text
            ? text
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            : '';
    }

    function formatMoney(cents) {
        return `$${(Number(cents || 0) / 100).toFixed(2)}`;
    }

    function safeJsonParse(text, fallbackError = 'Invalid server response') {
        try {
            return JSON.parse(text);
        } catch {
            throw new Error(fallbackError);
        }
    }

    function formatDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleDateString('en-AU');
    }

    function formatTime(value) {
        if (!value) return '';
        return String(value).slice(0, 5);
    }

    function formatDateTime(value) {
        if (!value) return '';
        return new Date(value).toLocaleString('en-AU');
    }

    function escapeHTML(value) {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // ================================
    // ELEMENTS
    // ================================
    const nameEl = document.getElementById('dashName');

    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileType = document.getElementById('profileType');

    const sidebarClientName = document.getElementById('sidebarClientName');
    const sidebarClientEmail = document.getElementById('sidebarClientEmail');

    const servicesList = document.getElementById('servicesList');
    const clientService = document.getElementById('clientService');

    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const recordsList = document.getElementById('recordsList');

    const bookingFeeValue = document.getElementById('bookingFeeValue');
    const serviceChargeValue = document.getElementById('serviceChargeValue');
    const totalChargeValue = document.getElementById('totalChargeValue');
    const amountPaidValue = document.getElementById('amountPaidValue');
    const chargeValue = document.getElementById('chargeValue');
    const chargeStatus = document.getElementById('chargeStatus');
    const chargeService = document.getElementById('chargeService');

    const payBtn = document.querySelector('.payment-action-btn');

    // ================================
    // SIDEBAR TOGGLE
    // ================================
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.client-sidebar');
    const clientMain = document.querySelector('.client-main');
    const portalContent = document.querySelector('.client-portal-content');

    function handleSidebarState() {
        if (window.innerWidth <= 768) {
            sidebar?.classList.remove('sidebar-hidden');
            portalContent?.classList.remove('content-expanded');
            clientMain?.classList.remove('content-expanded');
            return;
        }

        sidebar?.classList.remove('mobile-open');
    }

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
                return;
            }

            sidebar.classList.toggle('sidebar-hidden');
            portalContent?.classList.toggle('content-expanded');
            clientMain?.classList.toggle('content-expanded');
        });
    }

    document.addEventListener('click', (event) => {
        if (window.innerWidth > 768) return;
        if (!sidebar?.classList.contains('mobile-open')) return;

        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedToggle = sidebarToggleBtn?.contains(event.target);

        if (!clickedInsideSidebar && !clickedToggle) {
            sidebar.classList.remove('mobile-open');
        }
    });

    window.addEventListener('resize', handleSidebarState);
    handleSidebarState();

    // ================================
    // GUARD
    // ================================
    if (!clientId) {
        window.location.href = './login.html';
        return;
    }

    // ================================
    // HELPERS
    // ================================
    function setUploadStatus(message = '', ok = false) {
        if (!uploadStatus) return;

        uploadStatus.textContent = message;
        uploadStatus.style.color = ok ? '#1a7f37' : '#b00020';
    }

    function fillProfile(client) {
        if (!client) return;

        if (nameEl) nameEl.textContent = client.name || 'Client';
        if (profileName) profileName.textContent = client.name || '—';
        if (profileEmail) profileEmail.textContent = client.email || '—';
        if (profilePhone) profilePhone.textContent = client.phone || '—';
        if (profileType) profileType.textContent = formatText(client.client_type) || '—';

        if (sidebarClientName) sidebarClientName.textContent = client.name || 'Client';
        if (sidebarClientEmail) sidebarClientEmail.textContent = client.email || 'Logged in';

        sessionStorage.setItem('clientName', client.name || '');
        sessionStorage.setItem('clientEmail', client.email || '');
        sessionStorage.setItem('clientPhone', client.phone || '');
        sessionStorage.setItem('clientType', client.client_type || '');
        sessionStorage.setItem('clientService', client.service || '');
    }

    function fillServices(data) {
        if (!servicesList) return;

        if (!data || !Array.isArray(data.services) || data.services.length === 0) {
            const fallback = sessionStorage.getItem('clientService') || 'No Service Selected';

            servicesList.innerHTML = `
                <div class="portal-service-item">
                    <h4>${formatText(fallback)}</h4>
                    <p><strong>Status:</strong> Active</p>
                    <p><strong>Staff:</strong> Not assigned</p>
                    <p><strong>Notes:</strong> No additional notes available</p>
                </div>
            `;
            return;
        }

        servicesList.innerHTML = data.services.map(service => `
            <div class="portal-service-item">
                <h4>${formatText(service.title || 'Service')}</h4>
                <p><strong>Status:</strong> ${formatText(service.status || 'Active')}</p>
                <p><strong>Staff:</strong> ${formatText(service.staff_name) || 'Not assigned'}</p>
                <p><strong>Notes:</strong> ${escapeHTML(service.note || 'No additional notes available')}</p>
            </div>
        `).join('');

        if (clientService && data.services[0]?.title) {
            clientService.textContent = formatText(data.services[0].title);
        }
    }

    function updatePayButton(totalDue) {
        if (!payBtn) return;

        if (Number(totalDue || 0) <= 0) {
            payBtn.textContent = 'No Payment Due';
            payBtn.classList.add('is-disabled');
            payBtn.removeAttribute('href');
        } else {
            payBtn.textContent = '💳 Pay Now';
            payBtn.classList.remove('is-disabled');
            payBtn.setAttribute('href', 'payment.html');
        }
    }

    // ================================
    // SECTION TOGGLING
    // ================================
    const sectionIds = [
        'profileSection',
        'servicesSection',
        'recordsSection',
        'chargesSection',
        'uploadSection'
    ];

    function showSection(sectionId) {
        sectionIds.forEach(id => {
            const section = document.getElementById(id);
            if (!section) return;

            if (id === sectionId) {
                section.classList.remove('is-hidden');
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                section.classList.add('is-hidden');
            }
        });
    }

    window.openSection = function (sectionId) {
        showSection(sectionId);

        if (sectionId === 'recordsSection') {
            loadRecords();
        }

        if (sectionId === 'chargesSection') {
            loadCharges();
        }
    };

    window.toggleUpload = function () {
        const uploadSection = document.getElementById('uploadSection');
        if (!uploadSection) return;

        if (uploadSection.classList.contains('is-hidden')) {
            showSection('uploadSection');
        } else {
            uploadSection.classList.add('is-hidden');
        }
    };

    // ================================
    // LOAD PROFILE
    // ================================
    async function loadProfile() {
        try {
            const res = await fetch(`${API_BASE}/api/profile?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text);

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load profile');
            }

            fillProfile(data.client);
        } catch (err) {
            console.error('Profile load error:', err);

            fillProfile({
                name: sessionStorage.getItem('clientName'),
                email: sessionStorage.getItem('clientEmail'),
                phone: sessionStorage.getItem('clientPhone'),
                client_type: sessionStorage.getItem('clientType'),
                service: sessionStorage.getItem('clientService')
            });
        }
    }

    // ================================
    // LOAD SERVICES
    // ================================
    async function loadServices() {
        if (!servicesList) return;

        try {
            const res = await fetch(`${API_BASE}/api/services?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text);

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load services');
            }

            fillServices(data);
        } catch (err) {
            console.error('Services load error:', err);

            const fallback = sessionStorage.getItem('clientService') || 'No Service Selected';

            servicesList.innerHTML = `
                <div class="portal-service-item">
                    <h4>${formatText(fallback)}</h4>
                    <p><strong>Status:</strong> Active</p>
                    <p><strong>Staff:</strong> Not assigned</p>
                    <p><strong>Notes:</strong> No additional notes available</p>
                </div>
            `;
        }
    }

    // ================================
    // FILE UPLOAD
    // ================================
    uploadForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        setUploadStatus('');

        const fileInput = uploadForm.querySelector('input[type="file"]');
        const file = fileInput?.files?.[0];

        if (!file) {
            setUploadStatus('Please select a file.');
            return;
        }

        const btn = uploadForm.querySelector('button[type="submit"]');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Uploading...';
        }

        const formData = new FormData(uploadForm);
        formData.append('clientId', clientId);

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadStatus('Upload successful.', true);
            uploadForm.reset();
            loadRecords();
        } catch (err) {
            console.error('Upload error:', err);
            setUploadStatus(err.message || 'Upload failed.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Upload';
            }
        }
    });

    // ================================
    // LOAD RECORDS
    // ================================
    async function loadRecords() {
        if (!recordsList) return;

        recordsList.textContent = 'Loading...';

        try {
            const res = await fetch(`${API_BASE}/api/records?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load records');
            }

            if (!Array.isArray(data) || data.length === 0) {
                recordsList.textContent = 'No records found yet.';
                return;
            }

            recordsList.innerHTML = data.map(record => `
                <div class="record-item">
                    <strong>${escapeHTML(record.file_name)}</strong><br>
                    <small>${new Date(record.uploaded_at).toLocaleString()}</small><br>
                    <a href="${API_BASE}/${record.file_path}" target="_blank" rel="noopener noreferrer">Open file</a>
                </div>
            `).join('');
        } catch (err) {
            console.error('Records load error:', err);
            recordsList.textContent = 'Failed to load records.';
        }
    }

    // ================================
    // LOAD CHARGES
    // ================================
    async function loadCharges() {
        try {
            const res = await fetch(`${API_BASE}/api/charges?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load charges');
            }

            if (bookingFeeValue) bookingFeeValue.textContent = formatMoney(data.bookingFee);
            if (serviceChargeValue) serviceChargeValue.textContent = formatMoney(data.serviceCharge);
            if (totalChargeValue) totalChargeValue.textContent = formatMoney(data.totalCharge);
            if (amountPaidValue) amountPaidValue.textContent = formatMoney(data.amountPaid);
            if (chargeValue) chargeValue.textContent = formatMoney(data.totalDue);
            if (chargeStatus) chargeStatus.textContent = formatText(data.status || 'Pending');
            if (chargeService) chargeService.textContent = formatText(data.serviceName || 'Not assigned');

            updatePayButton(data.totalDue);
        } catch (err) {
            console.error('Charge load error:', err);

            if (bookingFeeValue) bookingFeeValue.textContent = '$0.00';
            if (serviceChargeValue) serviceChargeValue.textContent = '$0.00';
            if (totalChargeValue) totalChargeValue.textContent = '$0.00';
            if (amountPaidValue) amountPaidValue.textContent = '$0.00';
            if (chargeValue) chargeValue.textContent = '$0.00';
            if (chargeStatus) chargeStatus.textContent = 'Unavailable';
            if (chargeService) chargeService.textContent = 'Not assigned';

            updatePayButton(0);
        }
    }

    // ================================
    // LOAD CLIENT SERVICE HISTORY
    // ================================
    async function loadClientServiceHistory() {
        try {
            const res = await fetch(`${API_BASE}/api/client/service-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load service history');
            }

            const services = data.services || [];

            const upcomingAppointmentsCount =
                document.getElementById('upcomingAppointmentsCount');

            if (upcomingAppointmentsCount) {
                const upcomingCount = services.filter(service =>
                    service.booking_status !== 'Cancelled'
                ).length;

                upcomingAppointmentsCount.textContent = upcomingCount;
            }

            const serviceTable = document.getElementById('serviceHistoryTable');
            const appointmentTable = document.getElementById('appointmentHistoryTable');

            if (serviceTable) {
                if (!services.length) {
                    serviceTable.innerHTML = `<tr><td colspan="6">No service history found.</td></tr>`;
                } else {
                    serviceTable.innerHTML = services.map(service => `
                        <tr>
                            <td>${escapeHTML(service.service_name || '')}</td>
                            <td>${escapeHTML(service.staff_name || 'Not assigned')}</td>
                            <td>${formatDate(service.appointment_date)}</td>
                            <td>${escapeHTML(service.booking_status || '')}</td>
                        </tr>
                    `).join('');
                }
            }

            if (appointmentTable) {
                if (!services.length) {
                    appointmentTable.innerHTML = `<tr><td colspan="5">No appointments found.</td></tr>`;
                } else {
                    appointmentTable.innerHTML = services.map(service => `
                        <tr>
                            <td>${escapeHTML(service.service_name || '')}</td>
                            <td>${escapeHTML(service.staff_name || 'Not assigned')}</td>
                            <td>${formatDate(service.appointment_date)}</td>
                            <td>${formatTime(service.appointment_time)}</td>
                            <td>${escapeHTML(service.booking_status || '')}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('Service history load error:', err);
        }
    }

    // ================================
    // LOAD CLIENT PAYMENT HISTORY
    // ================================
    async function loadClientPaymentHistory() {
        try {
            const res = await fetch(`${API_BASE}/api/client/payment-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load payment history');
            }

            const payments = data.payments || [];
            const table = document.getElementById('paymentHistoryTable');

            if (!table) return;

            if (!payments.length) {
                table.innerHTML = `<tr><td colspan="5">No payment history found.</td></tr>`;
                return;
            }

            table.innerHTML = payments.map(payment => `
                <tr>
                    <td>${escapeHTML(payment.service_name || '')}</td>
                    <td>${formatMoney(payment.amount)}</td>
                    <td>${escapeHTML((payment.currency || 'AUD').toUpperCase())}</td>
                    <td>${escapeHTML(payment.status || '')}</td>
                    <td>${formatDateTime(payment.payment_date)}</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Payment history load error:', err);
        }
    }

    // ================================
    // CLIENT MESSAGE FORM
    // ================================
    function setupClientMessageForm() {
        const form = document.getElementById('clientMessageForm');

        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const message = document.getElementById('clientMessageText')?.value.trim() || '';
            const statusEl = document.getElementById('clientMessageStatus');

            if (!message) {
                if (statusEl) {
                    statusEl.textContent = 'Please write a message.';
                    statusEl.style.color = '#b00020';
                }
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/client/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientId,
                        appointmentId: selectedConversation.appointmentId || null,
                        subject: selectedConversation.serviceName || 'Client message',
                        message
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to send message');
                }

                form.reset();

                if (statusEl) {
                    statusEl.textContent = '';
                }

                await loadClientMessages();

            } catch (err) {
                console.error(err);

                if (statusEl) {
                    statusEl.textContent = err.message;
                    statusEl.style.color = '#b00020';
                }
            }
        });
    }

    // ================================
    // LOAD CLIENT MESSAGES
    // ================================
    async function loadClientMessages() {
        try {
            const res = await fetch(`${API_BASE}/api/client/messages?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load messages');
            }

            let messages = data.messages || [];
            messages.sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
            });

            if (selectedConversation.serviceName) {
                messages = messages.filter(msg =>
                    msg.service_name === selectedConversation.serviceName ||
                    msg.staff_name === selectedConversation.staffName
                );
            }

            const unreadMessagesCount = document.getElementById('unreadMessagesCount');

            if (unreadMessagesCount) {
                unreadMessagesCount.textContent = messages.length;
            }

            const clientMessagesList = document.getElementById('clientMessagesList');

            if (!clientMessagesList) return;

            if (!messages.length) {
                clientMessagesList.innerHTML = '<p>No messages found.</p>';
                return;
            }

            clientMessagesList.innerHTML = messages.map(msg => {
                const isClient = msg.sender_type === 'client';

                return `
                <div class="chat-bubble ${isClient ? 'chat-bubble-client' : 'chat-bubble-agent'}">
                    <small>
                        ${isClient ? 'You' : escapeHTML(msg.staff_name || selectedConversation.staffName || 'Adviser')}
                        · ${formatDateTime(msg.created_at)}
                    </small>

                    <p>${escapeHTML(msg.message || '')}</p>
                </div>
            `;
            }).join('');

            clientMessagesList.scrollTop = clientMessagesList.scrollHeight;

        } catch (err) {
            console.error(err);
        }
    }

    // ================================
    // LOAD CLIENT DOCUMENT REQUESTS
    // ================================
    async function loadClientDocumentRequests() {
        try {
            const res = await fetch(`${API_BASE}/api/client/document-requests?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load document requests');
            }

            const requests = data.requests || [];

            const documentRequestsCount = document.getElementById('documentRequestsCount');

            if (documentRequestsCount) {
                documentRequestsCount.textContent = requests.length;
            }

            const container = document.getElementById('clientDocumentRequestsList');

            if (!container) return;

            if (!requests.length) {
                container.innerHTML = '<p>No document requests found.</p>';
                return;
            }

            container.innerHTML = requests.map(req => `
                <div class="record-item">
                    <strong>${escapeHTML(req.document_title)}</strong>
                    <br>
                    <small>
                        Requested by:
                        ${escapeHTML(req.staff_name || '')}
                    </small>
                    <p>${escapeHTML(req.message || '')}</p>
                    <small>
                        Status:
                        ${escapeHTML(req.status || '')}
                    </small>
                </div>
            `).join('');
        } catch (err) {
            console.error(err);
        }
    }

    // ================================
    // LOAD APPOINTMENT SERVICE TABLE
    // ================================
    async function loadAppointmentServiceTable() {
        try {
            const res = await fetch(`${API_BASE}/api/client/service-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load appointment services');
            }

            const services = data.services || [];
            const table = document.getElementById('appointmentServiceTable');

            if (!table) return;

            if (!services.length) {
                table.innerHTML = `
                    <tr>
                        <td colspan="4">No services found.</td>
                    </tr>
                `;
                return;
            }

            const grouped = {};

            services.forEach(item => {
                const serviceName = item.service_name || 'Unknown Service';

                const appointmentDate = item.appointment_date
                    ? new Date(item.appointment_date)
                    : null;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const isUpcoming =
                    appointmentDate &&
                    appointmentDate >= today &&
                    item.booking_status !== 'Cancelled';

                if (!grouped[serviceName]) {
                    grouped[serviceName] = {
                        serviceName,
                        staffName: item.staff_name || 'Not assigned',
                        appointmentStatus: isUpcoming ? 'Scheduled' : 'Completed',
                        upcomingDateTime: isUpcoming
                            ? `${formatDate(item.appointment_date)} at ${formatTime(item.appointment_time)}`
                            : 'No upcoming appointment'
                    };
                }

                if (isUpcoming) {
                    grouped[serviceName].appointmentStatus = 'Scheduled';
                    grouped[serviceName].upcomingDateTime =
                        `${formatDate(item.appointment_date)} at ${formatTime(item.appointment_time)}`;
                }
            });

            table.innerHTML = Object.values(grouped).map(item => `
    <tr>
        <td>${escapeHTML(item.serviceName)}</td>

        <td>${escapeHTML(item.staffName)}</td>

        <td>${escapeHTML(item.appointmentStatus)}</td>

        <td>${escapeHTML(item.upcomingDateTime)}</td>

        <td>
            <a href="client-messages.html?service=${encodeURIComponent(item.serviceName)}">
                View Conversation History
            </a>
        </td>

        <td>
            <div class="client-action-row">
                <button 
                    type="button" 
                    class="btn btn-ghost cancel-appointment-btn"
                    data-service="${escapeHTML(item.serviceName)}">
                    Cancel
                </button>

                <button 
                    type="button" 
                    class="btn btn-primary reschedule-appointment-btn"
                    data-service="${escapeHTML(item.serviceName)}">
                    Reschedule
                </button>
            </div>
        </td>
    </tr>
`).join('');
        } catch (err) {
            console.error(err);
        }
    }
    // ===========================
    // LOAD APPOINTMENT DETAILS
    // ==========================

    async function loadAppointmentDetailsPage() {
        const upcomingTable = document.getElementById('upcomingAppointmentsTable');
        const previousTable = document.getElementById('previousAppointmentsTable');

        if (!upcomingTable || !previousTable) return;

        const params = new URLSearchParams(window.location.search);
        const selectedService = params.get('service');

        try {
            const res = await fetch(`${API_BASE}/api/client/service-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load appointments');
            }

            let appointments = data.services || [];

            if (selectedService) {
                appointments = appointments.filter(app =>
                    app.service_name === selectedService
                );
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcoming = appointments.filter(app => {
                const appDate = new Date(app.appointment_date);
                return appDate >= today && app.booking_status !== 'Cancelled';
            });

            const previous = appointments.filter(app => {
                const appDate = new Date(app.appointment_date);
                return appDate < today || app.booking_status === 'Cancelled';
            });

            function renderRows(list, emptyMessage) {
                if (!list.length) {
                    return `
                    <tr>
                        <td colspan="5">${emptyMessage}</td>
                    </tr>
                `;
                }

                return list.map(app => `
                <tr>
                    <td>${escapeHTML(app.service_name || '')}</td>
                    <td>${escapeHTML(app.staff_name || 'Not assigned')}</td>
                    <td>${formatDate(app.appointment_date)}</td>
                    <td>${formatTime(app.appointment_time)}</td>
                    <td>${escapeHTML(app.booking_status || '')}</td>
                </tr>
            `).join('');
            }

            upcomingTable.innerHTML = renderRows(upcoming, 'No upcoming appointments found.');
            previousTable.innerHTML = renderRows(previous, 'No previous appointments found.');

        } catch (err) {
            console.error('Appointment details error:', err);

            upcomingTable.innerHTML = `
            <tr>
                <td colspan="5">Failed to load upcoming appointments.</td>
            </tr>
        `;

            previousTable.innerHTML = `
            <tr>
                <td colspan="5">Failed to load previous appointments.</td>
            </tr>
        `;
        }
    }

    let selectedConversation = {
        serviceName: '',
        staffName: '',
        staffId: '',
        appointmentId: ''
    };

    async function loadClientChatAgents() {
        const peopleList = document.getElementById('chatPeopleList');
        const serviceSelect = document.getElementById('chatDocumentService');

        if (!peopleList) return;

        try {
            const res = await fetch(`${API_BASE}/api/client/service-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load advisers');
            }

            const services = data.services || [];

            if (!services.length) {
                peopleList.innerHTML = '<p>No adviser conversations found.</p>';
                return;
            }

            const grouped = {};

            services.forEach(item => {
                const key = `${item.service_name}-${item.staff_id}`;

                if (!grouped[key]) {
                    grouped[key] = {
                        serviceName: item.service_name || 'Service',
                        staffName: item.staff_name || 'Not assigned',
                        staffId: item.staff_id,
                        appointmentId: item.appointment_id
                    };
                }
            });

            const conversations = Object.values(grouped);

            peopleList.innerHTML = conversations.map((item, index) => `
            <button
                type="button"
                class="chat-person ${index === 0 ? 'active' : ''}"
                data-service="${escapeHTML(item.serviceName)}"
                data-staff-name="${escapeHTML(item.staffName)}"
                data-staff-id="${item.staffId || ''}"
                data-appointment-id="${item.appointmentId || ''}">

                <div class="chat-avatar">
                    ${escapeHTML(getInitials(item.staffName))}
                </div>

                <div>
                    <strong>${escapeHTML(item.staffName)}</strong>
                    <small>${escapeHTML(item.serviceName)}</small>
                </div>
            </button>
        `).join('');

            if (serviceSelect) {
                serviceSelect.innerHTML = `
                <option value="">Select service</option>
                ${conversations.map(item => `
                    <option value="${escapeHTML(item.serviceName)}">
                        ${escapeHTML(item.serviceName)}
                    </option>
                `).join('')}
            `;
            }

            selectConversation(conversations[0]);

            document.querySelectorAll('.chat-person').forEach(button => {
                button.addEventListener('click', () => {
                    document.querySelectorAll('.chat-person').forEach(btn => {
                        btn.classList.remove('active');
                    });

                    button.classList.add('active');

                    selectConversation({
                        serviceName: button.dataset.service,
                        staffName: button.dataset.staffName,
                        staffId: button.dataset.staffId,
                        appointmentId: button.dataset.appointmentId
                    });
                });
            });

        } catch (err) {
            console.error(err);
            peopleList.innerHTML = '<p>Failed to load conversations.</p>';
        }
    }

    function selectConversation(conversation) {
        selectedConversation = conversation;

        const chatStaffName = document.getElementById('chatStaffName');
        const chatServiceName = document.getElementById('chatServiceName');

        if (chatStaffName) {
            chatStaffName.textContent = conversation.staffName || 'Adviser';
        }

        if (chatServiceName) {
            chatServiceName.textContent = conversation.serviceName || 'Service conversation';
        }

        loadClientMessages();
    }

    function getInitials(name) {
        return String(name || 'CO')
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    function setupChatDocumentUploadPanel() {
        const openBtn = document.getElementById('openDocumentPanel');
        const closeBtn = document.getElementById('closeDocumentPanel');
        const panel = document.getElementById('documentUploadPanel');

        if (!openBtn || !panel) return;

        openBtn.addEventListener('click', () => {
            panel.classList.toggle('is-hidden');
        });

        closeBtn?.addEventListener('click', () => {
            panel.classList.add('is-hidden');
        });
    }

    // ================================
    // INITIAL LOAD
    // ================================
    (async function initialiseDashboard() {

        await loadProfile().catch(console.error);
        await loadServices().catch(console.error);
        await loadRecords().catch(console.error);
        await loadCharges().catch(console.error);
        await loadClientServiceHistory().catch(console.error);
        await loadClientPaymentHistory().catch(console.error);
        await loadClientMessages().catch(console.error);
        await loadClientDocumentRequests().catch(console.error);
        await loadAppointmentServiceTable().catch(console.error);
        await loadAppointmentDetailsPage().catch(console.error);
        await loadClientChatAgents();

        setupClientMessageForm();
        setupChatDocumentUploadPanel();
    })();
});
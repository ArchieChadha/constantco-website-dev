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
    const sidebarToggleBtn =
        document.getElementById('sidebarToggleBtn');

    const sidebar =
        document.querySelector('.client-sidebar');

    const portalContent =
        document.querySelector('.client-portal-content');

    if (sidebarToggleBtn && sidebar && portalContent) {

        sidebarToggleBtn.addEventListener('click', () => {

            sidebar.classList.toggle('sidebar-hidden');

            portalContent.classList.toggle('content-expanded');
        });
    }

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

        sessionStorage.setItem('clientName', client.name || '');
        sessionStorage.setItem('clientEmail', client.email || '');
        sessionStorage.setItem('clientPhone', client.phone || '');
        sessionStorage.setItem('clientType', client.client_type || '');
        sessionStorage.setItem('clientService', client.service || '');
    }

    function fillServices(data) {
        if (!servicesList) return;

        if (!data || !Array.isArray(data.services) || data.services.length === 0) {
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
                <p><strong>Client Type:</strong> ${formatText(service.client_type || 'Not specified')}</p>
                <p><strong>Staff:</strong> ${formatText(service.staff_name) || 'Not assigned'}</p>
                <p><strong>Notes:</strong> ${service.note || 'No additional notes available'}</p>
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
                    <p><strong>Notes:</strong> No additional notes available</p>
                    <p><strong>Staff:</strong> ${service.staff_name || 'Not assigned'}</p>
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
                    <strong>${record.file_name}</strong><br>
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

            if (bookingFeeValue) {
                bookingFeeValue.textContent = formatMoney(data.bookingFee);
            }

            if (serviceChargeValue) {
                serviceChargeValue.textContent = formatMoney(data.serviceCharge);
            }

            if (totalChargeValue) {
                totalChargeValue.textContent = formatMoney(data.totalCharge);
            }

            if (amountPaidValue) {
                amountPaidValue.textContent = formatMoney(data.amountPaid);
            }

            if (chargeValue) {
                chargeValue.textContent = formatMoney(data.totalDue);
            }

            if (chargeStatus) {
                chargeStatus.textContent = formatText(data.status || 'Pending');
            }

            if (chargeService) {
                chargeService.textContent = formatText(data.serviceName || 'Not assigned');
            }

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

    async function loadClientServiceHistory() {
        try {
            const res = await fetch(`${API_BASE}/api/client/service-history?clientId=${encodeURIComponent(clientId)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load service history');
            }

            const services = data.services || [];
            const upcomingCount =
                services.filter(service =>
                    service.booking_status !== 'Cancelled'
                ).length;

            document.getElementById('upcomingAppointmentsCount').textContent =
                upcomingCount;

            const serviceTable = document.getElementById('serviceHistoryTable');
            const appointmentTable = document.getElementById('appointmentHistoryTable');

            if (serviceTable) {
                if (!services.length) {
                    serviceTable.innerHTML = `<tr><td colspan="4">No service history found.</td></tr>`;
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

    function setupClientMessageForm() {
        const form = document.getElementById('clientMessageForm');

        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const subject = document.getElementById('clientMessageSubject').value.trim();
            const message = document.getElementById('clientMessageText').value.trim();
            const statusEl = document.getElementById('clientMessageStatus');

            if (!message) {
                statusEl.textContent = 'Please write a message.';
                statusEl.style.color = '#b00020';
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
                        subject,
                        message
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to send message');
                }

                form.reset();

                statusEl.textContent = 'Message sent successfully.';
                statusEl.style.color = '#1a7f37';

                await loadClientMessages();

            } catch (err) {
                console.error(err);
                statusEl.textContent = err.message;
                statusEl.style.color = '#b00020';
            }
        });
    }

    async function loadClientMessages() {
        try {
            const clientId = sessionStorage.getItem('clientId');

            const res = await fetch(`${API_BASE}/api/client/messages?clientId=${clientId}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load messages');
            }

            const messages = data.messages || [];
            document.getElementById('unreadMessagesCount').textContent =
                messages.length;
            const clientMessagesList = document.getElementById('clientMessagesList');

            if (!clientMessagesList) return;

            if (!messages.length) {
                clientMessagesList.innerHTML = '<p>No messages found.</p>';
                return;
            }

            clientMessagesList.innerHTML = messages.map(msg => `
            <div class="record-item">
                <strong>${escapeHTML(msg.subject || 'No subject')}</strong><br>
                <small>
                    ${escapeHTML(msg.sender_type || '')} · 
                    ${formatDateTime(msg.created_at)}
                </small>
                <p>${escapeHTML(msg.message || '')}</p>
                <small>Agent: ${escapeHTML(msg.staff_name || 'Not assigned')}</small>
            </div>
        `).join('');

        } catch (err) {
            console.error(err);
        }
    }

    async function loadClientDocumentRequests() {
        try {
            const clientId =
                sessionStorage.getItem('clientId');

            const res = await fetch(
                `${API_BASE}/api/client/document-requests?clientId=${clientId}`
            );

            const data = await res.json();

            const requests = data.requests || [];
            document.getElementById('documentRequestsCount').textContent =
                requests.length;

            const container =
                document.getElementById(
                    'clientDocumentRequestsList'
                );

            if (!container) return;

            if (!requests.length) {
                container.innerHTML =
                    '<p>No document requests found.</p>';
                return;
            }

            container.innerHTML = requests.map(req => `
            <div class="record-item">

                <strong>
                    ${escapeHTML(req.document_title)}
                </strong>

                <br>

                <small>
                    Requested by:
                    ${escapeHTML(req.staff_name || '')}
                </small>

                <p>
                    ${escapeHTML(req.message || '')}
                </p>

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
    // INITIAL LOAD
    // ================================
    (async function initialiseDashboard() {

        await loadProfile();

        await loadServices();

        await loadRecords();

        await loadCharges();

        await loadClientServiceHistory();

        await loadClientPaymentHistory();

        await loadClientMessages();

        setupClientMessageForm();
        await loadClientDocumentRequests();

    })();
});
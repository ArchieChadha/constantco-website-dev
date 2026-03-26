document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    // ================================
    // FORMAT HELPER (GLOBAL)
    // ================================
    const formatText = (text) =>
        text
            ? text
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            : '';

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

    const clientId = sessionStorage.getItem('clientId');

    // ================================
    // HELPERS
    // ================================
    function setUploadStatus(message = '', ok = false) {
        if (!uploadStatus) return;
        uploadStatus.textContent = message;
        uploadStatus.style.color = ok ? '#1a7f37' : '#b00020';
    }

    function safeJsonParse(text, fallbackError = 'Invalid server response') {
        try {
            return JSON.parse(text);
        } catch {
            throw new Error(fallbackError);
        }
    }

    function fillProfile(client) {
        if (!client) return;

        if (nameEl) nameEl.textContent = client.name || 'Client';
        if (profileName) profileName.textContent = client.name || '—';
        if (profileEmail) profileEmail.textContent = client.email || '—';
        if (profilePhone) profilePhone.textContent = client.phone || '—';

        // ✅ FORMATTED
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
                    <h4>No Service Selected</h4>
                    <p>No services are currently linked to this client account.</p>
                </div>
            `;
            return;
        }

        servicesList.innerHTML = data.services.map(service => `
            <div class="portal-service-item">
                <h4>${formatText(service.title || 'Service')}</h4>
                <p><strong>Status:</strong> ${formatText(service.status || 'Active')}</p>
                <p><strong>Client Type:</strong> ${formatText(service.client_type || 'Not specified')}</p>
                <p><strong>Notes:</strong> ${formatText(service.note || 'No additional notes available')}</p>
            </div>
        `).join('');

        if (clientService && data.services[0]?.title) {
            clientService.textContent = formatText(data.services[0].title);
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
        if (!clientId) {
            if (nameEl) nameEl.textContent = 'Client';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/profile?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text);

            if (!res.ok) throw new Error(data.error);

            fillProfile(data.client);
        } catch (err) {
            console.error(err);

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
        if (!clientId || !servicesList) return;

        try {
            const res = await fetch(`${API_BASE}/api/services?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text);

            if (!res.ok) throw new Error(data.error);

            fillServices(data);
        } catch (err) {
            console.error(err);

            const fallback = sessionStorage.getItem('clientService') || 'Tax Filing & Compliance';

            servicesList.innerHTML = `
                <div class="portal-service-item">
                    <h4>${formatText(fallback)}</h4>
                    <p><strong>Status:</strong> Active</p>
                    <p><strong>Client Type:</strong> ${formatText(sessionStorage.getItem('clientType'))}</p>
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

        if (!clientId) {
            setUploadStatus('Session expired. Please log in again.');
            return;
        }

        const file = uploadForm.querySelector('input[type="file"]').files[0];
        if (!file) return setUploadStatus('Please select a file.');

        const btn = uploadForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Uploading...';

        const formData = new FormData(uploadForm);
        formData.append('clientId', clientId);

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setUploadStatus('Upload successful', true);
            uploadForm.reset();
            loadRecords();

        } catch (err) {
            setUploadStatus(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload';
        }
    });

    // ================================
    // LOAD RECORDS
    // ================================
    async function loadRecords() {
        if (!recordsList || !clientId) return;

        recordsList.textContent = 'Loading...';

        try {
            const res = await fetch(`${API_BASE}/api/records?clientId=${clientId}`);
            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) {
                recordsList.textContent = 'No records found yet.';
                return;
            }

            recordsList.innerHTML = data.map(record => `
                <div class="record-item">
                    <strong>${record.file_name}</strong><br>
                    <small>${new Date(record.uploaded_at).toLocaleString()}</small><br>
                    <a href="${API_BASE}/${record.file_path}" target="_blank">Open file</a>
                </div>
            `).join('');
        } catch {
            recordsList.textContent = 'Failed to load records.';
        }
    }

    // ================================
    // INITIAL LOAD
    // ================================
    loadProfile();
    loadServices();
    loadRecords();
});
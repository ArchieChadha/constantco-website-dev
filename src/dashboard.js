// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
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
        if (profileType) profileType.textContent = client.client_type || '—';

        // Keep session data updated too
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
                <h4>${service.title || 'Service'}</h4>
                <p><strong>Status:</strong> ${service.status || 'Active'}</p>
                <p><strong>Client Type:</strong> ${service.client_type || 'Not specified'}</p>
                <p><strong>Notes:</strong> ${service.note || 'No additional notes available'}</p>
            </div>
        `).join('');

        if (clientService && data.services[0]?.title) {
            clientService.textContent = data.services[0].title;
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

    // Make available to inline HTML onclick
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
    // LOAD PROFILE FROM DATABASE
    // ================================
    async function loadProfile() {
        if (!clientId) {
            if (nameEl) nameEl.textContent = 'Client';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/profile?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text, 'Invalid profile response');

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load profile');
            }

            fillProfile(data.client);
        } catch (err) {
            console.error('Profile load failed:', err);

            // fallback to anything already in sessionStorage
            const fallbackClient = {
                name: sessionStorage.getItem('clientName') || 'Client',
                email: sessionStorage.getItem('clientEmail') || '—',
                phone: sessionStorage.getItem('clientPhone') || '—',
                client_type: sessionStorage.getItem('clientType') || '—',
                service: sessionStorage.getItem('clientService') || '—'
            };
            fillProfile(fallbackClient);
        }
    }

    // ================================
    // LOAD SERVICES FROM DATABASE
    // ================================
    async function loadServices() {
        if (!clientId || !servicesList) return;

        try {
            const res = await fetch(`${API_BASE}/api/services?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text, 'Invalid services response');

            if (!res.ok) {
                throw new Error(data.error || 'Failed to load services');
            }

            fillServices(data);
        } catch (err) {
            console.error('Services load failed:', err);

            const fallbackService = sessionStorage.getItem('clientService') || 'Tax Filing & Compliance';
            servicesList.innerHTML = `
                <div class="portal-service-item">
                    <h4>${fallbackService}</h4>
                    <p><strong>Status:</strong> Active</p>
                    <p><strong>Client Type:</strong> ${sessionStorage.getItem('clientType') || 'Not specified'}</p>
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

        const fileInput = uploadForm.querySelector('input[type="file"]');
        const file = fileInput?.files?.[0];

        if (!file) {
            setUploadStatus('Please select a file.');
            return;
        }

        const btn = uploadForm.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.dataset.original = btn.textContent;
            btn.textContent = 'Uploading...';
        }

        const formData = new FormData(uploadForm);
        formData.append('clientId', clientId);

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const text = await res.text();
            const data = safeJsonParse(text, 'Server returned invalid upload response');

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadStatus(data.message || 'Upload successful', true);
            uploadForm.reset();

            // Refresh records immediately
            await loadRecords();

        } catch (err) {
            console.error('Upload failed:', err);
            setUploadStatus(err.message || 'Upload failed');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset.original || 'Upload';
            }
        }
    });

    // ================================
    // LOAD RECORDS
    // ================================
    async function loadRecords() {
        if (!recordsList) return;

        if (!clientId) {
            recordsList.textContent = 'Session expired. Please log in again.';
            return;
        }

        recordsList.textContent = 'Loading...';

        try {
            const res = await fetch(`${API_BASE}/api/records?clientId=${encodeURIComponent(clientId)}`);
            const text = await res.text();
            const data = safeJsonParse(text, 'Invalid records response');

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
                    <a href="${API_BASE}/${record.file_path}" target="_blank">Open file</a>
                </div>
            `).join('');
        } catch (err) {
            console.error('Records load failed:', err);
            recordsList.textContent = err.message || 'Failed to load records.';
        }
    }

    // ================================
    // INITIAL LOAD
    // ================================
    loadProfile();
    loadServices();
    loadRecords();

    // Show first section by default if sections are hide/show based
    const profileSection = document.getElementById('profileSection');
    if (profileSection && profileSection.classList.contains('is-hidden')) {
        showSection('profileSection');
    }
});
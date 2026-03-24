// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE =
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

    const nameEl = document.getElementById('dashName');
    const btnUpload = document.getElementById('btnUpload');
    const btnRecords = document.getElementById('btnRecords');

    const uploadSection = document.getElementById('uploadSection');
    const recordsSection = document.getElementById('recordsSection');

    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const recordsList = document.getElementById('recordsList');

    // ================================
    // USER NAME DISPLAY
    // ================================
    const storedName = sessionStorage.getItem('clientName') || localStorage.getItem('clientName');
    if (storedName && nameEl) {
        nameEl.textContent = storedName;
    }

    function setUploadStatus(message = '', ok = false) {
        if (!uploadStatus) return;
        uploadStatus.textContent = message;
        uploadStatus.style.color = ok ? '#1a7f37' : '#b00020';
    }

    // ================================
    // SECTION HANDLING
    // ================================
    function openSection(section) {
        if (!section) return;

        section.classList.remove('is-hidden');

        requestAnimationFrame(() => {
            section.classList.add('is-open');
        });

        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }

    function closeSection(section) {
        if (!section) return;

        section.classList.remove('is-open');

        section.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'max-height') {
                section.classList.add('is-hidden');
                section.removeEventListener('transitionend', onEnd);
            }
        });
    }

    btnUpload?.addEventListener('click', () => {
        openSection(uploadSection);
        if (recordsSection?.classList.contains('is-open')) {
            closeSection(recordsSection);
        }
    });

    btnRecords?.addEventListener('click', () => {
        openSection(recordsSection);
        if (uploadSection?.classList.contains('is-open')) {
            closeSection(uploadSection);
        }
        loadRecords();
    });

    // ================================
    // FILE UPLOAD
    // ================================
    uploadForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        setUploadStatus('');

        const clientId = sessionStorage.getItem('clientId');
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

            // 🔥 Fix JSON crash (important)
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Server returned invalid response');
            }

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadStatus(data.message || 'Upload successful', true);
            uploadForm.reset();

            // 🔥 Auto refresh records after upload
            loadRecords();

        } catch (err) {
            console.error(err);
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

        const clientId = sessionStorage.getItem('clientId');
        if (!clientId) {
            recordsList.textContent = 'Session expired. Please log in again.';
            return;
        }

        recordsList.textContent = 'Loading...';

        try {
            const res = await fetch(`${API_BASE}/api/records?clientId=${encodeURIComponent(clientId)}`);

            // 🔥 Fix JSON crash here too
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Invalid server response');
            }

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
            console.error(err);
            recordsList.textContent = err.message || 'Failed to load records.';
        }
    }

});
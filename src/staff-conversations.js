let selectedConversation = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffConversations();
    setupStaffChatTabs();
    setupStaffReplyForm();
    setupStaffFileUpload();
});

async function loadStaffConversations(
    keepAppointmentId = null,
    keepClientId = null
) {
    try {
        const res = await fetch(`${API_BASE}/api/staff/messages?staffId=${encodeURIComponent(staffId)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load conversations');

        renderConversationList(
            data.messages || [],
            keepAppointmentId,
            keepClientId
        );
    } catch (err) {
        console.error(err);
    }
}

function renderConversationList(
    messages,
    keepAppointmentId = null,
    keepClientId = null
) {
    const list = document.getElementById('staffChatPeopleList');
    if (!list) return;

    if (!messages.length) {
        list.innerHTML = '<p style="padding:18px;">No conversations found.</p>';
        return;
    }

    const grouped = {};

    messages.forEach(msg => {
        const key = `${msg.client_id}-${msg.service_name || msg.subject || 'general'}`;

        if (!grouped[key]) {
            grouped[key] = {
                clientId: msg.client_id,
                clientName: msg.client_name || 'Client',
                serviceName: msg.service_name || msg.subject || 'Service',
                appointmentId: msg.appointment_id,
                messages: []
            };
        }

        grouped[key].messages.push(msg);
    });

    const conversations = Object.values(grouped);

    list.innerHTML = conversations.map((item, index) => `
        <button type="button"
            class="staff-chat-person ${index === 0 ? 'active' : ''}"
            data-index="${index}">
            <div class="staff-chat-avatar">${getInitials(item.clientName)}</div>
            <div>
                <strong>${escapeHTML(item.clientName)}</strong>
                <small>${escapeHTML(item.serviceName)}</small>
            </div>
        </button>
    `).join('');

    document.querySelectorAll('.staff-chat-person').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.staff-chat-person').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            selectedConversation = conversations[Number(button.dataset.index)];
            renderSelectedConversation();

            const activeTab = document.querySelector('.chat-tab.active');

            if (activeTab?.dataset.staffChatTab === 'shared') {
                loadStaffSharedDocuments();
            }
        });
    });

    let selectedIndex = 0;

    if (keepAppointmentId || keepClientId) {

        const foundIndex =
            conversations.findIndex(item => {

                return (
                    String(item.appointmentId) ===
                    String(keepAppointmentId)

                    &&

                    String(item.clientId) ===
                    String(keepClientId)
                );
            });

        if (foundIndex !== -1) {
            selectedIndex = foundIndex;
        }
    }

    selectedConversation =
        conversations[selectedIndex];

    renderSelectedConversation();

    setTimeout(() => {

        document
            .querySelectorAll('.staff-chat-person')
            .forEach(btn => btn.classList.remove('active'));

        const activeButton =
            document.querySelector(
                `.staff-chat-person[data-index="${selectedIndex}"]`
            );

        activeButton?.classList.add('active');

    }, 0);
}

function renderSelectedConversation() {
    if (!selectedConversation) return;

    document.getElementById('chatClientName').textContent = selectedConversation.clientName;
    document.getElementById('chatServiceName').textContent = selectedConversation.serviceName;

    loadConversationMessages();
}

function loadConversationMessages() {
    const list = document.getElementById('staffMessagesList');
    if (!list || !selectedConversation) return;

    const messages = [...selectedConversation.messages].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    if (!messages.length) {
        list.innerHTML = '<p>No messages found.</p>';
        return;
    }

    list.innerHTML = messages.map(msg => {
        const isStaff = String(msg.sender_type || '').toLowerCase() === 'staff';

        return `
            <div class="staff-chat-bubble ${isStaff ? 'staff-chat-bubble-staff' : 'staff-chat-bubble-client'}">
                <small>
                    ${isStaff ? 'You' : escapeHTML(msg.client_name || selectedConversation.clientName)}
                    · ${formatDateTime(msg.created_at)}
                </small>
                ${renderStaffMessageContent(msg.message)}
            </div>
        `;
    }).join('');

    list.scrollTop = list.scrollHeight;
}

function renderStaffMessageContent(message) {
    try {
        const data = JSON.parse(message);

        if (data.type === 'file') {
            return `
                <div class="staff-chat-file">
                    <strong>📎 ${escapeHTML(data.fileName || 'Document')}</strong>
                    <a href="${API_BASE}/${data.filePath}" target="_blank" rel="noopener noreferrer">
                        Open document
                    </a>
                </div>
            `;
        }
    } catch {
        // Normal text message
    }

    return `<p>${escapeHTML(message || '')}</p>`;
}

function setupStaffReplyForm() {
    const form = document.getElementById('staffReplyForm');
    const textarea = document.getElementById('replyMessage');

    if (!form || !textarea) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!selectedConversation) return;

        const message = textarea.value.trim();
        if (!message) return;

        try {
            const res = await fetch(`${API_BASE}/api/staff/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    staffId,
                    clientId: selectedConversation.clientId,
                    appointmentId: selectedConversation.appointmentId,
                    subject: selectedConversation.serviceName,
                    message
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to send message');
            textarea.value = '';

            const currentAppointmentId =
                selectedConversation.appointmentId;

            const currentClientId =
                selectedConversation.clientId;

            await loadStaffConversations(
                currentAppointmentId,
                currentClientId
            );

        } catch (err) {
            console.error(err);
        }
    });
}

function setupStaffFileUpload() {

    const openBtn = document.getElementById('openStaffDocumentPanel');

    const uploadPanel = document.getElementById('staffUploadPanel');

    const closeBtn = document.getElementById('closeStaffUploadPanel');

    const chooseBtn = document.getElementById('chooseStaffFilesBtn');

    const uploadBtn = document.getElementById('uploadStaffFilesBtn');

    const fileInput = document.getElementById('staffChatFiles');

    const selectedText = document.getElementById('selectedStaffFilesText');

    const statusText = document.getElementById('staffUploadStatus');

    if (!openBtn || !uploadPanel || !fileInput) return;

    let selectedFiles = [];

    // OPEN POPUP
    openBtn.addEventListener('click', () => {

        if (!selectedConversation) {
            alert('Please select a conversation first.');
            return;
        }

        uploadPanel.classList.remove('is-hidden');

    });

    // CLOSE POPUP
    closeBtn?.addEventListener('click', () => {

        uploadPanel.classList.add('is-hidden');

        fileInput.value = '';

        selectedFiles = [];

        if (selectedText) {
            selectedText.textContent = 'No files selected.';
        }

        if (statusText) {
            statusText.textContent = '';
        }

    });

    // OPEN FILE EXPLORER
    chooseBtn?.addEventListener('click', () => {

        fileInput.click();

    });

    // FILE SELECTED
    fileInput.addEventListener('change', () => {

        selectedFiles = Array.from(fileInput.files || []);

        if (!selectedFiles.length) {

            selectedText.textContent = 'No files selected.';
            return;

        }

        selectedText.textContent = selectedFiles
            .map(file => file.name)
            .join(', ');

    });

    // ACTUAL UPLOAD BUTTON
    uploadBtn?.addEventListener('click', async () => {

        if (!selectedFiles.length) {

            statusText.textContent = 'Please select files first.';
            return;

        }

        try {

            uploadBtn.disabled = true;

            statusText.textContent = 'Uploading documents...';

            const formData = new FormData();

            formData.append('staffId', staffId);

            formData.append(
                'clientId',
                selectedConversation.clientId
            );

            formData.append(
                'appointmentId',
                selectedConversation.appointmentId || ''
            );

            formData.append(
                'serviceName',
                selectedConversation.serviceName || ''
            );

            selectedFiles.forEach(file => {

                formData.append('files', file);

            });

            const res = await fetch(
                `${API_BASE}/api/staff/chat-documents`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            statusText.textContent = 'Upload successful';

            // CLOSE POPUP
            setTimeout(() => {

                uploadPanel.classList.add('is-hidden');

            }, 700);

            // RESET
            fileInput.value = '';

            selectedFiles = [];

            selectedText.textContent = 'No files selected.';

            // REFRESH CHAT + SHARED
            await loadStaffConversations(
                selectedConversation.appointmentId,
                selectedConversation.clientId
            );

            await loadStaffSharedDocuments();

        } catch (err) {

            console.error(err);

            statusText.textContent =
                err.message || 'Upload failed';

        } finally {

            uploadBtn.disabled = false;

        }

    });

}

async function loadStaffSharedDocuments() {

    try {

        if (!selectedConversation) return;

        const container =
            document.getElementById(
                'staffSharedDocumentsList'
            );

        if (!container) return;

        container.innerHTML =
            '<p>Loading documents...</p>';

        const clientId =
            selectedConversation.clientId;

        const appointmentId =
            selectedConversation.appointmentId || '';

        const res = await fetch(
            `${API_BASE}/api/client/shared-documents?clientId=${clientId}&appointmentId=${appointmentId}`
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.error ||
                'Failed to load documents'
            );
        }

        const documents =
            data.documents || [];

        if (!documents.length) {

            container.innerHTML = `
                <p>
                    No shared documents yet.
                </p>
            `;

            return;
        }

        container.innerHTML = documents.map(doc => {

            const uploadedDate =
                new Date(doc.uploaded_at)
                    .toLocaleString('en-AU');

            return `
                <div class="shared-document-card">

                    <div class="shared-document-top">

                        <div>

                            <strong>

                                ${doc.file_name || 'Document'}

                            </strong>

                            <p>

                                Uploaded:
                                ${uploadedDate}

                            </p>

                        </div>

                    </div>

                    <a
                        href="${API_BASE}/${doc.file_path}"
                        target="_blank"
                        class="btn btn-ghost"
                    >
                        View Document
                    </a>

                </div>
            `;

        }).join('');

    } catch (err) {

        console.error(err);

        const container =
            document.getElementById(
                'staffSharedDocumentsList'
            );

        if (container) {

            container.innerHTML = `
                <p>
                    Failed to load documents.
                </p>
            `;
        }
    }
}

function setupStaffChatTabs() {
    const tabs = document.querySelectorAll('.chat-tab');
    const chatPanel = document.getElementById('staffChatTabPanel');
    const sharedPanel = document.getElementById('staffSharedTabPanel');
    const composer = document.getElementById('staffReplyForm');

    if (!tabs.length || !chatPanel || !sharedPanel) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.staffChatTab === 'chat') {
                chatPanel.classList.remove('is-hidden');
                sharedPanel.classList.add('is-hidden');
                composer?.classList.remove('is-hidden');
            }

            if (tab.dataset.staffChatTab === 'shared') {
                chatPanel.classList.add('is-hidden');
                sharedPanel.classList.remove('is-hidden');
                composer?.classList.add('is-hidden');
                loadStaffSharedDocuments();
            }
        });
    });
}

function getInitials(name) {
    return String(name || 'C')
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();
}
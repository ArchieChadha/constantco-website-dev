const API_BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '';

const adminId = sessionStorage.getItem('internalUserId');
const adminRole = sessionStorage.getItem('internalUserRole');

if (!adminId || adminRole !== 'admin') {
    window.location.href = 'super-admin-portal.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupAdminSidebar();
    setupAdminLogout();
    loadAdminSidebarProfile();
});

function setupAdminSidebar() {
    const btn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.client-sidebar');
    const content = document.querySelector('.client-portal-content');

    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-hidden');
        content?.classList.toggle('content-expanded');
    });
}

function setupAdminLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();

        sessionStorage.removeItem('internalUserId');
        sessionStorage.removeItem('internalUserName');
        sessionStorage.removeItem('internalUserEmail');
        sessionStorage.removeItem('internalUserRole');

        window.location.href = 'admin-portal.html';
    });
}

function loadAdminSidebarProfile() {
    const name = sessionStorage.getItem('internalUserName') || 'Admin';
    const email = sessionStorage.getItem('internalUserEmail') || 'Logged in';

    const nameEl = document.getElementById('adminNameSidebar');
    const emailEl = document.getElementById('adminEmailSidebar');

    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
}

function escapeHTML(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-AU');
}

function formatDateTime(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-AU');
}

function formatMoney(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}
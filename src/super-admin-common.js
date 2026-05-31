const API_BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '';

const adminId = sessionStorage.getItem('internalUserId');
const adminRole = sessionStorage.getItem('internalUserRole');

if (!adminId || adminRole !== 'admin') {
    window.location.href = 'admin-portal.html';
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

    if (!btn || !sidebar || !content) return;

    let backdrop = document.querySelector('.portal-sidebar-backdrop');

    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'portal-sidebar-backdrop';
        document.body.appendChild(backdrop);
    }

    function isTabletOrMobile() {
        return window.innerWidth <= 900;
    }

    function closeSidebar() {
        sidebar.classList.add('sidebar-hidden');
        content.classList.add('content-expanded');
        document.body.classList.remove('sidebar-open');
    }

    function openSidebar() {
        sidebar.classList.remove('sidebar-hidden');
        content.classList.add('content-expanded');
        document.body.classList.add('sidebar-open');
    }

    function resetSidebarForScreenSize() {
        if (isTabletOrMobile()) {
            closeSidebar();
        } else {
            sidebar.classList.remove('sidebar-hidden');
            content.classList.remove('content-expanded');
            document.body.classList.remove('sidebar-open');
        }
    }

    btn.addEventListener('click', () => {
        if (sidebar.classList.contains('sidebar-hidden')) {
            openSidebar();
        } else {
            closeSidebar();
        }
    });

    backdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', resetSidebarForScreenSize);

    resetSidebarForScreenSize();
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
const API_BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '';

const staffId = sessionStorage.getItem('internalUserId');
const role = sessionStorage.getItem('internalUserRole');

if (!staffId || role !== 'staff') {
    window.location.href = 'admin-portal.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupLogout();
    setupSidebarToggle();
    loadStaffProfile();
});

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();

        sessionStorage.removeItem('internalUserId');
        sessionStorage.removeItem('internalUserName');
        sessionStorage.removeItem('internalUserEmail');
        sessionStorage.removeItem('internalUserRole');

        window.location.href = 'admin-portal.html';
    });
}

function setupSidebarToggle() {
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

async function loadStaffProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/staff/me?id=${encodeURIComponent(staffId)}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load staff profile');
        }

        const name = data.full_name || data.name || 'Staff';
        const email = data.email || '';

        const sidebarName = document.getElementById('staffNameSidebar');
        const sidebarEmail = document.getElementById('staffEmailSidebar');
        const pageName = document.getElementById('staffName');
        const pageEmail = document.getElementById('staffEmail');

        if (sidebarName) sidebarName.textContent = name;
        if (sidebarEmail) sidebarEmail.textContent = email;
        if (pageName) pageName.textContent = `Welcome, ${name}`;
        if (pageEmail) pageEmail.textContent = email;

    } catch (err) {
        console.error('Staff profile error:', err);
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
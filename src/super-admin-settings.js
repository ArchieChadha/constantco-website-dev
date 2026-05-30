document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();

    const form = document.getElementById('adminSettingsForm');

    if (form) {
        form.addEventListener('submit', updateAdminProfile);
    }
});

function getApiBase() {
    return typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:3001';
}

/*-----Find Logged-In Admin From Storage-----*/
function getLoggedInAdmin() {
    const possibleKeys = [
        'admin',
        'adminUser',
        'loggedInAdmin',
        'internalUser',
        'user'
    ];

    for (const key of possibleKeys) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);

        if (!value) {
            continue;
        }

        try {
            const parsed = JSON.parse(value);

            if (parsed && parsed.id) {
                return parsed;
            }
        } catch {
            // Ignore invalid JSON
        }
    }

    const adminId =
        localStorage.getItem('adminId') ||
        sessionStorage.getItem('adminId');

    if (adminId) {
        return { id: adminId };
    }

    return null;
}

/*-----Load Admin Profile-----*/
async function loadAdminProfile() {
    const message = document.getElementById('settingsMessage');
    const admin = getLoggedInAdmin();

    if (!admin || !admin.id) {
        if (message) {
            message.textContent = '';
        }
        return;
    }

    try {
        const res = await fetch(`${getApiBase()}/api/admin/profile/${admin.id}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load admin profile');
        }

        const profile = data.admin;

        document.getElementById('adminId').value = profile.id;
        document.getElementById('adminFullName').value = profile.full_name || '';
        document.getElementById('adminEmail').value = profile.email || '';
        document.getElementById('adminRole').value = profile.role || 'admin';
        document.getElementById('adminVerified').value = profile.verified ? 'Yes' : 'No';

        if (message) {
            message.textContent = '';
        }

    } catch (err) {
        console.error('Admin profile load error:', err);

        if (message) {
            message.textContent = err.message || 'Failed to load admin profile.';
        }
    }
}

/*-----Update Admin Profile-----*/
async function updateAdminProfile(event) {
    event.preventDefault();

    const message = document.getElementById('settingsMessage');

    const adminId = document.getElementById('adminId').value;
    const fullName = document.getElementById('adminFullName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!adminId || !fullName || !email) {
        message.textContent = 'Full name and email are required.';
        return;
    }

    if (newPassword && !currentPassword) {
        message.textContent = 'Please enter your current password to change password.';
        return;
    }

    try {
        const res = await fetch(`${getApiBase()}/api/admin/profile/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to update admin profile');
        }

        message.textContent = 'Admin profile updated successfully.';

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';

        updateStoredAdmin(data.admin);

        await loadAdminProfile();

    } catch (err) {
        console.error('Admin profile update error:', err);
        message.textContent = err.message || 'Failed to update admin profile.';
    }
}

/*-----Update Browser Storage After Save-----*/
function updateStoredAdmin(admin) {
    const possibleKeys = [
        'admin',
        'adminUser',
        'loggedInAdmin',
        'internalUser',
        'user'
    ];

    for (const key of possibleKeys) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);

        if (!value) {
            continue;
        }

        try {
            const parsed = JSON.parse(value);

            if (parsed && String(parsed.id) === String(admin.id)) {
                const updated = {
                    ...parsed,
                    full_name: admin.full_name,
                    name: admin.full_name,
                    email: admin.email,
                    role: admin.role,
                    verified: admin.verified
                };

                if (localStorage.getItem(key)) {
                    localStorage.setItem(key, JSON.stringify(updated));
                }

                if (sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, JSON.stringify(updated));
                }
            }
        } catch {
            // Ignore invalid JSON
        }
    }

    const sidebarName = document.getElementById('adminNameSidebar');
    const sidebarEmail = document.getElementById('adminEmailSidebar');

    if (sidebarName) {
        sidebarName.textContent = admin.full_name || 'Admin';
    }

    if (sidebarEmail) {
        sidebarEmail.textContent = admin.email || 'Logged in';
    }
}
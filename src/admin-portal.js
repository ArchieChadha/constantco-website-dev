const API_BASE =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3001'
        : '';

const STORAGE_KEYS = {
    clients: "cc_admin_clients",
    invoices: "cc_admin_invoices",
    admins: "cc_admin_admins"
};

function loadJsonArray(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

let clients = loadJsonArray(STORAGE_KEYS.clients);
let invoices = loadJsonArray(STORAGE_KEYS.invoices);
let appointments = [];
let admins = loadJsonArray(STORAGE_KEYS.admins);

let currentUser = null;
let editState = {
    client: null,
    invoice: null,
    appointment: null,
    admin: null
};

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

function saveAll() {
    localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
    localStorage.setItem(STORAGE_KEYS.admins, JSON.stringify(admins));
}

function formatMoney(value) {
    return "$" + Number(value || 0).toFixed(2);
}

function uid(prefix) {
    return prefix + "_" + Date.now();
}

function getStatusBadge(status) {
    const key = String(status).toLowerCase();
    if (["active", "paid", "confirmed", "verified", "completed"].includes(key)) return "badge badge-active";
    if (["pending", "scheduled"].includes(key)) return "badge badge-pending";
    if (["inactive", "cancelled", "overdue", "unverified"].includes(key)) return "badge badge-overdue";
    return "badge";
}

function setRecentActivity(text) {
    const activityText = document.getElementById("activityText");
    if (activityText) {
        activityText.textContent = text;
    }
}

function updateStats() {
    const statClients = document.getElementById("statClients");
    const statInvoices = document.getElementById("statInvoices");
    const statAppointments = document.getElementById("statAppointments");
    const statAdmins = document.getElementById("statAdmins");

    const totalAdmins = document.getElementById("totalAdmins");
    const verifiedAdmins = document.getElementById("verifiedAdmins");
    const pendingAdmins = document.getElementById("pendingAdmins");
    const superAdmins = document.getElementById("superAdmins");

    if (statClients) statClients.textContent = clients.length;
    if (statInvoices) statInvoices.textContent = invoices.filter(i => i.status !== "Paid").length;
    if (statAppointments) statAppointments.textContent = appointments.length;
    if (statAdmins) statAdmins.textContent = admins.length;

    if (totalAdmins) totalAdmins.textContent = admins.length;
    if (verifiedAdmins) verifiedAdmins.textContent = admins.filter(a => a.verified).length;
    if (pendingAdmins) pendingAdmins.textContent = admins.filter(a => !a.verified).length;
    if (superAdmins) superAdmins.textContent = admins.filter(a => a.role === "Super Admin").length;
}

function renderClients() {
    const tbody = document.getElementById("clientsTable");
    const searchInput = document.getElementById("searchClients");
    if (!tbody || !searchInput) return;

    const term = searchInput.value.trim().toLowerCase();

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.company || "").toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No clients found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(client => `
        <tr>
            <td>${client.name}</td>
            <td>${client.email}</td>
            <td>${client.phone || "N/A"}</td>
            <td>${client.company || "N/A"}</td>
            <td><span class="${getStatusBadge(client.status)}">${client.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="editClient('${client.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteClient('${client.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderInvoices() {
    const tbody = document.getElementById("invoicesTable");
    const searchInput = document.getElementById("searchInvoices");
    if (!tbody || !searchInput) return;

    const term = searchInput.value.trim().toLowerCase();

    const filtered = invoices.filter(invoice =>
        invoice.number.toLowerCase().includes(term) ||
        invoice.client.toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No invoices found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(invoice => `
        <tr>
            <td>${invoice.number}</td>
            <td>${invoice.client}</td>
            <td>${formatMoney(invoice.amount)}</td>
            <td>${invoice.dueDate || "N/A"}</td>
            <td><span class="${getStatusBadge(invoice.status)}">${invoice.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="editInvoice('${invoice.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderAppointments() {
    const tbody = document.getElementById("appointmentsTable");
    const searchInput = document.getElementById("searchAppointments");
    if (!tbody || !searchInput) return;

    const term = searchInput.value.trim().toLowerCase();

    const filtered = appointments.filter(item =>
        (item.client || '').toLowerCase().includes(term) ||
        (item.type || '').toLowerCase().includes(term) ||
        (item.email || '').toLowerCase().includes(term)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No appointments found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.client}</td>
            <td>${item.date || "N/A"}</td>
            <td>${item.time || "N/A"}</td>
            <td>${item.type}</td>
            <td><span class="${getStatusBadge(item.status)}">${item.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="editAppointment('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${item.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderAdmins() {
    const tbody = document.getElementById("adminsTable");
    if (!tbody) return;

    if (!admins.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No admin users found.</td></tr>';
        return;
    }

    tbody.innerHTML = admins.map(admin => `
        <tr>
            <td>${admin.name}</td>
            <td>${admin.email}</td>
            <td>${admin.role}</td>
            <td>${admin.joinDate || "N/A"}</td>
            <td><span class="${getStatusBadge(admin.verified ? "Verified" : "Unverified")}">${admin.verified ? "Verified" : "Pending"}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="toggleVerifyAdmin('${admin.id}')">
                        ${admin.verified ? "Unverify" : "Verify"}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAdmin('${admin.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderAll() {
    updateStats();
    renderClients();
    renderInvoices();
    renderAppointments();
    renderAdmins();
    saveAll();
}

async function loadAppointmentsFromBackend() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/appointments`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch appointments');
        }

        appointments = (data.appointments || []).map(item => ({
            id: String(item.id),
            client: item.full_name,
            email: item.email,
            phone: item.phone,
            company: item.company || "N/A",
            date: item.appointment_date,
            time: item.appointment_time,
            type: `${item.meeting_type} - ${item.service_name}`,
            status: item.booking_status,
            duration: "60",
            notes: item.notes || "N/A",
            cost: item.booking_fee ? `$${(Number(item.booking_fee) / 100).toFixed(2)}` : "$0.00"
        }));

        renderAppointments();
        updateStats();
    } catch (err) {
        console.error('Load appointments error:', err);
    }
}

function showPage(pageName) {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === pageName);
    });

    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    const target = document.getElementById(`page-${pageName}`);
    if (target) target.classList.add("active");

    if (pageName === "appointments") {
        loadAppointmentsFromBackend();
    }
}

function applyAdminSession(matched) {
    loginError.classList.add("hidden");
    currentUser = matched;

    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const userAvatar = document.getElementById("userAvatar");

    if (userName) userName.textContent = matched.name;
    if (userRole) userRole.textContent = matched.role;
    if (userAvatar) userAvatar.textContent = matched.name.charAt(0).toUpperCase();

    loginScreen.classList.add("hidden");
    adminApp.classList.add("active");

    renderAll();
    loadAppointmentsFromBackend();
    showPage("appointments");
    setRecentActivity(`Welcome back, ${matched.name}.`);
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll("[data-open-page]").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.openPage));
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    loginError.classList.add("hidden");
    loginError.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        applyAdminSession({
            id: String(data.admin.id),
            name: data.admin.name,
            email: data.admin.email,
            role: data.admin.role,
            verified: data.admin.verified
        });
    } catch (err) {
        loginError.textContent = err.message || "Invalid email or password.";
        loginError.classList.remove("hidden");
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = null;
    adminApp.classList.remove("active");
    loginScreen.classList.remove("hidden");
    document.getElementById("loginForm").reset();
});

document.getElementById("searchClients").addEventListener("input", renderClients);
document.getElementById("searchInvoices").addEventListener("input", renderInvoices);
document.getElementById("searchAppointments").addEventListener("input", renderAppointments);

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
});

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.remove("active");
        }
    });
});

document.getElementById("addClientBtn").addEventListener("click", () => {
    editState.client = null;
    document.getElementById("clientModalTitle").textContent = "Add New Client";
    document.getElementById("clientForm").reset();
    openModal("clientModal");
});

document.getElementById("clientForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const client = {
        id: editState.client || uid("client"),
        name: document.getElementById("clientName").value.trim(),
        email: document.getElementById("clientEmail").value.trim(),
        phone: document.getElementById("clientPhone").value.trim(),
        company: document.getElementById("clientCompany").value.trim(),
        status: document.getElementById("clientStatus").value,
        joinDate: document.getElementById("clientJoinDate").value,
        address: document.getElementById("clientAddress").value.trim()
    };

    if (editState.client) {
        clients = clients.map(c => c.id === editState.client ? client : c);
        setRecentActivity(`Client updated: ${client.name}`);
    } else {
        clients.push(client);
        setRecentActivity(`Client added: ${client.name}`);
    }

    renderAll();
    closeModal("clientModal");
});

window.editClient = function (id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    editState.client = id;
    document.getElementById("clientModalTitle").textContent = "Edit Client";
    document.getElementById("clientName").value = client.name;
    document.getElementById("clientEmail").value = client.email;
    document.getElementById("clientPhone").value = client.phone || "";
    document.getElementById("clientCompany").value = client.company || "";
    document.getElementById("clientStatus").value = client.status;
    document.getElementById("clientJoinDate").value = client.joinDate || "";
    document.getElementById("clientAddress").value = client.address || "";
    openModal("clientModal");
};

window.deleteClient = function (id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    if (!confirm(`Delete client "${client.name}"?`)) return;

    clients = clients.filter(c => c.id !== id);
    renderAll();
    setRecentActivity(`Client deleted: ${client.name}`);
};

document.getElementById("addInvoiceBtn").addEventListener("click", () => {
    editState.invoice = null;
    document.getElementById("invoiceModalTitle").textContent = "Create Invoice";
    document.getElementById("invoiceForm").reset();
    openModal("invoiceModal");
});

document.getElementById("invoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const invoice = {
        id: editState.invoice || uid("invoice"),
        number: document.getElementById("invoiceNumber").value.trim(),
        client: document.getElementById("invoiceClient").value.trim(),
        amount: document.getElementById("invoiceAmount").value.trim(),
        dueDate: document.getElementById("invoiceDueDate").value,
        status: document.getElementById("invoiceStatus").value,
        issueDate: document.getElementById("invoiceIssueDate").value,
        description: document.getElementById("invoiceDescription").value.trim()
    };

    if (editState.invoice) {
        invoices = invoices.map(i => i.id === editState.invoice ? invoice : i);
        setRecentActivity(`Invoice updated: ${invoice.number}`);
    } else {
        invoices.push(invoice);
        setRecentActivity(`Invoice created: ${invoice.number}`);
    }

    renderAll();
    closeModal("invoiceModal");
});

window.editInvoice = function (id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    editState.invoice = id;
    document.getElementById("invoiceModalTitle").textContent = "Edit Invoice";
    document.getElementById("invoiceNumber").value = invoice.number;
    document.getElementById("invoiceClient").value = invoice.client;
    document.getElementById("invoiceAmount").value = invoice.amount;
    document.getElementById("invoiceDueDate").value = invoice.dueDate || "";
    document.getElementById("invoiceStatus").value = invoice.status;
    document.getElementById("invoiceIssueDate").value = invoice.issueDate || "";
    document.getElementById("invoiceDescription").value = invoice.description || "";
    openModal("invoiceModal");
};

window.deleteInvoice = function (id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    if (!confirm(`Delete invoice "${invoice.number}"?`)) return;

    invoices = invoices.filter(i => i.id !== id);
    renderAll();
    setRecentActivity(`Invoice deleted: ${invoice.number}`);
};

document.getElementById("addAppointmentBtn").addEventListener("click", () => {
    editState.appointment = null;
    document.getElementById("appointmentModalTitle").textContent = "Appointment Details";
    document.getElementById("portalAppointmentForm").reset();

    document.getElementById("appointmentClient").readOnly = true;
    document.getElementById("appointmentDate").readOnly = true;
    document.getElementById("appointmentTime").readOnly = true;
    document.getElementById("appointmentType").readOnly = true;
    document.getElementById("appointmentDuration").readOnly = true;

    alert("New appointments should be created from the client booking page.");
});

document.getElementById("portalAppointmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!editState.appointment) {
        alert("New appointments should be created from the client booking page.");
        return;
    }

    try {
        const typeValue = document.getElementById("appointmentType").value;
        const typeParts = String(typeValue).split(" - ");
        const meetingType = typeParts[0] || "Consultation";
        const serviceName = typeParts[1] || typeValue;

        const res = await fetch(`${API_BASE}/api/admin/appointments/${editState.appointment}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: document.getElementById("appointmentClient").value.trim(),
                appointmentDate: document.getElementById("appointmentDate").value,
                appointmentTime: document.getElementById("appointmentTime").value,
                serviceName,
                meetingType,
                bookingStatus: document.getElementById("appointmentStatus").value,
                notes: document.getElementById("appointmentNotes").value.trim()
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to update appointment');
        }

        await loadAppointmentsFromBackend();
        closeModal("appointmentModal");
        setRecentActivity(`Appointment updated for ${document.getElementById("appointmentClient").value.trim()}`);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Something went wrong.');
    }
});

window.editAppointment = function (id) {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;

    editState.appointment = id;
    document.getElementById("appointmentModalTitle").textContent = "Edit Appointment";

    document.getElementById("appointmentClient").value = appointment.client;
    document.getElementById("appointmentDate").value = appointment.date || "";
    document.getElementById("appointmentTime").value = appointment.time || "";
    document.getElementById("appointmentType").value = appointment.type || "";
    document.getElementById("appointmentStatus").value = appointment.status || "Scheduled";
    document.getElementById("appointmentDuration").value = appointment.duration || "60";
    document.getElementById("appointmentNotes").value = appointment.notes || "";

    document.getElementById("appointmentClient").readOnly = false;
    document.getElementById("appointmentDate").readOnly = false;
    document.getElementById("appointmentTime").readOnly = false;
    document.getElementById("appointmentType").readOnly = false;
    document.getElementById("appointmentDuration").readOnly = true;

    openModal("appointmentModal");
};

window.deleteAppointment = async function (id) {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;
    if (!confirm(`Delete appointment for "${appointment.client}"?`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/appointments/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to delete appointment');
        }

        await loadAppointmentsFromBackend();
        setRecentActivity(`Appointment deleted for ${appointment.client}`);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Something went wrong.');
    }
};

document.getElementById("addAdminBtn").addEventListener("click", () => {
    editState.admin = null;
    document.getElementById("adminModalTitle").textContent = "Add New Admin";
    document.getElementById("adminForm").reset();
    openModal("adminModal");
});

document.getElementById("adminForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const admin = {
        id: editState.admin || uid("admin"),
        name: document.getElementById("adminName").value.trim(),
        email: document.getElementById("adminEmail").value.trim(),
        password: document.getElementById("adminPassword").value.trim(),
        role: document.getElementById("adminRoleSelect").value,
        verified: true,
        joinDate: document.getElementById("adminJoinDate").value || new Date().toISOString().split("T")[0]
    };

    if (editState.admin) {
        admins = admins.map(a => a.id === editState.admin ? admin : a);
        setRecentActivity(`Admin updated: ${admin.name}`);
    } else {
        admins.push(admin);
        setRecentActivity(`Admin created: ${admin.name}`);
    }

    renderAll();
    closeModal("adminModal");
});

window.toggleVerifyAdmin = function (id) {
    admins = admins.map(admin => {
        if (admin.id === id) {
            return { ...admin, verified: !admin.verified };
        }
        return admin;
    });

    renderAll();
    setRecentActivity("Admin verification status updated.");
};

window.deleteAdmin = function (id) {
    const admin = admins.find(a => a.id === id);
    if (!admin) return;

    if (currentUser && currentUser.id === id) {
        alert("You cannot delete your own logged-in account.");
        return;
    }

    if (!confirm(`Delete admin "${admin.name}"?`)) return;

    admins = admins.filter(a => a.id !== id);
    renderAll();
    setRecentActivity(`Admin deleted: ${admin.name}`);
};

renderAll();
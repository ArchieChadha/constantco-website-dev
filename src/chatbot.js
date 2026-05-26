const CHATBOT_API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:3001"
        : "";

const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotForm = document.getElementById("chatbotForm");
const chatbotMessages = document.getElementById("chatbotMessages");

let currentStep = "main";

const bookingData = {
    service: "",
    providerId: "",
    providerName: "",
    date: "",
    time: "",
    fullName: "",
    email: "",
    phone: ""
};

const contactData = {
    name: "",
    email: "",
    message: ""
};

chatbotToggle.addEventListener("click", () => {
    chatbotPanel.classList.toggle("hidden");

    if (!chatbotMessages.dataset.started) {
        chatbotMessages.dataset.started = "true";
        showWelcome();
    }
});

chatbotClose.addEventListener("click", () => {
    chatbotPanel.classList.add("hidden");
});

chatbotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = chatbotInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    chatbotInput.value = "";

    await handleTypedInput(text);
});

function showWelcome() {
    hideInput();
    addMessage("Hi, welcome to Constant & Co. How can we help?", "bot");
    showMainOptions();
}

function showMainOptions() {
    currentStep = "main";
    hideInput();
    removeOptions();

    showOptions([
        { label: "Ask about services", action: "askServices" },
        { label: "Payment or billing help", action: "billingHelp" },
        { label: "Existing booking help", action: "existingBooking" },
        { label: "Send us a message", action: "sendMessage" }
    ]);
}

async function handleOption(action, value = null) {
    removeOptions();
    hideInput();

    if (action === "mainMenu") {
        addMessage("Back to main menu.", "bot");
        showMainOptions();
        return;
    }

    if (action === "bookAppointment") {
        await startBooking();
        return;
    }

    if (action === "askServices") {
        showServiceInfoOptions();
        return;
    }

    if (action === "billingHelp") {
        currentStep = "billingEmail";
        addMessage("Please enter your account email address so I can check billing information.", "bot");
        showInput("Enter your email address");
        return;
    }

    if (action === "existingBooking") {
        currentStep = "bookingToken";
        addMessage("Please paste your booking management token from your confirmation email.", "bot");
        showInput("Enter booking token");
        return;
    }

    if (action === "sendMessage") {
        currentStep = "contactName";
        addMessage("Sure. Please enter your full name.", "bot");
        showInput("Enter your full name");
        return;
    }

    if (action === "chooseService") {
        bookingData.service = value;
        addMessage(`Selected service: ${value}`, "user");
        await loadProviders(value);
        return;
    }

    if (action === "serviceInfo") {
        showServiceDetails(value);
        return;
    }

    if (action === "bookThisService") {
        bookingData.service = value;
        addMessage(`Selected service: ${value}`, "user");
        await loadProviders(value);
        return;
    }

    if (action === "chooseProvider") {
        bookingData.providerId = value.id;
        bookingData.providerName = value.name;

        addMessage(`Selected provider: ${value.name}`, "user");

        currentStep = "bookingDate";
        addMessage("Please enter your preferred appointment date in YYYY-MM-DD format. Example: 2026-05-28", "bot");
        showInput("YYYY-MM-DD");
        return;
    }

    if (action === "chooseSlot") {
        bookingData.time = value.time;
        bookingData.providerId = value.providerId || bookingData.providerId;

        if (value.providerName) {
            bookingData.providerName = value.providerName;
        }

        addMessage(`Selected time: ${value.time}`, "user");

        currentStep = "bookingName";
        addMessage("Please enter your full name.", "bot");
        showInput("Full name");
        return;
    }

    if (action === "confirmBooking") {
        await createBooking();
        return;
    }

    if (action === "mainMenu") {
        showMainOptions();
        return;
    }
}

async function startBooking() {
    try {
        addMessage("Please choose a service.", "bot");

        const res = await fetch(`${CHATBOT_API_BASE}/api/booking-services`);
        const data = await res.json();

        if (!data.services || !data.services.length) {
            addMessage("No services found right now.", "bot");
            showMainOptions();
            return;
        }

        showOptions(
            data.services.map(service => ({
                label: service,
                action: "chooseService",
                value: service
            }))
        );

    } catch (err) {
        console.error(err);
        addMessage("Could not load services.", "bot");
    }
}

async function loadProviders(service) {
    try {
        addMessage("Choose a provider.", "bot");

        const res = await fetch(
            `${API_BASE}/api/booking-providers?service=${encodeURIComponent(service)}`
        );

        const data = await res.json();

        if (!data.providers || !data.providers.length) {
            addMessage("No providers found for this service.", "bot");
            showMainOptions();
            return;
        }

        showOptions(
            data.providers.map(provider => ({
                label: provider.next_available_date
                    ? `${provider.full_name} — next ${provider.next_available_date} ${String(provider.next_available_time).slice(0, 5)}`
                    : provider.full_name,
                action: "chooseProvider",
                value: {
                    id: provider.id,
                    name: provider.full_name
                }
            }))
        );

    } catch (err) {
        console.error(err);
        addMessage("Could not load providers.", "bot");
    }
}

async function loadSlots() {
    try {
        addMessage("Checking available time slots...", "bot");

        const res = await fetch(
            `${API_BASE}/api/booking-slots?service=${encodeURIComponent(bookingData.service)}&providerId=${bookingData.providerId}&date=${bookingData.date}`
        );

        const data = await res.json();

        if (!data.slots || !data.slots.length) {
            addMessage("No available slots found for this date. Please enter another date.", "bot");
            currentStep = "bookingDate";
            showInput("Enter another date");
            return;
        }

        addMessage("Please choose a time slot.", "bot");

        showOptions(
            data.slots.map(slot => ({
                label: slot.provider_name
                    ? `${slot.time} with ${slot.provider_name}`
                    : slot.time,
                action: "chooseSlot",
                value: {
                    time: slot.time,
                    providerId: slot.provider_id,
                    providerName: slot.provider_name
                }
            }))
        );

    } catch (err) {
        console.error(err);
        addMessage("Could not load slots.", "bot");
    }
}

async function createBooking() {
    try {
        addMessage("Creating booking...", "bot");

        const res = await fetch(`${API_BASE}/api/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                staffId: bookingData.providerId,
                fullName: bookingData.fullName,
                email: bookingData.email,
                phone: bookingData.phone,
                serviceName: bookingData.service,
                meetingType: "Online",
                appointmentDate: bookingData.date,
                appointmentTime: bookingData.time,
                notes: "Booked from chatbot",
                bookingFee: 0
            })
        });

        const data = await res.json();

        if (!res.ok) {
            addMessage(data.error || "Booking failed.", "bot");
            return;
        }

        addMessage(
            `Booking confirmed with ${bookingData.providerName} on ${bookingData.date} at ${bookingData.time}.`,
            "bot"
        );

        showMainOptions();

    } catch (err) {
        console.error(err);
        addMessage("Booking failed.", "bot");
    }
}

async function handleTypedInput(text) {
    if (currentStep === "bookingDate") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            addMessage("Please use this date format: YYYY-MM-DD", "bot");
            showInput("YYYY-MM-DD");
            return;
        }

        bookingData.date = text;
        hideInput();
        await loadSlots();
        return;
    }

    if (currentStep === "bookingName") {
        bookingData.fullName = text;
        currentStep = "bookingEmail";
        addMessage("Enter your email address.", "bot");
        showInput("Email");
        return;
    }

    if (currentStep === "bookingEmail") {
        if (!text.includes("@")) {
            addMessage("Please enter a valid email address.", "bot");
            showInput("Email");
            return;
        }

        bookingData.email = text;
        currentStep = "bookingPhone";
        addMessage("Enter your phone number.", "bot");
        showInput("Phone");
        return;
    }

    if (currentStep === "bookingPhone") {
        bookingData.phone = text;
        hideInput();

        addMessage(
            `Confirm booking?\nService: ${bookingData.service}\nProvider: ${bookingData.providerName}\nDate: ${bookingData.date}\nTime: ${bookingData.time}`,
            "bot"
        );

        showOptions([
            { label: "Confirm Booking", action: "confirmBooking" },
            { label: "Main Menu", action: "mainMenu" }
        ]);

        return;
    }

    if (currentStep === "billingEmail") {
        hideInput();
        await loadBilling(text);
        return;
    }

    if (currentStep === "bookingToken") {
        hideInput();
        await loadExistingBooking(text);
        return;
    }

    if (currentStep === "contactName") {
        contactData.name = text;
        currentStep = "contactEmail";
        addMessage("Enter your email.", "bot");
        showInput("Email");
        return;
    }

    if (currentStep === "contactEmail") {
        contactData.email = text;
        currentStep = "contactMessage";
        addMessage("Write your message.", "bot");
        showInput("Message");
        return;
    }

    if (currentStep === "contactMessage") {
        contactData.message = text;
        hideInput();
        await sendContactMessage();
    }
}

async function loadBilling(email) {
    try {
        const res = await fetch(`${API_BASE}/api/chatbot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "billing",
                email
            })
        });

        const data = await res.json();

        if (!res.ok) {
            addMessage(data.error || "No billing found.", "bot");
            showMainOptions();
            return;
        }

        const b = data.billing;

        addMessage(
            `Billing summary:\nClient: ${b.client_name}\nService: ${b.service_name || "N/A"}\nTotal: $${((b.total_charge || 0) / 100).toFixed(2)}\nPaid: $${((b.amount_paid || 0) / 100).toFixed(2)}\nDue: $${((b.amount_due || 0) / 100).toFixed(2)}\nStatus: ${b.payment_status || "Pending"}`,
            "bot"
        );

        showMainOptions();

    } catch (err) {
        console.error(err);
        addMessage("Could not load billing information.", "bot");
    }
}

async function loadExistingBooking(token) {
    try {
        const res = await fetch(`${API_BASE}/api/booking/manage/${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
            addMessage(data.error || "Booking not found.", "bot");
            showMainOptions();
            return;
        }

        const b = data.booking;

        addMessage(
            `Booking found:\nService: ${b.service_name}\nStaff: ${b.staff_full_name || "Not assigned"}\nDate: ${String(b.appointment_date).slice(0, 10)}\nTime: ${String(b.appointment_time).slice(0, 5)}\nStatus: ${b.booking_status}`,
            "bot"
        );

        showMainOptions();

    } catch (err) {
        console.error(err);
        addMessage("Could not load booking.", "bot");
    }
}

async function sendContactMessage() {
    try {
        const res = await fetch(`${API_BASE}/api/contact`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: contactData.name,
                email: contactData.email,
                phone: "",
                subject: "Chatbot Message",
                message: contactData.message
            })
        });

        if (!res.ok) {
            addMessage("Could not send your message.", "bot");
            showMainOptions();
            return;
        }

        addMessage("Your message has been sent successfully.", "bot");
        showMainOptions();

    } catch (err) {
        console.error(err);
        addMessage("Message failed.", "bot");
    }
}

function showServiceInfoOptions() {
    addMessage("Choose a service to learn more.", "bot");

    showOptions([
        { label: "Tax Filing & Compliance", action: "serviceInfo", value: "Tax Filing & Compliance" },
        { label: "Business Consulting", action: "serviceInfo", value: "Business Consulting" },
        { label: "Payroll", action: "serviceInfo", value: "Payroll" },
        { label: "Auditing", action: "serviceInfo", value: "Auditing" },
        { label: "Main Menu", action: "mainMenu" }
    ]);
}

function showServiceDetails(service) {
    const details = {
        "Tax Filing & Compliance": "We help with tax returns, lodgements, amendments, and ATO-compliant records.",
        "Business Consulting": "We help with cash flow, KPI dashboards, business structure, and growth advice.",
        "Payroll": "We support STP, super, awards, onboarding, and monthly payroll runs.",
        "Auditing": "We provide independent assurance for compliance and financial confidence."
    };

    addMessage(details[service] || "This service is available at Constant & Co.", "bot");

    showOptions([
        { label: "Main Menu", action: "mainMenu" }
    ]);
}

function showOptions(options) {
    removeOptions();

    const wrapper = document.createElement("div");
    wrapper.className = "chatbot-options";

    options.forEach(option => {
        const btn = document.createElement("button");
        btn.className = "chatbot-option-btn";
        btn.type = "button";
        btn.textContent = option.label;

        btn.addEventListener("click", () => {
            handleOption(option.action, option.value);
        });

        wrapper.appendChild(btn);
    });

    chatbotMessages.appendChild(wrapper);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function removeOptions() {
    document
        .querySelectorAll(".chatbot-options")
        .forEach(el => el.remove());
}

function showInput(placeholder = "Type here...") {
    chatbotForm.classList.remove("hidden");
    chatbotForm.style.display = "grid";
    chatbotInput.placeholder = placeholder;
    chatbotInput.focus();
}

function hideInput() {
    chatbotForm.classList.add("hidden");
    chatbotForm.style.display = "none";
}

function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `chatbot-message ${sender}`;
    div.textContent = text;
    chatbotMessages.appendChild(div);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
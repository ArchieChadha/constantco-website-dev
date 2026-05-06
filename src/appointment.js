document.addEventListener("DOMContentLoaded", () => {
    // Login guard
    const clientId = sessionStorage.getItem("clientId");

    if (!clientId) {
        window.location.href = "./appointment-access.html";
        return;
    }

    const form = document.getElementById("appointmentForm");
    const service = document.getElementById("service");
    const meetingType = document.getElementById("meetingType");
    const appointmentDate = document.getElementById("appointmentDate");
    const statusText = document.getElementById("appointmentStatus");
    const bookingCost = document.getElementById("bookingCost");
    const bookingCostWrap = document.getElementById("bookingCostWrap");

    const feeTable = {
        "Tax Return": {
            "In Person": "$120",
            "Phone Call": "$100",
            "Video Meeting": "$110"
        },
        "Business Advisory": {
            "In Person": "$180",
            "Phone Call": "$150",
            "Video Meeting": "$160"
        },
        "Payroll Support": {
            "In Person": "$140",
            "Phone Call": "$120",
            "Video Meeting": "$130"
        },
        "Auditing": {
            "In Person": "$220",
            "Phone Call": "$190",
            "Video Meeting": "$200"
        },
        "General Consultation": {
            "In Person": "$100",
            "Phone Call": "$80",
            "Video Meeting": "$90"
        }
    };

    const victoriaMetroPublicHolidays = [
        "2026-01-01",
        "2026-01-26",
        "2026-03-09",
        "2026-04-03",
        "2026-04-06",
        "2026-06-08",
        "2026-09-25",
        "2026-11-03",
        "2026-12-25",
        "2026-12-28",
        "2027-01-01",
        "2027-01-26",
        "2027-03-08",
        "2027-03-26",
        "2027-03-29",
        "2027-06-14",
        "2027-10-01",
        "2027-11-02",
        "2027-12-27",
        "2027-12-28"
    ];

    function updateCost() {
        const selectedService = service.value;
        const selectedMeetingType = meetingType.value;

        if (selectedService && selectedMeetingType) {
            bookingCost.textContent = feeTable[selectedService][selectedMeetingType];
            bookingCostWrap.hidden = false;
        } else {
            bookingCost.textContent = "$0";
            bookingCostWrap.hidden = true;
        }
    }

    flatpickr(appointmentDate, {
        dateFormat: "Y-m-d",
        minDate: "today",
        disable: [
            function (date) {
                const day = date.getDay();
                const dateStr = date.toISOString().split("T")[0];

                return (
                    day === 0 ||
                    day === 6 ||
                    victoriaMetroPublicHolidays.includes(dateStr)
                );
            }
        ]
    });
    service.addEventListener("change", () => {
    updateCost();
    checkAvailableAgent();
});

meetingType.addEventListener("change", () => {
    updateCost();
    checkAvailableAgent();
});

document.getElementById("appointmentTime").addEventListener("change", checkAvailableAgent);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const API_BASE =
            (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                ? 'http://localhost:3001'
                : '';

        const fullName = document.getElementById("fullName");
        const email = document.getElementById("email");
        const phone = document.getElementById("phone");
        const company = document.getElementById("company");
        const appointmentTime = document.getElementById("appointmentTime");
        const notes = document.getElementById("notes");
        const consent = document.getElementById("consent");

        const requiredFields = [
            fullName,
            email,
            phone,
            service,
            meetingType,
            appointmentDate,
            appointmentTime
        ];

        requiredFields.forEach((field) => field.classList.remove("input-error"));

        let hasError = false;

        requiredFields.forEach((field) => {
            if (!field.value.trim()) {
                field.classList.add("input-error");
                hasError = true;
            }
        });

        if (!consent.checked || hasError) {
            statusText.textContent = "Please complete all required fields correctly.";
            statusText.style.color = "#c62828";
            return;
        }

        const bookingData = {
            fullName: fullName.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            company: company.value.trim(),
            service: service.value,
            meetingType: meetingType.value,
            appointmentDate: appointmentDate.value,
            appointmentTime: appointmentTime.value,
            notes: notes.value.trim(),
            bookingCost: bookingCost.textContent
        };

        localStorage.setItem("constantCoAppointment", JSON.stringify(bookingData));

        try {
            const clientId = sessionStorage.getItem("clientId");
            const feeNumber = Number(bookingData.bookingCost.replace('$', '')) * 100;

            // 1. create appointment in DB
            const appointmentRes = await fetch(`${API_BASE}/api/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    fullName: bookingData.fullName,
                    email: bookingData.email,
                    phone: bookingData.phone,
                    company: bookingData.company,
                    serviceName: bookingData.service,
                    meetingType: bookingData.meetingType,
                    appointmentDate: bookingData.appointmentDate,
                    appointmentTime: bookingData.appointmentTime,
                    notes: bookingData.notes,
                    bookingFee: feeNumber
                })
            });

            const appointmentData = await appointmentRes.json();

            if (!appointmentRes.ok) {
                throw new Error(appointmentData.error || 'Failed to create appointment');
            }

            const appointmentId = appointmentData.appointment.id;

            // 2. create initial billing row
            const billingRes = await fetch(`${API_BASE}/api/create-booking-billing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId,
                    clientId,
                    serviceName: bookingData.service,
                    bookingFee: feeNumber
                })
            });

            const billingData = await billingRes.json();

            if (!billingRes.ok) {
                throw new Error(billingData.error || 'Failed to create booking billing record');
            }

            statusText.textContent = "Redirecting to payment...";
            statusText.style.color = "#236B7D";

            window.location.href = "./payment.html";

        } catch (err) {
            console.error(err);
            statusText.textContent = err.message || "Something went wrong. Please try again.";
            statusText.style.color = "#c62828";
        }
    });
    async function checkAvailableAgent() {
    const selectedService = service.value;
    const selectedMeetingType = meetingType.value;
    const selectedTime = document.getElementById("appointmentTime").value;
    const agentBox = document.getElementById("availableAgent");

    if (!agentBox) return;

    if (!selectedService || !selectedMeetingType || !selectedTime) {
        agentBox.innerHTML = "Please select service, meeting type and time.";
        return;
    }

    const API_BASE =
        (location.hostname === "localhost" || location.hostname === "127.0.0.1")
            ? "http://localhost:3001"
            : "";

    const res = await fetch(
        `${API_BASE}/api/available-agent?service=${encodeURIComponent(selectedService)}&meetingType=${encodeURIComponent(selectedMeetingType)}&time=${encodeURIComponent(selectedTime)}`
    );

    const data = await res.json();

    if (!data.agents || data.agents.length === 0) {
        agentBox.innerHTML = "No agent available for this selection.";
        return;
    }

    agentBox.innerHTML = data.agents.map(agent => `
        <label class="agent-card selectable-agent">
            <input type="radio" name="selectedAgent" value="${agent.name}" required>
            <img src="assets/${agent.image}" alt="${agent.name}">
            <div>
                <strong>${agent.name}</strong>
                <p>${agent.role}</p>
                <p>${agent.expertise}</p>
            </div>
        </label>
    `).join("");
}

    updateCost();
    checkAvailableAgent();
});
document.addEventListener("DOMContentLoaded", () => {
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

    service.addEventListener("change", updateCost);
    meetingType.addEventListener("change", updateCost);

    form.addEventListener("submit", (event) => {
        event.preventDefault();

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

        if (!consent.checked) {
            statusText.textContent = "Please complete all required fields and accept the terms.";
            statusText.style.color = "#c62828";
            return;
        }

        if (hasError) {
            statusText.textContent = "Please complete all required fields correctly before submitting.";
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

        /* Keep summary page working */
        localStorage.setItem("constantCoAppointment", JSON.stringify(bookingData));

        /* Save into admin dashboard appointments */
        const existingAppointments = JSON.parse(localStorage.getItem("cc_admin_appointments")) || [];

        const adminAppointment = {
            id: "appointment_" + Date.now(),
            client: bookingData.fullName,
            email: bookingData.email,
            phone: bookingData.phone,
            company: bookingData.company || "N/A",
            date: bookingData.appointmentDate,
            time: bookingData.appointmentTime,
            type: bookingData.meetingType + " - " + bookingData.service,
            status: "Scheduled",
            duration: "60",
            notes: bookingData.notes || "N/A",
            cost: bookingData.bookingCost
        };

        existingAppointments.push(adminAppointment);
        localStorage.setItem("cc_admin_appointments", JSON.stringify(existingAppointments));

        statusText.textContent = "Your appointment request has been submitted successfully.";
        statusText.style.color = "#236B7D";

        window.location.href = "./booking-summary.html";
    });

    updateCost();
});
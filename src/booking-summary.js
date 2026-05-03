       document.addEventListener("DOMContentLoaded", () => {
            const data = JSON.parse(localStorage.getItem("constantCoAppointment"));

            if (!data) {
                window.location.href = "./appointment.html";
                return;
            }

            document.getElementById("summaryName").textContent = data.fullName || "N/A";
            document.getElementById("summaryEmail").textContent = data.email || "N/A";
            document.getElementById("summaryPhone").textContent = data.phone || "N/A";
            document.getElementById("summaryCompany").textContent = data.company || "N/A";
            document.getElementById("summaryService").textContent = data.service || "N/A";
            document.getElementById("summaryMeetingType").textContent = data.meetingType || "N/A";
            document.getElementById("summaryDate").textContent = data.appointmentDate || "N/A";
            document.getElementById("summaryTime").textContent = data.appointmentTime || "N/A";
            document.getElementById("summaryCost").textContent = data.bookingCost || "N/A";
            document.getElementById("summaryNotes").textContent = data.notes || "N/A";

            document.getElementById("backHomeBtn").addEventListener("click", () => {
                window.location.href = "./index.html";
            });
        });
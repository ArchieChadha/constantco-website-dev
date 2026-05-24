document.addEventListener('DOMContentLoaded', () => {

    setupLeaveValidation();
    setupAvailabilityRequestForm();
});

function setupLeaveValidation() {

    const leaveType =
        document.getElementById('leaveType');

    const startDate =
        document.getElementById('availabilityStartDate');

    if (!leaveType || !startDate) return;

    leaveType.addEventListener('change', () => {

        if (leaveType.value === 'annual') {

            const minDate = new Date();

            minDate.setDate(
                minDate.getDate() + 28
            );

            startDate.min =
                minDate.toISOString().split('T')[0];

        } else {

            startDate.min =
                new Date().toISOString().split('T')[0];
        }
    });

    leaveType.dispatchEvent(new Event('change'));
}

function setupAvailabilityRequestForm() {

    const form =
        document.getElementById('availabilityRequestForm');

    if (!form) return;

    form.addEventListener('submit', async (event) => {

        event.preventDefault();

        try {

            const leaveType =
                document.getElementById('leaveType').value;

            const startDate =
                document.getElementById('availabilityStartDate').value;

            const endDate =
                document.getElementById('availabilityEndDate').value;

            const reason =
                document.getElementById('availabilityReason').value;

            const res = await fetch(
                `${API_BASE}/api/staff/availability-change-request`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        staffId,
                        leaveType,
                        startDate,
                        endDate,
                        reason
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    'Failed to submit request'
                );
            }

            form.reset();

        } catch (err) {
            console.error(err);
        }
    });
}
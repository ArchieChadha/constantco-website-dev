document.addEventListener('DOMContentLoaded', loadAdminReports);

let reportData = {
    serviceBreakdown: [],
    statusBreakdown: [],
    monthlyRevenue: []
};

async function loadAdminReports() {
    const table = document.getElementById('reportServicesTable');
    const generatedAt = document.getElementById('reportGeneratedAt');
    const chartType = document.getElementById('reportChartType');

    try {
        const res = await fetch(`${API_BASE}/api/admin/reports`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to load reports');
        }

        console.log('Reports data:', data);

        reportData = {
            serviceBreakdown: data.serviceBreakdown || [],
            statusBreakdown: data.statusBreakdown || [],
            monthlyRevenue: data.monthlyRevenue || []
        };

        if (generatedAt) {
            generatedAt.textContent = `Generated ${new Date().toLocaleDateString('en-AU')}`;
        }

        renderServiceTable(reportData.serviceBreakdown);
        renderBusinessChart('revenue');

        if (chartType) {
            chartType.addEventListener('change', () => {
                renderBusinessChart(chartType.value);
            });
        }

    } catch (err) {
        console.error('Reports load error:', err);

        if (table) {
            table.innerHTML = '<tr><td colspan="2">Failed to load report data.</td></tr>';
        }

        const chart = document.getElementById('businessAnalysisChart');

        if (chart) {
            chart.innerHTML = '<p>Failed to load chart data.</p>';
        }

        const note = document.getElementById('businessChartNote');

        if (note) {
            note.textContent = 'Failed to load business report data.';
        }
    }
}

/*-----Service Breakdown Table-----*/
function renderServiceTable(services) {
    const table = document.getElementById('reportServicesTable');

    if (!table) {
        return;
    }

    if (!services.length) {
        table.innerHTML = '<tr><td colspan="2">No service data found.</td></tr>';
        return;
    }

    table.innerHTML = services.map(item => `
        <tr>
            <td>${escapeHTML(item.service_name || 'Not specified')}</td>
            <td>${item.total || 0}</td>
        </tr>
    `).join('');
}

/*-----Chart Switcher-----*/
function renderBusinessChart(type) {
    if (type === 'services') {
        renderBarChart({
            title: 'Service Demand',
            data: reportData.serviceBreakdown.map(item => ({
                label: item.service_name || 'Not specified',
                value: Number(item.total) || 0,
                displayValue: `${item.total || 0} bookings`
            })),
            note: 'This chart shows which services clients are booking most often.'
        });

        return;
    }

    if (type === 'status') {
        renderBarChart({
            title: 'Appointment Status',
            data: reportData.statusBreakdown.map(item => ({
                label: formatStatus(item.booking_status || 'Unknown'),
                value: Number(item.total) || 0,
                displayValue: `${item.total || 0} appointments`
            })),
            note: 'This chart shows the distribution of pending, confirmed, completed, and cancelled appointments.'
        });

        return;
    }

    renderBarChart({
        title: 'Monthly Revenue Trend',
        data: reportData.monthlyRevenue.map(item => ({
            label: formatShortMonth(item.month_label || ''),
            value: centsToDollars(item.total || 0),
            displayValue: formatMoney(item.total || 0)
        })),
        note: 'This chart shows successful client payment revenue by month.'
    });
}

/*-----Professional HTML Bar Chart-----*/
function renderBarChart({ title, data, note }) {
    const chart = document.getElementById('businessAnalysisChart');
    const noteBox = document.getElementById('businessChartNote');

    if (!chart) {
        return;
    }

    if (!data.length || data.every(item => Number(item.value) === 0)) {
        chart.innerHTML = `
            <div class="empty-report-box">
                <h3>${escapeHTML(title)}</h3>
                <p>No data available for this report yet.</p>
            </div>
        `;

        if (noteBox) {
            noteBox.textContent = note || '';
        }

        return;
    }

    const maxValue = Math.max(...data.map(item => Number(item.value) || 0), 1);

    chart.innerHTML = `
        <div class="report-chart-title-row">
            <h3>${escapeHTML(title)}</h3>
        </div>

        <div class="report-bar-list">
            ${data.map(item => {
        const value = Number(item.value) || 0;
        const width = Math.max(Math.round((value / maxValue) * 100), 4);

        return `
                    <div class="report-bar-row">
                        <div class="report-bar-label">
                            ${escapeHTML(item.label)}
                        </div>

                        <div class="report-bar-track">
                            <div class="report-bar-fill" style="width: ${width}%"></div>
                        </div>

                        <div class="report-bar-value">
                            ${escapeHTML(item.displayValue)}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    if (noteBox) {
        noteBox.textContent = note || '';
    }
}

/*-----Helpers-----*/
function centsToDollars(value) {
    return Math.round((Number(value) || 0) / 100);
}

function formatShortMonth(value) {
    if (!value) {
        return '';
    }

    const parts = String(value).split('-');

    if (parts.length < 2) {
        return value;
    }

    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);

    return date.toLocaleDateString('en-AU', {
        month: 'short',
        year: '2-digit'
    });
}

function formatStatus(status) {
    return String(status || '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}
let dashboard_filters = {
    from_date: null,
    to_date: null
};
let applications_pagination = {
    limit: 10,
    offset: 0,
    total: 0,
    current_page: 1
};
const stageColors = {
    "In Review": "#e45c33ff",   // orange
    "Screening": "#857be7ff",   // purple
    "Interview": "#5bc0de",   // blue
    "Offered": "#5cb85c",     // green
    "Rejected": "#d9534f",    // red
    "Offer Drop": "#999999"   // gray
};
const priorityColors = {
    "Critical": "#ff4f49ff",
    "High": "#f0814eff"
};
frappe.pages['hr-recruitment-dashb'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'HR Recruitment Dashboard',
        single_column: true
    });
	// Global filter state
// let dashboard_filters = {
//     from_date: null,
//     to_date: null
// };

// Add Date Range filter
page.add_field({
    fieldtype: "DateRange",
    fieldname: "date_range",
    label: "Date Range",
    change() {
        const value = page.fields_dict.date_range.get_value();
        if (Array.isArray(value) && value.length === 2) {
    dashboard_filters.from_date = value[0];
    dashboard_filters.to_date = value[1];
} else {
    dashboard_filters.from_date = null;
    dashboard_filters.to_date = null;
}

        refresh_dashboard();
    }
});
    // KPI container
    $(`
        <div class="hr-kpi-section" style="margin-top: 16px;">
            <div class="row" id="hr-kpi-cards"></div>
        </div>
    `).appendTo(page.body);

    load_kpis();
};
function refresh_dashboard() {
    $("#hr-kpi-cards").empty();
    $(".card").not(".kpi-card").remove();

    load_kpis();
}
function load_kpis() {
    frappe.call({
        method: "frappe.desk.query_report.run",
        args: {
            report_name: "HR Recruitment KPIs",
            filters: {
                from_date: dashboard_filters.from_date,
                to_date: dashboard_filters.to_date
            }
        },
        callback: function(r) {
            if (!r.message || !r.message.result) return;

            render_kpi_cards(r.message.result[0]);

            const chartsRow = $(`
                <div class="row" id="charts-row" style="display:flex; gap:16px; padding:16px; "></div>
            `);
            $(".hr-kpi-section").append(chartsRow);

            if (r.message.chart) {
                render_stage_chart(r.message.chart, chartsRow);
            }
            render_department_pie_chart(chartsRow);
            render_urgent_openings_table(() => {
                render_applications_table();
            });
        }
    });
}
function render_stage_chart(chart_data, container) {
    const labels = chart_data.data.labels;
    const values = chart_data.data.datasets[0].values;

    const datasets = labels.map((label, index) => ({
        name: label,
        values: labels.map((_, i) => i === index ? values[index] : 0),
        chartType: "bar",
        color: stageColors[label] || "#cccccc"
    }));

    const updated_chart_data = {
        type: "bar",
        data: {
            labels: labels,
            datasets: datasets
        },
        barOptions: {
            stacked: true,
            spaceRatio: 0.6
        }
    };

    const chart_container = $(`
        <div class="card" style="flex:1; padding:16px;">
            <h4>Candidate Pipeline</h4>
            <div id="stage-chart"></div>
        </div>
    `);

    container.append(chart_container);

    frappe.utils.make_chart("#stage-chart", updated_chart_data);
}

function render_kpi_cards(data) {
    const cards = [
        { label: "Total Candidates", value: data.total_candidates },
        { label: "Blacklisted Candidates", value: data.blacklisted_candidates },
        { label: "Active Applications", value: data.active_applications },
        { label: "Jobs Offered", value: data.offers_released }
    ];

    const $row = $("#hr-kpi-cards");
    $row.empty();

    cards.forEach(card => {
        $(`
            <div class="col-sm-3">
                <div class="card kpi-card">
                    <div class="kpi-value">${card.value}</div>
                    <div class="kpi-label">${card.label}</div>
                </div>
            </div>
        `).appendTo($row);
    });
}
$("<style>")
    .prop("type", "text/css")
    .html(`
        .kpi-card {
            padding: 14px;
            text-align: center;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            height: 100%;
        }
        .kpi-value {
            font-size: 20px;
            font-weight: 600;
        }
        .kpi-label {
            margin-top: 6px;
            font-size: 13px;
            color: #6c7680;
        }
    `)
    .appendTo("head");
function render_department_pie_chart(container) {
    frappe.call({
        method: "btw_recruitment.btw_recruitment.api.hr_dashboard.get_candidates_by_department",
        args: {
            from_date: dashboard_filters.from_date,
            to_date: dashboard_filters.to_date
        },
        callback: function(r) {
            if (!r.message || r.message.length === 0) return;

            const labels = r.message.map(d => d.department);
            const values = r.message.map(d => d.count);

			const chart_container = $(`
                <div class="card" style="flex:1; padding:16px;">
                    <h4>Candidates by Department</h4>
                    <div id="department-pie-chart"></div>
                </div>
            `);

            container.append(chart_container);

            frappe.utils.make_chart("#department-pie-chart", {
                data: {
                    labels: labels,
                    datasets: [{name: "Candidates", values: values}]
                },
                type: "pie"
            });
        }
    });
}
function render_applications_table() {
    const table_container = $(`
        <div class="card" style="margin-top: 20px; padding: 16px;">
            <h4>Active Applications</h4>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Candidate</th>
                        <th>Stage</th>
                        <th>Interview Date</th>
                        <th>Application</th>
                    </tr>
                </thead>
                <tbody id="applications-table-body">
                    <tr>
                        <td colspan="4" class="text-muted text-center">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `);

    $(".hr-kpi-section").append(table_container);

    load_applications_table();
}
function load_applications_table() {
    frappe.call({
        method: "btw_recruitment.btw_recruitment.api.hr_dashboard.get_active_applications",
		args: {
            limit: applications_pagination.limit,
            offset: applications_pagination.offset
        },
        callback: function(r) {
			 console.log("APPLICATION API RESPONSE:", r);
            console.log("r.message:", r.message);
            console.log("r.message.data:", r.message?.data);
            const tbody = $("#applications-table-body");
            tbody.empty();

            if (!r.message || r.message.length === 0 || r.message.data.length === 0) {
                tbody.append(`
                    <tr>
                        <td colspan="4" class="text-muted text-center">
                            No active applications
                        </td>
                    </tr>
                `);
                return;
            }
			applications_pagination.total = r.message.total;
            r.message.data.forEach((row, index) => {
                const serial = applications_pagination.offset + index + 1;
                tbody.append(`
                    <tr>
                        <td>${serial}. 
                            <a href="/app/dkp_candidate/${row.candidate_name}">
                                ${row.candidate_name}
                            </a>
                        </td>
                        <td>
                            <span style="
                                display: inline-block;
                                padding: 4px 8px;
                                border-radius: 12px;
                                background-color: ${stageColors[row.stage] || "#cccccc"};
                                color: #fff;
                                font-weight: 500;
                            ">
                                ${row.stage}
                            </span>
                        </td>
                        <td>${row.interview_date || "-"}</td>
                        <td>
                            <a href="/app/dkp_job_application/${row.job_application}">
                                ${row.job_application}
                            </a>
                        </td>
                    </tr>
                `);
            });
			render_applications_pagination(r.message.data.length);
        }
    });
}

function render_applications_pagination(currentCount) {
    $("#applications-pagination").remove();

    const totalPages = Math.ceil(applications_pagination.total / applications_pagination.limit);
    const container = $(`
        <div id="applications-pagination" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div id="page-info">Page ${applications_pagination.current_page} of ${totalPages}</div>
            <div>
                <button id="prev-page" class="btn btn-sm btn-outline-primary">Previous</button>
                <button id="next-page" class="btn btn-sm btn-outline-primary">Next</button>
            </div>
        </div>
    `);

    $(".hr-kpi-section").append(container);

    if (applications_pagination.current_page === 1) $("#prev-page").attr("disabled", true);
    if (applications_pagination.current_page === totalPages) $("#next-page").attr("disabled", true);

    $("#prev-page").click(() => {
        if (applications_pagination.current_page > 1) {
            applications_pagination.current_page--;
            applications_pagination.offset -= applications_pagination.limit;
            load_applications_table();
        }
    });

    $("#next-page").click(() => {
        if (applications_pagination.current_page < totalPages) {
            applications_pagination.current_page++;
            applications_pagination.offset += applications_pagination.limit;
            load_applications_table();
        }
    });
}
function render_urgent_openings_table(callback) {
    frappe.call({
        method: "btw_recruitment.btw_recruitment.api.hr_dashboard.get_urgent_openings",
        callback: function (r) {
            if (!r.message || r.message.length === 0) {
                if (callback) callback();
                return;
            }

            const table_container = $(`
                <div class="card" style="margin-top:20px; padding:16px;">
                    <h4>🚨 Urgent Openings</h4>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Job Opening</th>
                                <th>Company</th>
                                <th>Recruiter</th>
                                <th>Priority</th>
                                <th>Positions</th>
                            </tr>
                        </thead>
                        <tbody id="urgent-openings-body"></tbody>
                    </table>
                </div>
            `);

            $(".hr-kpi-section").append(table_container);

            const tbody = $("#urgent-openings-body");
            r.message.forEach((row, index) => {
                tbody.append(`
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <a href="/app/dkp_job_opening/${row.name}">
                                ${row.job_title || row.name}
                            </a>
                        </td>
                        <td>${row.company || "-"}</td>
                        <td>${row.assign_recruiter || "-"}</td>
                        <td>
                            <span style="
                                padding:4px 10px;
                                border-radius:12px;
                                color:#fff;
                                font-weight:600;
                                background:${priorityColors[row.priority]};
                            ">
                                ${row.priority}
                            </span>
                        </td>
                        <td>${row.number_of_positions || "0"}</td>
                    </tr>
                `);
            });

            if (callback) callback();
        }
    });
}


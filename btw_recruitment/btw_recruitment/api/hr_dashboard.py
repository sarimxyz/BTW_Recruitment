import frappe
from frappe.utils import add_days
@frappe.whitelist()
def get_active_applications(limit=10, offset=0,from_date=None, to_date=None):
    limit = int(limit)
    offset = int(offset)

    active_filters = [
        ["parenttype", "=", "DKP_Job_Application"],
        ["stage", "in", ["", "In Review", "Screening", "Interview", "Offered"]]
    ]
    if from_date and to_date:
        active_filters.append([
            "creation",
            "between",
            [from_date, add_days(to_date, 1)]
        ])
    data = frappe.get_all(
        "DKP_JobApplication_Child",
        fields=[
            "candidate_name",
            "stage",
            "interview_date",
            "parent as job_application"
        ],
        filters=active_filters,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit
    )

    total = frappe.db.count(
    "DKP_JobApplication_Child",
    active_filters
)


    return {
        "total": total,
        "data": data
    }


@frappe.whitelist()
def get_candidates_by_department(from_date=None, to_date=None):
    filters = {}
    
    # Optional: filter by date if provided
    if from_date and to_date:
        filters["creation"] = ["between", [from_date, to_date]]
    
    # Fetch candidate counts grouped by department
    data = frappe.db.sql("""
        SELECT department, COUNT(name) as count
        FROM `tabDKP_Candidate`
        WHERE department IS NOT NULL
        GROUP BY department
    """, as_dict=1)

    return data

@frappe.whitelist()
def get_urgent_openings(from_date=None, to_date=None):

    filters = [
        ["priority", "in", ["High", "Critical"]]
    ]

    # 🔹 DATE FILTER
    if from_date and to_date:
        filters.append([
            "creation",
            "between",
            [from_date, add_days(to_date, 1)]
        ])

    return frappe.get_all(
        "DKP_Job_Opening",
        fields=[
            "name",
            "designation",
            "company",
            "assign_recruiter",
            "priority",
            "number_of_positions",
            "status"
        ],
        filters=filters,
        order_by="modified desc"
    )



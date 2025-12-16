# import frappe

# @frappe.whitelist()
# def get_active_applications():
#     return frappe.db.get_all(
#         "DKP_JobApplication_Child",
#         fields=[
#             "candidate_name",
#             "stage",
#             "interview_date",
#             "parent as job_application"
#         ],
#         filters={
#             "parenttype": "DKP_Job_Application",
#             "stage": ["in", ["In Review", "Screening", "Interview","Offered"]]
#         },
#         order_by="modified desc",
#         limit=10
#     )
import frappe

# @frappe.whitelist()
# def get_active_applications(limit=10, offset=0):
#     return frappe.db.get_all(
#         "DKP_JobApplication_Child",
#         fields=[
#             "candidate_name",
#             "stage",
#             "interview_date",
#             "parent as job_application"
#         ],
#         filters={
#             "parenttype": "DKP_Job_Application",
#             "stage": ["in", ["In Review", "Screening", "Interview","Offered"]]
#         },
#         order_by="modified desc",
#         limit_page_length=int(limit),   # <-- this replaces 'limit'
#         limit_start=int(offset) 
#     )
# @frappe.whitelist()
# def get_active_applications(limit=10, offset=0):
#     filters = {
#         "parenttype": "DKP_Job_Application",
#         "stage": ["in", ["In Review", "Screening", "Interview","Offered"]]
#     }
#     total = frappe.db.count("DKP_JobApplication_Child", filters)
    
#     data = frappe.get_list(
#         "DKP_JobApplication_Child",
#         fields=["candidate_name", "stage", "interview_date", "parent as job_application"],
#         filters=filters,
#         order_by="modified desc",
#         limit_page_length=int(limit),
#         limit_start=int(offset)
#     )
    
#     return {"total": total, "data": data}
@frappe.whitelist()
def get_active_applications(limit=10, offset=0):
    limit = int(limit)
    offset = int(offset)

    active_filters = [
        ["parenttype", "=", "DKP_Job_Application"],
        ["stage", "in", ["In Review", "Screening", "Interview", "Offered"]]
    ]

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
        {"parenttype": "DKP_Job_Application"}
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
def get_urgent_openings():
    return frappe.get_all(
        "DKP_Job_Opening",
        fields=["name", "designation", "company", "assign_recruiter", "priority", "number_of_positions","status"],
        filters=[["priority", "in", ["High", "Critical"]]],
        order_by="modified desc"
    )


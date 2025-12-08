# import frappe

# @frappe.whitelist()
# def rename_candidate_after_parse(docname, force="0"):
#     """
#     Safe renaming performed separately from parsing.
#     - docname: current docname (string)
#     - force: "1" to force rename even if fields missing (not recommended)
#     Returns: {"new_name": new_name, "renamed": True/False}
#     """
#     doc = frappe.get_doc("DKP_Candidate", docname)

#     # Safe inline handling (no extra helper function)
#     name = doc.candidate_name.strip() if doc.candidate_name else ""
#     designation = doc.current_designation.strip() if doc.current_designation else ""

#     # If not present and not forced -> skip
#     if not name or not designation:
#         if force == "1":
#             # If forced, build base using whatever exists (fallback to docname parts)
#             name = name or f"candidate"
#             designation = designation or ""
#         else:
#             return {"renamed": False, "reason": "missing_fields", "new_name": doc.name}

#     base = f"{name}-{designation}" if designation else name

#     # Avoid collision with same doc (if doc already has that name)
#     if doc.name == base:
#         return {"renamed": False, "reason": "already_named", "new_name": doc.name}

#     # If base not used by another doc -> use it
#     if not frappe.db.exists("DKP_Candidate", base):
#         new_name = base
#     else:
#         # Add 4-digit counter
#         counter = 1
#         new_name = f"{base}-{counter:04d}"
#         while frappe.db.exists("DKP_Candidate", new_name):
#             counter += 1
#             new_name = f"{base}-{counter:04d}"

#     # Finally rename (safe)
#     try:
#         frappe.rename_doc("DKP_Candidate", doc.name, new_name, force=True)
#         frappe.db.commit()
#         return {"renamed": True, "new_name": new_name}
#     except Exception as e:
#         frappe.log_error(message=str(e), title="rename_candidate_after_parse_error")
#         return {"renamed": False, "reason": "rename_failed", "error": str(e), "new_name": doc.name}
import frappe

@frappe.whitelist()
def rename_candidate_after_parse(docname, force="0"):
    """
    Rename candidate only using candidate_name.
    - No designation included.
    """
    doc = frappe.get_doc("DKP_Candidate", docname)

    # Safe inline handling
    name = doc.candidate_name.strip() if doc.candidate_name else ""

    # If missing name and not forced → skip
    if not name:
        if force == "1":
            name = "candidate"
        else:
            return {"renamed": False, "reason": "missing_name", "new_name": doc.name}

    base = name  # <-- NO DESIGNATION EVER

    # Already same name
    if doc.name == base:
        return {"renamed": False, "reason": "already_named", "new_name": doc.name}

    # Check if available
    if not frappe.db.exists("DKP_Candidate", base):
        new_name = base
    else:
        # Add counter for duplicates
        counter = 1
        new_name = f"{base}-{counter:04d}"
        while frappe.db.exists("DKP_Candidate", new_name):
            counter += 1
            new_name = f"{base}-{counter:04d}"

    # Rename safely
    try:
        frappe.rename_doc("DKP_Candidate", doc.name, new_name, force=True)
        frappe.db.commit()
        return {"renamed": True, "new_name": new_name}
    except Exception as e:
        frappe.log_error(message=str(e), title="rename_candidate_after_parse_error")
        return {
            "renamed": False,
            "reason": "rename_failed",
            "error": str(e),
            "new_name": doc.name
        }

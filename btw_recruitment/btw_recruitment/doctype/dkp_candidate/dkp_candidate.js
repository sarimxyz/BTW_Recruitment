frappe.ui.form.on("DKP_Candidate", {
    resume_attachment(frm) {
        if (frm.doc.resume_attachment) {

            frm.save().then(() => {
                frappe.call({
                    method: "btw_recruitment.btw_recruitment.api.resume_parser.process_resume",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: "Extracting data from resume..."
                }).then(r => {
                    frappe.msgprint("Resume processed successfully! Please review highlighted fields.");

                    // Set flag on client side also (safe)
                    frm.doc.resume_parsed = 1;

                    // Reload & highlight
                    frm.reload_doc();
                });
            });
        }
    },

    // --------------------------
    // REFRESH - HIGHLIGHT
    // --------------------------
    refresh(frm) {

        // ALWAYS remove old highlights first
        removeHighlights(frm);

        // highlight only AFTER resume parsing
        if (!frm.doc.resume_parsed) return;

        const manual_fields = [
            "alternate_phone",
            "gender",
            "current_ctc",
            "expected_ctc",
            "notice_period_days",
            "last_working_day",
            "resume_source"
        ];

        manual_fields.forEach(fieldname => {

            const field = frm.get_field(fieldname);
            const value = frm.doc[fieldname];

            const isEmpty =
                value === null ||
                value === undefined ||
                value === "" ||
                value === 0;

            if (field && isEmpty) {
                // field input
                if (field.$input) {
                    field.$input.css({
                        "border": "2px solid #ff4d4d",
                        "background-color": "#ffecec",
                        "border-radius": "4px"
                    });
                }
            }
        });
    }
});


// -------------------------------------
// CLEAR ALL HIGHLIGHTS (GLOBAL CLEANER)
// -------------------------------------
function removeHighlights(frm) {
    Object.values(frm.fields_dict).forEach(field => {

        if (field.$input) {
            field.$input.css({
                "border": "",
                "background-color": "",
                "border-radius": ""
            });
        }

    });
}
    


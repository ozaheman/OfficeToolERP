// ===================================================================================
//
//  MODULE: LETTER FORMATS
//
//  DESCRIPTION:
//  This module provides standardized HTML templates for both HR and Project letters.
//
// ===================================================================================

const formatDateForTemplates = (dateValue = new Date()) => {
    return new Date(dateValue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCurrencyForTemplates = (num) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(num || 0);

// Helper function for letterhead image, used in multiple templates
const getLetterheadHeaderHtml = () => `<div class="preview-header-image"><img src="${LOGO_BASE64}" alt="Company Letterhead"></div>`;


/**
 * @const {Object} HR_LETTER_TEMPLATES
 * Templates for Human Resources related letters.
 */
const HR_LETTER_TEMPLATES = {
    appreciation: ({ staff, details }) => `
        <p>Date: ${formatDateForTemplates()}</p><br><br>
        <p>To,</p><p><b>${staff.name}</b></p><p>${staff.role}</p><br>
        <h3 style="text-align:center; text-decoration: underline;">Letter of Appreciation</h3><br>
        <p>Dear ${staff.name.split(' ')[0]},</p>
        <p>We are writing to formally express our sincere appreciation for your outstanding contribution regarding ${details.reason || 'your recent work'}. Your dedication and hard work have been invaluable.</p>
        <p>We are proud to have you as a member of our team.</p><br>
        <p>Sincerely,</p><br><br><p><b>Management</b></p>`,

    warning: ({ staff, details }) => `
        <p>Date: ${formatDateForTemplates()}</p><br><br>
        <p>To,</p><p><b>${staff.name}</b></p><p>${staff.role}</p><br>
        <h3 style="text-align:center; text-decoration: underline;">Warning Letter</h3><br>
        <p>Dear ${staff.name.split(' ')[0]},</p>
        <p>This letter serves as a formal warning regarding: ${details.reason || 'a breach of company policy'}.</p>
        <p>We expect immediate improvement in this area. Failure to comply with company standards may result in further disciplinary action.</p><br>
        <p>Sincerely,</p><br><br><p><b>Management</b></p>`,

    termination: ({ staff, details }) => `
        <p>Date: ${formatDateForTemplates()}</p><br><br>
        <p>To,</p><p><b>${staff.name}</b></p><p>${staff.role}</p><br>
        <h3 style="text-align:center; text-decoration: underline;">Letter of Termination</h3><br>
        <p>Dear ${staff.name.split(' ')[0]},</p>
        <p>This letter confirms the termination of your employment with Urban Axis, effective ${details.lastDay ? formatDateForTemplates(details.lastDay) : 'immediately'}.</p>
        <p>This decision is based on ${details.reason || 'company restructuring'}. We wish you the best in your future endeavors.</p><br>
        <p>Sincerely,</p><br><br><p><b>Management</b></p>`,

    salary_certificate: ({ staff }) => {
        const grossSalary = staff.grossSalary || 0;
        const basic = grossSalary * 0.6;
        const allowance = grossSalary * 0.4;

        return `
            ${getLetterheadHeaderHtml()}
            <p style="text-align:right;">Date: ${formatDateForTemplates()}</p><br><br>
            <h3 style="text-align:center; text-decoration: underline;">TO WHOM IT MAY CONCERN</h3><br><br>
            <h4 style="text-align:center; text-decoration: underline;">SALARY CERTIFICATE</h4><br><br>
            <p>This is to certify that <b>Mr. / Ms. ${staff.name}</b>, holder of Passport No. <b>${staff.passportNo || '[Passport No. Missing]'}</b>, has been employed with Urban Axis Architectural & Consulting Engineers since ${formatDateForTemplates(staff.joinDate)}.</p>
            <p>Currently, he/she is designated as <b>${staff.role}</b> and his/her monthly salary is as follows:</p>
            <br>
            <table style="width: 60%; margin-left: 5%; border-collapse: collapse;" border="0">
                <tr><td style="padding: 5px; width: 25%;">Basic Salary</td><td style="padding: 5px;">: ${formatCurrencyForTemplates(basic)}</td></tr>
                <tr><td style="padding: 5px;">Allowances</td><td style="padding: 5px;">: ${formatCurrencyForTemplates(allowance)}</td></tr>
                <tr><td style="padding: 5px; border-top: 1px solid #000;"><b>Total Salary</b></td><td style="padding: 5px; border-top: 1px solid #000;"><b>: ${formatCurrencyForTemplates(grossSalary)}</b></td></tr>
            </table>
            <br>
            <p>This certificate is issued upon the request of the employee for whatever legal purpose it may serve.</p>
            <br><br><p>Sincerely,</p><br><br><p><b>Management</b></p>
        `;
    },

    notice: ({ details }) => `
        <p>Date: ${formatDateForTemplates()}</p><br><br>
        <h3 style="text-align:center; text-decoration: underline;">NOTICE</h3><br>
        <p><b>Subject: ${details.subject || 'Important Announcement'}</b></p><br>
        <p>${(details.body || '').replace(/\n/g, '<br>')}</p><br>
        <p>Thank you for your attention to this matter.</p><br><br>
        <p><b>Management</b></p>`,

    authority: ({ staff, details }) => `
        <p>Date: ${formatDateForTemplates()}</p><br><br>
        <h3 style="text-align:center; text-decoration: underline;">TO WHOM IT MAY CONCERN</h3><br><br>
        <p>This letter is to authorize the bearer, <b>Mr. / Ms. ${staff.name}</b>, holding Emirates ID No. <b>${staff.emiratesId || '[EID Missing]'}</b>, to represent Urban Axis Architectural & Consulting Engineers for the purpose of ${details.reason || 'official business'}.</p>
        <p>Any assistance extended to him/her in this regard would be highly appreciated.</p><br>
        <p>Sincerely,</p><br><br><p><b>Management</b></p>`
};

/**
 * @const {Object} PROJECT_LETTER_TEMPLATES
 * Templates for Project related letters to authorities.
 */
const PROJECT_LETTER_TEMPLATES = {
    // --- MODIFICATION START ---
    scopeOfWork: ({ projectData, details }) => {
        const authority = CONTENT.AUTHORITY_DETAILS[details.authority] || { name: 'The Relevant Authority', address: 'Dubai, U.A.E.' };
        // Generate list items from the details provided by app.js
        const scopeItemsHtml = (details.scopeItems || []).map((item) => `<li>${item}</li>`).join('');

        return `
            ${getLetterheadHeaderHtml()}
            <div style="padding: 0 10mm;">
                <p style="text-align:right;">Date: ${formatDateForTemplates()}</p><br>
                <p>${authority.name}<br>${authority.address}</p><br>
                <p><b>Attention:</b> Head of the Planning Department</p><br>
                <p style="margin-bottom: 2px;"><b>Project:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${projectData.projectDescription} on plot no. ${projectData.plotNo} @ ${projectData.area}</p>
                <p><b>Subject:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Scope of works for existing and proposed.</p><br>
                <p>Dear Sir,</p>
                <p>With reference to the above mentioned project we would like to submit our scope of work for existing and proposed.</p><br>
                <h4 style="text-decoration: underline;">Proposed scope of works for extension of villa</h4>
                <ol style="padding-left: 20px;">${scopeItemsHtml || '<li>No scope items provided.</li>'}</ol><br>
                <p>This is for your information and records.</p>
                <p>Yours faithfully,</p><br><br><br>
                <p><b>For Urban Axis Architectural & Consulting Engineers</b></p>
            </div>
        `;
    },
    // --- MODIFICATION END ---
    consultantAppointment: ({ projectData, details }) => {
        const authority = CONTENT.AUTHORITY_DETAILS[details.authority] || { name: 'The Relevant Authority', address: 'Dubai, U.A.E.' };
        return `
            ${getLetterheadHeaderHtml()}
             <div style="padding: 0 10mm;">
                <p style="text-align:right;">Date: ${formatDateForTemplates()}</p><br>
                <p>${authority.name}<br>${authority.address}</p><br>
                <p><b>Attention:</b> Head of the Planning Department</p><br>
                <p style="margin-bottom: 2px;"><b>Project:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${projectData.projectDescription} on plot no. ${projectData.plotNo} @ ${projectData.area}</p>
                <p style="margin-bottom: 2px;"><b>Subject:</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Consultant appointment letter.</p>
                <p><b>Plot number:</b> ${projectData.plotNo}, DUBAI- UAE</p><br>
                <p>Dear Sir,</p>
                <p>With reference to the above mentioned project we would like to bring to your kind attention that we have appointed <b>Urban Axis Architectural and Consulting Engineers</b> as the main consultant to do the designs / drawings submissions to Authorities and obtain all essential NOC to satisfy the concerned regulations.</p>
                <p>Henceforth, Urban Axis will be coordinating with yourself for drawings submissions/approvals etc.</p><br>
                <p>Yours faithfully,</p><br><br><br>
                <p><b>${projectData.clientName}</b></p>
            </div>
        `;
    }
};
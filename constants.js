//--- START OF FILE constants.js ---


// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================
      // DDA: { name: 'M/s Dubai Development Authority', address: 'Planning Department<br>Dubai, U.A.E.' },
         // DubaiSportsCity: { name: 'M/s Dubai Sports City', address: 'Planning Department<br>Dubai, U.A.E.' },
         // EmiratesHills: { name: 'Emirates Hills', address: 'P.O. Box 9440<br>Dubai, United Arab Emirates' }
// +    },
// +    AUTHORITY_MAPPING: { // New mapping for UI logic
// +        'dubai': 'DM',
// +        'abu dhabi': 'DMT',
// +        'al ain': 'DMT',
// +        'sharjah': 'Sharjah Municipality',
// +        'ajman': 'Ajman Municipality',
// +        'ras al khaimah': 'RAK Municipality',
// +        'rak': 'RAK Municipality',
// +        'umm al quwain': 'UAQ Municipality',
// +        'uaq': 'UAQ Municipality',
// +        'fujairah': 'Fujairah Municipality'
     // },
  //--- START OF FILE constants.js ---


// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================

const DEPARTMENT_COLORS = {
    'Architectural': '#ffe119', // Yellow
    'Structural': '#3cb44b',    // Green
    'MEP': '#4363d8',           // Blue
    'Mechanical': '#42d4f4',      // Cyan
    'AOR': '#e6194B',           // Red
    'Tender': '#f58231',        // Orange
    'Draftsmen': '#469990',      // Teal
    'Account': '#f032e6',       // Magenta
    'Manager': '#a9a9a9',       // Dark Grey
    'Site': '#bfef45',        // Lime
    'Submission': '#9A6324',    // Brown
    'Default': '#808080'        // Grey
};

// MODIFICATION: Added default salaries for resource calculation
const DEFAULT_DEPARTMENT_SALARIES = {
    'Architectural': 12000, 'Structural': 12000, 'MEP': 8000, 'Mechanical': 8000, 'AOR': 7000, 'Tender': 5000, 'Draftsmen': 5000, 'Account': 5000, 'Manager': 7000, 'Site': 8000, 'Submission': 7000, 'Default': 4000
};
       
// MODIFICATION: Cleaned up this array to match keys in the details object below.
const SCOPE_OF_WORK_DETAILS_KEYS = [
    'New Construction',
    'Modification',
    'AOR Service',
    'Supervision',
    'Interior Design',
    'BIM',
    'Extension',
    'Project Management',
    'Swimming Pool',
    'Tendering',
    'Landscaping'
];
// ===================================================================================
// MODULE 1: CONTENT DEFINITIONS
// ===================================================================================

const DESIGN_SCRUM_TEMPLATE = [
    { id: 1, name: 'Project Kickoff & Client Requirements', duration: 5, dependencies: [], department: 'Manager', fixed_time: 3 },
    { id: 2, name: 'Prepare Initial Design Proposal', duration: 8, dependencies: [1], department: 'Architectural', fixed_time: 7 },
    { id: 3, name: 'Client Presentation & Feedback Round 1', duration: 3, dependencies: [2], department: 'Manager', fixed_time: 3 },
    { id: 4, name: 'Revise Design based on Feedback', duration: 5, dependencies: [3], department: 'Architectural', fixed_time: 5 },
    { id: 5, name: 'Finalize Architectural Plan Layout', duration: 5, dependencies: [4], department: 'Draftsmen', fixed_time: 5 },
    { id: 6, name: 'Develop Perspectives & Elevations', duration: 7, dependencies: [5], department: 'Architectural', fixed_time: 7 },
    { id: 7, name: 'Request/Receive Topographic Survey', duration: 7, dependencies: [1], department: 'Site', fixed_time: 7 },
    { id: 8, name: 'Request/Receive Soil Test Report', duration: 15, dependencies: [1], department: 'Site', fixed_time: 10 },
    { id: 9, name: 'Request/Receive Renewed Affection Plan & Load Confirmation', duration: 10, dependencies: [1], department: 'AOR', fixed_time: 3 },
    { id: 10, name: 'Develop Section Drawings', duration: 8, dependencies: [5], department: 'Draftsmen', fixed_time: 8 },
    { id: 11, name: 'Client Approval on Final Visuals & Sections', duration: 3, dependencies: [6, 10], department: 'Manager', fixed_time: 3 },
    { id: 12, name: 'Prepare Preliminary Drawings for Developer/Authority', duration: 15, dependencies: [11, 7, 8, 9], department: 'Submission', fixed_time: 5 },
    { id: 13, name: 'Submit & Await Developer/Authority Preliminary Approval', duration: 20, dependencies: [12], department: 'AOR', fixed_time: 15 },
    { id: 14, name: 'Finalize Architectural Package for Coordination', duration: 7, dependencies: [13], department: 'Architectural', fixed_time: 7 },
    { id: 15, name: 'Share Package with MEP & Structural Teams', duration: 1, dependencies: [14], department: 'Manager', fixed_time: 1 },
    { id: 16, name: 'Receive & Review MEP/Structural Concerns (Shafts, Columns)', duration: 5, dependencies: [15], department: 'Architectural', fixed_time: 5 },
    { id: 17, name: 'Accommodate MEP/Structural Feedback & Reshare', duration: 4, dependencies: [16], department: 'Architectural', fixed_time: 3 },
    { id: 18, name: 'MEP Team Finalizes Drawings', duration: 10, dependencies: [17], department: 'MEP', fixed_time: 7 },
    { id: 19, name: 'Structural Team Finalizes Drawings', duration: 10, dependencies: [17], department: 'Structural', fixed_time: 7 },
    { id: 20, name: 'Start NOC Application Process (Parallel)', duration: 20, dependencies: [13], department: 'AOR', fixed_time: 20 },
    { id: 21, name: 'Prepare Final Architectural Tender Drawings', duration: 7, dependencies: [17], department: 'Draftsmen', fixed_time: 7 },
    { id: 22, name: 'Compile Full Tender Package (Arch, STR, MEP)', duration: 3, dependencies: [18, 19, 21], department: 'Tender', fixed_time: 3 },
    { id: 23, name: 'Submit for Final Building Permit', duration: 3, dependencies: [22, 20], department: 'Submission', fixed_time: 3 },
    { id: 24, name: 'Await Final Building Permit Approval', duration: 15, dependencies: [23], department: 'AOR', fixed_time: 15 },
    { id: 25, name: 'Float Tender to Contractors (Parallel)', duration: 2, dependencies: [22], department: 'Tender', fixed_time: 1 },
    { id: 26, name: 'Receive & Analyze Tender Proposals', duration: 15, dependencies: [25], department: 'Tender', fixed_time: 7 }
];
const CONTENT = {
    VAT_TRN: '100337020000003',
    BANK_DETAILS: {
        name: 'Urban Axis ARCHITECTURAL & CONSULTING ENGINEERS',
        bank: 'AL MASRAF BANK',
        ac: '611000432052',
        iban: 'AE230080000611000432052',
        swift: 'ABINAEAAXXX'
    },
    AUTHORITY_MAPPING: {
        'dubai': 'DM',
        'abu dhabi': 'DMT',
        'al ain': 'DMT',
        'sharjah': 'Sharjah Municipality',
        'ajman': 'Ajman Municipality',
        'ras al khaimah': 'RAK Municipality',
        'rak': 'RAK Municipality',
        'umm al quwain': 'UAQ Municipality',
        'uaq': 'UAQ Municipality',
        'fujairah': 'Fujairah Municipality'
    },
    AREA_AUTHORITY_NAMES: {
        'dubai': {
            main_authority_short: 'DM',
            main_authority_long: 'Dubai Municipality',
            civil_defense: 'Dubai Civil Defense (DCD)',
            electricity_water: 'Dubai Electricity & Water Authority (DEWA)'
        },
        'abu dhabi': {
            main_authority_short: 'DMT',
            main_authority_long: 'Department of Municipalities and Transport',
            civil_defense: 'Abu Dhabi Civil Defence (ADCD)',
            electricity_water: 'Abu Dhabi Distribution Company (ADDC)'
        },
        'sharjah': {
            main_authority_short: 'Sharjah Municipality',
            main_authority_long: 'Sharjah Municipality',
            civil_defense: 'Sharjah Civil Defence',
            electricity_water: 'Sharjah Electricity, Water and Gas Authority (SEWA)'
        },
        'default': {
            main_authority_short: 'Local Municipality',
            main_authority_long: 'the concerned Local Municipality',
            civil_defense: 'the local Civil Defense department',
            electricity_water: 'the local Electricity & Water Authority'
        }
    },
    AUTHORITY_DETAILS: {
        Emaar: { name: 'M/s Emaar', address: 'Planning Department<br>Dubai, U.A.E.' },
        DM: { name: 'M/s Dubai Municipality', address: 'Planning Department<br>Dubai, U.A.E.' },
        DDA: { name: 'M/s Dubai Development Authority', address: 'Planning Department<br>Dubai, U.A.E.' },
        DubaiSportsCity: { name: 'M/s Dubai Sports City', address: 'Planning Department<br>Dubai, U.A.E.' },
        EmiratesHills: { name: 'Emirates Hills', address: 'P.O. Box 9440<br>Dubai, United Arab Emirates' }
    },
    SCOPE_OF_WORK_DETAILS: {
        'New Construction': {
            brief: 'New Construction Consultancy',
            detail: 'Comprehensive architectural and engineering consultancy for proposed new construction projects, from initial concept design through to project completion and handover.',
            scopeSections: ['1', '2', '3', '4', '5', '6']
        },
        'Modification': {
            brief: 'Modification & Renovation Services',
            detail: 'Design and supervision for modification, renovation, and alteration works on existing buildings, including site surveying and preparation of as-built drawings.',
            scopeSections: ['1', '2', '3', '4', '5', '6']
        },
        'AOR Service': {
            brief: 'Architect of Record (AOR) Services',
            detail: 'Providing Architect of Record (AOR) services for projects where designs are provided by others. This includes reviewing employer\'s design, advising on local authority compliance, preparing submission formats (DWF/PDF), managing online submissions, project tracking, and obtaining all necessary NOCs and the final Building Permit.',
            scopeSections: ['2', '3']
        },
        'Supervision': {
            brief: 'Site Supervision Services [{supervisionVisits} visits/month]',
            detail: 'Manage and supervise the execution of works at site through scheduled site visits to monitor progress and ensure conformity with drawings and contract documents. This includes reviewing contractor submittals, approving materials, preparing progress reports, and certifying interim payments. Additional supervision beyond the agreed scope will be charged at AED {additionalSupervisionFee}/visit.',
            scopeSections: ['5', '6']
        },
        'Interior Design': {
            brief: 'Interior Design Services',
            detail: 'Complete interior design services, from space planning and concept development to material selection, furniture specification, and preparation of detailed drawings for execution.',
            scopeSections: ['7']
        },
        'BIM': {
            brief: 'Building Information Modeling (BIM)',
            detail: 'Building Information Modeling (BIM) services including 3D modeling, clash detection, and documentation.',
            scopeSections: ['12', '13']
        },
        'Extension': {
            brief: 'Building Extension Design & Supervision',
            detail: 'Specialized consultancy services for designing and managing building extension projects, ensuring seamless integration with the existing structure and compliance with all relevant building codes.',
            scopeSections: ['1', '2', '3', '5']
        },
        'Project Management': { brief: 'Project Management', detail: 'The Consultant\'s representative will assist the Client if he/she requires the assistance, to visit interior Related Market/ shops/ showrooms for Selections of furnishings, furniture, decorations, accessories, FF & E etc and coordinating with the contractors during the office hours which will be covered as project management fees', scopeSections: ['1', '4', '5', '6'] },
        'Swimming Pool': { brief: 'Swimming Pool Design & Approval', detail: '...', scopeSections: ['2', '3'] },
        'Tendering': { brief: 'Tendering Services', detail: '...', scopeSections: ['4'] },
        'Landscaping': { brief: 'Landscaping Design', detail: '...', scopeSections: ['2', '3', '7'] },
         'Structural Review': { brief: 'Structural Design Review', detail: 'Review and reporting on third-party structural drawings and calculations.', scopeSections: ['14'] },
        'Existing Structural Review': { brief: 'Existing Structure Assessment', detail: 'Assessment of existing structures, including recommendations for strength testing.', scopeSections: ['14']}
    },
    BRIEF_PROPOSAL_TERMS: [
        { id: 'specialApprovals', text: 'Any Special Approvals by Authorities to be paid by the client.' },
        { id: 'submissionCharges', text: 'Authorities submissions / Resubmission charges to be paid by the owner.' },
        { id: 'siteVisits', text: '{supervisionVisits} site visits are included in the package.' },
        { id: 'extraSupervision', text: 'Extra Supervision charged separately ({additionalSupervisionFee} AED per visit).' },
        { id: 'surveyWorks', text: 'Any survey works if required, will be charged separately.' },
        { id: 'neighborNOC', text: 'NOC from neighbor will be provided by the client.' }
    ],
    FEE_MILESTONES: [
        { id: 'advance', text: 'Advance', defaultPercentage: 15 },
        { id: 'prep_dwg', text: 'On Preparation of Drawings', defaultPercentage: 10 },
        { id: 'approve_client', text: 'On Approval of Drawings by Client', defaultPercentage: 10 },
        { id: 'approve_dev', text: 'On Getting Approval from Developer (DDA)', defaultPercentage: 10 },
        { id: 'submit_auth', text: 'On Submission to Authority', defaultPercentage: 10 },
        { id: 'approve_auth', text: 'On Approval from Authority', defaultPercentage: 10 },
        { id: 'prep_tender', text: 'On Preparation of Tender', defaultPercentage: 10 },
        { id: 'tender_analysis', text: 'On Tender Analysis', defaultPercentage: 5 },
        { id: 'get_noc', text: 'On Getting NOCs', defaultPercentage: 5 },
        { id: 'get_permit', text: 'On Getting Building Permit', defaultPercentage: 10 },
        { id: 'tender_invitation', text: 'On Tender Invitation', defaultPercentage: 5 },
    ],
    NOTES: [
        { id: 'note-special', text: 'Any special approvals will be charged separately.' },
        { id: 'note-green', text: 'Green Building approvals, Environment Impact study Assessment, Traffic Impact Study & Third party Design analysis will be done by Specialists (if required) the price of the above is excluded in our offer.' },
        { id: 'note-bidders', text: 'Consultant has allowed for 4 bidders only for the bid invitations, review & analysis.' },
        { id: 'note-authority', text: 'Authority Fee charged separately.' }
    ],
    SCOPE_DEFINITIONS: {
        
        
    1: [
        { id: '1.1', brief: 'Study Owner Requirements', detailed: "<b>1.1 Study the Owners requirements and advise as necessary.</b>" },
        { id: '1.2', brief: 'Site Inspection & Info Gathering', detailed: "<b>1.2 The consultant shall visit and properly inspect, consistent with the level of professional skill and care required hereunder, the Project site and any structure(s) or other man-made features to be modified:</b><p> familiarize itself with the survey, including the location of all existing buildings, utilities, conditions, streets equipment, components and other attributes having or likely to have an impact on the Project; familiarize itself with the Owner's layout and design requirements, conceptual design objectives and budget for the project; familiarize itself with pertinent Project dates and programming needs, including the Project design schedule, review and analyze all Project geotechnical, hazardous substances, structural, chemical, electrical, mechanical and construction materials tests, investigations and recommendations if required; and gather any other information necessary for a thorough understanding of the Project." },
        { id: '1.3', brief: 'Revise Plans per Regulations', detailed: "<b>1.3 Revise the site plans and Owner's requirements in view of the applicable building regulations of all the concerned authorities.</b><p> Endeavour to develop, implement and maintain, in consultation with the Owner and Builder, a spirit of cooperation, collegiality and open communication among the parties so that the goals and objectives of each are clearly understood, potential problems are resolved promptly, and, upon completion, the Project is deemed a success by all parties.  The consultant shall perform all services in accordance with requirements of governmental agencies having jurisdiction over the Project such as {main_authority_long}, {civil_defense}, and other concerned authorities.The Consultant's design shall comply with applicable building codes, accessibility laws and regulations." },
        { id: '1.4', brief: 'Conduct Design Workshops', detailed: "<b>1.4 During the design phases, the consultant agrees to provide, as part of Basic Services, on-site program and budget verification, development and review workshops necessary or desirable to develop a design, acceptable to Owner and its user groups, which is within Owner's budget.</b><p> Such workshop(s) will be conducted with representatives of Owner's user groups. The preliminary drawings and plans of the project shall be prepared including cross-section for the various floors and the main elevations." },
        { id: '1.5', brief: 'Prepare Draft Specifications', detailed: "<b>1.5 Prepare and draft specifications</b><p> in accordance with requirements of the owner and as per the authorities' regulation." }
    ],
    2: [
        { id: '2.1', brief: 'Prepare Preliminary Designs', detailed: "<b>2.1 Based upon the approved Conceptual Schematic Design studies, the consultant shall prepare, for approval by the Owner, Preliminary Design Documents consisting of drawings, 3-dimensional renderings and other documents illustrating the scale and relationship of Project components and building systems parameters.</b><p> Consultant shall prepare and submit the preliminary drawings including Architectural floor plans, Elevations, Sections, Built up and FAR calculations, Parking calculations, in accordance with the requirements of the concerned authority." },
        { id: '2.2', brief: 'Prepare & Submit DWF Files', detailed: "<b>2.2 Preparation of DWF formats from DWG files.</b><p> Submit all necessary documents to Concerned Authority, regular project tracking, preparation of building cards and data sheets, preparation of green building data sheets." },
        { id: '2.3', brief: 'Obtain Preliminary Approval', detailed: "<b>2.3 Obtain the preliminary approval from the concerned authorities for the preliminary drawings.</b><p> Furnish the owner with one set of approved drawings (pdf format)." },
        { id: '2.4', brief: 'Coordinate with Interior Designer', detailed: "<b>2.4 Coordinate and liaise with the Interior Designer for Architectural and MEP layouts and elevations based on AutoCAD." },
        { id: '2.5', brief: 'Manage Soil Investigation & NOCs', detailed: "<b>2.5 Invite reputable soil investigation firms to quote for the Soil Investigation works and topographic works and assign the job to the successful bidder.</b><p> Apply for all NOCs such as {electricity_water}, Etisalat / DU, {civil_defense}, RTA (if required, documents to be prepared by specialized RTA consultant) Final Inspection chamber (FIC)." },
        { id: '2.6', brief: 'Revise Provisional Costs', detailed: "<b>2.6 Revise the provisional costs of the project as per the above.</b>" }
    ],
    3: [
        { id: '3.1', brief: 'Topographic Survey', detailed: "<b>3.1 Undertake the required topographic survey and leveling works, cut and fill (by specialized contractor if required).</b>" },
        { id: '3.2', brief: 'Prepare Final Drawings', detailed: `<b>3.2 Prepare the Final drawing and designs of the project as per the following:</b><p><ol type="A" class="nested-scope-list" data-section="3.2"></ol>` },
        { id: '3.3', brief: 'Submit for Building Permit', detailed: "<b>3.3 Submit the drawings to the Municipality or other concerned authorities for approval & obtaining the Building Permit.</b>" },
        { id: '3.4', brief: 'Provide As-Built Drawings', detailed: "<b>3.4 Furnish the Owner with one set of the As-Built drawings of the project.</b>" }
    ],
    '3.2': [
        { id: '3.2.A', brief: 'Architectural', detailed: "<b>A. The Architectural drawings:</b><p> Detailed Setting out, floor plans, elevations, sections, finishes schedules, area calculations, garbage calculations, green building calculations, architectural detailed enlarged sections and point details, door window schedules, kitchen and toilet details, compound wall details, external structures detailed drawings." },
        { id: '3.2.B', brief: 'Structural', detailed: "<b>B. Structural drawings:</b><p> Detailed drawings such as framing plans, foundations details, column beam schedules, structural details, column beam layouts, structural grids, detailed structural calculations, ETABS model or equivalent." },
        { id: '3.2.C', brief: 'Electrical', detailed: "<b>C. Electrical drawings:</b><p> Detailed floor plans, layouts, power and lighting details, single line diagrams, LV design and load schedules, trench details, substations lv room details." },
        { id: '3.2.D', brief: 'Plumbing', detailed: "<b>D. Plumbing drawings:</b><p> Complete drainage and water supply layouts, riser diagrams, invert level calculations, FIC details, and standard details." },
        { id: '3.2.E', brief: 'Air Conditioning', detailed: "<b>E. Air Conditioning drawings:</b><p> AC layouts ducting layouts, wall and slab sections, insulation details, U values as per green building requirements, AC calculations on HAP as per Dubai Municipality regulations." },
        { id: '3.2.F', brief: 'Fire & Alarm', detailed: "<b>F. Fire protection and Alarm system drawings:</b><p> Firefighting and fire protection layouts, emergency evacuation plans, sprinklers layouts, smoke detectors layouts, riser diagrams and hydraulic calculations (if required)." },
        { id: '3.2.G', brief: 'Solar Panel', detailed: "<b>G. Solar Panel:</b><p>Basic Layout solar panel coordination on roof area. Consultancy and suggestions by expert."}
    ],
    4: [ // MODIFICATION: Added separate BOQ items
        { id: '4.1', brief: 'Prepare Tender Documents', detailed: "<b>4.1 Prepare the Project drawings, Tender & contract documents, General and Particular terms and conditions of the contract agreement.</b>" },
        { id: '4.2', brief: 'Propose Contractors', detailed: "<b>4.2 Propose competent contractors suitable for the execution of the project in consultation with the Owner.</b>" },
        { id: '4.3.A', brief: 'Prepare Architectural BOQ', detailed: "<b>4.3.A Prepare Bill of Quantities for Architectural and Finishing works.</b>" },
        { id: '4.3.B', brief: 'Prepare Structural BOQ', detailed: "<b>4.3.B Prepare Bill of Quantities for Structural works.</b>" },
        { id: '4.3.C', brief: 'Prepare MEP BOQ', detailed: "<b>4.3.C Prepare Bill of Quantities for MEP works.</b>" },
        { id: '4.4', brief: 'Tender Analysis Report', detailed: "<b>4.4 Propose a financial & technical analysis report for the received offers along with Consultants recommendations in this regard and submit it to the Owner for approval.</b>" },
        { id: '4.5', brief: 'Place Contract with Bidder', detailed: "<b>4.5 Upon the approval of the Owner, the Consultant shall place the Contract with the successful tender in the presence of the Owner or his representatives.</b>" }
    ],
    5: [
        { id: '5.1', brief: 'Provide Gantt Chart', detailed: "<b>5.1 Contractor to provide Gant Chart to show estimated Timeline of project.</b>" },
        { id: '5.2', brief: 'Provide Technical Advice', detailed: "<b>5.2 Provide the Owner with the required technical advice when and as necessary.</b>" },
        { id: '5.3', brief: 'Supervise Site Works', detailed: "<b>5.3 Manage and supervise the execution of works at site through site-visits, in order tofollow up the progress of the works and ensure their conformity with the drawings,contract documents, acceptable engineering practices and the terms andconditions of the Contract agreement. The Consultant may issue instructions to the contractor to abide by the terms and conditions of the Contract agreementand/or require him to comply with the Specifications and standards.</b>" },        
{ id: '5.4', brief: 'Approve Workshop Drawings', detailed: "<b>5.4 Approve the detailed workshop drawings proposed by the Contractor, Subcontractors or Suppliers before commencement of execution.</b>" },
        { id: '5.5', brief: 'Interior Design Submissions', detailed: "<b>5.5 Interior Design Scope - Design Submissions:</b><p>Compile and submit working drawings (A-3 copy and PDF) and BOQs (A-4 copy and PDF)The compilations will be categorized on a per area basis." },
        { id: '5.6', brief: 'Provide Clarifications', detailed: "<b>5.6 Provide the Contractor with all necessary clarifications pertaining to the Contract Documents in order to ensure the satisfactory completion of the project.</b>" },
        { id: '5.7', brief: 'Approve Material Samples', detailed: "<b>5.7 Approve the samples of materials supplied by the Contractor for use in the project and endure their soundness with the standards and specifications.</b>" },
        { id: '5.8', brief: 'Inspect Materials & Workmanship', detailed: "<b>5.8 Inspect the materials and their workmanship, and order all necessary tests to be carried on them under his own Supervision.</b>" },
        { id: '5.9', brief: 'Report Progress to Owner', detailed: "<b>5.9 Report to the Owner on the Progress of the project at regular periods.</b>" },
        { id: '5.10', brief: 'Prepare Interim Payments', detailed: "<b>5.10 Prepare interim payment certificates monthly.</b>" },
        { id: '5.11', brief: 'Handle Variations/Amendments', detailed: "<b>5.11 Apply to the concerned authorities as per the applicable procedures to obtain their approval for any amendments/variations agreed upon in writing between the Owner and the Contractor.</b>" },
        { id: '5.12', brief: 'Review Contractor Claims', detailed: "<b>5.12 Review the Contractor's claims and submit his recommendations to the Owner.</b>" },
        { id: '5.13', brief: 'Final Inspection & Certificates', detailed: "<b>5.13 Carry out the final inspection of the works, issue the final acceptance certificates and prepare the final settlements account and Contractor's due payments.</b>" }
    ],
    6: [
        { id: '6.1', brief: 'Guide Owner on Material Selection', detailed: "<b>6.1 The Consultant shall from time to time obtain the approval from the Owner for the use of the material in the construction, decoration of Project for quality, design and colours before giving any approval to the Contractor.</b><p> However the consultant being an expert in this field should give his best opinion and guide the owner in decision making." },
        { id: '6.2', brief: 'Relieved from Liability for Others', detailed: "<b>6.2 The Consultant shall be relieved from responsibility for any injuries resulting from the default and/or instructions of other parties.</b><p> Additionally, the consultant shall not be held responsible for any damage/defects resulting from the acts of God." }
    ],
    7: [
        { id: '7.1', brief: 'Prepare Mood Boards & 3D Renders', detailed: '<b>7.1 Prepare Interior Design Concepts:</b><p>Develop Mood Boards for each area with reference images and color schemes. Prepare 2 or more 3D Render views for each major area.' },
        { id: '7.2', brief: 'Develop Detailed Interior Layouts', detailed: '<b>7.2 Develop Detailed Layouts:</b><p>Prepare detailed interior layouts for all areas<p><ul><li>Flooring layouts</li><li>Ceiling layouts (RCP)</li><li>Elevations with furniture </li><li>Lighting and Electrical</li><li>Mood board </li>...</ul>' },
        { id: '7.3', brief: 'Prepare Interior BOQ & Specifications', detailed: '<b>7.3 Prepare Tender Documents:</b><p>Prepare detailed Bill of Quantities (BOQ) and Specification documents for all interior finishes, fixtures, and furniture (FF&E).' },
        { id: '7.4', brief: 'Manage Showroom Visits & Samples', detailed: '<b>7.4 Project Management & Selections:</b><p>Assist the Client with visits to interior related markets/shops/showrooms for selections.Project Management starts with the commencement of design execution on site.' },
         { id: '7.5', brief: 'Preparing BOQ for ID items', detailed: '<b>7.5 Project Management & Selections:</b><p>The BOQs will be compiled and submitted in an A-4 copy and a CD (soft copy in PDF). The compilations with be categorized on a per package basis.' },
{ id: '7.6', brief: 'Project Management for Interior works', detailed: '<b>7.6 Project Management Stage: </b><p>The Consultants representative will assist the Client if he/she requires the assistance, to visit interior Related Market/ shops/ showrooms for Selections of furnishings, furniture, decorations, accessories, FF & E etc and coordinating with the contractors during the office hours which will be covered as project management fees.  Project Management starts with the commencement of design execution on site.' },
{ id: '7.7', brief: 'Project Management OverTime 800 Aed/-  after office hours', detailed: '<b>7.7 It will be charged at AED 800/hour extra, if after office hours, weekends, or public holidays.' }
    ],
    8: [
        { id: '8.1', brief: 'Fee Calculation Basis', detailed: "<b>8.1 The project cost shall first be calculated on the basis of the provisional cost of the project and then on the basis of the accepted offer price and then the actual cost of the project on effecting the final payment to the Contractor.</b><p> The above ratios of fees for the various project stages shall be adjusted according to the applicable data at the time of payment." },
        { id: '8.2', brief: 'Definition of Actual Cost', detailed: "<b>8.2 The actual cost of the project shall consist of the total payments made to the contractor, the payments made against contractors claims arising out of the contract agreement minus any penalty amounts deducted from the contractor & the fair evaluation to any labour, materials or machinery provided by the owner to the contractor.</b>" },
        { id: '8.3', brief: 'Exclusions from Consultancy Fees', detailed: `<b>8.3 The following are not included in the consultancy fees:</b>...` }
    ],
    9: [
        { id: '9.1', brief: 'Owner to Issue Instructions via Consultant', detailed: "<b>9.1 The Owner undertakes not to enter any amendments on the designs or issue any technical instruction except through the Consultant.</b><p> In case of the Owner does not abide by this condition, the Consultant shall relieve himself from any responsibility for the consequences of such amendments or instructions." },
        { id: '9.2', brief: 'Owner-appointed Staff to follow Consultant', detailed: "<b>9.2 If the Owner insists to appoint a supervision staff such staff shall abide by the Consultants instructions and in case of their non-abidance, the Consultant shall not bear the responsibility for any technical and legal obligations arising out of the contract-agreement;</b><p> provided the official authorities and the Owner are kept informed accordingly." }
    ],
    10: [
        { id: '10.1', brief: 'Handling of Amendments/Variations', detailed: "<b>10. Amendments:</b><p> Should the need arises for any amendment or variation on the designs or documents already prepared by the Consultant at the request of the Owner, the Consultant shall be entitled to remuneration for such amendments and variations as agreed upon between the Consultant and the Owner prior to the commencement of work." }
    ],
    11: [
        { id: '11.1', brief: 'Entitlement to Fees on Extension', detailed: "<b>11.1 Where the need arises for the extension of the original completion period of the project as stated in the contract agreement concluded between the Owner and the Contractor for any reason whatsoever in which the Consultant is not involved, the Consultant shall be entitled to remuneration as per the monthly supervision fees.</b>" },
        { id: '11.2', brief: 'Remuneration on Suspension/Termination', detailed: "<b>11.2 If at any stage of Consultancy work the Consultant's work is partially or totally suspended/Terminated by the order of the Client, the Consultant shall be entitled to a remuneration for the completed stage plus the remuneration for the stage which he has just commenced as well as reasonable remuneration for work completed for the following stages and any other proved costs and expenditures borne by the Consultant in the course of the project execution.</b>" },
        { id: '11.4', brief: 'Delay by Contractor', detailed: "<b>11.4 If there is a delay in the project completion period from the Contractor's side, the Consultant's monthly supervision charges for the extended supervision shall be paid by the contractor as agreed mutually by the Consultant & Contractor till the project is completed.</b>" },
        { id: '11.5', brief: 'Delay by Owner', detailed: "<b>11.5 If there is a delay in the project from Owner's side, the Consultant's monthly supervision charges for the extended supervision shall be paid by the owner which will be agreed mutually between consultant and owner till the project is completed.</b>" }
    ],
    12: [ 
        { id: '12.1', brief: 'Architectural BIM Modeling', detailed: "<b>12.1 Architectural BIM Modeling:</b><p>Development of a 3D architectural model for coordination and visualization." },
        { id: '12.2', brief: 'Structural BIM Modeling', detailed: "<b>12.2 Structural BIM Modeling:</b><p>Development of a 3D structural model, including rebar modeling if required." },
        { id: '12.3', brief: 'MEP BIM Modeling', detailed: "<b>12.3 MEP BIM Modeling:</b><p>Development of a 3D MEP model for all mechanical, electrical, and plumbing systems." },
        { id: '12.4', brief: 'Clash Detection', detailed: "<b>12.4 Clash Detection & Coordination:</b><p>Combining all models into a federated model to run clash detection reports and coordinate resolutions between disciplines." }
    ],
    13: [ // NEW: BIM LOD Section
        { id: '13.1', brief: 'LOD 100 - Concept Design', detailed: "<b>13.1 Level of Detail 100:</b> Model elements are represented with a mass or symbol to analyze basic parameters like area, volume, orientation, and cost." },
        { id: '13.2', brief: 'LOD 200 - Schematic Design', detailed: "<b>13.2 Level of Detail 200:</b> Model elements are represented as generic systems with approximate quantities, size, shape, location, and orientation." },
        { id: '13.3', brief: 'LOD 300 - Detailed Design', detailed: "<b>13.3 Level of Detail 300:</b> Model elements are graphically represented as specific systems, objects or assemblies in terms of quantity, size, shape, location, and orientation." },
        { id: '13.4', brief: 'LOD 350 - Construction Documentation', detailed: "<b>13.4 Level of Detail 350:</b> Model elements include details necessary for cross-coordination, such as connections and interfaces with other elements." },
        { id: '13.5', brief: 'LOD 400 - Fabrication & Assembly', detailed: "<b>13.5 Level of Detail 400:</b> Model elements are modeled with sufficient detail for fabrication, assembly, and installation." }
    ],
   14: [
            { id: '14.1', brief: 'Review of Third-Party Drawings', detailed: `<b>14.1 Structural Review of Drawings Received from Client:</b><p>Review and provide comments on structural drawings prepared by a third party for the following elements:</p><ol type="A" class="nested-scope-list" data-section="14.1"></ol>` },
            { id: '14.2', brief: 'Assessment of Existing Structures', detailed: "<b>14.2 Assessment of Existing Structures:</b><p>Conduct a visual inspection and review of as-built information for existing structural elements. This service includes recommending necessary on-site tests to verify the strength and integrity of concrete and steel reinforcement.</p>" },
            { id: '14.3', brief: 'Strength Testing Coordination', detailed: "<b>14.3 Coordination of Material Strength Testing:</b><p>Coordinate and supervise third-party specialists to conduct tests such as Core Testing for concrete compressive strength, and rebar scanning/testing for steel reinforcement details. A final report will be issued based on the test results." }
        ],
        '14.1': [ // Sub-items for the drawing review
            { id: '14.1.A', brief: 'Footing / Raft / Piles', detailed: "<b> Foundation Systems:</b> Footings, Raft, and Piles" },
            { id: '14.1.B', brief: 'Retaining & Shoring Walls', detailed: "<b> Earth-Retaining Systems:</b> Retaining Walls and Shoring Walls" },
            { id: '14.1.C', brief: 'Slabs & Beams', detailed: "<b> Horizontal Elements:</b> Slabs and Beams" },
            { id: '14.1.D', brief: 'Columns', detailed: "<b> Vertical Elements:</b> Columns" },
            { id: '14.1.E', brief: 'Staircases', detailed: "<b> Staircases:</b> Concrete and/or Metal/Steel Staircases" },
            { id: '14.1.F', brief: 'Ancillary Structures', detailed: "<b> Ancillary Structures:</b> Pergolas, Sheds, Warehouse Structures" }
        ]
    
},
    VILLA_SCHEDULE_TEMPLATE: [
        { id: 1, name: 'MOBILIZATION', startOffset: 0, duration: 62, dependencies: [] }, 
        { id: 2, name: 'SHORING WORKS', startOffset: 31, duration: 19, dependencies: [1] }, 
        { id: 3, name: 'EXCAVATION WORK', startOffset: 51, duration: 27, dependencies: [2] }, 
        { id: 4, name: 'COMPACTION & PCC', startOffset: 62, duration: 31, dependencies: [3] }, 
        { id: 5, name: 'WATER-PROOFING', startOffset: 71, duration: 130, dependencies: [4] }, 
        { id: 6, name: 'SUB-STRUCTURE', startOffset: 109, duration: 140, dependencies: [5] }, 
        { id: 7, name: 'B/WALL WORKS', startOffset: 385, duration: 74, dependencies: [10] }, 
        { id: 8, name: 'FIRST FLOOR SLAB', startOffset: 213, duration: 45, dependencies: [6] }, 
        { id: 9, name: 'ROOF SLAB WORKS', startOffset: 259, duration: 46, dependencies: [18] }, 
        { id: 10, name: 'UPPER ROOF SLAB', startOffset: 342, duration: 23, dependencies: [9] }, 
        { id: 11, name: 'STEEL STAIRCASE', startOffset: 339, duration: 18, dependencies: [10] }, 
        { id: 12, name: 'PLUMBING/DRAINAGE', startOffset: 111, duration: 453, dependencies: [6] }, 
        { id: 13, name: 'WATER TANK', startOffset: 461, duration: 19, dependencies: [10] }, 
        { id: 14, name: 'ELECTRICAL WORKS', startOffset: 62, duration: 483, dependencies: [6] }, 
        { id: 15, name: 'INTERCOM/CCTV', startOffset: 492, duration: 27, dependencies: [21] }, 
        { id: 16, name: 'AC WORK', startOffset: 405, duration: 138, dependencies: [20] }, 
        { id: 17, name: 'FIRE FIGHTING', startOffset: 181, duration: 401, dependencies: [6] }, 
        { id: 18, name: 'BLOCK WORK', startOffset: 204, duration: 189, dependencies: [8] }, 
        { id: 19, name: 'PLASTERING', startOffset: 262, duration: 117, dependencies: [9, 18] }, 
        { id: 20, name: 'GYPSUM CEILING', startOffset: 364, duration: 137, dependencies: [19] }, 
        { id: 21, name: 'INTERNAL FINISHES', startOffset: 410, duration: 127, dependencies: [20] }, 
        { id: 22, name: 'EXTERNAL FINISHES', startOffset: 375, duration: 113, dependencies: [19, 7] }, 
        { id: 23, name: 'ALUMINIUM WORK', startOffset: 339, duration: 207, dependencies: [19] }, 
        { id: 24, name: 'LIFT WORK', startOffset: 436, duration: 142, dependencies: [10] }, 
        { id: 25, name: 'JOINERY WORK', startOffset: 426, duration: 65, dependencies: [21] }, 
        { id: 26, name: 'SWIMMING POOL', startOffset: 461, duration: 54, dependencies: [10] }, 
        { id: 27, name: 'LANDSCAPE WORK', startOffset: 466, duration: 111, dependencies: [22, 26] }, 
        { id: 28, name: 'MAIN GATE WORK', startOffset: 507, duration: 61, dependencies: [7, 22] }, 
        { id: 29, name: 'SNAGGING', startOffset: 565, duration: 7, dependencies: [21, 22, 23, 24, 25, 27, 28] }, 
        { id: 30, name: 'AUTHORITY INSPECTION', startOffset: 572, duration: 5, dependencies: [29] },
    ]
};
    // --- DATA STORE (In a real app, this would come from a database) ---
    const STAFF_DATA = [
        { id: 1, name: 'Faisal M.', role: 'Architect', joinDate: '2005-01-15', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 2, name: 'Adnan K.', role: 'Architect', joinDate: '2022-02-01', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 3, name: 'Imran S.', role: 'Structure Engineer', joinDate: '2021-11-10', grossSalary: 13000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 4, name: 'Bilal H.', role: 'MEP Engineer', joinDate: '2022-05-20', grossSalary: 7000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 5, name: 'Kareem A.', role: 'Designer', joinDate: '2023-01-10', grossSalary: 4000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 6, name: 'Sana R.', role: 'Receptionist', joinDate: '2022-08-01', grossSalary: 3000, leaveBalance: 30, increments: [], leaves: [] },
        { id: 7, name: 'Ali Z.', role: 'Office Boy', joinDate: '2022-09-01', grossSalary: 2000, leaveBalance: 30, increments: [], leaves: [] }
    ];

    const OFFICE_EXPENSES = [
        { id: 1, date: '2024-05-01', category: 'Rent', description: 'Office Rent for May', amount: 7000 },
        { id: 2, date: '2024-05-05', category: 'Utilities (DEWA)', description: 'Electricity and Water bill', amount: 2000 },
        { id: 3, date: '2024-05-10', category: 'Petty Cash', description: 'Monthly petty cash refill', amount: 6000 },
        { id: 4, date: '2024-04-01', category: 'Rent', description: 'Office Rent for April', amount: 7000 },
        { id: 5, date: '2024-04-04', category: 'Utilities (DEWA)', description: 'Electricity and Water bill', amount: 2150 },
        { id: 6, date: '2024-02-15', category: 'Office Supplies', description: 'Stationery and printer toner', amount: 850 },
    ];
    // --- END OF DATA STORE ---
    // --- DATA FROM PDF ---
    // This data is extracted directly from the provided PDF image.
    const STAFF_SALARIES = [
        { role: 'Architect 1', salary: 13000, group: 'Architects' },
        { role: 'Architect 2', salary: 13000, group: 'Architects' },
        { role: 'Structure Engineer 1', salary: 13000, group: 'Engineers' },
        { role: 'Structure Engineer 2', salary: 13000, group: 'Engineers' },
        { role: 'MEP Engineer', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 1', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 2', salary: 7000, group: 'Engineers' },
        { role: 'Inspection Engineer 3', salary: 7000, group: 'Engineers' },
        { role: 'Designer 1', salary: 4000, group: 'Designers' },
        { role: 'Designer 2', salary: 4000, group: 'Designers' },
        { role: 'Receptionist', salary: 3000, group: 'Admin' },
        { role: 'Office Boy', salary: 2000, group: 'Admin' },
        { role: 'Staff 1', salary: 2000, group: 'Admin' },
        { role: 'Staff 2', salary: 2000, group: 'Admin' }
    ];

    const MONTHLY_OFFICE_EXPENSES = [
        { item: 'Rent', amount: 7000 },
        { item: 'DEWA', amount: 2000 },
        { item: 'Petty Cash', amount: 6000 }
    ];
    
    const YEARLY_FIXED_EXPENSES = [
        { item: 'LICENSE', amount: 40000 },
        { item: 'Healthcare', amount: 98000 },
        { item: 'Gratuity', amount: 58200 },
        { item: 'Visa', amount: 42000 }
    ];
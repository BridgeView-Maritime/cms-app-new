// Declarative definitions for the BMPL back-office pages that are, at heart,
// a filtered list with a detail/edit form. One generic API and one generic
// React page serve all of them; the workflow pages (sourcing, documentation,
// sign-on) are hand-built in bmplRoutes.js and the client.
//
// Field names are the legacy MySQL column names, so nothing written here is
// invisible to the old tooling that still reads these tables.
//
// column types: text | longtext | date | datetime | money | status | file | lookup
// form types:   text | textarea | number | date | select | lookup | yesno
import { LegacyBoCompany } from '../models/legacy/LegacyBoCompany.js';
import { LegacyVessel } from '../models/legacy/LegacyVessel.js';
import { LegacyBoRank } from '../models/legacy/LegacyBoRank.js';
import { LegacyBdevelopment } from '../models/legacy/LegacyBdevelopment.js';
import { LegacyLastAuditReport } from '../models/legacy/LegacyLastAuditReport.js';
import { LegacyManningContractCopy } from '../models/legacy/LegacyManningContractCopy.js';
import { LegacyImportantInformation } from '../models/legacy/LegacyImportantInformation.js';
import { LegacyAgentDetails } from '../models/legacy/LegacyAgentDetails.js';
import { LegacyPrequisition } from '../models/legacy/LegacyPrequisition.js';
import { LegacyDoctor } from '../models/legacy/LegacyDoctor.js';
import { LegacyCompanylogin } from '../models/legacy/LegacyCompanylogin.js';
import { LegacyPayroll } from '../models/legacy/LegacyPayroll.js';
import { LegacyStaffAttendance } from '../models/legacy/LegacyStaffAttendance.js';
import { LegacyEditvacancies } from '../models/legacy/LegacyEditvacancies.js';
import { LegacyDynCrew } from '../models/legacy/LegacyDynCrew.js';
import { LegacyNrpa } from '../models/legacy/LegacyNrpa.js';
import { LegacyPcc } from '../models/legacy/LegacyPcc.js';
import { LegacyCoscertificate } from '../models/legacy/LegacyCoscertificate.js';
import { LegacyCcoscertificate } from '../models/legacy/LegacyCcoscertificate.js';
import { LegacyVisaservice } from '../models/legacy/LegacyVisaservice.js';
import { LegacyLogCandidate } from '../models/legacy/LegacyLogCandidate.js';
import { LegacyLicensedetails } from '../models/legacy/LegacyLicensedetails.js';
import { LegacyMmd } from '../models/legacy/LegacyMmd.js';
import { LegacyVaccinationCard } from '../models/legacy/LegacyVaccinationCard.js';
import { LegacyDgCircular } from '../models/legacy/LegacyDgCircular.js';
import { LegacyTarbook } from '../models/legacy/LegacyTarbook.js';
import { LegacySeaServiceRequest } from '../models/legacy/LegacySeaServiceRequest.js';
import { LegacyBlacklist } from '../models/legacy/LegacyBlacklist.js';
import { LegacyInvoice } from '../models/legacy/LegacyInvoice.js';
import { LegacyBankaccounts } from '../models/legacy/LegacyBankaccounts.js';
import { LegacyVendorinvoiceFollowup } from '../models/legacy/LegacyVendorinvoiceFollowup.js';
import { LegacyOtherExpenses } from '../models/legacy/LegacyOtherExpenses.js';
import { LegacyCompanyinvoiceFollowup } from '../models/legacy/LegacyCompanyinvoiceFollowup.js';
import { LegacyTblEvents } from '../models/legacy/LegacyTblEvents.js';
import { LegacyProformainvoice } from '../models/legacy/LegacyProformainvoice.js';
import { LegacyNedpassInvoice } from '../models/legacy/LegacyNedpassInvoice.js';
import { LegacyShoreVacancies } from '../models/legacy/LegacyShoreVacancies.js';
import { LegacyShoreRank } from '../models/legacy/LegacyShoreRank.js';
import { LegacyNotice } from '../models/legacy/LegacyNotice.js';
import { LegacyEmailFormat } from '../models/legacy/LegacyEmailFormat.js';
import { LegacyBbdevelopment } from '../models/legacy/LegacyBbdevelopment.js';
import { LegacyNedpass } from '../models/legacy/LegacyNedpass.js';
import { LegacyFlagdocNew } from '../models/legacy/LegacyFlagdocNew.js';
import { LegacyVisatype } from '../models/legacy/LegacyVisatype.js';
import { LegacyVisitors } from '../models/legacy/LegacyVisitors.js';
import { LegacyInandoutDocuments } from '../models/legacy/LegacyInandoutDocuments.js';
import { PpeRequest as LegacyPpeRequest } from '../models/PpeModels.js';
import { LegacyHotelRequest } from '../models/legacy/LegacyHotelRequest.js';
import { LegacyMedicalRequest } from '../models/legacy/LegacyMedicalRequest.js';
import { LegacyExpiryTbl } from '../models/legacy/LegacyExpiryTbl.js';
import { LegacyNewassetTable } from '../models/legacy/LegacyNewassetTable.js';
import { LegacyBmplOwnership } from '../models/legacy/LegacyBmplOwnership.js';
import { LegacyOwnershipVessel } from '../models/legacy/LegacyOwnershipVessel.js';
import { LegacyKsaVisa } from '../models/legacy/LegacyKsaVisa.js';
import { LegacyHandoverDetails } from '../models/legacy/LegacyHandoverDetails.js';
import { LegacyInstituteCertificate } from '../models/legacy/LegacyInstituteCertificate.js';
import { LegacyCurrency } from '../models/legacy/LegacyCurrency.js';
import { LegacyShipSubcat } from '../models/legacy/LegacyShipSubcat.js';
import { LegacyCategShiptype } from '../models/legacy/LegacyCategShiptype.js';
import { LegacyBoCountry } from '../models/legacy/LegacyBoCountry.js';
import { LegacyQuestionbank } from '../models/legacy/LegacyQuestionbank.js';
import { LegacyImpweblink } from '../models/legacy/LegacyImpweblink.js';
import { LegacyBasicRequirement } from '../models/legacy/LegacyBasicRequirement.js';
import { LegacyInvoiceVendor } from '../models/legacy/LegacyInvoiceVendor.js';
import { LegacyPayments } from '../models/legacy/LegacyPayments.js';
import { LegacyAccountDocument } from '../models/legacy/LegacyAccountDocument.js';
import { LegacyItrDoc } from '../models/legacy/LegacyItrDoc.js';
import { LegacyNrpaInvoice } from '../models/legacy/LegacyNrpaInvoice.js';
import { LegacyGrievanceChat } from '../models/legacy/LegacyGrievanceChat.js';
import { Grievance } from '../models/Grievance.js';

const ACTIVE = { status: { $in: ['1', 1] } };
const INACTIVE = { status: { $in: ['0', 0] } };

const col = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const YES_NO = ['Yes', 'No'];
const PAID = ['Paid', 'Not Paid'];

export const RESOURCES = {
  // ======================================================================
  // OWNER
  // ======================================================================
  owners: {
    title: 'List of Owner', menu: 'owner', legacyPage: 'manage_company.php',
    model: LegacyBoCompany, idField: 'com_id', baseFilter: ACTIVE, defaultSort: { com_id: -1 },
    columns: [col('company_shortname', 'Owner ID'), col('company_name', 'Company name'), col('vessels', 'Vessel list', 'count'), col('phoneno', 'Phone number'), col('email', 'Email'), col('email_accountdep1', 'Accounts dept. email'), col('address', 'Address'), col('contactperson', 'Contact person'), col('contract_date', 'Contract start', 'date'), col('reviesed_date', 'Contract revised', 'date'), col('validity_date', 'Agreement valid till', 'date'), col('country', 'Country'), col('invoice_type', 'Invoice type'), col('crew_welfare', 'Crew welfare', 'status')],
    search: ['company_name', 'company_shortname', 'email', 'contactperson', 'country'],
    filters: [{ key: 'country', label: 'Country', from: 'distinct' }, { key: 'invoice_type', label: 'Invoice type', from: 'distinct' }],
    form: [f('company_name', 'Company name', 'text', { required: true }), f('company_shortname', 'Short name'), f('country', 'Country'), f('cperson_prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs', 'Dr'] }), f('contactperson', 'Contact person'), f('phoneno', 'Phone'), f('email', 'Email'), f('address', 'Address', 'textarea'), f('panno', 'PAN'), f('gstno', 'GST no.'), f('validity_date', 'Agreement valid till', 'date'), f('agreement_type', 'Agreement type'), f('invoice_type', 'Invoice type', 'select', { options: ['Normal', 'Consolidated'] }), f('crew_welfare', 'Crew welfare', 'select', { options: ['1', '0'], labels: ['Yes', 'No'] }),
      f('crewing_department11', 'Crewing contact 1'), f('phonecrewing_department1', 'Crewing phone 1'), f('crewemail1', 'Crewing email 1'), f('crewing_department22', 'Crewing contact 2'), f('phonecrewing_department2', 'Crewing phone 2'), f('crewemail2', 'Crewing email 2'),
      f('accounts_department11', 'Accounts contact 1'), f('phoneaccounts_department1', 'Accounts phone 1'), f('email_accountdep1', 'Accounts email 1')],
    statusField: 'status', creatable: true, editable: true,
    related: [{ key: 'vessels', title: 'Vessels', resource: 'vessels', field: 'company_name', match: 'com_id' }],
    counts: [{ key: 'vessels', label: 'Vessels', model: LegacyVessel, foreign: 'company_name', local: 'com_id' }],
  },
  ownersInactive: {
    title: 'List of Deactive Owner', menu: 'owner', legacyPage: 'manage_companyd.php',
    model: LegacyBoCompany, idField: 'com_id', baseFilter: INACTIVE, defaultSort: { com_id: -1 },
    columns: [col('company_shortname', 'Owner ID'), col('company_name', 'Company name'), col('vessels', 'Vessel list', 'count'), col('phoneno', 'Phone number'), col('email', 'Email'), col('address', 'Address'), col('contactperson', 'Contact person'), col('country', 'Country'), col('deactivate_date', 'Deactivated', 'datetime'), col('deactivate_by', 'By')],
    search: ['company_name', 'company_shortname', 'email'],
    statusField: 'status', reactivate: true,
    counts: [{ key: 'vessels', label: 'Vessels', model: LegacyVessel, foreign: 'company_name', local: 'com_id' }],
  },
  vessels: {
    title: 'Vessel Profile', menu: 'owner', legacyPage: 'vessel_search.php',
    model: LegacyVessel, idField: 'vessel_id', baseFilter: ACTIVE, defaultSort: { vessel_id: -1 },
    columns: [col('company_name', 'Name of employer', 'lookup'), col('vesselname', 'Ship name'), col('IMO_Number', 'IMO no.'), col('call_sign', 'Call sign'), col('grt', 'Gross tonnage'), col('bhp', 'Kilo watt'), col('vessel_category', 'Ship category'), col('vesseltype', 'Ship type'), col('Flag', 'Ship flag'), col('pipolicynumber', 'P&I policy no.'), col('policydateofv', 'Validity policy date', 'date'), col('mlccertificateno', 'MLC certificate no.'), col('dofmlccertificate', 'Issue date', 'date'), col('doexpiry', 'Validity date', 'date'), col('fsdnumber', 'Financial security doc. number'), col('fsdvalidity', 'Financial security doc. validity', 'date'), col('maritimelabourconvention', 'MLC certificate', 'file'), col('fsdocument', 'Financial security document', 'file'), col('cdagreement', 'Collective Bargaining Agreement', 'file'), col('seagreement', 'Seafarer Employment Agreement', 'file'), col('pipolicydocument', 'P&I document', 'file'), col('dmlcp1', 'DMLC part 1', 'file'), col('dmlc2', 'DMLC part 2', 'file'), col('no_of_field_update_by_rps', 'Fields updated by RPS'), col('amount_paid_by_rps_field_update', 'Amount paid by RPS', 'money'), col('ref_no_of_bharatkosh_receipt', 'Bharatkosh receipt ref'), col('bharatkosh_receipt', 'Bharatkosh receipt', 'file'), col('bharatkosh_receipt_date', 'Bharatkosh receipt date', 'date'), col('bharatkosh_receipt_remark', 'Remark'), col('bharatkosh_receipt_add_by', 'Receipt added by'), col('remark', 'Vessel remark'), col('doneby', 'By')],
    lookups: { company_name: 'company' },
    search: ['vesselname', 'IMO_Number', 'call_sign', 'Flag'],
    filters: [{ key: 'company_name', label: 'Owner', from: 'lookup:company' }, { key: 'vessel_category', label: 'Category', from: 'distinct' }],
    form: [f('vesselname', 'Vessel name', 'text', { required: true }), f('company_name', 'Owner', 'lookup', { lookup: 'company', required: true }), f('IMO_Number', 'IMO number'), f('call_sign', 'Call sign'), f('vessel_category', 'Category', 'select', { options: ['Offshore', 'Mainfleet', 'Onshore'] }), f('vesseltype', 'Vessel type'), f('Flag', 'Flag'), f('grt', 'GRT'), f('bhp', 'BHP'), f('bhp2', 'BHP unit', 'select', { options: ['KW', 'HP'] }), f('pipolicynumber', 'P&I policy no.'), f('policydateofv', 'P&I valid till', 'date'), f('mlccertificateno', 'MLC certificate no.'), f('dofmlccertificate', 'MLC issued', 'date'), f('doexpiry', 'MLC expiry', 'date'), f('fsdnumber', 'FSD number'), f('fsdvalidity', 'FSD validity', 'date'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true,
  },
  prospectiveClients: {
    title: 'Prospective Client', menu: 'owner', legacyPage: 'manage_perspective_client.php',
    model: LegacyBdevelopment, idField: 'bid', baseFilter: { bstatus: { $in: ['1', 1] } }, defaultSort: { bid: -1 },
    columns: [col('company_name', 'Company name'), col('contact_person', 'Contact person'), col('contact_number', 'Phone'), col('emailid', 'Email'), col('country', 'Country'), col('address', 'Address'), col('bcategory', 'Category'), col('location', 'Location'), col('remark', 'Remark'), col('bdate', 'Date', 'datetime'), col('buser', 'Added by')],
    search: ['company_name', 'emailid', 'location', 'remark'],
    filters: [{ key: 'bcategory', label: 'Category', from: 'distinct' }, { key: 'location', label: 'Location', from: 'distinct' }],
    form: [f('company_name', 'Company', 'text', { required: true }), f('bcategory', 'Category', 'select', { options: ['Marine', 'Offshore', 'Onshore', 'Other'] }), f('location', 'Location'), f('country', 'Country'), f('contact_person', 'Contact person'), f('contact_number', 'Phone'), f('emailid', 'Email'), f('address', 'Address', 'textarea'), f('remark', 'Remark', 'textarea')],
    statusField: 'bstatus', creatable: true, editable: true, stamp: { user: 'buser', date: 'bdate' },
    actions: [
      {key: 'won', label: 'Became a client', set: {bfrom: 'Owner', remark: '$input'}, done: 'Marked as converted - add them under List of Owner.'},
    ],
  },
  statutoryAudits: {
    title: 'Statutory Documents - Audit reports', menu: 'owner', legacyPage: 'statutory_documents.php',
    model: LegacyLastAuditReport, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('lar_year', 'Audit year'), col('comid', 'Company', 'lookup'), col('document_type', 'Type'), col('uplod', 'Document', 'file'), col('report', 'Report', 'file'), col('cdate', 'Added', 'date'), col('user', 'By')],
    lookups: { comid: 'company' },
    search: ['lar_year', 'document_type'],
    form: [f('lar_year', 'Year', 'text', { required: true }), f('document_type', 'Document type')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'user', date: 'cdate' },
    siblings: ['statutoryManning', 'statutoryInfo'],
  },
  statutoryManning: {
    title: 'Statutory Documents - Manning contracts', menu: 'owner', legacyPage: 'statutory_documents.php', hidden: true,
    model: LegacyManningContractCopy, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('valid_from', 'Valid from', 'date'), col('valid_till', 'Valid till', 'date'), col('audit_year', 'Audit year'), col('uplod', 'Document', 'file'), col('user', 'By'), col('cdate', 'Added', 'datetime')],
    form: [f('valid_from', 'Valid from', 'date'), f('valid_till', 'Valid till', 'date'), f('audit_year', 'Audit year')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'user', date: 'cdate' },
  },
  statutoryInfo: {
    title: 'Statutory Documents - Important information', menu: 'owner', legacyPage: 'statutory_documents.php', hidden: true,
    model: LegacyImportantInformation, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('uplod', 'Document', 'file'), col('user', 'By'), col('cdate', 'Added', 'datetime')],
    statusField: 'status', editable: false,
  },
  ranks: {
    title: 'Rank', menu: 'owner', legacyPage: 'manage_rank.php',
    model: LegacyBoRank, idField: 'id', defaultSort: { rankname: 1 },
    columns: [col('rankname', 'Rank'), col('type', 'Type'), col('subcategory', 'Department'), col('catagory', 'Category'), col('post', 'Post'), col('status', 'Active', 'status'), col('doe', 'Added', 'datetime')],
    search: ['rankname', 'type', 'subcategory'],
    filters: [{ key: 'type', label: 'Type', from: 'distinct' }, { key: 'subcategory', label: 'Department', from: 'distinct' }, { key: 'status', label: 'Status', options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] }],
    form: [f('rankname', 'Rank name', 'text', { required: true }), f('type', 'Type', 'select', { options: ['Officer', 'Rating', 'Other'] }), f('subcategory', 'Department', 'select', { options: ['Deck', 'Engine', 'Catering', 'Other'] }), f('catagory', 'Category'), f('post', 'Post order', 'number'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, invalidates: 'rank',
  },

  // ======================================================================
  // VENDOR
  // ======================================================================
  vendors: {
    title: 'Vendor Details', menu: 'vendor', legacyPage: 'manage_vendor_detail.php',
    model: LegacyAgentDetails, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('Agent_name', 'Vendor name'), col('Address', 'Address'), col('contactperson', 'Contact person'), col('contactno', 'Phone'), col('contactemail', 'Email'), col('services', 'Services offer'), col('provider', 'Provider'), col('remark', 'Remark'), col('approve', 'Approved', 'status'), col('addedby', 'Added by'), col('cdate', 'Added', 'date')],
    search: ['Agent_name', 'services', 'contactperson', 'contactemail', 'Address'],
    filters: [{ key: 'services', label: 'Service', from: 'distinct' }, { key: 'provider', label: 'Provider', from: 'distinct' }],
    form: [f('Agent_name', 'Vendor name', 'text', { required: true }), f('agent_shortname', 'Short name'), f('services', 'Services'), f('provider', 'Provider', 'select', { options: ['visa', 'flag', 'medical', 'travel', 'ppe', 'hotel', 'courier', 'other'] }), f('prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs'] }), f('contactperson', 'Contact person'), f('contactno', 'Phone'), f('contactemail', 'Email'), f('contactemail2', 'Email 2'), f('Address', 'Address', 'textarea'), f('bankname', 'Bank'), f('accountname', 'Account name'), f('accountno', 'Account no.'), f('ifscode', 'IFSC'), f('panno', 'PAN'), f('gstno', 'GST no.'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addedby', date: 'cdate' }, invalidates: 'agent',
  },
  purchaseRequisitions: {
    title: 'Purchase Requisition', menu: 'vendor', legacyPage: 'gprequisition.php',
    model: LegacyPrequisition, idField: 'id', defaultSort: { id: -1 },
    columns: [col('svendor', 'Vendor name', 'lookup'), col('wpurchase', 'Purchased status'), col('ecofcomp', 'Expected date of completion', 'date'), col('iname', 'Raised by'), col('cdate', 'Raised', 'datetime')],
    lookups: { svendor: 'agent', svendor: 'agent' },
    search: ['iname', 'wpurchase'],
    form: [f('iname', 'Item', 'text', { required: true }), f('svendor', 'Vendor', 'lookup', { lookup: 'agent' }), f('wpurchase', 'Purchased for'), f('ecofcomp', 'Expected completion', 'date')],
    creatable: true, editable: true, stamp: { date: 'cdate' },
  },
  doctors: {
    title: 'Doctors', menu: 'vendor', legacyPage: 'manage_docotor_details.php',
    model: LegacyDoctor, idField: 'id', defaultSort: { doctorname: 1 },
    columns: [col('doctorname', 'Doctor name'), col('email', 'Email'), col('email2', 'Email 2'), col('dphoneno', 'Contact'), col('dphoneno2', 'Contact 2'), col('daddress', 'Address'), col('medical', 'Medical types'), col('amount', 'Amount', 'money'), col('remark', 'Remark'), col('addby', 'Addby'), col('status', 'Active', 'status')],
    search: ['doctorname', 'daddress', 'email'],
    filters: [{ key: 'status', label: 'Status', options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] }],
    form: [f('prefix', 'Prefix', 'select', { options: ['Dr.', 'Mr', 'Ms'] }), f('doctorname', 'Doctor name', 'text', { required: true }), f('daddress', 'Address', 'textarea'), f('dphoneno', 'Phone'), f('dphoneno2', 'Phone 2'), f('email', 'Email'), f('email2', 'Email 2'), f('medical', 'Medical types'), f('amount', 'Amount'), f('crew_amount', 'Crew amount'), f('p_i', 'P&I approved', 'select', { options: YES_NO }), f('remark', 'Remark', 'textarea'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, stamp: { user: 'addby', date: 'adddate' }, invalidates: 'doctor',
  },

  // ======================================================================
  // BMPL EMPLOYEE
  // ======================================================================
  staff: {
    title: 'Staff Member List', menu: 'employee', legacyPage: 'manage_adminuser.php',
    model: LegacyCompanylogin, idField: 'id', defaultSort: { fullname: 1 },
    columns: [col('fullname', 'Full name'), col('username', 'Username'), col('dept', 'Department'), col('position', 'Position'), col('email', 'Email'), col('phonenumber', 'Phone'), col('company', 'Company'), col('joining_date', 'Joined', 'date'), col('image', 'Images', 'file'), col('jd', 'JD', 'file'), col('monthly_target', 'Target'), col('blockstatus', 'Block status'), col('status', 'Active', 'status')],
    hiddenFields: ['password', 'cookies', 'wati_otp'],
    search: ['fullname', 'username', 'email', 'dept', 'position'],
    filters: [{ key: 'dept', label: 'Department', from: 'distinct' }, { key: 'status', label: 'Status', options: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] }],
    form: [f('prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs'] }), f('fullname', 'Full name', 'text', { required: true }), f('dept', 'Department'), f('position', 'Position'), f('email', 'Official email'), f('per_email', 'Personal email'), f('phonenumber', 'Phone'), f('per_phone', 'Personal phone'), f('dob', 'Date of birth', 'date'), f('joining_date', 'Joining date', 'date'), f('leaving_date', 'Leaving date', 'date'), f('address', 'Address', 'textarea'), f('city', 'City'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    editable: true, invalidates: 'staff',
  },
  payroll: {
    title: 'Pay Roll (history)', menu: 'employee', legacyPage: 'showsalaryslip.php',
    model: LegacyPayroll, idField: 'id', defaultSort: { formonth: -1 },
    columns: [col('userid', 'Name', 'lookup'), col('formonth', 'Month', 'date'), col('pdate', 'Creation date', 'datetime'), col('paysal', 'Total generated salary', 'money'), col('noofwdays', 'Working days'), col('noofabsent', 'Absent'), col('given_status', 'Status'), col('approval', 'Approved', 'status'), col('puser', 'By')],
    lookups: { userid: 'staff' },
    filters: [{ key: 'userid', label: 'Staff', from: 'lookup:staff' }, { key: 'cdate', label: 'Month', type: 'daterange' }],
    readOnly: true, note: 'Historical payroll from the old system. Payroll is now run from the HR module.',
  },
  staffAttendance: {
    title: 'Daily attendance (history)', menu: 'employee', legacyPage: 'dailyattendance_report.php',
    model: LegacyStaffAttendance, idField: 'id', defaultSort: { date: -1 },
    columns: [col('username', 'Employee name'), col('date', 'Date', 'date'), col('in_time', 'In', 'datetime'), col('out_time', 'Out', 'datetime'), col('leave_time', 'Leave', 'datetime'), col('intime_location', 'In location'), col('intime_location_status', 'In status'), col('outtime_location', 'Out location'), col('remarks', 'Remark')],
    search: ['username'],
    filters: [{ key: 'username', label: 'Staff', from: 'distinct' }, { key: 'day_type', label: 'Day type', from: 'distinct' }, { key: 'adate', label: 'Date', type: 'daterange' }],
    readOnly: true, note: 'Historical attendance from the old system. Attendance is now recorded in the HR module.',
  },

  // ======================================================================
  // SOURCING (list-style parts; the workflow pages are custom)
  // ======================================================================
  closedVacancies: {
    title: 'Deleted / Closed Vacancies', menu: 'sourcing', legacyPage: 'manage_oldvacancy.php',
    model: LegacyEditvacancies, idField: 'id', defaultSort: { eiddate: -1 },
    columns: [col('eid', 'JOB ID'), col('dov', 'Date', 'datetime'), col('company_name', 'Company name', 'lookup'), col('rankname', 'Rank', 'lookup'), col('vessel_id', 'Vessel', 'lookup'), col('jlocation', 'Joining location'), col('excrew', 'Vacancy type joining'), col('exp', 'Opening details'), col('noopening', 'No of opening'), col('salary', 'Salary'), col('currency_type', 'Currency', 'lookup'), col('type_days', 'Day/month'), col('remark', 'Remark'), col('image', 'Vacancy details', 'file'), col('user', 'User'), col('editremark', 'Change'), col('eidby', 'Edited by'), col('eiddate', 'On', 'datetime')],
    lookups: { company_name: 'company', rankname: 'rank', vessel_id: 'vessel' },
    search: ['crew_name', 'jlocation', 'remark', 'editremark'],
    filters: [{ key: 'company_name', label: 'Owner', from: 'lookup:company' }, { key: 'exp', label: 'State', from: 'distinct' }, { key: 'dov', label: 'Raised', type: 'daterange' }],
    readOnly: true,
  },

  // ======================================================================
  // DOCUMENTATION (list-style parts)
  // ======================================================================
  ownerCrewContacts: {
    title: 'Owner crew contacts', menu: 'owner', legacyPage: 'manage_company.php', hidden: true,
    model: LegacyDynCrew, idField: 'id', defaultSort: { id: -1 },
    columns: [col('companyid', 'Owner', 'lookup'), col('crew_type', ''), col('crew_name', 'Crew contact'), col('crew_phone', 'Phone'), col('crew_email', 'Email'), col('crew_expire', 'Expires', 'date')],
    lookups: { companyid: 'company' },
    search: ['crew_name', 'crew_email'],
    filters: [{ key: 'companyid', label: 'Owner', from: 'lookup:company' }],
    form: [f('companyid', 'Owner', 'lookup', { lookup: 'company', required: true }), f('crew_type', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs', 'Capt'] }), f('crew_name', 'Name', 'text', { required: true }), f('crew_phone', 'Phone'), f('crew_email', 'Email'), f('crew_expire', 'Expires', 'date')],
    creatable: true, editable: true, deletable: true,
  },

  // ======================================================================
  // NRPA
  // ======================================================================
  emigrate: {
    title: 'Data Submit For eMigrate', menu: 'nrpa', legacyPage: 'emigratepassport.php',
    model: LegacyNrpa, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('refno', 'Reference no'), col('name', 'Name'), col('nrpatype', 'NRPA type'), col('joinertype', 'Joiner type'), col('nationality', 'Nationality'), col('passport', 'Passport'), col('rank', 'Rank', 'lookup'), col('ranktype', 'Rank type'), col('company', 'Company', 'lookup'), col('vessle', 'Vessel', 'lookup'), col('flag', 'Flag'), col('imo', 'IMO'), col('date_leave', 'Left home', 'date'), col('flight_date', 'Flight', 'date'), col('signondate', 'Signed on', 'date'), col('signoffdate', 'Signed off', 'date'), col('ticket', 'Ticket'), col('travellocation', 'Travel location'), col('immigration_officer', 'Immigration'), col('remark', 'Remark'), col('doneby', 'By')],
    lookups: { rank: 'rank', company: 'company', vessle: 'vessel' },
    search: ['refno', 'name', 'passport', 'imo', 'remark'],
    filters: [{ key: 'company', label: 'Owner', from: 'lookup:company' }, { key: 'nrpatype', label: 'Type', from: 'distinct' }, { key: 'joinertype', label: 'Joiner', from: 'distinct' }, { key: 'cdate', label: 'Date', type: 'daterange' }],
    form: [f('name', 'Name', 'text', { required: true }), f('passport', 'Passport'), f('nationality', 'Nationality'), f('rank', 'Rank', 'lookup', { lookup: 'rank' }), f('ranktype', 'Rank type'), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('vessle', 'Vessel', 'lookup', { lookup: 'vessel' }), f('flag', 'Flag'), f('imo', 'IMO'), f('nrpatype', 'Type', 'select', { options: ['NRPA', 'RPA'] }), f('joinertype', 'Joiner type', 'select', { options: ['Newjoiner', 'Rejoiner'] }), f('contract_duration', 'Contract (months)'), f('date_leave', 'Departure date', 'date'), f('flight_date', 'Flight date', 'date'), f('travellocation', 'Travel from'), f('ticket', 'Ticket / joining'), f('immigration_officer', 'Immigration point'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'doneby', date: 'cdate' },
  },
  techniciansJoined: {
    title: 'List Of Technician Joined', menu: 'nrpa', legacyPage: 'nrpa_report.php',
    model: LegacyNrpa, idField: 'id', baseFilter: { ...ACTIVE, ranktype: { $ne: 'Vessel Rank' } }, defaultSort: { id: -1 },
    columns: [col('refno', 'Reference no'), col('name', 'Name'), col('nrpatype', 'NRPA type'), col('joinertype', 'Joiner type'), col('nationality', 'Nationality'), col('passport', 'Passport'), col('rank', 'Rank', 'lookup'), col('company', 'Company', 'lookup'), col('vessle', 'Vessel', 'lookup'), col('flag', 'Flag'), col('date_leave', 'Left home', 'date'), col('signondate', 'Signed on', 'date'), col('signoffdate', 'Signed off', 'date'), col('davailable', 'Available from', 'date'), col('travellocation', 'Travel location'), col('cancelled_by', 'Cancelled by'), col('cancelled_remark', 'Cancel remark'), col('doneby', 'By')],
    lookups: { rank: 'rank', company: 'company', vessle: 'vessel' },
    search: ['refno', 'name', 'passport'],
    filters: [{ key: 'doj', label: 'Joined', type: 'daterange' }],
    readOnly: true,
  },

  // ======================================================================
  // LETTER DETAILS
  // ======================================================================
  pcc: {
    title: 'PCC Manager', menu: 'letters', legacyPage: 'pcclist.php',
    model: LegacyPcc, idField: 'id', defaultSort: { id: -1 },
    columns: [col('refno', 'Reference number'), col('cname', 'Candidate name'), col('lname', 'Last name'), col('profile', 'Rank'), col('owner', 'Owner name'), col('pass', 'Passport'), col('field', 'Field'), col('doi', 'Issue date', 'date'), col('doe', 'Expiry', 'date'), col('addby', 'Added by'), col('requested_by', 'Requested by'), col('adddate', 'Date', 'date'), col('approval', 'Approved', 'status')],
    search: ['refno', 'cname', 'indosno', 'pass', 'owner'],
    filters: [{ key: 'issue_status', label: 'Issue status', from: 'distinct' }, { key: 'owner', label: 'Owner', from: 'distinct' }, { key: 'cdate', label: 'Requested', type: 'daterange' }],
    form: [f('cname', 'Candidate name', 'text', { required: true }), f('fname', "Father's name"), f('lname', 'Last name'), f('dob', 'Date of birth', 'date'), f('indosno', 'INDOS'), f('pass', 'Passport'), f('doi', 'Passport issued', 'date'), f('doe', 'Passport expiry', 'date'), f('profile', 'Rank'), f('owner', 'Owner'), f('field', 'Field / project'), f('address1', 'Address line 1', 'textarea'), f('address2', 'Address line 2', 'textarea'), f('director', 'Signatory'), f('issue_status', 'Issue status', 'select', { options: ['Pending', 'Handed Over', 'Couriered'] })],
    creatable: true, editable: true, stamp: { user: 'addby', date: 'adddate' },
  },
  oldSeaService: {
    title: 'Old Sea Service', menu: 'letters', legacyPage: 'oldsea_details.php',
    model: LegacyCcoscertificate, idField: 'id', defaultSort: { id: -1 },
    columns: [col('cos_refno', 'Reference'), col('cosrno', 'COSR no'), col('cos_candname', 'Name'), col('cos_owner', 'Company name'), col('cos_vessel', 'Vessel'), col('cos_rank', 'Rank'), col('cos_indos', 'INDOS no'), col('cos_passport', 'Passport'), col('cos_fromdate', 'From', 'date'), col('cos_todate', 'To', 'date'), col('adddate', 'Issue date', 'datetime'), col('editby', 'Edited by'), col('editdate', 'Edited on', 'datetime')],
    search: ['cos_refno', 'cosrno', 'cos_candname', 'cos_indos', 'cos_passport', 'cos_vessel', 'cos_owner'],
    filters: [{ key: 'cos_owner', label: 'Company', from: 'distinct' }, { key: 'adddate', label: 'Issued', type: 'daterange' }],
    readOnly: true,
    note: 'The earlier versions of each sea-service letter, kept by the old site whenever one was edited.',
  },

  lgDetails: {
    title: 'LG Details', menu: 'letters', legacyPage: 'lgdetails.php',
    model: LegacyLogCandidate, idField: 'id', defaultSort: { id: -1 },
    columns: [col('doe', 'Date of entry', 'datetime'), col('doi', 'LG date', 'date'), col('travel_detail', 'Travel detail'), col('airport_name', 'From'), col('stay_place', 'Stay place'), col('joining_vessel', 'Joining vessel'), col('indosno', 'INDOS no'), col('doneby', 'Done by'), col('user', 'By')],
    search: ['indosno', 'joining_vessel', 'travel_detail', 'airport_name'],
    filters: [{ key: 'cdate', label: 'Date', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('airport_name', 'Airport'), f('doi', 'Date', 'date'), f('travel_detail', 'Travel detail', 'textarea'), f('stay_place', 'Stay place'), f('joining_vessel', 'Joining vessel')],
    creatable: true, editable: true, stamp: { user: 'doneby', date: 'doe' },
  },

  // ======================================================================
  // DG
  // ======================================================================
  licenses: {
    title: 'My License', menu: 'dg', legacyPage: 'manage_license.php',
    model: LegacyLicensedetails, idField: 'id', defaultSort: { licensedoe: -1 },
    columns: [col('licensename', 'Name of the license'), col('licenseupload', 'My file', 'file'), col('licenseno', 'License no'), col('licensedoi', 'Issued on', 'date'), col('licensedoe', 'Validity', 'date'), col('addedby', 'Added by'), col('cdate', 'Added', 'datetime')],
    form: [f('licensename', 'Licence', 'text', { required: true }), f('licenseno', 'Number'), f('licensedoi', 'Issued', 'date'), f('licensedoe', 'Expires', 'date')],
    creatable: true, editable: true, stamp: { user: 'addedby', date: 'cdate' },
  },
  mmd: {
    title: 'MMD', menu: 'dg', legacyPage: 'manage_mmd.php',
    model: LegacyMmd, idField: 'id', defaultSort: { id: 1 },
    columns: [col('mmd', 'MMD'), col('type', 'Type'), col('authority', 'Authority'), col('branch_name', 'Branch name'), col('branch_address', 'Branch address'), col('cdate', 'Date', 'datetime'), col('status', 'Active', 'status')],
    form: [f('type', 'Type'), f('mmd', 'Office', 'text', { required: true }), f('authority', 'Authority'), f('branch_name', 'Branch'), f('branch_address', 'Address', 'textarea'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, stamp: { date: 'cdate' },
  },
  immunizationCards: {
    title: 'Immunization Card', menu: 'dg', legacyPage: 'manage_vaccination_card.php',
    model: LegacyVaccinationCard, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('name', 'Name'), col('rank', 'Rank'), col('indosno', 'Indos no'), col('passport', 'Passport no'), col('vaccination_dose', 'Vaccination dose for'), col('vaccine_name', 'Vaccine'), col('takendate', 'Taken on', 'date'), col('vaccine_name2', 'Vaccine 2'), col('takendate2', 'Taken on 2', 'date'), col('company', 'Owner', 'lookup'), col('vessel', 'Vessel'), col('approval', 'Approved', 'status'), col('issue_status', 'Issue status'), col('doneby', 'Done by'), col('cdate', 'Date', 'datetime')],
    lookups: { company: 'company' },
    search: ['name', 'indosno', 'passport', 'vessel'],
    filters: [{ key: 'vaccine_name', label: 'Vaccine', from: 'distinct' }, { key: 'issue_status', label: 'Issue status', from: 'distinct' }, { key: 'takendate', label: 'Taken on', type: 'daterange' }],
    form: [f('prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs'] }), f('name', 'Name', 'text', { required: true }), f('rank', 'Rank'), f('email', 'Email'), f('indosno', 'INDOS'), f('passport', 'Passport'), f('cdcno', 'CDC'), f('dob', 'Date of birth', 'date'), f('vaccine_name', 'Vaccine'), f('vaccination_dose', 'Dose', 'select', { options: ['First Dose', 'Second Dose', 'Booster'] }), f('takendate', 'Taken on', 'date'), f('vaccine_name2', 'Vaccine 2'), f('takendate2', 'Taken on 2', 'date'), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('vessel', 'Vessel'), f('issue_status', 'Issue status', 'select', { options: ['Pending', 'Handed Over', 'Couriered'] })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'doneby', date: 'cdate' },
    actions: [
      {key: 'approve', label: 'Approve', set: {approval: '1', approveby: '$user'}, when: {field: 'approval', not: '1'}, done: 'Card approved.'},
      {key: 'handover', label: 'Handed over', set: {issue_status: 'Handed Over'}, when: {field: 'issue_status', not: 'Handed Over'}, done: 'Marked handed over.'},
    ],
  },
  seaServiceRequests: {
    title: 'Issuance of Sea-Service - requests', menu: 'dg', legacyPage: 'sea_details.php',
    model: LegacyCoscertificate, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('cosrno', 'COSR no'), col('cos_refno', 'Reference'), col('cos_candname', 'Name'), col('cos_indos', 'INDOS'), col('cos_passport', 'Passport'), col('cos_rank', 'Rank'), col('cos_owner', 'Company'), col('cos_vessel', 'Vessel'), col('flag', 'Flag'), col('cos_shiptype', 'Ship type'), col('cos_fromdate', 'From', 'date'), col('cos_todate', 'To', 'date'), col('cos_grt', 'GRT'), col('cos_kwt', 'KW'), col('priority', 'Priority'), col('cos_status', 'Approval'), col('cos_user', 'Approved by'), col('app_date', 'Approved on', 'date'), col('cos_substatus', 'Sub approval'), col('cos_subby', 'Sub approval by'), col('cos_subremark', 'Correction remark'), col('attach_file', 'Attachment', 'file'), col('cdc_scrnshot', 'CDC screenshot', 'file'), col('passport_left_scrnshot', 'Passport screenshot', 'file'), col('adddate', 'Created on', 'datetime'), col('addby', 'Created by')],
    search: ['cos_refno', 'cosrno', 'cos_candname', 'cos_indos', 'cos_passport', 'cos_vessel', 'cos_owner'],
    filters: [{ key: 'cos_status', label: 'Approval', from: 'distinct' }, { key: 'cos_substatus', label: 'Sub approval', from: 'distinct' }, { key: 'cos_owner', label: 'Company', from: 'distinct' }, { key: 'adddate', label: 'Created', type: 'daterange' }],
    form: [f('cos_candname', 'Candidate', 'text', { required: true }), f('prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs'] }), f('cos_rank', 'Rank'), f('cos_indos', 'INDOS'), f('cos_passport', 'Passport'), f('cos_cdc', 'CDC'), f('cos_owner', 'Company'), f('cos_vessel', 'Vessel'), f('imo', 'IMO'), f('flag', 'Flag'), f('cos_shiptype', 'Ship type'), f('cos_grt', 'GRT'), f('cos_kwt', 'KW'), f('cos_fromdate', 'From', 'date'), f('cos_todate', 'To', 'date'), f('priority', 'Priority', 'number'), f('email', 'Email'), f('remark', 'Remark', 'textarea'), f('cos_subremark', 'Correction remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addby', date: 'adddate' },
    note: 'The sea-service (COS) register the DG team works from. Requests raised by seafarers in the portal are under Sea-service portal requests.',
    actions: [
      { key: 'subApprove', label: 'Sub approval', set: { cos_substatus: 'APPROVED', cos_subby: '$user' }, when: { field: 'cos_substatus', not: 'APPROVED' }, done: 'Sub approval recorded.' },
      { key: 'approve', label: 'Final approval', set: { cos_status: 'APPROVED', cos_user: '$user', app_date: '$today' }, when: { field: 'cos_status', not: 'APPROVED' }, done: 'Approved.' },
      { key: 'correction', label: 'Add correction remark', set: { cos_correction: '1' }, ask: [{ key: 'cos_subremark', label: 'Correction remark' }], done: 'Correction noted.' },
    ],
  },

  seaServiceLetters: {
    title: 'Issuance of Sea-Service - letters', menu: 'dg', legacyPage: 'sea_details.php', hidden: true,
    model: LegacyCoscertificate, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('cos_refno', 'Ref'), col('cos_candname', 'Candidate'), col('cos_indos', 'INDOS'), col('cos_vessel', 'Vessel'), col('cos_fromdate', 'From', 'date'), col('cos_todate', 'To', 'date'), col('cos_status', 'Status'), col('cos_substatus', 'DG status'), col('cos_auser', 'By')],
    search: ['cos_refno', 'cos_candname', 'cos_indos', 'cos_vessel'],
    readOnly: true,
  },
  dgCirculars: {
    title: 'DG Circular', menu: 'dg', legacyPage: 'dg_cercular.php',
    model: LegacyDgCircular, idField: 'id', baseFilter: ACTIVE, defaultSort: { issue_date: -1 },
    columns: [col('agreement_no', 'Aggrement no.'), col('uplod', 'Circular', 'file'), col('issue_date', 'Issue date', 'date'), col('valid_date', 'Validity date', 'date'), col('summary', 'Summary', 'longtext'), col('users', 'By'), col('cdate', 'Added', 'datetime')],
    search: ['agreement_no', 'summary'],
    form: [f('agreement_no', 'Circular / file no.', 'text', { required: true }), f('summary', 'Summary', 'textarea'), f('issue_date', 'Issued', 'date'), f('valid_date', 'Valid till', 'date')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'users', date: 'cdate' },
  },
  tarBooks: {
    title: 'Verification Of TAR Book', menu: 'dg', legacyPage: 'issurance_tarbook.php',
    model: LegacyTarbook, idField: 'id', defaultSort: { id: -1 },
    columns: [col('indosno', 'Indos no.'), col('tar_scrnshot', 'Tarbook', 'file'), col('tar_remark', 'Crew remarks'), col('emp_remark', 'Employee remarks'), col('new_remark', 'New remark'), col('users', 'By'), col('supuser', 'Verified by')],
    search: ['indosno', 'tar_remark'],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('tar_remark', 'Remark', 'textarea'), f('emp_remark', 'Staff remark', 'textarea'), f('new_remark', 'New remark', 'textarea')],
    creatable: true, editable: true, stamp: { user: 'users' },
    actions: [
      {key: 'verify', label: 'Mark verified', set: {supuser: '$user'}, when: {field: 'supuser', empty: true}, done: 'Marked verified.'},
    ],
  },
  backOut: {
    title: 'Back Out Candidate', menu: 'report', legacyPage: 'blacklist.php',
    model: LegacyBlacklist, idField: 'blacklist_id', baseFilter: ACTIVE, defaultSort: { bdate: -1 },
    columns: [col('indosno', 'INDOS no'), col('companyname', 'Company name', 'lookup'), col('vesselname', 'Vessel name'), col('brank', 'Rank name', 'lookup'), col('vacancyid', 'Vacancy #'), col('remark', 'Remark'), col('nature', 'Nature of incident'), col('immediate_cause', 'Immediate cause'), col('intermediate_cause', 'Intermediate cause'), col('root_cause', 'Root cause'), col('actiontaken', 'Action taken'), col('bdate', 'Created on', 'date'), col('baddedby', 'By', 'lookup')],
    lookups: { companyname: 'company', brank: 'rank', baddedby: 'staff' },
    search: ['indosno', 'vesselname', 'remark', 'immediate_cause'],
    filters: [{ key: 'nature', label: 'Nature', from: 'distinct' }, { key: 'companyname', label: 'Owner', from: 'lookup:company' }, { key: 'bdate', label: 'Date', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('companyname', 'Owner', 'lookup', { lookup: 'company' }), f('vesselname', 'Vessel'), f('brank', 'Rank', 'lookup', { lookup: 'rank' }), f('vacancyid', 'Vacancy #'), f('nature', 'Nature', 'select', { options: ['Backout', 'Blacklist', 'Misconduct', 'Other'] }), f('immediate_cause', 'Immediate cause', 'textarea'), f('intermediate_cause', 'Intermediate cause', 'textarea'), f('root_cause', 'Root cause', 'textarea'), f('actiontaken', 'Action taken'), f('remark', 'Remark', 'textarea'), f('bdate', 'Date', 'date')],
    statusField: 'status', creatable: true, editable: true,
    actions: [
      {key: 'enable', label: 'Enable for processing', set: {status: '0'}, when: {field: 'status', equals: '1'}, confirm: 'Take this candidate off the back-out list?', done: 'Candidate enabled for processing again.'},
    ],
  },

  // ======================================================================
  // INVOICE
  // ======================================================================
  invoices: {
    title: 'Print Invoice', menu: 'invoice', legacyPage: 'invoice_copy.php',
    model: LegacyInvoice, idField: 'invid', baseFilter: { status: 'Active' }, defaultSort: { invid: -1 },
    columns: [col('invoic_no', 'Invoice number'), col('invoiceno', '#'), col('company_name', 'Company'), col('fullname', 'Crew details'), col('vcan_id', 'INDOS'), col('passport', 'Passport'), col('rankname', 'Rank'), col('vesselname', 'Vessel'), col('joiner_type', 'Joiner'), col('jdate', 'Joined', 'date'), col('dayson_vessel', 'Days'), col('agencyfee', 'Agency fee', 'money'), col('crewl_fee', 'Crew fee', 'money'), col('invoice_payed', 'Payment status'), col('payment_date', 'Payment date', 'date'), col('invoice_raised', 'Invoice raised'), col('istatus', 'Print status'), col('doe', 'Created date', 'datetime'), col('doneby', 'Created by'), col('cancelinvoice', 'Cancelled', 'status')],
    search: ['invoic_no', 'invoiceno', 'fullname', 'vcan_id', 'company_name', 'vesselname', 'passport'],
    filters: [{ key: 'company_name', label: 'Owner', from: 'distinct' }, { key: 'istatus', label: 'Print status', from: 'distinct' }, { key: 'joiner_type', label: 'Joiner', from: 'distinct' }, { key: 'doe', label: 'Invoice date', type: 'daterange' }, { key: 'payment_date', label: 'Payment date', type: 'daterange' }],
    readOnly: true,
    actions: [
      {key: 'printed', label: 'Mark printed', set: {istatus: 'PRINTED'}, when: {field: 'istatus', not: 'PRINTED'}, done: 'Marked printed.'},
      {key: 'cancel', label: 'Cancel invoice', set: {cancelinvoice: '1', canceledby: '$user', canceldate: '$now'}, when: {field: 'cancelinvoice', not: '1'}, ask: [{key: 'cancelremarks', label: 'Reason'}], confirm: 'Cancel this invoice?', done: 'Invoice cancelled.'},
      {key: 'unlock', label: 'Request unlock', set: {invunlockreq: '1', invunlockreqby: '$user'}, when: {field: 'invunlockreq', not: '1'}, ask: [{key: 'invunlockremark', label: 'Why'}], done: 'Unlock requested.'},
      {key: 'paid', label: 'Mark paid', set: {invoice_payed: 'Yes', update_at: '$now', update_by: '$user'}, when: {field: 'invoice_payed', not: 'Yes'}, done: 'Marked paid.'},
    ],
  },
  proformaInvoices: {
    title: 'Proforma Invoice', menu: 'invoice', legacyPage: 'proformainvoice.php',
    model: LegacyProformainvoice, idField: 'pro_id', defaultSort: { pro_id: -1 },
    columns: [col('pro_invoiceno', 'Reference number'), col('pro_indosno', 'INDOS no'), col('candidate', 'Candidate name', 'person'), col('pro_companyname', 'Owner name', 'lookup'), col('pro_rankname', 'Rank', 'lookup'), col('pro_date', 'Issue date', 'datetime')],
    lookups: { pro_companyname: 'company', pro_rankname: 'rank' },
    search: ['pro_indosno', 'pro_invoiceno'],
    filters: [{ key: 'pro_companyname', label: 'Owner', from: 'lookup:company' }, { key: 'pro_date', label: 'Date', type: 'daterange' }],
    readOnly: true,
    personBy: 'pro_indosno',
  },
  nedpassInvoices: {
    title: 'Nedpass Invoice', menu: 'invoice', legacyPage: 'nedpass_invoice.php',
    model: LegacyNedpassInvoice, idField: 'id', defaultSort: { id: -1 },
    columns: [col('inv_no', 'Invoice number'), col('po_number', 'PO number'), col('inv_date', 'Invoice month', 'date'), col('ned_id', 'NED pass ids'), col('bankid', 'Bank'), col('cdate', 'Created date', 'datetime'), col('doneby', 'Created by')],
    search: ['inv_no', 'po_number'],
    filters: [{ key: 'inv_date', label: 'Invoice date', type: 'daterange' }],
    readOnly: true,
  },
  bankAccounts: {
    title: 'Bank Details', menu: 'invoice', legacyPage: 'manage_bankdetails.php',
    model: LegacyBankaccounts, idField: 'id', defaultSort: { id: 1 },
    columns: [col('account_name', 'Account name'), col('bank_name', 'Bank name'), col('bank_address', 'Bank address'), col('account_number', 'Account number'), col('account_type', 'Account type'), col('rtgs_neft_ifsc', 'IFSC code'), col('swift_code', 'Swift code'), col('pan_no', 'Pan number'), col('status', 'Active', 'status')],
    form: [f('account_name', 'Account name', 'text', { required: true }), f('bank_name', 'Bank'), f('bank_address', 'Bank address', 'textarea'), f('account_number', 'Account number'), f('account_type', 'Account type'), f('rtgs_neft_ifsc', 'IFSC'), f('swift_code', 'SWIFT'), f('pan_no', 'PAN'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true,
  },
  vendorInvoiceFollowups: {
    title: 'Vendor Invoice Followup', menu: 'invoice', legacyPage: 'manage_vendorinvoice_followup.php',
    model: LegacyVendorinvoiceFollowup, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('vendor', 'Vendor', 'lookup'), col('category', 'Category'), col('inv_number', 'Invoice number'), col('gen_date', 'Invoice date', 'date'), col('rec_date', 'Received', 'date'), col('amount', 'Amount', 'money'), col('half_payment', 'Part paid', 'money'), col('payment', 'Payment status'), col('payment_method', 'Method'), col('payment_by', 'Paid by'), col('payment_paid_date', 'Paid on', 'date'), col('payment_date', 'Due', 'date'), col('invoice_copy', 'Invoice copy', 'file'), col('payment_screenshot', 'Payment proof', 'file'), col('remark', 'Remark'), col('addby', 'Addby'), col('cdate', 'Added', 'datetime')],
    lookups: { vendor: 'agent', company: 'company' },
    search: ['inv_number', 'candidates', 'remark'],
    filters: [{ key: 'payment', label: 'Payment', from: 'distinct' }, { key: 'category', label: 'Category', from: 'distinct' }, { key: 'vendor', label: 'Vendor', from: 'lookup:agent' }, { key: 'gen_date', label: 'Invoice date', type: 'daterange' }, { key: 'payment_date', label: 'Due date', type: 'daterange' }],
    form: [f('inv_number', 'Invoice no.', 'text', { required: true }), f('vendor', 'Vendor', 'lookup', { lookup: 'agent' }), f('category', 'Category'), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('candidates', 'Candidate (INDOS)'), f('gen_date', 'Invoice date', 'date'), f('rec_date', 'Received', 'date'), f('amount', 'Amount', 'number'), f('payment_date', 'Due date', 'date'), f('payment', 'Payment', 'select', { options: ['Paid', 'Not Paid', 'Partial'] }), f('half_payment', 'Partial amount'), f('payment_method', 'Method', 'select', { options: ['Bank Transfer', 'Cash', 'Cheque', 'UPI'] }), f('payment_by', 'Paid by'), f('payment_paid_date', 'Paid on', 'date'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addby', date: 'cdate' },
    actions: [
      {key: 'paid', label: 'Mark paid', set: {payment: 'Paid', payment_paid_date: '$today'}, when: {field: 'payment', not: 'Paid'}, done: 'Marked paid.'},
    ],
  },
  otherExpenses: {
    title: 'Other Expenses', menu: 'invoice', legacyPage: 'manage_other_expenses.php',
    model: LegacyOtherExpenses, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('req_date', 'Request date', 'date'), col('req_by', 'Request by'), col('product', 'Product details'), col('product_details', 'Details'), col('vendor', 'Vendor', 'lookup'), col('amount_vendor', 'Vendor amount', 'money'), col('vendor_payment', 'Vendor payment'), col('company', 'Owner', 'lookup'), col('amount_company', 'Owner amount', 'money'), col('company_payment', 'Owner payment'), col('payment_by', 'Payment by'), col('added_by', 'Added by'), col('added_date', 'Added', 'datetime')],
    filters: [{ key: 'cdate', label: 'Date', type: 'daterange' }],
    lookups: { vendor: 'agent', company: 'company' },
    form: [f('req_date', 'Date', 'date'), f('req_by', 'Requested by'), f('payment_by', 'Payment by'), f('product', 'Product', 'text', { required: true }), f('product_details', 'Details', 'textarea'), f('vendor', 'Vendor', 'lookup', { lookup: 'agent' }), f('amount_vendor', 'Vendor amount', 'number'), f('vendor_payment', 'Vendor payment', 'select', { options: PAID }), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('amount_company', 'Owner amount', 'number'), f('company_payment', 'Owner payment', 'select', { options: PAID })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'added_by', date: 'added_date' },
  },
  companyInvoiceFollowups: {
    title: 'Company Invoice Followup', menu: 'invoice', legacyPage: 'manage_companyinvoice_followup.php',
    model: LegacyCompanyinvoiceFollowup, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('company', 'Company', 'lookup'), col('category', 'Category'), col('inv_number', 'Invoice number'), col('gen_date', 'Invoice date', 'date'), col('amount', 'Amount (INR)', 'money'), col('invoice_copy', 'Invoice copy', 'file'), col('remark', 'Remark'), col('payment', 'Payment status'), col('half_payment', 'Part paid', 'money'), col('payment_date', 'Paid on', 'datetime'), col('payment_screenshot', 'Payment proof', 'file'), col('addby', 'Addby'), col('cdate', 'Added', 'datetime')],
    lookups: { company: 'company' },
    search: ['inv_number', 'remark'],
    filters: [{ key: 'payment', label: 'Payment', from: 'distinct' }, { key: 'company', label: 'Owner', from: 'lookup:company' }, { key: 'gen_date', label: 'Invoice date', type: 'daterange' }],
    form: [f('inv_number', 'Invoice no.', 'text', { required: true }), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('category', 'Category'), f('gen_date', 'Invoice date', 'date'), f('amount', 'Amount', 'number'), f('payment', 'Payment', 'select', { options: ['Paid', 'Not Paid', 'Partial'] }), f('half_payment', 'Partial amount'), f('payment_date', 'Paid on', 'date'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addby', date: 'cdate' },
    actions: [
      {key: 'paid', label: 'Mark paid', set: {payment: 'Paid', payment_paid_date: '$today'}, when: {field: 'payment', not: 'Paid'}, done: 'Marked paid.'},
    ],
  },
  accountingCalendar: {
    title: 'Accounting Calendar', menu: 'invoice', legacyPage: 'eventindex.php',
    model: LegacyTblEvents, idField: 'id', defaultSort: { start: -1 },
    columns: [col('title', 'Event'), col('start', 'Start', 'datetime'), col('end', 'End', 'datetime')],
    form: [f('title', 'Event', 'text', { required: true }), f('start', 'Start', 'date'), f('end', 'End', 'date')],
    creatable: true, editable: true, deletable: true,
  },

  // ======================================================================
  // SHORE JOB
  // ======================================================================
  shoreVacancies: {
    title: 'Add Shore Vacancy', menu: 'shore', legacyPage: 'manage_vacancy_shore.php',
    model: LegacyShoreVacancies, idField: 'id', baseFilter: { dstatus: { $in: ['1', 1] } }, defaultSort: { id: -1 },
    columns: [col('id', 'JOB ID'), col('dov', 'Date', 'datetime'), col('company_name', 'Company name', 'lookup'), col('crew_name', 'Crewing officer'), col('rankname', 'Rank'), col('jlocation', 'Joining location'), col('exp', 'Vacancy details'), col('remark', 'Remark'), col('noopening', 'No of opening'), col('salary', 'Salary'), col('currency_type', 'Currency', 'lookup'), col('type_days', 'Day/month'), col('excrew', 'Joiner'), col('cduration', 'Duration'), col('nationality', 'Nationality'), col('visatype', 'Visa type'), col('shsub_id', 'Sub category', 'lookup'), col('image', 'Vacancy image', 'file'), col('user', 'User')],
    lookups: { company_name: 'company', currency_type: 'currency', shsub_id: 'shipSubcat' },
    search: ['crew_name', 'jlocation', 'remark'],
    filters: [{ key: 'exp', label: 'State', from: 'distinct' }, { key: 'company_name', label: 'Owner', from: 'lookup:company' }],
    form: [f('company_name', 'Owner', 'lookup', { lookup: 'company', required: true }), f('rankname', 'Position', 'lookup', { lookup: 'shoreRank', required: true }), f('crew_name', 'Contact person'), f('noopening', 'Openings', 'number'), f('salary', 'Salary'), f('currency_type', 'Currency', 'lookup', { lookup: 'currency' }), f('type_days', 'Basis', 'select', { options: ['Permonth', 'Perday', 'Annual'] }), f('cduration', 'Duration'), f('jlocation', 'Location'), f('nationality', 'Nationality'), f('visatype', 'Visa type'), f('exp', 'State', 'select', { options: ['Open', 'Close'] }), f('remark', 'Remark', 'textarea')],
    statusField: 'dstatus', creatable: true, editable: true, stamp: { user: 'user', date: 'dov' },
  },

  // ======================================================================
  // UTILITIES
  // ======================================================================
  notices: {
    title: 'My Files / Notices', menu: 'utilities', legacyPage: 'manage_file.php',
    model: LegacyNotice, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('txt_name', 'Notice name'), col('txt_notice', 'Notice text', 'longtext'), col('department', 'Notice for department'), col('txt_fromdate', 'Display from', 'date'), col('txt_tilldate', 'Display till', 'date'), col('txt_file', 'Notice file', 'file'), col('cdate', 'Created date', 'datetime'), col('user', 'Done by'), col('status', 'Active', 'status')],
    search: ['txt_name', 'txt_notice', 'department'],
    form: [f('txt_name', 'Title', 'text', { required: true }), f('txt_notice', 'Notice', 'textarea'), f('department', 'Departments (comma separated)'), f('txt_fromdate', 'From', 'date'), f('txt_tilldate', 'Till', 'date')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'user', date: 'cdate' },
  },
  emailFormats: {
    title: 'Email Format', menu: 'utilities', legacyPage: 'manage_emailformat.php',
    model: LegacyEmailFormat, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: 1 },
    columns: [col('email_format', 'Format name'), col('header', 'Email format', 'encoded'), col('content', 'Body', 'encoded'), col('addedby', 'Done by'), col('cdate', 'Date'), col('status', 'Active', 'status')],
    search: ['email_format'],
    form: [f('email_format', 'Template key', 'text', { required: true }), f('header', 'Subject / header', 'textarea', { encoded: true }), f('content', 'Body (HTML)', 'textarea', { encoded: true })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addedby', date: 'cdate' },
  },
  globalSh: {
    title: 'GlobalSH', menu: 'utilities', legacyPage: 'bbdevelopment.php',
    model: LegacyBbdevelopment, idField: 'bid', defaultSort: { bid: -1 },
    columns: [col('bdate', 'Date of entry', 'datetime'), col('company_name', 'Company name'), col('contact_number', 'Contact number'), col('location', 'Location'), col('emailid', 'Email ID'), col('bcategory', 'Category'), col('remark', 'Remark'), col('buser', 'User')],
    search: ['company_name', 'emailid', 'location'],
    form: [f('company_name', 'Company', 'text', { required: true }), f('contact_person', 'Contact'), f('contact_number', 'Phone'), f('emailid', 'Email'), f('location', 'Location'), f('remark', 'Remark', 'textarea')],
    creatable: true, editable: true, stamp: { user: 'buser', date: 'bdate' },
  },
  nedPass: {
    title: 'Ned Pass', menu: 'utilities', legacyPage: 'manage_nedpass.php',
    model: LegacyNedpass, idField: 'id', defaultSort: { id: -1 },
    columns: [col('crewname', 'Crew name'), col('txt_rank', 'Rank', 'lookup'), col('particulars', 'Type of pass'), col('txt_passport', 'Passport'), col('priority', 'Priority (days)'), col('proposal_date1', 'Email received', 'date'), col('proposal_date2', 'Submitted to SCI', 'date'), col('proposal_date3', 'Approval from SCI', 'date'), col('proposal_date4', 'Submitted to ONGC', 'date'), col('proposal_date5', 'Pass issued by ONGC', 'date'), col('coveringletter', 'Covering letter', 'file'), col('remarks', 'Remarks'), col('txt_vess', 'Vessel'), col('txt_nedpassno', 'NED pass no.'), col('txt_nedtype', 'NED type'), col('txt_billnumber', 'Bill no.'), col('txt_billdate', 'Bill date', 'date'), col('txt_Remark5', 'Latest remark'), col('cancelrequest', 'Cancel requested'), col('addedby', 'By')],
    lookups: { txt_rank: 'rank' },
    search: ['crewname', 'txt_passport', 'txt_nedpassno', 'txt_vess', 'txt_billnumber'],
    filters: [{ key: 'txt_nedtype', label: 'NED type', from: 'distinct' }, { key: 'txt_passtype', label: 'Pass type', from: 'distinct' }, { key: 'txt_billdate', label: 'Bill date', type: 'daterange' }],
    form: [f('prefix', 'Prefix', 'select', { options: ['Mr', 'Ms', 'Mrs'] }), f('crewname', 'Crew name', 'text', { required: true }), f('txt_rank', 'Rank', 'lookup', { lookup: 'rank' }), f('txt_email', 'Email'), f('phoneno', 'Phone'), f('indosno', 'INDOS'), f('txt_passport', 'Passport'), f('txt_vess', 'Vessel'), f('txt_vesscode', 'Vessel code'), f('txt_passtype', 'Pass type'), f('txt_nedtype', 'NED type'), f('txt_nedpassno', 'NED pass no.'), f('txt_billnumber', 'Bill number'), f('txt_billdate', 'Bill date', 'date'), f('priority', 'Priority', 'number'), f('txt_description', 'Description', 'textarea'), f('txt_Remark1', 'Remark 1'), f('txt_Remark2', 'Remark 2'), f('txt_Remark3', 'Remark 3')],
    creatable: true, editable: true,
    actions: [
      {key: 'requestCancel', label: 'Request cancellation', set: {cancelrequest: '1', cancelby: '$user'}, when: {field: 'cancelrequest', not: '1'}, ask: [{key: 'remarks', label: 'Reason'}], done: 'Cancellation requested.'},
      {key: 'approveCancel', label: 'Approve cancellation', set: {status: '0', cancelby: '$user'}, when: {field: 'cancelrequest', equals: '1'}, confirm: 'Cancel this NED pass?', done: 'NED pass cancelled.'},
    ],
  },
  flagDocuments: {
    title: 'Flag Document', menu: 'utilities', legacyPage: 'manage_flagdoc_new.php',
    model: LegacyFlagdocNew, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('candidate', 'Candidate details', 'person'), col('indosno', 'INDOS'), col('emailid', 'Email'), col('company', 'Company details', 'lookup'), col('vendor', 'Vendor details', 'lookup'), col('certificate', 'Course name'), col('req_by', 'Requested by'), col('payment_by', 'Payment by'), col('amount', 'Amount', 'money'), col('rate', 'Rate', 'money'), col('paidto_bmpl', 'Paid to BMPL'), col('paidto_vendor', 'Paid to vendor'), col('certificate_status', 'Certificate status'), col('req_date', 'Requested', 'date'), col('apl_date', 'Applied', 'date'), col('jobid', 'Vacancy #'), col('addby', 'Assigned executive'), col('cdate', 'Add date', 'datetime')],
    lookups: { company: 'company', vendor: 'agent' },
    search: ['indosno', 'emailid', 'certificate', 'vesselname'],
    filters: [{ key: 'certificate_status', label: 'Certificate status', from: 'distinct' }, { key: 'paidto_vendor', label: 'Paid to vendor', from: 'distinct' }, { key: 'company', label: 'Owner', from: 'lookup:company' }, { key: 'req_date', label: 'Requested', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('emailid', 'Email'), f('certificate', 'Certificate'), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('vesselname', 'Vessel'), f('jobid', 'Vacancy #'), f('vendor', 'Vendor', 'lookup', { lookup: 'agent' }), f('req_date', 'Requested', 'date'), f('apl_date', 'Applied', 'date'), f('req_by', 'Requested by', 'select', { options: ['Crew', 'Company', 'BMPL'] }), f('payment_by', 'Payment by', 'select', { options: ['Crew', 'Company', 'BMPL'] }), f('amount', 'Amount', 'number'), f('rate', 'Rate', 'number'), f('start_date', 'Start', 'date'), f('end_date', 'End', 'date'), f('paidto_bmpl', 'Paid to BMPL', 'select', { options: PAID }), f('paidto_vendor', 'Paid to vendor', 'select', { options: PAID }), f('certificate_status', 'Certificate status', 'select', { options: ['Pending', 'Applied', 'Received', 'Handed Over'] })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addby', date: 'cdate' },
    actions: [
      {key: 'paidVendor', label: 'Vendor paid', set: {paidto_vendor: 'Paid'}, when: {field: 'paidto_vendor', not: 'Paid'}, done: 'Marked paid to the vendor.'},
      {key: 'paidBmpl', label: 'Paid to BMPL', set: {paidto_bmpl: 'Paid'}, when: {field: 'paidto_bmpl', not: 'Paid'}, done: 'Marked received by BMPL.'},
      {key: 'received', label: 'Certificate received', set: {certificate_status: 'Received'}, when: {field: 'certificate_status', not: 'Received'}, done: 'Certificate marked received.'},
      {key: 'handover', label: 'Handed over', set: {certificate_status: 'Handed Over'}, when: {field: 'certificate_status', not: 'Handed Over'}, done: 'Marked handed over.'},
    ],
    personBy: 'indosno',
  },
  visaTypes: {
    title: 'Visa Service', menu: 'utilities', legacyPage: 'manage_visaservice.php',
    model: LegacyVisaservice, idField: 'id', defaultSort: { id: -1 },
    columns: [col('dateorr', 'Request received date', 'date'), col('name', 'Candidate name'), col('passport', 'Passport'), col('company', 'Company name', 'lookup'), col('visatype', 'Visa type'), col('vendor', 'Visa agent', 'lookup'), col('dateva', 'Date of visa applied', 'date'), col('datevr', 'Date visa received', 'date'), col('amountcompany', 'Owner amount', 'money'), col('compcurr', 'Owner currency'), col('amountvendor', 'Vendor amount', 'money'), col('vencurr', 'Vendor currency'), col('addedby', 'By'), col('cdate', 'Added', 'datetime')],
    lookups: { company: 'company', vendor: 'agent' },
    search: ['name', 'passport', 'visatype'],
    filters: [{ key: 'visatype', label: 'Visa type', from: 'distinct' }, { key: 'company', label: 'Company', from: 'lookup:company' }, { key: 'vendor', label: 'Visa agent', from: 'lookup:agent' }, { key: 'dateorr', label: 'Request received', type: 'daterange' }],
    form: [f('dateorr', 'Request received', 'date'), f('name', 'Candidate name', 'text', { required: true }), f('passport', 'Passport'), f('company', 'Company', 'lookup', { lookup: 'company' }), f('visatype', 'Visa type'), f('vendor', 'Visa agent', 'lookup', { lookup: 'agent' }), f('dateva', 'Date of visa applied', 'date'), f('datevr', 'Date visa received', 'date'), f('amountcompany', 'Owner amount', 'number'), f('compcurr', 'Owner currency'), f('amountvendor', 'Vendor amount', 'number'), f('vencurr', 'Vendor currency')],
    creatable: true, editable: true, stamp: { user: 'addedby', date: 'cdate' },
  },

  // The visa-type master list (manage_visatype.php), reachable from Master Data.
  visaTypeMaster: {
    title: 'Visa types', menu: 'utilities', legacyPage: 'manage_visaservice.php', hidden: true,
    model: LegacyVisatype, idField: 'id', defaultSort: { visatype: 1 },
    columns: [col('visatype', 'Visa type'), col('addby', 'By'), col('adddate', 'Added', 'datetime'), col('status', 'Active', 'status')],
    form: [f('visatype', 'Visa type', 'text', { required: true }), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, stamp: { user: 'addby', date: 'adddate' },
  },

  visitorEntries: {
    title: 'Visitor Entries', menu: 'utilities', legacyPage: 'manage_visitor_entries.php',
    model: LegacyVisitors, idField: 'id', defaultSort: { id: -1 },
    columns: [col('v_type', 'Visitor'), col('v_joinertype', 'Joiner type'), col('v_fullname', 'Visitor name'), col('v_rank', 'Rank'), col('v_indosno', 'INDOS'), col('v_passport', 'Passport'), col('v_cdc', 'CDC'), col('v_dob', 'Date of birth', 'date'), col('v_phoneno', 'Phone'), col('v_alternate', 'Alternate'), col('v_email', 'Email'), col('v_reason', 'Visitor details'), col('v_person', 'Person to meet'), col('v_file', 'File', 'file'), col('v_date', 'Date of entry', 'datetime')],
    search: ['v_fullname', 'v_indosno', 'v_passport', 'v_email', 'v_phoneno'],
    filters: [{ key: 'v_type', label: 'Type', from: 'distinct' }, { key: 'v_person', label: 'Met', from: 'distinct' }, { key: 'cdate', label: 'Date of entry', type: 'daterange' }],
    form: [f('v_type', 'Visitor type', 'select', { options: ['Crew', 'Vendor', 'Company', 'Other'] }), f('v_joinertype', 'Joiner type', 'select', { options: ['Newjoiner', 'Rejoiner'] }), f('v_fullname', 'Full name', 'text', { required: true }), f('v_rank', 'Rank'), f('v_indosno', 'INDOS'), f('v_passport', 'Passport'), f('v_cdc', 'CDC'), f('v_dob', 'Date of birth', 'date'), f('v_email', 'Email'), f('v_phoneno', 'Phone'), f('v_alternate', 'Alternate phone'), f('v_reason', 'Reason for visit'), f('v_person', 'Person met')],
    creatable: true, editable: true, stamp: { date: 'v_date' },
  },
  inOutDocuments: {
    title: 'In/Out Documents', menu: 'utilities', legacyPage: 'manage_inandout_documents.php',
    model: LegacyInandoutDocuments, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('document_id', 'Doc #'), col('document_type', 'Document type'), col('document_category', 'Category'), col('doc_name', 'Document'), col('doc_quantity', 'Qty'), col('document_by', 'Document by'), col('instructed_by', 'Instructed by'), col('credential', 'INDOS'), col('fullname', 'Documents of seafarer'), col('rank', 'Rank'), col('passport', 'Passport'), col('emailid', 'Email'), col('document_status', 'Document status'), col('remark', 'Remarks'), col('verify', 'Verified', 'status'), col('verifyby', 'Verified by'), col('added_by', 'Added by'), col('added_date', 'Add date', 'datetime')],
    search: ['fullname', 'credential', 'doc_name', 'emailid', 'passport'],
    filters: [{ key: 'document_type', label: 'Direction', from: 'distinct' }, { key: 'document_status', label: 'Status', from: 'distinct' }, { key: 'document_by', label: 'Via', from: 'distinct' }],
    form: [f('document_type', 'Direction', 'select', { options: ['Inward', 'Outward'], required: true }), f('document_by', 'Via', 'select', { options: ['Courier', 'Direct', 'Hand delivery'] }), f('instructed_by', 'Instructed by'), f('credential', 'INDOS', 'text', { required: true }), f('fullname', 'Candidate name'), f('rank', 'Rank'), f('emailid', 'Email'), f('passport', 'Passport'), f('document_category', 'Category'), f('doc_name', 'Documents'), f('doc_quantity', 'Quantity', 'number'), f('document_status', 'Status', 'select', { options: ['With BMPL', 'Handed Over', 'Dispatched', 'Returned'] }), f('location', 'Location'), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'added_by', date: 'added_date' },
    actions: [
      {key: 'verify', label: 'Verify', set: {verify: '1', verifyby: '$user'}, when: {field: 'verify', not: '1'}, done: 'Verified.'},
    ],
  },
  ppeRequests: {
    title: 'PPE Request', menu: 'utilities', legacyPage: 'manage_pperequest.php',
    model: LegacyPpeRequest, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('candidate', 'Candidate details', 'person'), col('indosno', 'INDOS'), col('emailid', 'Email'), col('vendor', 'Vendor', 'lookup'), col('company', 'Company', 'lookup'), col('product', 'PPE products'), col('product_size', 'Size'), col('product_quantity', 'Qty'), col('product_amount', 'Amount', 'money'), col('paidto_bmpl', 'Payment to BMPL'), col('paidto_vendor', 'Paid to vendor'), col('product_status', 'Delivered', 'status'), col('addby', 'Add by'), col('cdate', 'Add date', 'datetime'), col('emailsent', 'Email status')],
    lookups: { vendor: 'agent', company: 'company' },
    search: ['indosno', 'emailid', 'product', 'vesselname'],
    filters: [{ key: 'product', label: 'Product', from: 'distinct' }, { key: 'paidto_vendor', label: 'Paid to vendor', from: 'distinct' }, { key: 'cdate', label: 'Raised', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('emailid', 'Email'), f('product', 'Product'), f('product_size', 'Size'), f('product_quantity', 'Quantity', 'number'), f('product_amount', 'Amount', 'number'), f('company_amount', 'Owner amount', 'number'), f('vendor', 'Vendor', 'lookup', { lookup: 'agent' }), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('vesselname', 'Vessel'), f('paidto_bmpl', 'Paid to BMPL', 'select', { options: PAID }), f('paidto_vendor', 'Paid to vendor', 'select', { options: PAID }), f('product_status', 'Delivered', 'select', { options: ['1', '0'], labels: ['Yes', 'No'] })],
    statusField: 'status', creatable: true, editable: true, stamp: { date: 'cdate' },
    actions: [
      {key: 'paidVendor', label: 'Vendor paid', set: {paidto_vendor: 'Paid'}, when: {field: 'paidto_vendor', not: 'Paid'}, done: 'Marked paid to the vendor.'},
      {key: 'paidBmpl', label: 'Paid to BMPL', set: {paidto_bmpl: 'Paid'}, when: {field: 'paidto_bmpl', not: 'Paid'}, done: 'Marked received by BMPL.'},
      {key: 'delivered', label: 'Delivered', set: {product_status: '1'}, when: {field: 'product_status', not: '1'}, done: 'Marked delivered.'},
    ],
    personBy: 'indosno',
  },
  hotelRequests: {
    title: 'Hotel Request', menu: 'utilities', legacyPage: 'manage_hotel_request.php',
    model: LegacyHotelRequest, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('candidate', 'Name', 'person'), col('indosno', 'Indos / passport'), col('email', 'Email'), col('vendor', 'Vendor', 'lookup'), col('company', 'Owner', 'lookup'), col('checkin', 'Check-in', 'datetime'), col('checkout', 'Check-out', 'datetime'), col('room', 'Room'), col('meal', 'Meal'), col('remark', 'Remark'), col('payment_by', 'Paid by'), col('paidto_bmpl', 'Payment to BMPL'), col('paidto_vendor', 'Paid to vendor'), col('doneby', 'Add by'), col('cdate', 'Add date', 'datetime')],
    lookups: { vendor: 'agent', company: 'company' },
    search: ['indosno', 'email', 'remark'],
    filters: [{ key: 'checkin', label: 'Check-in', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('email', 'Email'), f('vendor', 'Hotel / vendor', 'lookup', { lookup: 'agent' }), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('req_date', 'Requested', 'date'), f('checkin', 'Check-in', 'date'), f('checkout', 'Check-out', 'date'), f('room', 'Room', 'select', { options: ['AC', 'Non-AC', 'Suite'] }), f('meal', 'Meal'), f('payment_by', 'Payment by', 'select', { options: ['Crew', 'Company', 'BMPL'] }), f('paidto_bmpl', 'Paid to BMPL', 'select', { options: ['Received', 'Not Received'] }), f('paidto_vendor', 'Paid to vendor', 'select', { options: PAID }), f('remark', 'Remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'doneby', date: 'cdate' },
    actions: [
      {key: 'paidVendor', label: 'Vendor paid', set: {paidto_vendor: 'Paid'}, when: {field: 'paidto_vendor', not: 'Paid'}, done: 'Marked paid to the vendor.'},
      {key: 'paidBmpl', label: 'Paid to BMPL', set: {paidto_bmpl: 'Received'}, when: {field: 'paidto_bmpl', not: 'Received'}, done: 'Marked received by BMPL.'},
    ],
    personBy: 'indosno',
  },
  medicalRequests: {
    title: 'Medical Request', menu: 'utilities', legacyPage: 'manage_medical_request.php',
    model: LegacyMedicalRequest, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('candidate', 'Candidate details', 'person'), col('indosno', 'INDOS'), col('email', 'Email'), col('vendor', 'Doctor / vendor', 'lookup'), col('company', 'Company', 'lookup'), col('medical', 'Medical'), col('paymentby', 'Payment by'), col('amount', 'Amount', 'money'), col('rate', 'Rate', 'money'), col('paidto_bmpl', 'Paid to BMPL'), col('paidto_vendor', 'Paid to vendor'), col('directto_vendor', 'Direct to vendor'), col('screen_ss', 'Screenshot', 'file'), col('mid', 'Medical #'), col('addby', 'Added by'), col('cdate', 'Added date', 'datetime')],
    lookups: { vendor: 'agent', company: 'company' },
    search: ['indosno', 'email', 'vesselname', 'medical'],
    filters: [{ key: 'medical', label: 'Medical', from: 'distinct' }, { key: 'paidto_vendor', label: 'Paid to vendor', from: 'distinct' }, { key: 'company', label: 'Owner', from: 'lookup:company' }, { key: 'cdate', label: 'Raised', type: 'daterange' }],
    form: [f('indosno', 'INDOS', 'text', { required: true }), f('email', 'Email'), f('medical', 'Medical type'), f('vendor', 'Doctor / vendor', 'lookup', { lookup: 'agent' }), f('company', 'Owner', 'lookup', { lookup: 'company' }), f('vesselname', 'Vessel'), f('jobid', 'Vacancy #'), f('paymentby', 'Payment by', 'select', { options: ['Crew', 'Company', 'BMPL'] }), f('amount', 'Amount', 'number'), f('rate', 'Rate', 'number'), f('paidto_bmpl', 'Paid to BMPL', 'select', { options: PAID }), f('paidto_vendor', 'Paid to vendor', 'select', { options: PAID })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addby', date: 'cdate' },
    actions: [
      {key: 'paidVendor', label: 'Vendor paid', set: {paidto_vendor: 'Paid'}, when: {field: 'paidto_vendor', not: 'Paid'}, done: 'Marked paid to the vendor.'},
      {key: 'paidBmpl', label: 'Paid to BMPL', set: {paidto_bmpl: 'Paid'}, when: {field: 'paidto_bmpl', not: 'Paid'}, done: 'Marked received by BMPL.'},
    ],
    personBy: 'indosno',
  },
  expiryPlans: {
    title: 'Expiry Plans', menu: 'utilities', legacyPage: 'expiry_table.php',
    model: LegacyExpiryTbl, idField: 'id', defaultSort: { plan_by_expiry: 1 },
    columns: [col('plans', 'Plans'), col('plan_details', 'Plan details'), col('company_name', 'Provider'), col('email_id', 'Account email'), col('user_name', 'User name'), col('plan_price', 'Plan price', 'money'), col('plan_by_date', 'Plan by date', 'date'), col('plan_by_expiry', 'Plan expiry date', 'date')],
    hiddenFields: ['password'],
    form: [f('plans', 'Plan', 'text', { required: true }), f('plan_details', 'Details'), f('company_name', 'Provider'), f('email_id', 'Email'), f('user_name', 'Account'), f('plan_by_date', 'Started', 'date'), f('plan_by_expiry', 'Expires', 'date'), f('plan_price', 'Price')],
    creatable: true, editable: true,
  },
  assets: {
    title: 'Add Assets', menu: 'utilities', legacyPage: 'assets_table.php',
    model: LegacyNewassetTable, idField: 'id', defaultSort: { id: -1 },
    columns: [col('asset_name', 'Assets name'), col('asset_key', 'Key / serial'), col('asset_details', 'Details'), col('asset_user', 'Assigned to'), col('date', 'Date'), col('remark', 'Remark'), col('status', 'In use', 'status')],
    search: ['asset_name', 'asset_key', 'asset_user', 'asset_details'],
    filters: [{ key: 'asset_name', label: 'Asset', from: 'distinct' }, { key: 'asset_user', label: 'Assigned to', from: 'distinct' }],
    form: [f('asset_name', 'Asset', 'text', { required: true }), f('asset_key', 'Key / serial'), f('asset_details', 'Details'), f('asset_user', 'Assigned to'), f('date', 'Date'), f('remark', 'Remark', 'textarea'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['In use', 'Returned'] })],
    creatable: true, editable: true,
  },
  ksaVisas: {
    title: 'KSA / Visa applications', menu: 'utilities', legacyPage: 'manage_visaservice.php', hidden: true,
    model: LegacyKsaVisa, idField: 'ksa_id', defaultSort: { ksa_id: -1 },
    columns: [col('name', 'Name'), col('indosno', 'INDOS'), col('passportno', 'Passport'), col('rank', 'Rank'), col('visa_type', 'Visa'), col('visa_category', 'Category'), col('visa_no', 'Visa no.'), col('company_name', 'Owner', 'lookup'), col('vessel', 'Vessel'), col('vendor_amount', 'Vendor amount', 'money'), col('paidstatus', 'Paid'), col('created_by', 'By'), col('doe', 'Created', 'datetime')],
    lookups: { company_name: 'company' },
    search: ['name', 'indosno', 'passportno', 'visa_no'],
    filters: [{ key: 'visa_type', label: 'Visa', from: 'distinct' }, { key: 'paidstatus', label: 'Paid', from: 'distinct' }],
    readOnly: true,
  },
  handovers: {
    title: 'Document handovers', menu: 'utilities', legacyPage: 'manage_inandout_documents.php', hidden: true,
    model: LegacyHandoverDetails, idField: 'id', defaultSort: { id: -1 },
    columns: [col('fullname', 'Candidate'), col('cnumber', 'INDOS'), col('doc_name', 'Documents'), col('handovertype', 'Type'), col('courier_by', 'Courier'), col('trackid', 'Tracking'), col('handoverdate', 'Date', 'date'), col('handoverby', 'By'), col('verify', 'Verified', 'status')],
    search: ['fullname', 'cnumber', 'trackid', 'doc_name'],
    readOnly: true,
  },
  instituteCertificates: {
    title: 'Institute certificates (vendor rates)', menu: 'vendor', legacyPage: 'manage_vendor_detail.php', hidden: true,
    model: LegacyInstituteCertificate, idField: 'id', defaultSort: { id: -1 },
    columns: [col('institute_name', 'Institute'), col('certificatename', 'Certificate'), col('vendor_id', 'Vendor', 'lookup'), col('currency', ''), col('price', 'Price', 'money'), col('crate', 'Crew rate', 'money'), col('cdate', 'Added', 'date'), col('addedby', 'By')],
    lookups: { vendor_id: 'agent' },
    search: ['institute_name', 'certificatename'],
    form: [f('institute_name', 'Institute'), f('certificatename', 'Certificate', 'text', { required: true }), f('vendor_id', 'Vendor', 'lookup', { lookup: 'agent' }), f('currency', 'Currency', 'select', { options: ['INR', 'USD', 'AED'] }), f('price', 'Price', 'number'), f('crate', 'Crew rate', 'number')],
    creatable: true, editable: true, stamp: { user: 'addedby', date: 'cdate' },
  },
  questionBank: {
    title: 'Question bank', menu: 'sourcing', legacyPage: 'manage_questionbank.php', hidden: true,
    model: LegacyQuestionbank, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('question', 'Question', 'longtext'), col('eng_que', 'English question', 'longtext'), col('indosno', 'INDOS'), col('rank', 'Rank', 'lookup'), col('emailid', 'Email'), col('cdate', 'Added', 'datetime')],
    lookups: { rank: 'rank' },
    search: ['question', 'indosno', 'emailid'],
    form: [f('question', 'Question', 'textarea', { required: true }), f('eng_que', 'English question', 'textarea'), f('indosno', 'INDOS'), f('rank', 'Rank', 'lookup', { lookup: 'rank' }), f('emailid', 'Email')],
    statusField: 'status', creatable: true, editable: true, stamp: { date: 'cdate' },
  },

  // ======================================================================
  // BMPL OWNERSHIP
  // ======================================================================
  ownership: {
    title: 'List of BMPL Ownership', menu: 'ownership', legacyPage: 'listof_bmplownership.php',
    model: LegacyBmplOwnership, idField: 'own_id', baseFilter: ACTIVE, defaultSort: { own_id: -1 },
    columns: [col('owner_name', 'Owner name'), col('ownership_type', 'Ownership type'), col('documents', 'Documents', 'count'), col('add_date', 'Added', 'datetime'), col('user', 'By')],
    filters: [{ key: 'add_date', label: 'Added', type: 'daterange' }],
    form: [f('owner_name', 'Owner', 'text', { required: true }), f('ownership_type', 'Type', 'select', { options: ['BARGE', 'VESSEL', 'TUG', 'OTHER'] })],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'user', date: 'add_date' },
    related: [{ key: 'documents', title: 'Documents', resource: 'ownershipDocuments', field: 'own_id', match: 'own_id' }],
    counts: [{ key: 'documents', label: 'Documents', model: LegacyOwnershipVessel, foreign: 'own_id', local: 'own_id' }],
  },
  ownershipDocuments: {
    title: 'BMPL Ownership - documents', menu: 'ownership', legacyPage: 'listof_bmplownership.php', hidden: true,
    model: LegacyOwnershipVessel, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('own_id', 'Ownership #'), col('company', 'Company'), col('doc_name', 'Document'), col('document', 'File', 'file'), col('issue_date', 'Issued', 'date'), col('validity_date', 'Valid till', 'date'), col('addedby', 'By')],
    form: [f('own_id', 'Ownership #', 'number', { required: true }), f('company', 'Company'), f('doc_name', 'Document name'), f('issue_date', 'Issued', 'date'), f('validity_date', 'Valid till', 'date')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'addedby' },
  },

  // ======================================================================
  // MASTER DATA (small reference tables behind dropdowns)
  // ======================================================================
  currencies: {
    title: 'Currencies', menu: 'utilities', legacyPage: 'manage_users.php', hidden: true,
    model: LegacyCurrency, idField: 'cu_id', defaultSort: { cu_id: 1 },
    columns: [col('currency_type', 'Currency'), col('rate', 'Rate to INR'), col('status', 'Active', 'status')],
    form: [f('currency_type', 'Currency', 'text', { required: true }), f('rate', 'Rate to INR', 'number'), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, invalidates: 'currency',
  },
  shipSubcategories: {
    title: 'Ship sub-categories', menu: 'utilities', legacyPage: 'manage_users.php', hidden: true,
    model: LegacyShipSubcat, idField: 'shsub_id', defaultSort: { subcat_name: 1 },
    columns: [col('subcat_name', 'Sub-category'), col('c_st', 'Ship category', 'lookup'), col('status', 'Active', 'status')],
    lookups: { c_st: 'shipCategory' },
    form: [f('subcat_name', 'Sub-category', 'text', { required: true }), f('c_st', 'Ship category', 'lookup', { lookup: 'shipCategory' }), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, invalidates: 'shipSubcat',
  },
  shipCategories: {
    title: 'Ship categories', menu: 'utilities', legacyPage: 'manage_users.php', hidden: true,
    model: LegacyCategShiptype, idField: 'c_st', defaultSort: { c_st: 1 },
    columns: [col('ship_type', 'Category'), col('status', 'Active', 'status')],
    form: [f('ship_type', 'Category', 'text', { required: true }), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, invalidates: 'shipCategory',
  },
  countries: {
    title: 'Countries', menu: 'utilities', legacyPage: 'manage_users.php', hidden: true,
    model: LegacyBoCountry, idField: 'id', defaultSort: { countryname: 1 },
    columns: [col('countryname', 'Country'), col('status', 'Active', 'status')],
    search: ['countryname'],
    form: [f('countryname', 'Country', 'text', { required: true }), f('status', 'Status', 'select', { options: ['1', '0'], labels: ['Active', 'Inactive'] })],
    creatable: true, editable: true, invalidates: 'country',
  },
  shoreRanks: {
    title: 'Shore positions', menu: 'shore', legacyPage: 'manage_vacancy_shore.php', hidden: true,
    model: LegacyShoreRank, idField: 'id', defaultSort: { id: 1 },
    columns: [col('rankname', 'Position'), col('status', 'Active', 'status')],
    form: [f('rankname', 'Position', 'text', { required: true })],
    creatable: true, editable: true, invalidates: 'shoreRank',
  },

  // ======================================================================
  // UTILITIES / ACCOUNTS - tables behind the remaining custom pages
  // ======================================================================
  websiteLinks: {
    title: 'Website Links', menu: 'utilities', legacyPage: 'manage_websource.php', hidden: true,
    model: LegacyImpweblink, idField: 'id', defaultSort: { id: -1 },
    columns: [col('title', 'Title'), col('link', 'Link'), col('email', 'Login email'), col('type', 'Type'), col('user', 'By'), col('date', 'Added', 'datetime')],
    search: ['title', 'link', 'email'],
    form: [f('title', 'Title', 'text', { required: true }), f('link', 'Link', 'text', { required: true }), f('email', 'Login email'), f('password', 'Password'), f('type', 'Type')],
    hiddenFields: [], creatable: true, editable: true, deletable: true, stamp: { user: 'user', date: 'date' },
    note: 'Important portals and their shared logins (DG Shipping, e-Migrate, owners\' portals). Passwords are visible to everyone with access to this page, as on the old site.',
  },
  seafarerRequirements: {
    title: 'Seafarer requirements', menu: 'sourcing', legacyPage: 'basic_requirement.php', hidden: true,
    model: LegacyBasicRequirement, idField: 'id', baseFilter: ACTIVE, defaultSort: { companyid: 1, type: 1, question: 1 },
    columns: [col('companyid', 'Owner', 'lookup'), col('type', 'Type'), col('rank', 'Rank', 'lookup'), col('requirement', 'Requirement', 'longtext'), col('question', 'Q #')],
    lookups: { companyid: 'company', rank: 'rank' },
    search: ['requirement', 'question'],
    filters: [{ key: 'companyid', label: 'Owner', from: 'lookup:company' }, { key: 'type', label: 'Type', options: ['basic', 'iqaa'] }],
    form: [f('companyid', 'Owner', 'lookup', { lookup: 'company', required: true }), f('type', 'Type', 'select', { options: ['basic', 'iqaa'], labels: ['Basic requirement', 'Interview Q&A'], required: true }), f('rank', 'Rank (Q&A only)', 'lookup', { lookup: 'rank' }), f('question', 'Question no.'), f('requirement', 'Requirement / question and answer', 'textarea', { required: true })],
    statusField: 'status', creatable: true, editable: true, deletable: true,
  },
  vendorInvoices: {
    title: 'Vendor Invoices', menu: 'invoice', legacyPage: 'vendorinvoice.php', hidden: true,
    model: LegacyInvoiceVendor, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('inv_count', '#'), col('invoice', 'Category'), col('vendor', 'Vendor', 'lookup'), col('invoice_company', 'Owner', 'lookup'), col('refno', 'Reference'), col('items', 'Items'), col('fromdate', 'From', 'date'), col('todate', 'To', 'date'), col('doneby', 'By'), col('cdate', 'Created', 'datetime')],
    lookups: { invoice_company: 'company', vendor: 'agent' },
    search: ['invoice', 'refno', 'items'],
    filters: [{ key: 'invoice', label: 'Category', from: 'distinct' }, { key: 'vendor', label: 'Vendor', from: 'lookup:agent' }, { key: 'invoice_company', label: 'Owner', from: 'lookup:company' }, { key: 'cdate', label: 'Created', type: 'daterange' }],
    form: [f('invoice', 'Category', 'select', { options: ['Flag Documents', 'Medical', 'Visa', 'PPE', 'Hotel', 'Travel', 'Other'], required: true }), f('vendor', 'Vendor', 'lookup', { lookup: 'agent', required: true }), f('invoice_company', 'Owner', 'lookup', { lookup: 'company' }), f('refno', 'Reference'), f('fromdate', 'From', 'date'), f('todate', 'To', 'date'), f('items', 'Number of items', 'number')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'doneby', date: 'cdate' },
  },
  payments: {
    title: 'Payments', menu: 'invoice', legacyPage: 'account_documents.php', hidden: true,
    model: LegacyPayments, idField: 'id', defaultSort: { id: -1 },
    columns: [col('fullname', 'Candidate'), col('indosno', 'INDOS'), col('category', 'Category'), col('payment_to_type', 'Paid to'), col('payment_to', 'Payee'), col('payment_method', 'Method'), col('payment_amount', 'Amount', 'money'), col('payment_status', 'Status'), col('payment_date', 'Paid on', 'date'), col('payment_proof', 'Proof', 'file'), col('add_by', 'By')],
    search: ['fullname', 'indosno', 'emailid', 'payment_to', 'remark'],
    filters: [{ key: 'category', label: 'Category', from: 'distinct' }, { key: 'payment_status', label: 'Status', from: 'distinct' }, { key: 'payment_method', label: 'Method', from: 'distinct' }, { key: 'payment_date', label: 'Paid on', type: 'daterange' }],
    form: [f('fullname', 'Candidate'), f('indosno', 'INDOS'), f('emailid', 'Email'), f('category', 'Category'), f('payment_to_type', 'Paid to (type)', 'select', { options: ['Vendor', 'Candidate', 'Owner', 'Other'] }), f('payment_to', 'Payee'), f('payment_method', 'Method', 'select', { options: ['NEFT', 'RTGS', 'UPI', 'Cash', 'Cheque', 'Card'] }), f('payment_amount', 'Amount', 'number'), f('payment_status', 'Status', 'select', { options: PAID }), f('payment_date', 'Paid on', 'date'), f('remark', 'Remark', 'textarea')],
    creatable: true, editable: true, stamp: { user: 'add_by', date: 'add_date' },
  },
  accountDocuments: {
    title: 'Account Documents', menu: 'invoice', legacyPage: 'account_documents.php', hidden: true,
    model: LegacyAccountDocument, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('doc_name', 'Document'), col('doc_type', 'Type'), col('issue_date', 'Issued', 'date'), col('valid_date', 'Valid till', 'date'), col('uplod', 'File', 'file'), col('users', 'By'), col('cdate', 'Added', 'datetime')],
    search: ['doc_name', 'doc_type'],
    filters: [{ key: 'doc_type', label: 'Type', from: 'distinct' }, { key: 'issue_date', label: 'Issued', type: 'daterange' }],
    form: [f('doc_name', 'Document name', 'text', { required: true }), f('doc_type', 'Type'), f('issue_date', 'Issued', 'date'), f('valid_date', 'Valid till', 'date'), f('pan', 'PAN'), f('passport', 'Passport'), f('adhar', 'Aadhaar'), f('passport_issue_date', 'Passport issued', 'date'), f('passport_expiry_date', 'Passport expiry', 'date')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'users', date: 'cdate' },
  },
  itrDocuments: {
    title: 'ITR Documents', menu: 'invoice', legacyPage: 'account_documents.php', hidden: true,
    model: LegacyItrDoc, idField: 'id', baseFilter: ACTIVE, defaultSort: { id: -1 },
    columns: [col('itr_id', 'ITR'), col('agreement_no', 'Agreement no.'), col('issue_date', 'Issued', 'date'), col('valid_date', 'Valid till', 'date'), col('uplod', 'File', 'file'), col('users', 'By'), col('cdate', 'Added', 'datetime')],
    search: ['itr_id', 'agreement_no'],
    form: [f('itr_id', 'ITR', 'text', { required: true }), f('agreement_no', 'Agreement no.'), f('issue_date', 'Issued', 'date'), f('valid_date', 'Valid till', 'date')],
    statusField: 'status', creatable: true, editable: true, stamp: { user: 'users', date: 'cdate' },
  },
  nrpaInvoices: {
    title: 'NRPA Invoices', menu: 'invoice', legacyPage: 'account_documents.php', hidden: true,
    model: LegacyNrpaInvoice, idField: 'invid', baseFilter: { status: 'Active' }, defaultSort: { invid: -1 },
    columns: [col('invoic_no', 'Invoice no.'), col('invoiceno', '#'), col('company_name', 'Owner'), col('fullname', 'Candidate'), col('vcan_id', 'INDOS'), col('rankname', 'Rank'), col('vesselname', 'Vessel'), col('jdate', 'Joined', 'date'), col('dayson_vessel', 'Days'), col('agencyfee', 'Agency fee', 'money'), col('total', 'Total', 'money'), col('payment_date', 'Payment', 'date'), col('istatus', 'Print status')],
    search: ['invoic_no', 'invoiceno', 'fullname', 'vcan_id', 'company_name', 'vesselname'],
    filters: [{ key: 'company_name', label: 'Owner', from: 'distinct' }, { key: 'istatus', label: 'Print status', from: 'distinct' }],
    readOnly: true,
  },
  grievances: {
    title: 'Sea service grievances', menu: 'dg', legacyPage: 'sea_service_correction.php', hidden: true,
    model: Grievance, idField: 'id', defaultSort: { id: -1 },
    columns: [col('g_title', 'Title'), col('indosno', 'INDOS'), col('emailid', 'Email'), col('g_remark', 'Remark', 'longtext'), col('status', 'Open', 'status'), col('cdate', 'Raised', 'datetime')],
    search: ['g_title', 'indosno', 'emailid', 'g_remark'],
    filters: [{ key: 'cdate', label: 'Raised', type: 'daterange' }],
    form: [f('g_title', 'Title', 'text', { required: true }), f('indosno', 'INDOS'), f('emailid', 'Email'), f('g_remark', 'Remark', 'textarea'), f('g_close_remark', 'Closing remark', 'textarea')],
    statusField: 'status', creatable: true, editable: true, stamp: { date: 'cdate' },
    related: [{ key: 'chat', title: 'Replies', resource: 'grievanceChats', field: 'g_id', match: 'id' }],
  },
  grievanceChats: {
    title: 'Grievance replies', menu: 'dg', legacyPage: 'sea_service_correction.php', hidden: true,
    model: LegacyGrievanceChat, idField: 'id', defaultSort: { id: -1 },
    columns: [col('g_id', 'Grievance #'), col('indosno', 'INDOS'), col('chat', 'Message', 'longtext'), col('user', 'By'), col('cdate', 'On', 'datetime')],
    form: [f('g_id', 'Grievance #', 'number', { required: true }), f('indosno', 'INDOS'), f('emailid', 'Email'), f('chat', 'Message', 'textarea', { required: true })],
    statusField: 'status', creatable: true, editable: false, stamp: { user: 'user', date: 'cdate' },
  },
};

// Public, serialisable form of a definition: mongoose models (top level and
// inside `counts`) never go to the client.
export function describe(key) {
  const r = RESOURCES[key];
  if (!r) return null;
  const { model, baseFilter, counts, ...rest } = r;
  const out = { key, ...rest };
  if (counts) out.counts = counts.map(({ model: m, ...c }) => c);
  return out;
}

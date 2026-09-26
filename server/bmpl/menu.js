// The BMPL back-office navigation, mirroring the legacy cms_menu /
// cms_submenu tree. Each item is either a declarative resource (see
// resources.js) or a hand-built page on the client. `legacyPage` is the
// PHP file the item replaces; a staff member sees an item only when that
// page is in their imported permissions (or they have all_access).
import { RESOURCES } from './resources.js';

const res = (key) => ({ type: 'resource', key, label: RESOURCES[key].title, legacyPage: RESOURCES[key].legacyPage });
const page = (route, label, legacyPage, extra = {}) => ({ type: 'page', route, label, legacyPage, ...extra });

export const MENU = [
  { key: 'home', label: 'Home', icon: 'LayoutDashboard', items: [page('', 'Dashboard', 'dashboard.php')] },
  { key: 'owner', label: 'Owner', icon: 'Building2', items: [res('owners'), res('ownersInactive'), res('vessels'), res('prospectiveClients'), res('statutoryAudits'), res('ranks')] },
  { key: 'vendor', label: 'Vendor', icon: 'Truck', items: [res('vendors'), res('purchaseRequisitions'), res('doctors')] },
  { key: 'employee', label: 'BMPL Employee', icon: 'Users', items: [res('staff'), res('payroll'), res('staffAttendance')] },
  { key: 'sourcing', label: 'Sourcing', icon: 'Search', items: [
    page('candidates', 'View Candidate CV', 'ship_dashboard.php'),
    page('vacancies', 'List of vacancies', 'manage_vacancy.php'),
    page('sourcing-tasks', 'Task For Sourcing', 'manage_task.php'),
    page('proposals', 'Candidate Proposal Status', 'proposed_candidates.php'),
    res('closedVacancies'),
    page('seafarer-requirements', 'Seafarer', 'basic_requirement.php'),
  ] },
  { key: 'documentation', label: 'Documentation', icon: 'FileCheck2', items: [
    page('pooled-crew', 'Pooled Crew', 'pooled_crew.php'),
    page('vacancies?rejoining=1', 'Rejoining Vacancies', 'manage_vacancyr.php'),
    page('documentation-tasks', 'Task For Documentation', 'manage_tapproval.php'),
    page('cancelled-joiners', 'List of cancelled Joiners', 'cancelled_joiners.php'),
    page('document-upload', 'Document Upload', 'document_upload.php'),
    page('travel-diary', 'Travel Diary', 'Crew_travel_details.php'),
  ] },
  { key: 'signon', label: 'Crew Sign On/Off', icon: 'Anchor', items: [page('crew-signon', 'Crew Signon', 'signon_report.php')] },
  { key: 'nrpa', label: 'NRPA', icon: 'Plane', items: [res('emigrate'), res('techniciansJoined'), page('other-nationality', 'Other Nationality Crew', 'othernation_crew.php')] },
  { key: 'letters', label: 'Letter Details', icon: 'Mail', items: [res('pcc'), res('oldSeaService'), page('letters/visa', 'Visa Letter', 'visa_details_search.php'), res('lgDetails'), page('letters/nedpass', 'Nedpass letter', 'nedpass_details_search.php')] },
  { key: 'dg', label: 'DG', icon: 'ShieldCheck', items: [
    res('licenses'), res('mmd'),
    page('pending-dg', 'Pending Issues with DG', 'pendingissuewithdg.php'),
    res('immunizationCards'), res('seaServiceRequests'),
    page('sea-service-correction', 'Sea Service correction', 'sea_service_correction.php'),
    res('dgCirculars'), res('tarBooks'),
    page('dg-related', 'DG Related Icon', 'dg_related.php'),
  ] },
  { key: 'report', label: 'Report', icon: 'BarChart3', items: [
    page('reports/month-end', 'Month End Report', 'monthreport.php'),
    page('reports/candidate', 'Candidate Information', 'getinfo_candidate.php'),
    page('reports/crew-welfare', 'Crew Welfare Report', 'crewwelfare_new_search.php'),
    page('reports/crew-welfare-govt', 'Crew Welfare-GOVT Report', 'crew_welfare_report.php'),
    res('backOut'),
    page('reports/all', 'All Report', 'all_report.php'),
    page('reports/expenses', 'BMPL Expenses Report', 'expenses_report_search.php'),
    page('reports/signoff', 'Signoff Data Reports', 'signoff_searchemail.php'),
  ] },
  { key: 'invoice', label: 'Invoice', icon: 'Receipt', items: [
    page('invoices/generate', 'Generate Invoice', 'newinvoice.php'),
    page('invoices/generate-vendor', 'Generate Vendor Invoice', 'create_vendor_invoice.php'),
    res('invoices'), res('nedpassInvoices'),
    page('invoices/vendor', 'Vendor Invoices', 'vendorinvoice.php'),
    res('proformaInvoices'), res('bankAccounts'), res('vendorInvoiceFollowups'), res('otherExpenses'), res('companyInvoiceFollowups'), res('accountingCalendar'),
    page('invoices/account-documents', 'Account Documents', 'account_documents.php'),
  ] },
  { key: 'shore', label: 'Shore Job', icon: 'Briefcase', items: [res('shoreVacancies'), page('shore-cvs', 'Shore Candidate All CV', 'allshorecv.php')] },
  { key: 'utilities', label: 'Utilities', icon: 'Wrench', items: [
    res('notices'), res('emailFormats'), res('globalSh'), res('nedPass'), res('flagDocuments'), res('visaTypes'),
    page('website-links', 'Website Links', 'manage_websource.php'),
    page('cms-control-panel', 'CMS Control Panel', 'manage_users.php'),
    res('visitorEntries'), res('inOutDocuments'), res('ppeRequests'), res('hotelRequests'), res('medicalRequests'), res('expiryPlans'), res('assets'),
    page('master-data', 'Master Data', 'manage_users.php'),
  ] },
  { key: 'ownership', label: 'BMPL Ownership', icon: 'Landmark', items: [res('ownership')] },
];

/** Legacy page names reachable from a resource key (for permission checks). */
export function legacyPageOf(resourceKey) {
  return RESOURCES[resourceKey]?.legacyPage || null;
}

export function canOpen(user, legacyPage) {
  if (!legacyPage) return true;
  if (user.role_code === 'SUPER_ADMIN') return true;
  const b = user.bmpl || {};
  if (b.all_access) return true;
  return Array.isArray(b.pages) && b.pages.includes(legacyPage);
}

/** The menu as one user sees it. */
export function menuFor(user) {
  return MENU.map((g) => ({ ...g, items: g.items.filter((it) => canOpen(user, it.legacyPage)) })).filter((g) => g.items.length);
}

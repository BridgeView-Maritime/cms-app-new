# Admin (BMPL back-office) migration

The legacy admin lives at `shipmanagementjobs.com/bridgeviewmaritime/admin_Bridgeview/`
(source: `C:\Users\Hp\_\public_html\bridgeviewmaritime.com\linux\shipmanagementjobs.com\bridgeviewmaritime\admin_Bridgeview\`).
It is **1,383 PHP files / ~935,000 lines**, against the `bridgeoffic` MySQL database.

Its navigation is not hardcoded: `cms_menu` / `cms_submenu` define the tree and
`cms_usermenu` / `cms_usersubmenu` grant menus per staff login. That gives an exact
inventory: **15 menus, 93 pages (84 active), 101 staff logins with at least one menu.**
The menu-entry pages alone are ~131,000 lines; each has add/edit/detail/print
sub-pages behind it.

## Where the data stands (2026-09-20)

| | |
|---|---|
| Legacy tables used by the 84 active pages | **117** |
| Migrated into Mongo (`collection_<table>`) | **117 / 117** – done in this pass (93 imported today, 291k documents) |
| Legacy collections in Mongo, all told | 162 (536k documents) |
| Mongoose models | hand-written for 30 collections; **116 generated** into `server/models/legacy/` by `scripts/generateLegacyModels.mjs` (types inferred from the data; header lists which admin pages use each table) |

Tools: `server/scripts/importLegacyTables.mjs <db> --file <list>` (single-pass batch import,
idempotent), `server/scripts/generateLegacyModels.mjs` (never overwrites, refuses
case-insensitive filename collisions – Windows).

Facts that matter for the build:

- **Owners are in `ecompany` (472 rows, 111 columns), not `company` (1 row).** The
  existing CMS form `CREATE_COMPANY` writes to its own `collection_create_company`
  (0 rows) – it must be pointed at `ecompany` or the two will diverge.
- **Staff accounts are `companylogin`: 186 rows, only 10 with status 1 (active).**
  Departments: Documentation 36, Sourcing 35, Accounts 21, IT 17, Admin 15… The new app
  has 3 users with no role. Per-user menu rights are `cms_usermenu`/`cms_usersubmenu`.
- **`visiter` (37,276 rows) is the crewing-side master record of a candidate**, used by
  15 admin pages; it is distinct from the public-site `registration`/`addresume`
  (linked by email/INDOS).
- Pipeline volumes: vacancies 18,438 (9,292 open) → vacanciescandidate 29,379 →
  taskassign 36,237 → contractnew (sign-ons) 12,304 → invoice 20,690.
- Five tables live in the `newshipboard` dump, not `bridgeoffic`: companyreg,
  countries, cv_deletion, tarbook, visitors.

## Inventory by menu (staff with access · pages · legacy lines)

| Menu | Users | Pages | Lines | Notes |
|---|---|---|---|---|
| Home | 51 | 1 | 10,453 | dashboard.php reads 32 tables |
| Owner | 49 | 6 | 4,511 | List of Owner (ecompany), Deactive, Vessel Profile, Prospective Client, Statutory Docs, Rank |
| Vendor | 46 | 3 | 2,130 | Vendor Details (agent_details), Purchase Requisition, Doctors |
| BMPL Employee | 30 | 4 | 4,342 | Staff list (companylogin), Payroll, TDS, Attendance – **overlaps the new app's HR/attendance module** |
| Sourcing | 79 | 6 active | 17,071 | View Candidate CV (3,986), List of vacancies (4,574), Task For Sourcing, Proposal Status, Closed Vacancies, Seafarer |
| Documentation | 76 | 6 | 29,611 | **Task For Documentation is 23,681 lines** – the single biggest page (the screenshot) |
| Crew Sign On/Off | 84 | 1 active | 893 | Crew Signon (contractnew); Signoff + Vessel Mgmt disabled in legacy |
| NRPA | 50 | 3 | 1,773 | eMigrate submission, technicians joined, other-nationality crew |
| Letter Details | 72 | 5 | 3,440 | PCC, Old Sea Service, Visa/LG/Nedpass letters – PDF generation |
| DG | 56 | 9 | 8,253 | licences, MMD, sea-service issuance (4,407), TAR book, circulars, immunization |
| Report | 82 | 8 | 6,215 | Month End, Candidate Information (2,772), crew welfare ×2, back-out, expenses, signoff |
| Invoice | 63 | 13 | 9,630 | generate/print invoices (PDF), vendor & proforma, followups, accounting calendar |
| Shore Job | 44 | 2 | 3,860 | shore vacancies + shore CVs |
| Utilities | 55 | 15 active | 12,806 | email formats, flag docs, nedpass, PPE/hotel/medical requests, in/out docs, assets, expiry plans, CMS control panel |
| BMPL Ownership | 6 | 1 | 526 | |

Full page → table map: `scripts/` output archived in this doc's history; regenerate with
the table scan in `generateLegacyModels.mjs` (the `usedBy` pass).

## Proposed phases

Ordered by dependency first, then by how many staff use the module daily.

| Phase | Scope | Why this order |
|---|---|---|
| **A – Foundation** | Staff accounts + per-user menu permissions (companylogin → users/roles, cms_usermenu → appmenus); admin nav skeleton; shared reference data pages: Owners (ecompany), Vessels, Ranks, Currency, Ship sub-categories, Vendors/Agents, Doctors, Visa types, Countries | Everything else joins to these; nothing can be permissioned without it |
| **B – Sourcing** | View Candidate CV (visiter), List of vacancies, Task For Sourcing, Candidate Proposal Status, Closed Vacancies, Seafarer | Start of the crewing pipeline; 79 users |
| **C – Documentation** | Task For Documentation, Pooled Crew, Rejoining Vacancies, Cancelled Joiners, Document Upload, Travel Diary | The team's daily workspace; 76 users; largest page |
| **D – Sign-on, NRPA, Letters** | Crew Signon; eMigrate/NRPA; PCC, Old Sea Service, Visa/LG/Nedpass letters | Completes the pipeline; 84/50/72 users; needs PDF generation |
| **E – Reports** | 8 reports | 82 users, read-only, mostly aggregations over the above |
| **F – Invoice** | 13 pages incl. PDF invoices, followups, calendar | 63 users; depends on sign-ons and vendors |
| **G – DG** | 9 pages | 56 users; self-contained |
| **H – Vendor, BMPL Employee, Shore Job, Utilities, Ownership** | remaining 25 pages | Lower usage or overlapping the new app's own HR modules |

### Decisions taken (2026-09-21)

These were settled in the build rather than asked, since the work ran unattended.

1. **Build approach – hybrid.** A declarative resource engine (`server/bmpl/resources.js`
   + `client/src/pages/bmpl/BmplListPage.jsx`/`BmplRecordPage.jsx`) serves the 71
   list/edit pages; the 30 workflow pages are hand-built React against purpose-built
   endpoints. The app's `formmetas` engine was **not** reused: it is bound to the
   candidate-portal form model and could not express the legacy joins.
2. **Staff accounts – imported.** All 186 `companylogin` rows became app users
   (`scripts/importLegacyStaff.mjs`): 171 with a BMPL profile, 10 active, 8 with
   `all_access`. The legacy plaintext password is bcrypt-hashed on import, and
   `cms_usersubmenu` rights become `user.bmpl.pages` (a list of legacy page names).
   Permissions are editable in-app under **Utilities → CMS Control Panel**.
3. **Owners – `bo_company` (168 rows).** `ecompany` turned out to be the *edit-history*
   copy (472 rows) and `company` in `newshipboard` holds 1 row; the admin's owner
   foreign keys (`company_name`) resolve against `bridgeoffic.company`, imported as
   `collection_bo_company`. The `CREATE_COMPANY` form was left alone – the BMPL pages
   read and write `bo_company` directly.
4. **HR overlap – history only.** Pay Roll and Daily attendance are read-only views of
   the migrated rows, labelled "(history)" in the menu. The new app's own employee and
   attendance modules stay the system of record.

## Status

- [x] Inventory (menus, pages, tables, usage)
- [x] All 118 page tables migrated; 128 legacy models generated
- [x] Phase A – staff accounts, permissions, menu, master data
- [x] Phases B–H – all 15 menus / 82 menu items build and render against live data

### What was built

**Server** (`/api/bmpl`, all behind `authenticateToken` + per-page permission):

| File | Role |
|---|---|
| `bmpl/resources.js` | 72 declarative resource definitions (columns, filters, search, form, lookups, related lists) |
| `bmpl/lookups.js` | id → name resolution for the legacy text foreign keys (company, rank, vessel, currency, ship category/sub-category, country, staff, agent, doctor, shore rank), cached |
| `bmpl/menu.js` | the 15-group menu and `canOpen(user, legacyPage)` |
| `routes/bmplRoutes.js` | generic list / detail / create / update / status / delete for every resource |
| `routes/bmplWorkflowRoutes.js` | dashboard, candidates (360° view), vacancies, sourcing tasks, proposals, documentation checklist, cancelled joiners, document upload, travel diary, crew sign-on/off |
| `routes/bmplExtraRoutes.js` | CMS control panel, pending DG issues, sea-service grievances, visa/NED letters, invoice builders, other-nationality & shore CVs, 5 report endpoints |
| `routes/bmplRoutes.js` also carries | CSV export, date-range filters and declarative per-row actions (see the audit below) |
| `scripts/ensureBmplIndexes.mjs` | 47 indexes for the back-office query paths (the legacy tables arrived without their MySQL indexes) |

**Client** (`client/src/pages/bmpl/`, mounted at `/dashboard/bmpl`): `BmplModule` (nav +
routing), the two generic pages, and 22 hand-built pages in `pages/`.

### Verified on 2026-09-21, 2026-09-22 and 2026-09-26

Against the live Atlas data, with a SUPER_ADMIN session: all **82 menu items** open, none
falls back to the "not rebuilt" placeholder, and the browser console is clean. Interaction
checks: vacancy → proposals/tasks detail, candidate report (sea service, proposals,
vaccinations, visas, payments), crew-welfare grouping (226 crew on board, 18 owners),
control panel permission grid, master-data tabs, seafarer requirements per owner, the
printable visa letter, the invoice builder (272 sign-ons for one owner in 2024 → line
selection → invoice number), and the grievance thread. Create/update/delete was exercised
end-to-end on `crew_dg_data` (the one new, empty collection) and the test row removed.

After the feature audit below, the sweep was repeated: all 82 items still open with a clean
console, and the additions were checked in the browser — CSV download from a list, a
date-range filter narrowing 1,500 payments to 24, row-action buttons on list and record
pages (with the server refusing an action whose condition no longer holds), the task
re-assign form, the documentation filters and status column, the candidate detailed search,
the sign-on date-field selector, the dashboard panels, and a 5,000-row workflow CSV.

After the column audit (2026-09-26) the sweep was repeated again: all 82 menu items
open with a clean console, and across 42 list pages every table header count matches
its body cells, no native date input remains, and the calendar picker was exercised in
both a filter and a form.

### Feature audit against the old site (2026-09-22)

Every one of the 81 legacy page files behind the menu was parsed for what it
actually offered — table columns, search inputs, row buttons, exports, sub-pages —
and compared with the rebuilt page. Tooling in `scratchpad/audit/`:
`extract.cjs` (legacy), `menu.mjs` (new), `compare.cjs` (diff). What the
comparison turned up, and what was done about it:

| Gap found | Where it applied | Closed by |
|---|---|---|
| **"Download Excel" on nearly every list** | 60+ pages | CSV export everywhere: `GET /r/:resource/export` streams the whole filtered set (10,000-row cap) for declarative lists; the workflow pages page through their own endpoint (5,000-row cap) and say so when a file is truncated |
| **Print button** | most lists | Print on every list and record page, on top of the print stylesheet the reports already had |
| **From / to date boxes** (`txt_from`, `txt_todate`) | 28 lists | A `daterange` filter type in the resource engine, matching both the migrated `Date` values and the string dates newer rows carry |
| **Per-row buttons** ("Click here to approve", "Cancel this nedpass", "Mark payment received", "Enable candidate") | 14 lists | Declarative `actions` on a resource → `POST /r/:resource/:id/action/:key`, with the legacy's own guards (an approved card cannot be approved twice) and prompts for the reason fields |
| Re-assign / delete a sourcing task; owner filter; count of candidates already proposed | Task For Sourcing | `PUT /tasks/:id`, `DELETE /tasks/:id`, owner + date filters, proposed/selected counts per row |
| Crewing-officer filter, joiner-type filter, start / re-start / cancel documentation, who it sits with | Task For Documentation | New filters and a Documentation column with Start, Re-start, Cancel and "Take it" |
| Sign-on searched by **sign-on date**, not entry date; rank, joiner and reason filters | Crew Signon | A date-field selector (sign-on / sign-off / entered) plus the three filters |
| Vacancy #, sourced-by and joiner filters | Candidate Proposal Status | Added to the toolbar and the API |
| Field-by-field search (name, INDOS, passport, CDC, ship type, skills …) | View Candidate CV, Shore CVs, Other Nationality | A "Detailed search" panel; ship type / skills / passport / CDC resolve through the public-site CV and back |
| On-board status and the ticket / Form 1 / contract uploaded against the proposal | Document Upload | Both now shown per document set |
| "Edited vacancy" history | List of vacancies | Change history card on the vacancy page (from `editvacancies`) |
| "My Task" panel and the movement chart | Dashboard | My tasks, and a six-month sign-on / sign-off / proposal trend |

Tables imported in this pass so the pages above have their data: `payments`,
`invoice_vendor`, `account_document`, `itr_doc`, `nrpa_invoice`, `impweblink`,
`basic_requirement`, `invoicezmi`.

Deliberately **not** rebuilt, with the reason:

- **Composite "details" columns.** The legacy tables packed "Company Details",
  "Candidate Details", "Opening Details" into one cell of stacked lines. The same
  fields are here as separate, sortable columns.
- **Sub-pages that are alternative exports** (`*_excel.php`, `*_pdf.php`,
  `*_pdfview.php`): replaced by the CSV export and browser printing.
- **e-mail campaigns and "Send Email" buttons** (`create_emailcampaign.php`,
  pooled crew, closed vacancies): still not sent — see the gap list below.
- **Staff HR sub-pages** (offer / experience / warning letters, hierarchy,
  interview records, assets per staff): the new app has its own employee module,
  per the earlier decision to keep legacy HR as history.
- **`manage_users.php` extras** — target amounts, login-request times, blocked
  status, CMS action logs: the new app's own users, roles and audit log cover
  these; the control panel only maps the legacy page rights.

### Column-by-column audit (2026-09-26)

The feature audit above compared what each page *does*; this one compared what
each page *shows*. Every legacy listing table was parsed for its header row in
order, and for the database fields printed in the matching body cells — including
the pages whose table is built by an `*_ajax.php` companion. Tooling:
`scratchpad/audit/columns.cjs`, `columns2.cjs`, `fields.cjs`, `side.cjs`.

It found that the first build had picked a sensible-looking subset of fields
rather than the ones the office actually reads. 69 of 81 pages were missing at
least one legacy column. The rule now applied: **the legacy columns are the
baseline** — every field the old page printed is on screen, in the old order,
with our additions after it.

Worth calling out:

- **Four pages were reading the wrong table.**
  | Page | Was | Now |
  |---|---|---|
  | Issuance of Sea-Service | `sea_service_request` (134 portal requests) | `coscertificate` — the COS register the DG team works from (2,041 active), with the approval chain |
  | Old Sea Service | `coscertificate` | `ccoscertificate` — the edit-history copies (1,528), which is what the old page listed |
  | Visa Service | `visatype` (the visa-type master list) | `visaservice` — the visa applications, with agent, amounts and applied/received dates. The table had never been imported; the master list moved to Master Data → Visa types |
  | Pooled Crew | `dyn_crew` (the owner's crew-contact list) | Built from `contractnew`, as the old page did: everyone whose last contract ended and who is not on board (4,102), with availability, residence visa, next of kin and sea-service remark. The old resource is kept as "Owner crew contacts" |

- **Wider tables where the old page showed more.** Vessel Profile went from 9
  columns to 25 (call sign, GRT/KW, P&I and MLC certificate numbers and dates,
  financial-security details, the seven certificate files, Bharatkosh receipt);
  owners gained address, contact person, accounts email, contract start/revised
  and a vessel count; NED Pass gained the five SCI/ONGC milestone dates; Print
  Invoice gained payment status, invoice raised, created date and created by;
  and the flag / PPE / medical / hotel request lists gained the candidate's
  name, rank and passport.

- **Two things the engine could not express**, now part of it: `personBy`
  (the legacy lists joined `visiter` on the INDOS number to show the candidate
  behind a request) and `counts` (rows that showed "3 vessels" / "5 documents").

- **Workflow pages** were brought to the same standard: the candidate CV list
  shows CDC, COC, ship type and whether a CV / photo / signature is on file; the
  vacancy list shows the old page's composite Company / Vessel / Salary-openings
  cells including IMO, flag, sub-category, priority and remark; sourcing tasks
  show TAT, basis and the vacancy remark; documentation shows passport, joiner
  type and visa / LOI status; sign-on shows CDC and COC; the CV lists show
  passport, date of birth and available-from.

What is deliberately still different: the legacy tables packed several fields
into one cell ("Company Details", "Candidate Details"). Those are split into
separate sortable columns here, so a label-by-label diff still reports them as
"missing" while every value is on screen. Staff passwords are not shown.

### Dates are calendars (2026-09-26)

Every date field in the back-office is now a calendar popover rather than a
typed box: one shared `components/CalendarPicker.jsx` (month and year
dropdowns, Today and Clear), used by the resource forms, the date-range filters
and every workflow page. The candidate portal's `DateField` became a thin
wrapper over the same component, so both sides behave identically and keep
their own styling. Verified: no `<input type="date">` remains anywhere in the
module.

Fixed while testing: the record form rebuilt its draft whenever the module's
context re-rendered, so a value entered in the first second or two after the
page opened was silently wiped. It is now prepared once per record.

### Known gaps

- **Files from the old site were not copied.** Rows that reference an upload (agreements,
  certificates, grievance attachments, old invoices) show the file name, not a link. New
  uploads go to `server/uploads/bmpl-docs` and do link.
- **No email.** The legacy pages mailed owners, vendors and candidates at several steps
  (proposal sent, visa request, sign-off confirmation). The app records the same rows but
  sends nothing; `email`/`emailsent` flags are left as the legacy code set them.
- **No PDF generation.** Letters and invoices render as print-styled HTML (browser Print →
  PDF) instead of the legacy HTML2PDF output. Lists export as CSV rather than .xls.
- **`crew_dg_data` is empty.** The table was created on the live site after the last MySQL
  backup, so "Pending Issues with DG" starts blank; the schema matches what the legacy page
  wrote (`models/CrewDgData.js`).
- **Reports are recomputed, not ported line by line.** The month-end report reproduces the
  legacy figures (movements, proposals per executive, vacancies, tasks) from the same
  tables, but the legacy page's ~3,500 lines contain per-owner special cases that were not
  reproduced; the numbers should be spot-checked against a known month before the office
  relies on them.
- **HR pages are read-only** by decision 4 above.
- Response times against Atlas are 2–5 s per list on the largest collections after
  indexing; acceptable for back-office use but worth a look if it grates.
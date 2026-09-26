// client/src/pages/bmpl/pages/MasterDataPage.jsx
// "Master Data" - the small reference tables behind the dropdowns, and with
// `websiteLinks` the legacy "Website Links" portal list. Both are embedded
// generic lists; this page just chooses which one.
import React, { useState } from 'react';
import { Database, Link2 } from 'lucide-react';
import BmplListPage from '../BmplListPage';
import { useBmpl } from '../BmplModule';

const MASTER = [
  { key: 'ranks', label: 'Ranks', hint: 'Seafarer ranks and their officer / rating type' },
  { key: 'currencies', label: 'Currencies', hint: 'Currencies and INR rates used on vacancies' },
  { key: 'shipCategories', label: 'Ship categories', hint: 'Top-level vessel categories' },
  { key: 'shipSubcategories', label: 'Ship sub-categories', hint: 'Vessel types under each category' },
  { key: 'countries', label: 'Countries', hint: 'Nationalities and visa countries' },
  { key: 'shoreRanks', label: 'Shore positions', hint: 'Positions used by shore vacancies' },
  { key: 'visaTypeMaster', label: 'Visa types', hint: 'The visa categories offered on requests' },
  { key: 'vendors', label: 'Vendors / agents', hint: 'Medical, visa, flag and travel vendors' },
  { key: 'doctors', label: 'Doctors', hint: 'Approved medical examiners' },
  { key: 'emailFormats', label: 'Email formats', hint: 'Templates used by the old mailer' },
  { key: 'bankAccounts', label: 'Bank accounts', hint: 'Accounts printed on invoices' },
];

export default function MasterDataPage({ websiteLinks }) {
  const { resources } = useBmpl();
  const available = MASTER.filter((m) => resources[m.key]);
  const [key, setKey] = useState(available[0]?.key || '');

  if (websiteLinks) {
    return (
      <div>
        <div className="bm-page-head"><div><h1><Link2 size={18} /> Website Links</h1><p>Portals the office uses every day and the shared logins for them. Visible to everyone with access to this page, exactly as on the old site.</p></div></div>
        <BmplListPage resourceKey="websiteLinks" embedded />
      </div>
    );
  }
  return (
    <div>
      <div className="bm-page-head"><div><h1><Database size={18} /> Master Data</h1><p>Reference lists behind the dropdowns. Editing here changes what every other page offers.</p></div></div>
      <div className="bm-tabs">{available.map((m) => <button key={m.key} type="button" className={'bm-tab' + (m.key === key ? ' bm-tab-active' : '')} title={m.hint} onClick={() => setKey(m.key)}>{m.label}</button>)}</div>
      {key && <BmplListPage key={key} resourceKey={key} embedded />}
    </div>
  );
}

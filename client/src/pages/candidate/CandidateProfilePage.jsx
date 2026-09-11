// client/src/pages/candidate/CandidateProfilePage.jsx
// "Personal Information" - the legacy addresume.php page. The registration
// record is one form; the sections the old page kept in the addresume
// table (experience, crane, other details, availability) each save on
// their own below it. Dashboard cards deep-link here with a #hash.
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { User, Save, Camera, Briefcase, Construction, ClipboardList, CalendarRange } from 'lucide-react';

import { CANDIDATE_ENDPOINTS, ACCOUNT_ENDPOINTS, PROFILE_SECTIONS } from '../../config/api';
import ExtendedSectionForm from '../../components/candidate/ExtendedSectionForm';
import CandidatePhotoUpload from '../../components/candidate/CandidatePhotoUpload';

const PROFILE_FIELDS = [
  { key: 'uname', label: 'Full Name' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'countrycode', label: 'Country Code', placeholder: '+91' },
  { key: 'phoneno', label: 'Phone Number' },
  { key: 'indosno', label: 'INDOS Number' },
  { key: 'sidno', label: 'SID Number' },
  { key: 'aadharno', label: 'Aadhar Card Number' },
  { key: 'pancardno', label: 'PAN Card Number' },
  { key: 'passport_no', label: 'Passport Number' },
  { key: 'coc_country', label: 'COC Country' },
  { key: 'coc', label: 'COC' },
  { key: 'engine_type', label: 'Engine Type' },
  { key: 'address', label: 'Address', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'countryname', label: 'Country' },
];

const toFieldValue = (type, value) => {
  if (type === 'date') {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  return value || '';
};

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function SectionCard({ id, icon: Icon, title, blurb, children }) {
  return (
    <div className="cp-card cp-section-card" id={id}>
      <div className="cp-card-head">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {blurb && <p className="cp-muted cp-section-blurb">{blurb}</p>}
      {children}
    </div>
  );
}

export default function CandidateProfilePage() {
  const { candidate, reload } = useOutletContext();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const [sections, setSections] = useState(null);
  const [options, setOptions] = useState({});
  const [lookups, setLookups] = useState({ ranks: [], vesselTypes: [] });

  useEffect(() => {
    if (candidate) {
      setProfile((prev) => prev ?? Object.fromEntries(
        PROFILE_FIELDS.map((f) => [f.key, toFieldValue(f.type, candidate[f.key])])
      ));
    }
  }, [candidate]);

  const loadExtended = useCallback(async () => {
    try {
      const res = await fetch(ACCOUNT_ENDPOINTS.EXTENDED_PROFILE, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setSections(data.sections);
    } catch (err) {
      setSections({});
    }
  }, []);

  useEffect(() => {
    loadExtended();
    fetch(ACCOUNT_ENDPOINTS.EXTENDED_OPTIONS).then((r) => r.json()).then((d) => { if (d.success) setOptions(d); }).catch(() => {});
    fetch(PROFILE_SECTIONS.LOOKUPS).then((r) => r.json()).then((d) => { if (d.success) setLookups(d); }).catch(() => {});
  }, [loadExtended]);

  // Dashboard cards link to #experience, #travel etc.
  useEffect(() => {
    if (!location.hash || !sections) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [location.hash, sections]);

  const handleFieldChange = (key, value) => setProfile((prev) => ({ ...prev, [key]: value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(CANDIDATE_ENDPOINTS.PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg({ type: 'success', text: 'Personal information updated.' });
        reload();
      } else {
        setSaveMsg({ type: 'error', text: data.message || 'Failed to update your details.' });
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Network error while saving.' });
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !sections) return <div className="cp-loading-screen">Loading your details...</div>;

  const rankField = (key, label) => ({
    key, label,
    type: lookups.ranks?.length ? 'select' : 'text',
    options: lookups.ranks || [],
  });

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Personal Information</h1>
          <p>Keep every section current - this is what our crewing team sees when matching you to a vacancy.</p>
        </div>
      </div>

      <SectionCard id="photo" icon={Camera} title="Profile Photo">
        <CandidatePhotoUpload candidate={candidate} onChanged={reload} />
      </SectionCard>

      <SectionCard id="personal" icon={User} title="Personal Details">
        {saveMsg && <div className={'cp-alert cp-alert-' + saveMsg.type}>{saveMsg.text}</div>}
        <form onSubmit={handleSaveProfile} className="cp-crud-form">
          <div className="cp-profile-grid">
            {PROFILE_FIELDS.map((f) => (
              <label key={f.key} className={'cp-field' + (f.wide ? ' cp-field-wide' : '')}>
                <span>{f.label}</span>
                <div className="cp-input-wrap cp-input-plain">
                  <input
                    type={f.type === 'date' ? 'date' : 'text'}
                    value={profile[f.key]}
                    placeholder={f.placeholder || ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  />
                </div>
              </label>
            ))}
          </div>
          <div className="cp-crud-form-actions">
            <button type="submit" className="lp-btn lp-btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Personal Details'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard id="experience" icon={Briefcase} title="Experience Details"
        blurb="Your current and target rank, and the vessels you have sailed on.">
        <ExtendedSectionForm
          section="experience"
          initial={sections.experience}
          onSaved={(s) => { setSections(s); reload(); }}
          fields={[
            rankField('presentrank', 'Present Rank'),
            rankField('appliedrank', 'Applied Rank'),
            { key: 'exprank', label: 'Experience in Rank', placeholder: 'e.g. 3 years' },
            { key: 'shiptype', label: 'Vessel Type', type: lookups.vesselTypes?.length ? 'select' : 'text', options: lookups.vesselTypes || [] },
            { key: 'skills', label: 'Cooking Skills', type: options.cookingSkills?.length ? 'select' : 'text',
              options: options.cookingSkills || [], hint: 'For catering ranks only.' },
            { key: 'aramcoapp', label: 'Aramco Approval', type: 'yesno' },
            { key: 'adnocapp', label: 'ADNOC Approval', type: 'yesno' },
          ]}
        />
      </SectionCard>

      <SectionCard id="crane" icon={Construction} title="Crane Experience Details"
        blurb="Only if you hold a crane licence - leave blank otherwise.">
        <ExtendedSectionForm
          section="crane"
          initial={sections.crane}
          onSaved={setSections}
          fields={[
            { key: 'cranetype', label: 'Type of Crane', type: 'select', options: options.craneTypes || [] },
            { key: 'cranemaker', label: 'Crane Maker', type: 'select', options: options.craneMakers || [] },
            { key: 'craneoperator', label: 'Crane Licence', placeholder: 'Licence number or authority' },
          ]}
        />
      </SectionCard>

      <SectionCard id="other" icon={ClipboardList} title="Other Details">
        <ExtendedSectionForm
          section="other"
          initial={sections.other}
          onSaved={setSections}
          fields={[
            { key: 'gender', label: 'Gender', type: 'select', options: options.genders || ['Male', 'Female', 'Other'] },
            { key: 'height', label: 'Height (cm)', type: 'number' },
            { key: 'weight', label: 'Weight (kg)', type: 'number' },
            { key: 'language', label: 'Languages Known', placeholder: 'e.g. English, Hindi' },
            { key: 'english_communication', label: 'English Communication', type: 'select', options: options.englishLevels || [] },
          ]}
        />
      </SectionCard>

      <SectionCard id="availability" icon={CalendarRange} title="Availability"
        blurb="When you are free to join. Vacancies are matched against this window.">
        <ExtendedSectionForm
          section="availability"
          initial={sections.availability}
          onSaved={setSections}
          submitLabel="Update Availability"
          fields={[
            { key: 'availablefrom', label: 'Available From', type: 'date' },
            { key: 'availableto', label: 'Available To', type: 'date' },
          ]}
        />
      </SectionCard>
    </>
  );
}

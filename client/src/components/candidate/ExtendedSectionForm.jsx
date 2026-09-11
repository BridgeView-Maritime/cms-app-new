// client/src/components/candidate/ExtendedSectionForm.jsx
// One group of the extended profile (experience, travel documents, covid
// vaccine, ...). Each group saves on its own so a candidate can fill in
// what they have now and come back for the rest.
import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('candidateToken'),
});

function Field({ field, value, onChange, disabled }) {
  const common = {
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
    placeholder: field.placeholder || '',
    disabled,
  };

  if (field.type === 'select') {
    return (
      <div className="cp-input-wrap cp-input-plain">
        <select {...common}>
          <option value="">-- Select --</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          {/* A stored value that is no longer in the list still has to be
              shown, or the form would silently blank it on save. */}
          {value && !(field.options || []).includes(value) && <option value={value}>{value}</option>}
        </select>
      </div>
    );
  }
  if (field.type === 'yesno') {
    return (
      <div className="cp-radio-row">
        {['YES', 'NO'].map((opt) => (
          <label key={opt} className={'cp-radio' + (String(value).toUpperCase() === opt ? ' cp-radio-on' : '')}>
            <input
              type="radio"
              name={field.key}
              value={opt}
              checked={String(value).toUpperCase() === opt}
              onChange={() => onChange(field.key, opt)}
              disabled={disabled}
            />
            {opt === 'YES' ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'textarea') return <textarea className="cp-textarea" rows={2} {...common} />;
  return (
    <div className="cp-input-wrap cp-input-plain">
      <input type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} {...common} />
    </div>
  );
}

/**
 * @param {string}  section   server-side group key (experience, travel, ...)
 * @param {Array}   fields    [{ key, label, type?, options?, placeholder?, wide?, hint?, showIf? }]
 * @param {object}  initial   current values for this group
 * @param {func}    onSaved   called with the full refreshed `sections` map
 */
export default function ExtendedSectionForm({ section, fields, initial, onSaved, submitLabel = 'Save' }) {
  const [draft, setDraft] = useState(initial || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setDraft(initial || {}); }, [initial]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(ACCOUNT_ENDPOINTS.EXTENDED_PROFILE, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ section, values: draft }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Saved.' });
        onSaved?.(data.sections);
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not save.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while saving.' });
    } finally {
      setBusy(false);
    }
  };

  const visible = fields.filter((f) => !f.showIf || f.showIf(draft));

  return (
    <form onSubmit={save} className="cp-crud-form">
      {msg && <div className={'cp-alert cp-alert-' + msg.type}>{msg.text}</div>}
      <div className="cp-profile-grid">
        {visible.map((f) => (
          <label key={f.key} className={'cp-field' + (f.wide ? ' cp-field-wide' : '')}>
            <span>{f.label}</span>
            <Field field={f} value={draft[f.key]} onChange={setField} disabled={busy} />
            {f.hint && <small className="cp-field-hint">{f.hint}</small>}
          </label>
        ))}
      </div>
      <div className="cp-crud-form-actions">
        <button type="submit" className="lp-btn lp-btn-primary" disabled={busy}>
          <Save size={15} /> {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

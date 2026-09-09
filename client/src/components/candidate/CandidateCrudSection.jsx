// client/src/components/candidate/CandidateCrudSection.jsx
// Drives the candidate-owned record sections (NOK, education, pre-sea,
// previous employers, bank details). They're all list + add/edit/delete
// against a candidate-scoped endpoint, so they share one implementation.
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, Inbox } from 'lucide-react';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('candidateToken'),
});

const blankFrom = (fields) => Object.fromEntries(fields.map((f) => [f.key, '']));

// Some columns are written by the company, not the candidate (a grievance
// response, for one). They are shown in the table but kept out of the form.
const editable = (fields) => fields.filter((f) => !f.readOnly);

// Legacy values arrive as plain YYYY-MM-DD strings. Render them readably in
// the table while leaving the raw value untouched for the date input.
// The legacy data uses sentinel dates ("1000-01-01", "0000-00-00") to mean
// "no expiry" / "not set". Those are shown as blank rather than as a date.
const isUsableDate = (raw) => {
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1901;
};

const displayValue = (field, raw) => {
  if (!raw) return '';
  if (field?.type === 'date') {
    return isUsableDate(raw)
      ? new Date(raw).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      : '';
  }
  return raw;
};

// Same sentinels must not reach a <input type="date">, which would either
// reject them or show a nonsense year.
const editValue = (field, raw) => {
  if (field?.type === 'date') return isUsableDate(raw) ? String(raw).slice(0, 10) : '';
  return raw ?? '';
};

function FieldInput({ field, value, onChange }) {
  const common = {
    value: value || '',
    onChange: (e) => onChange(field.key, e.target.value),
    placeholder: field.placeholder || '',
  };

  if (field.type === 'select') {
    return (
      <div className="cp-input-wrap cp-input-plain">
        <select {...common}>
          <option value="">-- Select --</option>
          {(field.options || []).map((o, i) => <option key={o + i} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return <textarea className="cp-textarea" rows={2} {...common} />;
  }
  return (
    <div className="cp-input-wrap cp-input-plain">
      <input type={field.type === 'date' ? 'date' : 'text'} {...common} />
    </div>
  );
}

/**
 * @param {string} endpoint       candidate-scoped API base (list/create at
 *                                the root, update/delete at `/:id`)
 * @param {Array}  fields         [{ key, label, type?, options?, placeholder?, required? }]
 * @param {Array}  columns        subset of field keys shown in the table
 * @param {boolean} single        one record per candidate -> plain form, no list
 */
export default function CandidateCrudSection({
  endpoint, fields, columns, single = false, addLabel = 'Add Record', emptyText,
}) {
  const [records, setRecords] = useState([]);
  const [draft, setDraft] = useState(null); // null = not editing; {} = new
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        if (single) {
          setRecords(data.record ? [data.record] : []);
          setDraft(data.record
            ? Object.fromEntries(fields.map((f) => [f.key, editValue(f, data.record[f.key])]))
            : blankFrom(fields));
        } else {
          setRecords(data.records || []);
        }
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not load records.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while loading records.' });
    } finally {
      setLoading(false);
    }
  }, [endpoint, single, fields]);

  useEffect(() => { load(); }, [load]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const startAdd = () => { setEditingId(null); setDraft(blankFrom(fields)); setMsg(null); };
  const startEdit = (rec) => {
    setEditingId(rec._id);
    setDraft(Object.fromEntries(fields.map((f) => [f.key, editValue(f, rec[f.key])])));
    setMsg(null);
  };
  const cancel = () => { setDraft(single ? draft : null); setEditingId(null); };

  const save = async (e) => {
    e.preventDefault();
    const missing = editable(fields).filter((f) => f.required && !String(draft[f.key] || '').trim());
    if (missing.length) {
      setMsg({ type: 'error', text: 'Please fill in: ' + missing.map((f) => f.label).join(', ') });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const isUpdate = Boolean(editingId);
      const res = await fetch(isUpdate ? endpoint + '/' + editingId : endpoint, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: authHeader(),
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Saved.' });
        setEditingId(null);
        if (!single) setDraft(null);
        await load();
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not save.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while saving.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rec) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint + '/' + rec._id, { method: 'DELETE', headers: authHeader() });
      const data = await res.json();
      if (data.success) { setMsg({ type: 'success', text: 'Deleted.' }); await load(); }
      else setMsg({ type: 'error', text: data.message || 'Could not delete.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error while deleting.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="cp-loading-screen">Loading...</div>;

  const form = draft && (
    <form onSubmit={save} className="cp-crud-form">
      <div className="cp-profile-grid">
        {editable(fields).map((f) => (
          <label key={f.key} className={'cp-field' + (f.wide ? ' cp-field-wide' : '')}>
            <span>{f.label}{f.required && ' *'}</span>
            <FieldInput field={f} value={draft[f.key]} onChange={setField} />
          </label>
        ))}
      </div>
      <div className="cp-crud-form-actions">
        <button type="submit" className="lp-btn lp-btn-primary" disabled={busy}>
          <Save size={15} /> {busy ? 'Saving...' : 'Save'}
        </button>
        {!single && (
          <button type="button" className="lp-btn lp-btn-outline" onClick={cancel} disabled={busy}>
            <X size={15} /> Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <>
      {msg && <div className={'cp-alert cp-alert-' + msg.type}>{msg.text}</div>}

      {single ? (
        <div className="cp-card">{form}</div>
      ) : (
        <>
          {!draft && (
            <div className="cp-crud-toolbar">
              <button type="button" className="lp-btn lp-btn-primary" onClick={startAdd}>
                <Plus size={15} /> {addLabel}
              </button>
            </div>
          )}

          {draft && <div className="cp-card">{form}</div>}

          {records.length === 0 ? (
            <div className="cp-placeholder">
              <Inbox size={28} />
              <h2>No records yet</h2>
              <p>{emptyText || 'Add your first record using the button above.'}</p>
            </div>
          ) : (
            <div className="cp-card cp-table-card">
              <div className="cp-table-scroll">
                <table className="cp-table">
                  <thead>
                    <tr>
                      {columns.map((c) => {
                        const f = fields.find((x) => x.key === c);
                        return <th key={c}>{f ? f.label : c}</th>;
                      })}
                      <th className="cp-table-actions-head">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r._id}>
                        {columns.map((c) => {
                          const shown = displayValue(fields.find((f) => f.key === c), r[c]);
                          return <td key={c}>{shown || <span className="cp-muted">&mdash;</span>}</td>;
                        })}
                        <td className="cp-table-actions">
                          <button type="button" className="cp-icon-btn" onClick={() => startEdit(r)} aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="cp-icon-btn cp-icon-btn-danger" onClick={() => remove(r)} aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

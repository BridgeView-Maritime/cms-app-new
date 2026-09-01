// client/src/pages/LandingContentEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, ExternalLink, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LANDING_ENDPOINTS } from '../config/api';
import { DEFAULT_LANDING_CONTENT, mergeLandingContent } from '../config/landingContentDefaults';
import '../styles/LandingContentEditor.css';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

// Immutable nested-path setter, e.g. setPath(obj, ['hero', 'heading'], 'x')
const setPath = (obj, path, value) => {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const base = Array.isArray(obj) ? [...obj] : { ...obj };
  base[head] = setPath(obj ? obj[head] : undefined, rest, value);
  return base;
};

function Field({ label, value, onChange, textarea, placeholder }) {
  return (
    <label className="lce-field">
      <span className="lce-field-label">{label}</span>
      {textarea ? (
        <textarea
          className="lce-input lce-textarea"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className="lce-input"
          type="text"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function ChipListField({ label, items, onChange }) {
  const [draft, setDraft] = useState('');

  const addChip = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...(items || []), v]);
    setDraft('');
  };

  const removeChip = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="lce-field">
      <span className="lce-field-label">{label}</span>
      <div className="lce-chip-editor">
        {(items || []).map((item, idx) => (
          <span className="lce-chip" key={`${item}-${idx}`}>
            {item}
            <button type="button" onClick={() => removeChip(idx)} aria-label={`Remove ${item}`}>
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="lce-chip-add-row">
        <input
          className="lce-input"
          type="text"
          value={draft}
          placeholder="Add an item and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
        />
        <button type="button" className="lce-btn lce-btn-outline" onClick={addChip}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

function RepeaterField({ label, items, onChange, fields, addLabel }) {
  const updateItem = (idx, key, val) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: val } : it));
    onChange(next);
  };
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const addItem = () => {
    const blank = Object.fromEntries(fields.map((f) => [f.key, '']));
    onChange([...(items || []), blank]);
  };

  return (
    <div className="lce-field">
      <span className="lce-field-label">{label}</span>
      <div className="lce-repeater">
        {(items || []).map((item, idx) => (
          <div className="lce-repeater-row" key={idx}>
            <span className="lce-repeater-index">{idx + 1}</span>
            <div className="lce-repeater-inputs">
              {fields.map((f) => (
                <input
                  key={f.key}
                  className="lce-input"
                  type="text"
                  value={item[f.key] || ''}
                  placeholder={f.placeholder}
                  onChange={(e) => updateItem(idx, f.key, e.target.value)}
                />
              ))}
            </div>
            <button type="button" className="lce-icon-btn" onClick={() => removeItem(idx)} aria-label="Remove item">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="lce-btn lce-btn-outline" onClick={addItem}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="lce-section">
      <div className="lce-section-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="lce-section-body">{children}</div>
    </section>
  );
}

export default function LandingContentEditor() {
  const [content, setContent] = useState(DEFAULT_LANDING_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', text }

  const set = useCallback((path, value) => {
    setContent((prev) => setPath(prev, path, value));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch(LANDING_ENDPOINTS.CONTENT);
      const data = await res.json();
      if (data?.success && data.data) {
        setContent(mergeLandingContent(data.data));
      }
    } catch (err) {
      setBanner({ type: 'error', text: 'Could not load saved content — showing defaults.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(LANDING_ENDPOINTS.CONTENT, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (data.success) {
        setContent(mergeLandingContent(data.data));
        setBanner({ type: 'success', text: 'Landing page content saved and live.' });
      } else {
        setBanner({ type: 'error', text: data.message || 'Failed to save landing page content.' });
      }
    } catch (err) {
      setBanner({ type: 'error', text: 'Network error while saving landing page content.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="lce-loading">Loading landing page content...</div>;
  }

  return (
    <div className="lce-root">
      <div className="lce-toolbar">
        <div>
          <h1>Landing Page Content</h1>
          <p>Edit the text shown on the public homepage. Layout, icons and navigation stay fixed — only the copy below is live-editable.</p>
        </div>
        <div className="lce-toolbar-actions">
          <a href="/" target="_blank" rel="noreferrer" className="lce-btn lce-btn-outline">
            <ExternalLink size={15} /> View Live Page
          </a>
          <button type="button" className="lce-btn lce-btn-outline" onClick={load} disabled={saving}>
            <RotateCcw size={15} /> Reload Saved
          </button>
          <button type="button" className="lce-btn lce-btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {banner && (
        <div className={`lce-banner lce-banner-${banner.type}`}>
          {banner.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {banner.text}
        </div>
      )}

      <Section title="Top Bar & Contact Details" description="Shown in the thin strip above the header, and reused in the Contact and Footer sections.">
        <div className="lce-grid-2">
          <Field label="Phone Number 1" value={content.topbar.phone1} onChange={(v) => set(['topbar', 'phone1'], v)} />
          <Field label="Phone Number 2" value={content.topbar.phone2} onChange={(v) => set(['topbar', 'phone2'], v)} />
          <Field label="Email Address" value={content.topbar.email} onChange={(v) => set(['topbar', 'email'], v)} />
          <Field label="RPSL Registration Text" value={content.topbar.rpslText} onChange={(v) => set(['topbar', 'rpslText'], v)} />
        </div>
      </Section>

      <Section title="Hero Section" description="The large banner at the top of the page.">
        <Field label="Eyebrow Badge Text" value={content.hero.eyebrow} onChange={(v) => set(['hero', 'eyebrow'], v)} />
        <Field label="Main Heading" value={content.hero.heading} onChange={(v) => set(['hero', 'heading'], v)} />
        <Field label="Subheading" value={content.hero.subheading} onChange={(v) => set(['hero', 'subheading'], v)} />
        <Field label="Description" value={content.hero.description} onChange={(v) => set(['hero', 'description'], v)} textarea />
        <div className="lce-grid-2">
          <Field label='"Submit Resume" Button Label' value={content.hero.ctaResumeLabel} onChange={(v) => set(['hero', 'ctaResumeLabel'], v)} />
          <Field label='"Apply For Jobs" Button Label' value={content.hero.ctaApplyLabel} onChange={(v) => set(['hero', 'ctaApplyLabel'], v)} />
          <Field label='"Browse More Jobs" Button Label' value={content.hero.ctaBrowseLabel} onChange={(v) => set(['hero', 'ctaBrowseLabel'], v)} />
          <Field label='"Company wise Jobs" Button Label' value={content.hero.ctaCompanyLabel} onChange={(v) => set(['hero', 'ctaCompanyLabel'], v)} />
        </div>
      </Section>

      <Section title="How It Works" description="The 4-step process cards.">
        <div className="lce-grid-2">
          <Field label="Kicker Label" value={content.process.kicker} onChange={(v) => set(['process', 'kicker'], v)} />
          <Field label="Section Heading" value={content.process.heading} onChange={(v) => set(['process', 'heading'], v)} />
        </div>
        <RepeaterField
          label="Steps"
          items={content.process.steps}
          onChange={(v) => set(['process', 'steps'], v)}
          addLabel="Add Step"
          fields={[
            { key: 'title', placeholder: 'Step title' },
            { key: 'desc', placeholder: 'Step description' },
          ]}
        />
      </Section>

      <Section title="Popular Ranks" description="The rank cards candidates can enquire about.">
        <div className="lce-grid-2">
          <Field label="Kicker Label" value={content.ranks.kicker} onChange={(v) => set(['ranks', 'kicker'], v)} />
          <Field label="Section Heading" value={content.ranks.heading} onChange={(v) => set(['ranks', 'heading'], v)} />
        </div>
        <RepeaterField
          label="Ranks"
          items={content.ranks.items}
          onChange={(v) => set(['ranks', 'items'], v)}
          addLabel="Add Rank"
          fields={[
            { key: 'title', placeholder: 'Rank title, e.g. Second Engineer' },
            { key: 'tag', placeholder: 'Tag, e.g. Offshore' },
          ]}
        />
      </Section>

      <Section title="Services" description="The four service cards.">
        <div className="lce-grid-2">
          <Field label="Kicker Label" value={content.services.kicker} onChange={(v) => set(['services', 'kicker'], v)} />
          <Field label="Section Heading" value={content.services.heading} onChange={(v) => set(['services', 'heading'], v)} />
        </div>

        <h3 className="lce-subheading">Value Added Courses</h3>
        <Field label="Title" value={content.services.courses.title} onChange={(v) => set(['services', 'courses', 'title'], v)} />
        <Field label="Description" value={content.services.courses.description} onChange={(v) => set(['services', 'courses', 'description'], v)} textarea />

        <h3 className="lce-subheading">Flag Documentation</h3>
        <Field label="Title" value={content.services.flags.title} onChange={(v) => set(['services', 'flags', 'title'], v)} />
        <Field label="Description" value={content.services.flags.description} onChange={(v) => set(['services', 'flags', 'description'], v)} textarea />
        <ChipListField label="Flags" items={content.services.flags.items} onChange={(v) => set(['services', 'flags', 'items'], v)} />

        <h3 className="lce-subheading">Visa Services</h3>
        <Field label="Title" value={content.services.visa.title} onChange={(v) => set(['services', 'visa', 'title'], v)} />
        <Field label="Description" value={content.services.visa.description} onChange={(v) => set(['services', 'visa', 'description'], v)} textarea />
        <ChipListField label="Countries" items={content.services.visa.items} onChange={(v) => set(['services', 'visa', 'items'], v)} />

        <h3 className="lce-subheading">Products</h3>
        <Field label="Title" value={content.services.products.title} onChange={(v) => set(['services', 'products', 'title'], v)} />
        <Field label="Description" value={content.services.products.description} onChange={(v) => set(['services', 'products', 'description'], v)} textarea />
      </Section>

      <Section title="About Us" description="Company description, badges and highlights.">
        <div className="lce-grid-2">
          <Field label="Kicker Label" value={content.about.kicker} onChange={(v) => set(['about', 'kicker'], v)} />
          <Field label="Heading" value={content.about.heading} onChange={(v) => set(['about', 'heading'], v)} />
        </div>
        <Field label="Paragraph" value={content.about.paragraph} onChange={(v) => set(['about', 'paragraph'], v)} textarea />
        <ChipListField label="Why Choose Us — Bullet Points" items={content.about.whyUs} onChange={(v) => set(['about', 'whyUs'], v)} />
        <RepeaterField
          label="Badges"
          items={content.about.badges}
          onChange={(v) => set(['about', 'badges'], v)}
          addLabel="Add Badge"
          fields={[
            { key: 'title', placeholder: 'Badge title, e.g. Est. 2018' },
            { key: 'subtitle', placeholder: 'Badge subtitle' },
          ]}
        />
      </Section>

      <Section title="Contact Section">
        <div className="lce-grid-2">
          <Field label="Kicker Label" value={content.contact.kicker} onChange={(v) => set(['contact', 'kicker'], v)} />
          <Field label="Heading" value={content.contact.heading} onChange={(v) => set(['contact', 'heading'], v)} />
        </div>
        <Field label="Subtitle" value={content.contact.subtitle} onChange={(v) => set(['contact', 'subtitle'], v)} textarea />
        <div className="lce-grid-2">
          <Field label="Phone Number 1" value={content.contact.phone1} onChange={(v) => set(['contact', 'phone1'], v)} />
          <Field label="Phone Number 2" value={content.contact.phone2} onChange={(v) => set(['contact', 'phone2'], v)} />
          <Field label="Email Address" value={content.contact.email} onChange={(v) => set(['contact', 'email'], v)} />
        </div>
        <Field label="Address Line 1" value={content.contact.addressLine1} onChange={(v) => set(['contact', 'addressLine1'], v)} />
        <Field label="Address Line 2" value={content.contact.addressLine2} onChange={(v) => set(['contact', 'addressLine2'], v)} />
      </Section>

      <Section title="Footer">
        <Field label="Brand Name" value={content.footer.brandName} onChange={(v) => set(['footer', 'brandName'], v)} />
        <Field label="Address Text" value={content.footer.addressText} onChange={(v) => set(['footer', 'addressText'], v)} textarea />
        <Field label="RPSL Text" value={content.footer.rpslText} onChange={(v) => set(['footer', 'rpslText'], v)} />
        <Field label="Copyright Line" value={content.footer.copyright} onChange={(v) => set(['footer', 'copyright'], v)} />
      </Section>

      <div className="lce-bottom-save">
        <button type="button" className="lce-btn lce-btn-primary lce-btn-lg" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

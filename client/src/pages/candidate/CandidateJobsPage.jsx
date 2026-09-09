// client/src/pages/candidate/CandidateJobsPage.jsx
// The job board (legacy bmpl.php). Search + filters + pagination, with save
// and apply acting straight from each card.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, Inbox, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { JOB_ENDPOINTS } from '../../config/api';
import JobCard from '../../components/candidate/JobCard';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('candidateToken'),
});

const EMPTY_FILTERS = { shipType: '', area: '', vesselType: '' };

export default function CandidateJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [options, setOptions] = useState({ shipTypes: [], areas: [], vesselTypes: [] });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState(null);
  const [msg, setMsg] = useState(null);
  const listTop = useRef(null);

  // Typing in the search box should not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch(JOB_ENDPOINTS.MY_ACTIVITY, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setSavedIds(new Set(data.savedJobIds || []));
        setAppliedIds(new Set(data.appliedJobIds || []));
      }
    } catch (err) {
      // Non-fatal: the board still works, the buttons just start unmarked.
    }
  }, []);

  useEffect(() => {
    fetch(JOB_ENDPOINTS.FILTERS)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOptions(d); })
      .catch(() => {});
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search) params.set('search', search);
      for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);

      try {
        const res = await fetch(JOB_ENDPOINTS.LIST + '?' + params.toString());
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setJobs(data.records || []);
          setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
        } else {
          setMsg({ type: 'error', text: data.message || 'Could not load jobs.' });
        }
      } catch (err) {
        if (!cancelled) setMsg({ type: 'error', text: 'Network error while loading jobs.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, search, filters]);

  const setFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const clearAll = () => { setSearchInput(''); setSearch(''); setFilters(EMPTY_FILTERS); setPage(1); };
  const hasFilters = Boolean(search) || Object.values(filters).some(Boolean);

  const goToPage = (n) => {
    setPage(n);
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleSave = async (job) => {
    const isSaved = savedIds.has(job.jobid);
    setBusyJob(job.jobid);
    setMsg(null);
    try {
      const res = await fetch(JOB_ENDPOINTS.SAVE(job.jobid), {
        method: isSaved ? 'DELETE' : 'POST',
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isSaved) next.delete(job.jobid); else next.add(job.jobid);
          return next;
        });
        setMsg({ type: 'success', text: isSaved ? 'Removed from saved jobs.' : 'Job saved.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not update your saved jobs.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyJob(null);
    }
  };

  const apply = async (job) => {
    setBusyJob(job.jobid);
    setMsg(null);
    try {
      const res = await fetch(JOB_ENDPOINTS.APPLY(job.jobid), { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setAppliedIds((prev) => new Set(prev).add(job.jobid));
        setMsg({ type: 'success', text: 'Application submitted for ' + job.title + '.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Could not submit your application.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyJob(null);
    }
  };

  return (
    <>
      <div className="cp-page-head" ref={listTop}>
        <div>
          <h1>Apply For New Job</h1>
          <p>Browse current openings and apply directly from here.</p>
        </div>
      </div>

      {msg && <div className={'cp-alert cp-alert-' + msg.type}>{msg.text}</div>}

      <div className="cp-card cp-job-filters">
        <div className="cp-job-search">
          <Search size={16} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by rank, company, vessel or location"
          />
        </div>
        <div className="cp-job-filter-row">
          <div className="cp-input-wrap cp-input-plain">
            <select value={filters.shipType} onChange={(e) => setFilter('shipType', e.target.value)}>
              <option value="">All Ship Types</option>
              {options.shipTypes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="cp-input-wrap cp-input-plain">
            <select value={filters.vesselType} onChange={(e) => setFilter('vesselType', e.target.value)}>
              <option value="">All Vessel Types</option>
              {options.vesselTypes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="cp-input-wrap cp-input-plain">
            <select value={filters.area} onChange={(e) => setFilter('area', e.target.value)}>
              <option value="">All Locations</option>
              {options.areas.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button type="button" className="lp-btn lp-btn-outline cp-job-btn" onClick={clearAll}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {!loading && (
        <div className="cp-job-resultbar">
          <SlidersHorizontal size={14} />
          <span>
            {meta.total.toLocaleString()} {meta.total === 1 ? 'opening' : 'openings'}
            {hasFilters ? ' matching your search' : ' available'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="cp-loading-screen">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No jobs found</h2>
          <p>
            {hasFilters
              ? 'Try widening your search or clearing the filters.'
              : 'There are no openings listed at the moment. Please check back soon.'}
          </p>
        </div>
      ) : (
        <>
          <div className="cp-job-list">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                saved={savedIds.has(job.jobid)}
                applied={appliedIds.has(job.jobid)}
                busy={busyJob === job.jobid}
                onSave={toggleSave}
                onApply={apply}
              />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="cp-pager">
              <button
                type="button"
                className="lp-btn lp-btn-outline cp-job-btn"
                onClick={() => goToPage(meta.page - 1)}
                disabled={meta.page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="cp-pager-status">Page {meta.page} of {meta.totalPages}</span>
              <button
                type="button"
                className="lp-btn lp-btn-outline cp-job-btn"
                onClick={() => goToPage(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

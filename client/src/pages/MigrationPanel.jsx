// client/src/pages/MigrationPanel.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Search, Database, ArrowRightLeft, Loader2, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Info
} from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import '../styles/MigrationPanel.css';

const API_BASE = `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/migration`;
const POLL_INTERVAL_MS = 3000;

export default function MigrationPanel({ isSuperAdmin }) {
  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  });

  // --- Table picker state ---
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('');

  // --- Relations state ---
  const [relations, setRelations] = useState({ embeddableChildren: [], referencedParents: [] });
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relationsError, setRelationsError] = useState('');
  const [embedMap, setEmbedMap] = useState({}); // { [childTable]: { checked, as, via } }

  // --- Preview state ---
  const [preview, setPreview] = useState({ columns: [], rows: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // --- Target collection ---
  const [targetCollection, setTargetCollection] = useState('');

  // --- Transfer / job state ---
  const [transferState, setTransferState] = useState('idle'); // idle | running | completed | failed
  const [transferError, setTransferError] = useState('');
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState(null); // { rootTable, targetCollection, total, processed, errors }

  const socketRef = useRef(null);
  const jobIdRef = useRef(null);
  const pollRef = useRef(null);
  // Refs mirror the latest selectedTable/targetCollection so the socket 'disconnect'
  // handler (bound once inside the mount effect) never reads stale closed-over state.
  const selectedTableRef = useRef('');
  const targetCollectionRef = useRef('');

  useEffect(() => { selectedTableRef.current = selectedTable; }, [selectedTable]);
  useEffect(() => { targetCollectionRef.current = targetCollection; }, [targetCollection]);

  // --- Socket lifecycle: connect once, reuse for whichever job is active ---
  useEffect(() => {
    if (!isSuperAdmin) return;
    const token = localStorage.getItem('accessToken');
    const socket = io(AUTH_ENDPOINTS.REACT_APP_API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (jobIdRef.current) {
        socket.emit('join-room', `migration:${jobIdRef.current}`);
        stopPolling();
      }
    });

    socket.on('disconnect', () => {
      if (jobIdRef.current) startPolling(jobIdRef.current);
    });

    socket.on('migration:progress', (payload) => {
      if (!payload || payload.jobId !== jobIdRef.current) return;
      setProgress({ processed: payload.processed || 0, total: payload.total || 0 });
    });

    socket.on('migration:complete', (payload) => {
      if (!payload || payload.jobId !== jobIdRef.current) return;
      stopPolling();
      setProgress({ processed: payload.processed || 0, total: payload.total || 0 });
      setResult(payload);
      setTransferState('completed');
    });

    socket.on('migration:error', (payload) => {
      if (!payload || payload.jobId !== jobIdRef.current) return;
      stopPolling();
      setTransferError(payload.message || 'The migration job failed unexpectedly.');
      setTransferState('failed');
    });

    return () => {
      stopPolling();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !selectedTable) return;
    setTargetCollection(`collection_${selectedTable.toLowerCase()}`);
    setEmbedMap({});
    fetchRelations(selectedTable);
    fetchPreview(selectedTable);
    resetTransferState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, selectedTable]);

  const resetTransferState = () => {
    stopPolling();
    jobIdRef.current = null;
    setJobId(null);
    setTransferState('idle');
    setTransferError('');
    setProgress({ processed: 0, total: 0 });
    setResult(null);
  };

  // --- Data fetchers ---
  const fetchTables = async () => {
    setTablesLoading(true);
    setTablesError('');
    try {
      const res = await fetch(`${API_BASE}/tables`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setTables(data.data || []);
      } else {
        setTablesError(data.message || `Failed to load tables (HTTP ${res.status}).`);
      }
    } catch (err) {
      setTablesError(`Network error while loading tables: ${err.message}`);
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchRelations = async (table) => {
    setRelationsLoading(true);
    setRelationsError('');
    setRelations({ embeddableChildren: [], referencedParents: [] });
    try {
      const res = await fetch(`${API_BASE}/tables/${encodeURIComponent(table)}/relations`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        const rel = data.data || { embeddableChildren: [], referencedParents: [] };
        setRelations(rel);
        const nextEmbedMap = {};
        (rel.embeddableChildren || []).forEach(child => {
          nextEmbedMap[child.table] = { checked: false, as: child.table, via: child.via };
        });
        setEmbedMap(nextEmbedMap);
      } else {
        setRelationsError(data.message || `Failed to load relations (HTTP ${res.status}).`);
      }
    } catch (err) {
      setRelationsError(`Network error while loading relations: ${err.message}`);
    } finally {
      setRelationsLoading(false);
    }
  };

  const fetchPreview = async (table) => {
    setPreviewLoading(true);
    setPreviewError('');
    setPreview({ columns: [], rows: [] });
    try {
      const res = await fetch(`${API_BASE}/tables/${encodeURIComponent(table)}/preview?limit=10`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(data.data || { columns: [], rows: [] });
      } else {
        setPreviewError(data.message || `Failed to load preview (HTTP ${res.status}).`);
      }
    } catch (err) {
      setPreviewError(`Network error while loading preview: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Polling fallback ---
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (id) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${id}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok || !data.success) return;

        const job = data.data;
        setProgress({ processed: job.processed || 0, total: job.total || 0 });

        if (job.status === 'completed') {
          stopPolling();
          setResult({
            rootTable: selectedTableRef.current,
            targetCollection: targetCollectionRef.current,
            total: job.total,
            processed: job.processed,
            errors: job.errors || []
          });
          setTransferState('completed');
        } else if (job.status === 'failed') {
          stopPolling();
          setTransferError(job.error || 'The migration job failed unexpectedly.');
          setTransferState('failed');
        }
      } catch {
        // transient network hiccup — keep polling until success/failure or unmount
      }
    }, POLL_INTERVAL_MS);
  };

  // --- Actions ---
  const toggleEmbed = (childTable) => {
    setEmbedMap(prev => ({
      ...prev,
      [childTable]: { ...prev[childTable], checked: !prev[childTable].checked }
    }));
  };

  const updateEmbedAlias = (childTable, alias) => {
    setEmbedMap(prev => ({
      ...prev,
      [childTable]: { ...prev[childTable], as: alias }
    }));
  };

  const handleStartTransfer = async () => {
    if (!selectedTable) return;
    setTransferState('running');
    setTransferError('');
    setResult(null);
    setProgress({ processed: 0, total: 0 });

    const embed = Object.entries(embedMap)
      .filter(([, cfg]) => cfg.checked)
      .map(([table, cfg]) => ({ table, via: cfg.via, as: (cfg.as || table).trim() || table }));

    try {
      const res = await fetch(`${API_BASE}/transfer`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          rootTable: selectedTable,
          targetCollection: targetCollection.trim() || undefined,
          embed
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setTransferError(data.message || `Failed to start transfer (HTTP ${res.status}).`);
        setTransferState('failed');
        return;
      }

      jobIdRef.current = data.jobId;
      setJobId(data.jobId);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join-room', `migration:${data.jobId}`);
      } else {
        startPolling(data.jobId);
      }
    } catch (err) {
      setTransferError(`Network error while starting transfer: ${err.message}`);
      setTransferState('failed');
    }
  };

  const handleRetry = () => {
    resetTransferState();
  };

  // --- Derived ---
  const filteredTables = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter(t => t.name.toLowerCase().includes(term));
  }, [tables, tableSearch]);

  const isTransferring = transferState === 'running';
  const progressPct = progress.total > 0
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : 0;

  // Rendered after all hooks so hook order never changes across renders.
  if (!isSuperAdmin) {
    return (
      <div className="migration-canvas">
        <div className="migration-access-denied">
          <AlertTriangle size={28} />
          <h3>Restricted Area</h3>
          <p>The MySQL &rarr; MongoDB migration tool is limited to Super Administrator accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="migration-canvas">
      <div className="panel-action-header">
        <div>
          <h2><ArrowRightLeft size={18} /> MySQL &rarr; MongoDB Migration</h2>
          <p>Pick a source table, choose which related tables to embed, preview the data, then run the transfer into a MongoDB collection.</p>
        </div>
        <button className="mac-btn-secondary" onClick={fetchTables} disabled={tablesLoading}>
          <RefreshCw size={14} className={tablesLoading ? 'animate-spin' : ''} /> Refresh Tables
        </button>
      </div>

      <div className="migration-split-view">
        {/* --- LEFT: TABLE PICKER --- */}
        <div className="migration-left-pane">
          <span className="pane-section-label">MySQL Tables</span>

          <div className="migration-search-box">
            <Search size={13} />
            <input
              type="text"
              placeholder="Search tables..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          {tablesError && (
            <div className="migration-inline-error">
              <AlertTriangle size={14} /> {tablesError}
            </div>
          )}

          {tablesLoading ? (
            <div className="migration-loading-row"><Loader2 size={16} className="animate-spin" /> Loading tables...</div>
          ) : (
            <div className="migration-table-list">
              {filteredTables.length === 0 && !tablesError && (
                <div className="migration-empty-row">No tables found.</div>
              )}
              {filteredTables.map(t => (
                <button
                  key={t.name}
                  className={`schema-pane-row-item ${selectedTable === t.name ? 'pane-active' : ''}`}
                  onClick={() => setSelectedTable(t.name)}
                  disabled={isTransferring}
                >
                  <Database size={14} />
                  <span className="migration-table-name">{t.name}</span>
                  <span className="migration-row-count">{Number(t.approxRowCount || 0).toLocaleString()} rows</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- RIGHT: CONFIGURATION + PREVIEW + TRANSFER --- */}
        <div className="migration-right-pane">
          {!selectedTable ? (
            <div className="migration-empty-state">
              <Database size={28} />
              <p>Select a table on the left to configure and preview a migration.</p>
            </div>
          ) : (
            <>
              <div className="workarea-pane-header">
                <h4>Configure Migration: <code>{selectedTable}</code></h4>
              </div>

              {/* Target collection */}
              <div className="field-group-input migration-target-collection">
                <label>Target MongoDB Collection Name</label>
                <input
                  type="text"
                  value={targetCollection}
                  onChange={(e) => setTargetCollection(e.target.value)}
                  disabled={isTransferring}
                />
              </div>

              {/* Relations */}
              <div className="migration-relations-block">
                <span className="pane-section-label">Embed Related Tables</span>
                {relationsError && (
                  <div className="migration-inline-error"><AlertTriangle size={14} /> {relationsError}</div>
                )}
                {relationsLoading ? (
                  <div className="migration-loading-row"><Loader2 size={16} className="animate-spin" /> Loading relations...</div>
                ) : (
                  <>
                    {relations.embeddableChildren.length === 0 && !relationsError && (
                      <div className="migration-empty-row">No child tables reference this table.</div>
                    )}
                    {relations.embeddableChildren.map(child => {
                      const cfg = embedMap[child.table] || { checked: false, as: child.table };
                      return (
                        <div className="migration-embed-row" key={child.table}>
                          <label className="migration-embed-checkbox">
                            <input
                              type="checkbox"
                              checked={!!cfg.checked}
                              disabled={isTransferring}
                              onChange={() => toggleEmbed(child.table)}
                            />
                            Embed <strong>{child.table}</strong> (via {child.via})
                          </label>
                          <div className="migration-embed-alias">
                            <span>as</span>
                            <input
                              type="text"
                              value={cfg.as}
                              disabled={isTransferring || !cfg.checked}
                              onChange={(e) => updateEmbedAlias(child.table, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {relations.referencedParents.length > 0 && (
                      <div className="migration-parents-info">
                        <span className="pane-section-label"><Info size={12} /> References (informational only)</span>
                        <ul>
                          {relations.referencedParents.map(p => (
                            <li key={`${p.table}-${p.column}`}>
                              <code>{p.column}</code> &rarr; {p.table}.{p.references}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Preview */}
              <div className="migration-preview-block">
                <span className="pane-section-label">Sample Preview (first 10 rows)</span>
                {previewError && (
                  <div className="migration-inline-error"><AlertTriangle size={14} /> {previewError}</div>
                )}
                {previewLoading ? (
                  <div className="migration-loading-row"><Loader2 size={16} className="animate-spin" /> Loading preview...</div>
                ) : preview.columns.length > 0 ? (
                  <div className="mac-table-container">
                    <table className="mac-data-table">
                      <thead>
                        <tr>
                          {preview.columns.map(col => (
                            <th key={col.name}>
                              {col.name}
                              {col.columnKey === 'PRI' && <span className="migration-pk-badge">PK</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, idx) => (
                          <tr key={idx}>
                            {preview.columns.map(col => (
                              <td key={col.name}>{String(row[col.name] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !previewError && <div className="migration-empty-row">No preview rows available.</div>
                )}
              </div>

              {/* Transfer controls + progress */}
              <div className="migration-transfer-block">
                {transferError && (
                  <div className="migration-fail-banner">
                    <XCircle size={16} /> {transferError}
                  </div>
                )}

                {transferState === 'completed' && result && (
                  <div className="migration-success-banner">
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>Migration complete.</strong>
                      <p>{result.processed} of {result.total} rows written to <code>{result.targetCollection}</code>.</p>
                      {result.errors && result.errors.length > 0 && (
                        <details className="migration-batch-errors">
                          <summary>{result.errors.length} batch error(s) occurred</summary>
                          <ul>
                            {result.errors.map((e, i) => (
                              <li key={i}>Batch after row {e.batchStartAfter}: {e.message}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {isTransferring && (
                  <div className="migration-progress-wrap">
                    <div className="migration-progress-label">
                      <Loader2 size={14} className="animate-spin" />
                      Transferring... {progress.processed}{progress.total ? ` / ${progress.total}` : ''} rows
                      {jobId && <span className="migration-job-id">Job {jobId}</span>}
                    </div>
                    <div className="migration-progress-track">
                      <div className="migration-progress-fill" style={{ width: `${progress.total ? progressPct : 100}%` }} />
                    </div>
                  </div>
                )}

                <div className="migration-transfer-actions">
                  {transferState === 'failed' ? (
                    <button className="mac-btn-secondary" onClick={handleRetry}>
                      <RefreshCw size={14} /> Retry
                    </button>
                  ) : (
                    <button
                      className="mac-btn-primary"
                      onClick={handleStartTransfer}
                      disabled={isTransferring || !targetCollection.trim()}
                    >
                      {isTransferring ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                      {isTransferring ? 'Transferring...' : 'Start Transfer'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

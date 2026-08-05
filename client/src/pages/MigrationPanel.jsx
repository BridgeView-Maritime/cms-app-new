// client/src/pages/MigrationPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  UploadCloud, FileText, X, Database, ArrowRightLeft, Loader2, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, Info, KeyRound, ChevronLeft, ChevronRight
} from 'lucide-react';
import { AUTH_ENDPOINTS } from '../config/api';
import '../styles/MigrationPanel.css';

const API_BASE = `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/migration`;
const POLL_INTERVAL_MS = 3000;
const ACCEPTED_EXT = /\.(sql|txt)$/i;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function MigrationPanel({ isSuperAdmin }) {
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` });
  const jsonHeaders = () => ({ ...authHeader(), 'Content-Type': 'application/json' });

  // --- Step 1: file queue ---
  const [queuedFiles, setQueuedFiles] = useState([]); // File[]
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // --- Step 2: parse ---
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [batchId, setBatchId] = useState(null);
  const [tableConfigs, setTableConfigs] = useState([]); // [{ table, columns, primaryKey, rowCount, embeddableChildren, referencedParents, included, targetCollection, embedMap }]

  // --- Full data preview (paginated) per table, fetched on demand ---
  // { [table]: { rows, page, pageSize, totalRows, totalPages, loading, error } }
  const [dataViews, setDataViews] = useState({});

  // --- Step 3: transfer / job ---
  const [transferState, setTransferState] = useState('idle'); // idle | running | completed | failed
  const [transferError, setTransferError] = useState('');
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState(null); // { total, processed, tables: [{ table, targetCollection, rowCount, warnings }] }

  const socketRef = useRef(null);
  const jobIdRef = useRef(null);
  const pollRef = useRef(null);

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
      setResult({ total: payload.total, processed: payload.processed, tables: payload.tables || [] });
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
        const res = await fetch(`${API_BASE}/jobs/${id}`, { headers: authHeader() });
        const data = await res.json();
        if (!res.ok || !data.success) return;

        const job = data.data;
        setProgress({ processed: job.processed || 0, total: job.total || 0 });

        if (job.status === 'completed') {
          stopPolling();
          setResult({ total: job.total, processed: job.processed, tables: job.tables || [] });
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

  // --- File queue handlers ---
  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter(f => ACCEPTED_EXT.test(f.name));
    if (incoming.length === 0) return;
    setQueuedFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}:${f.size}`));
      const deduped = incoming.filter(f => !existingKeys.has(`${f.name}:${f.size}`));
      return [...prev, ...deduped];
    });
  };

  const removeFile = (idx) => {
    setQueuedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  // --- Parse ---
  const handleParse = async () => {
    if (queuedFiles.length === 0) return;
    setParsing(true);
    setParseError('');
    resetTransferState();

    const formData = new FormData();
    queuedFiles.forEach(f => formData.append('files', f));

    try {
      const res = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: authHeader(), // no Content-Type — the browser sets the multipart boundary
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setParseError(data.message || `Failed to parse dump file(s) (HTTP ${res.status}).`);
        setBatchId(null);
        setTableConfigs([]);
        setDataViews({});
        return;
      }

      setBatchId(data.data.batchId);
      setDataViews({});
      setTableConfigs((data.data.tables || []).map(t => {
        const embedMap = {};
        (t.embeddableChildren || []).forEach(child => {
          embedMap[child.table] = { checked: false, as: child.table, via: child.via };
        });
        return {
          ...t,
          included: true,
          targetCollection: `collection_${t.table.toLowerCase()}`,
          embedMap
        };
      }));
    } catch (err) {
      setParseError(`Network error while parsing dump file(s): ${err.message}`);
      setBatchId(null);
      setTableConfigs([]);
      setDataViews({});
    } finally {
      setParsing(false);
    }
  };

  const resetAll = () => {
    setQueuedFiles([]);
    setParseError('');
    setBatchId(null);
    setTableConfigs([]);
    setDataViews({});
    resetTransferState();
  };

  const resetTransferState = () => {
    stopPolling();
    jobIdRef.current = null;
    setJobId(null);
    setTransferState('idle');
    setTransferError('');
    setProgress({ processed: 0, total: 0 });
    setResult(null);
  };

  // --- Full data preview (paginated) ---
  const fetchTableRows = async (table, page, pageSize) => {
    setDataViews(prev => ({
      ...prev,
      [table]: { ...(prev[table] || {}), page, pageSize, loading: true, error: '' }
    }));

    try {
      const res = await fetch(
        `${API_BASE}/batches/${batchId}/tables/${encodeURIComponent(table)}/rows?page=${page}&pageSize=${pageSize}`,
        { headers: authHeader() }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDataViews(prev => ({
          ...prev,
          [table]: { ...(prev[table] || {}), loading: false, error: data.message || `Failed to load rows (HTTP ${res.status}).` }
        }));
        return;
      }

      setDataViews(prev => ({
        ...prev,
        [table]: {
          rows: data.data.rows,
          page: data.data.page,
          pageSize: data.data.pageSize,
          totalRows: data.data.totalRows,
          totalPages: data.data.totalPages,
          loading: false,
          error: '',
          expanded: true
        }
      }));
    } catch (err) {
      setDataViews(prev => ({
        ...prev,
        [table]: { ...(prev[table] || {}), loading: false, error: `Network error while loading rows: ${err.message}` }
      }));
    }
  };

  const toggleDataView = (table) => {
    const existing = dataViews[table];
    if (existing?.expanded) {
      setDataViews(prev => ({ ...prev, [table]: { ...existing, expanded: false } }));
      return;
    }
    if (existing && existing.rows) {
      setDataViews(prev => ({ ...prev, [table]: { ...existing, expanded: true } }));
      return;
    }
    fetchTableRows(table, 1, DEFAULT_PAGE_SIZE);
  };

  const changeDataPage = (table, nextPage) => {
    const view = dataViews[table];
    if (!view || nextPage < 1 || nextPage > view.totalPages) return;
    fetchTableRows(table, nextPage, view.pageSize);
  };

  const changeDataPageSize = (table, nextPageSize) => {
    fetchTableRows(table, 1, nextPageSize);
  };

  // --- Per-table config actions ---
  const updateTable = (table, patch) => {
    setTableConfigs(prev => prev.map(t => (t.table === table ? { ...t, ...patch } : t)));
  };

  const toggleIncluded = (table) => {
    setTableConfigs(prev => prev.map(t => (t.table === table ? { ...t, included: !t.included } : t)));
  };

  const toggleEmbed = (table, childTable) => {
    setTableConfigs(prev => prev.map(t => {
      if (t.table !== table) return t;
      return {
        ...t,
        embedMap: {
          ...t.embedMap,
          [childTable]: { ...t.embedMap[childTable], checked: !t.embedMap[childTable].checked }
        }
      };
    }));
  };

  const updateEmbedAlias = (table, childTable, alias) => {
    setTableConfigs(prev => prev.map(t => {
      if (t.table !== table) return t;
      return {
        ...t,
        embedMap: {
          ...t.embedMap,
          [childTable]: { ...t.embedMap[childTable], as: alias }
        }
      };
    }));
  };

  // --- Transfer ---
  const handleStartTransfer = async () => {
    const transfers = tableConfigs
      .filter(t => t.included)
      .map(t => ({
        table: t.table,
        targetCollection: t.targetCollection.trim() || undefined,
        embed: Object.entries(t.embedMap)
          .filter(([, cfg]) => cfg.checked)
          .map(([childTable, cfg]) => ({ table: childTable, via: cfg.via, as: (cfg.as || childTable).trim() || childTable }))
      }));

    if (transfers.length === 0) {
      setTransferError('Select at least one table to transfer.');
      setTransferState('failed');
      return;
    }

    setTransferState('running');
    setTransferError('');
    setResult(null);
    setProgress({ processed: 0, total: 0 });

    try {
      const res = await fetch(`${API_BASE}/transfer`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ batchId, transfers })
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

  const isTransferring = transferState === 'running';
  const isLocked = isTransferring; // lock table/file editing while a transfer is in flight
  const includedCount = tableConfigs.filter(t => t.included).length;
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
          <p>The MySQL dump &rarr; MongoDB migration tool is limited to Super Administrator accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="migration-canvas">
      <div className="panel-action-header">
        <div>
          <h2><ArrowRightLeft size={18} /> MySQL Dump &rarr; MongoDB Migration</h2>
          <p>Upload one or more .sql dump files, review the tables found, choose what to embed, then transfer into MongoDB.</p>
        </div>
        {(batchId || queuedFiles.length > 0) && (
          <button className="mac-btn-secondary" onClick={resetAll} disabled={isTransferring}>
            <RefreshCw size={14} /> Start Over
          </button>
        )}
      </div>

      {/* --- STEP 1: UPLOAD --- */}
      {!batchId && (
        <div className="migration-upload-block">
          <div
            className={`migration-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={28} />
            <p><strong>Drag & drop .sql dump files here</strong>, or click to browse.</p>
            <span className="migration-dropzone-hint">Accepted: .sql, .txt &middot; up to 10 files, 50MB each</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".sql,.txt"
              hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {queuedFiles.length > 0 && (
            <div className="migration-file-queue">
              {queuedFiles.map((f, idx) => (
                <div className="migration-file-chip" key={`${f.name}-${f.size}-${idx}`}>
                  <FileText size={14} />
                  <span className="migration-file-name">{f.name}</span>
                  <span className="migration-file-size">{(f.size / 1024).toFixed(1)} KB</span>
                  <button type="button" className="migration-file-remove" onClick={() => removeFile(idx)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {parseError && (
            <div className="migration-fail-banner">
              <XCircle size={16} /> {parseError}
            </div>
          )}

          <div className="migration-transfer-actions">
            <button
              className="mac-btn-primary"
              onClick={handleParse}
              disabled={queuedFiles.length === 0 || parsing}
            >
              {parsing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {parsing ? 'Parsing...' : 'Parse Files'}
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2 & 3: REVIEW, CONFIGURE, TRANSFER --- */}
      {batchId && (
        <>
          <div className="migration-table-cards">
            {tableConfigs.map(t => (
              <div className={`migration-table-card ${!t.included ? 'excluded' : ''}`} key={t.table}>
                <div className="migration-card-header">
                  <label className="migration-embed-checkbox">
                    <input
                      type="checkbox"
                      checked={t.included}
                      disabled={isLocked}
                      onChange={() => toggleIncluded(t.table)}
                    />
                    <Database size={14} />
                    <strong>{t.table}</strong>
                  </label>
                  <span className="migration-row-count">{Number(t.rowCount || 0).toLocaleString()} rows</span>
                  {t.primaryKey ? (
                    <span className="migration-pk-badge"><KeyRound size={10} /> {t.primaryKey}</span>
                  ) : (
                    <span className="migration-warning-badge" title="No primary key detected — re-running this transfer later will duplicate rows.">
                      <AlertTriangle size={11} /> No primary key
                    </span>
                  )}
                </div>

                <div className="migration-card-body">
                  {/* Columns */}
                  <div className="migration-columns-list">
                    {t.columns.map(col => (
                      <span className="migration-column-chip" key={col.name}>
                        {col.name} <em>{col.dataType}{col.length ? `(${col.length})` : ''}</em>
                      </span>
                    ))}
                  </div>

                  {/* Target collection */}
                  <div className="field-group-input migration-target-collection">
                    <label>Target MongoDB Collection Name</label>
                    <input
                      type="text"
                      value={t.targetCollection}
                      disabled={isLocked || !t.included}
                      onChange={(e) => updateTable(t.table, { targetCollection: e.target.value })}
                    />
                  </div>

                  {/* Embeddable children */}
                  {t.embeddableChildren.length > 0 && (
                    <div className="migration-relations-block">
                      <span className="pane-section-label">Embed Related Tables</span>
                      {t.embeddableChildren.map(child => {
                        const cfg = t.embedMap[child.table] || { checked: false, as: child.table };
                        return (
                          <div className="migration-embed-row" key={child.table}>
                            <label className="migration-embed-checkbox">
                              <input
                                type="checkbox"
                                checked={!!cfg.checked}
                                disabled={isLocked || !t.included}
                                onChange={() => toggleEmbed(t.table, child.table)}
                              />
                              Embed <strong>{child.table}</strong> (via {child.via})
                            </label>
                            <div className="migration-embed-alias">
                              <span>as</span>
                              <input
                                type="text"
                                value={cfg.as}
                                disabled={isLocked || !t.included || !cfg.checked}
                                onChange={(e) => updateEmbedAlias(t.table, child.table, e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Referenced parents (informational) */}
                  {t.referencedParents.length > 0 && (
                    <div className="migration-parents-info">
                      <span className="pane-section-label"><Info size={12} /> References (informational only)</span>
                      <ul>
                        {t.referencedParents.map(p => (
                          <li key={`${p.table}-${p.column}`}>
                            <code>{p.column}</code> &rarr; {p.table}.{p.references}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Full data (paginated) */}
                  {t.rowCount > 0 && (() => {
                    const dv = dataViews[t.table];
                    return (
                      <div className="migration-preview-block">
                        <div className="migration-preview-header">
                          <span className="pane-section-label">Table Data ({Number(t.rowCount).toLocaleString()} rows)</span>
                          <button
                            type="button"
                            className="mac-btn-secondary migration-preview-toggle"
                            onClick={() => toggleDataView(t.table)}
                          >
                            {dv?.loading ? <Loader2 size={12} className="animate-spin" /> : null}
                            {dv?.expanded ? 'Hide Data' : dv ? 'Show Data' : 'View Data'}
                          </button>
                        </div>

                        {dv?.expanded && (
                          <>
                            {dv.error && (
                              <div className="migration-fail-banner">
                                <XCircle size={16} /> {dv.error}
                              </div>
                            )}

                            {!dv.error && (
                              <>
                                <div className="mac-table-container">
                                  <table className="mac-data-table">
                                    <thead>
                                      <tr>
                                        {t.columns.map(col => <th key={col.name}>{col.name}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(dv.rows || []).map((row, idx) => (
                                        <tr key={idx}>
                                          {t.columns.map(col => (
                                            <td key={col.name}>{String(row[col.name] ?? '')}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="migration-pagination">
                                  <div className="migration-pagination-size">
                                    <label>Rows per page</label>
                                    <select
                                      value={dv.pageSize}
                                      disabled={dv.loading}
                                      onChange={(e) => changeDataPageSize(t.table, Number(e.target.value))}
                                    >
                                      {PAGE_SIZE_OPTIONS.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="migration-pagination-nav">
                                    <button
                                      type="button"
                                      className="mac-btn-secondary"
                                      disabled={dv.loading || dv.page <= 1}
                                      onClick={() => changeDataPage(t.table, dv.page - 1)}
                                    >
                                      <ChevronLeft size={14} />
                                    </button>
                                    <span>Page {dv.page} of {dv.totalPages}</span>
                                    <button
                                      type="button"
                                      className="mac-btn-secondary"
                                      disabled={dv.loading || dv.page >= dv.totalPages}
                                      onClick={() => changeDataPage(t.table, dv.page + 1)}
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
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
                  <p>{result.processed} of {result.total} rows written across {result.tables.length} collection(s).</p>
                  <div className="migration-result-tables">
                    {result.tables.map(rt => (
                      <div className="migration-result-row" key={rt.table}>
                        <span><strong>{rt.table}</strong> &rarr; <code>{rt.targetCollection}</code></span>
                        <span>{Number(rt.rowCount || 0).toLocaleString()} rows</span>
                        {rt.warnings && rt.warnings.length > 0 && (
                          <span className="migration-result-warnings">
                            <AlertTriangle size={12} /> {rt.warnings.join('; ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
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
              ) : transferState !== 'completed' && (
                <button
                  className="mac-btn-primary"
                  onClick={handleStartTransfer}
                  disabled={isTransferring || includedCount === 0}
                >
                  {isTransferring ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                  {isTransferring ? 'Transferring...' : `Start Transfer (${includedCount} table${includedCount === 1 ? '' : 's'})`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

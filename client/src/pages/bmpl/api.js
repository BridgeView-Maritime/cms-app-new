// client/src/pages/bmpl/api.js
// Fetch helper for the BMPL back-office API. Staff sessions use the admin
// `accessToken`, not the candidate token.
import { AUTH_ENDPOINTS } from '../../config/api';

export const BMPL_API = AUTH_ENDPOINTS.REACT_APP_API_URL + '/api/bmpl';

export async function bmpl(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BMPL_API + path);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const headers = { Authorization: 'Bearer ' + localStorage.getItem('accessToken') };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(url.toString(), { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  } catch (err) {
    return { success: false, message: 'Network error - the server could not be reached.', network: true };
  }
  let data;
  try { data = await res.json(); } catch { data = { success: false, message: 'Unexpected response (' + res.status + ').' }; }
  if (!data.success && !data.message) data.message = 'Request failed (' + res.status + ').';
  data.status = res.status;
  return data;
}

/**
 * "Download Excel", as every legacy list had it — but as CSV, which Excel
 * opens directly. The request carries the same filters as the list, so what
 * downloads is what is on screen (up to the server's export cap).
 */
export async function downloadCsvFromApi(path, params, name = 'export') {
  const url = new URL(BMPL_API + path);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  let res;
  try {
    res = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') } });
  } catch {
    return { ok: false, message: 'Network error - the export could not be downloaded.' };
  }
  if (!res.ok) {
    let message = 'Export failed (' + res.status + ').';
    try { const j = await res.json(); if (j.message) message = j.message; } catch { /* not JSON */ }
    return { ok: false, message };
  }
  const blob = await res.blob();
  saveBlob(blob, String(name).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.csv');
  return { ok: true };
}

/** Builds a CSV from rows already on the client (used by the report pages). */
export function rowsToCsv(rows, columns) {
  const cell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const value = (r, c) => (typeof c.get === 'function' ? c.get(r) : r[c.key]);
  return '﻿' + [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(value(r, c))).join(','))].join('\r\n');
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // The browser cancels a blob download whose anchor or URL disappears before
  // it has started, so both are kept around well past the click.
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60000);
}

/**
 * CSV for a workflow page: pages through its own endpoint (which has no
 * server-side export) and stitches the rows together. Capped, and the caller
 * is told when the cap truncated the file.
 */
export async function downloadCsvByPaging(path, params, columns, name, { pageSize = 500, maxPages = 10 } = {}) {
  const all = [];
  let totalPages = 1;
  for (let page = 1; page <= Math.min(totalPages, maxPages); page += 1) {
    const d = await bmpl(path, { params: { ...params, page, limit: pageSize } });
    if (!d.success) return { ok: false, message: d.message };
    all.push(...(d.records || []));
    totalPages = d.totalPages || 1;
    if (!d.records?.length) break;
  }
  if (!all.length) return { ok: false, message: 'Nothing to export.' };
  saveBlob(new Blob([rowsToCsv(all, columns)], { type: 'text/csv;charset=utf-8' }), String(name).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.csv');
  return { ok: true, rows: all.length, truncated: totalPages > maxPages };
}

// ---- display formatting shared by every BMPL page ----

const ZERO_DATES = ['0000-00-00', '1000-01-01', '1000-10-10', '1970-01-01'];

export function fmtDate(v, withTime = false) {
  if (v === null || v === undefined || v === '') return '';
  const s = String(v);
  if (ZERO_DATES.some((z) => s.startsWith(z))) return '';
  const d = new Date(s.includes('T') || /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return s.length > 30 ? '' : s;
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(undefined, opts);
}

export function fmtMoney(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
}

export const isOn = (v) => v === 1 || v === '1' || v === true || v === 'Active' || v === 'Yes';

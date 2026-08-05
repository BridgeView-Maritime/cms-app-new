import { v4 as uuidv4 } from 'uuid';
import { parseDumpFiles, summarizeBatch, saveParsedBatch, runMigration, getTableRowsPage } from '../services/migrationService.js';
import { logAudit } from '../helpers/auditHelper.js';

// In-memory job registry — this is a single-instance admin tool, not a
// distributed queue, so a process-local Map is enough to track progress.
const jobs = new Map();

export const parseUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one .sql file is required.' });
    }

    const files = req.files.map((f) => ({ filename: f.originalname, content: f.buffer.toString('utf8') }));
    const tables = parseDumpFiles(files);

    if (tables.size === 0) {
      return res.status(400).json({ success: false, message: 'No CREATE TABLE / INSERT statements were found in the uploaded file(s).' });
    }

    const batchId = saveParsedBatch(tables);
    return res.status(200).json({ success: true, data: { batchId, tables: summarizeBatch(tables) } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getTableRows = async (req, res) => {
  try {
    const { batchId, table } = req.params;
    const { page, pageSize } = req.query;
    const data = getTableRowsPage(batchId, table, page, pageSize);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const startTransfer = async (req, res) => {
  const { batchId, transfers } = req.body;

  if (!batchId || !Array.isArray(transfers) || transfers.length === 0) {
    return res.status(400).json({ success: false, message: 'batchId and a non-empty transfers array are required.' });
  }

  const jobId = uuidv4();
  const io = req.app.get('io');
  const room = `migration:${jobId}`;

  jobs.set(jobId, { status: 'running', processed: 0, total: 0, startedAt: new Date() });

  res.status(202).json({ success: true, jobId });

  runMigration(batchId, transfers, {
    onProgress: ({ processed, total }) => {
      const job = jobs.get(jobId);
      job.processed = processed;
      job.total = total;
      io?.to(room).emit('migration:progress', { jobId, processed, total });
    }
  })
    .then((result) => {
      jobs.set(jobId, { status: 'completed', ...result, finishedAt: new Date() });
      io?.to(room).emit('migration:complete', { jobId, ...result });
      logAudit(req.user?.id, 'MYSQL_DUMP_MIGRATION', JSON.stringify({ jobId, ...result }), req);
    })
    .catch((err) => {
      const job = jobs.get(jobId) || {};
      jobs.set(jobId, { ...job, status: 'failed', error: err.message, finishedAt: new Date() });
      io?.to(room).emit('migration:error', { jobId, message: err.message });
      logAudit(req.user?.id, 'MYSQL_DUMP_MIGRATION_FAILED', JSON.stringify({ jobId, tables: transfers.map((t) => t.table), error: err.message }), req);
    });
};

export const getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found.' });
  }
  return res.status(200).json({ success: true, data: job });
};

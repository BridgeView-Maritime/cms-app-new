import { v4 as uuidv4 } from 'uuid';
import { listTables, getRelations, previewTable, runMigration } from '../services/migrationService.js';
import { logAudit } from '../helpers/auditHelper.js';

// In-memory job registry — this is a single-instance admin tool, not a
// distributed queue, so a process-local Map is enough to track progress.
const jobs = new Map();

export const getTables = async (req, res) => {
  try {
    const tables = await listTables();
    return res.status(200).json({ success: true, data: tables });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to list MySQL tables: ${err.message}` });
  }
};

export const getTableRelations = async (req, res) => {
  try {
    const { table } = req.params;
    const relations = await getRelations(table);
    return res.status(200).json({ success: true, data: relations });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getTablePreview = async (req, res) => {
  try {
    const { table } = req.params;
    const { limit } = req.query;
    const preview = await previewTable(table, limit);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const startTransfer = async (req, res) => {
  const { rootTable, targetCollection, embed } = req.body;

  if (!rootTable || typeof rootTable !== 'string') {
    return res.status(400).json({ success: false, message: 'rootTable is required.' });
  }

  const jobId = uuidv4();
  const io = req.app.get('io');
  const room = `migration:${jobId}`;

  jobs.set(jobId, { status: 'running', processed: 0, total: 0, errors: [], startedAt: new Date() });

  res.status(202).json({ success: true, jobId });

  runMigration(
    { rootTable, targetCollection, embed },
    {
      onProgress: ({ processed, total }) => {
        const job = jobs.get(jobId);
        job.processed = processed;
        job.total = total;
        io?.to(room).emit('migration:progress', { jobId, processed, total });
      }
    }
  )
    .then((result) => {
      jobs.set(jobId, { status: 'completed', ...result, finishedAt: new Date() });
      io?.to(room).emit('migration:complete', { jobId, ...result });
      logAudit(req.user?.id, 'MYSQL_MIGRATION', result, req);
    })
    .catch((err) => {
      const job = jobs.get(jobId) || {};
      jobs.set(jobId, { ...job, status: 'failed', error: err.message, finishedAt: new Date() });
      io?.to(room).emit('migration:error', { jobId, message: err.message });
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

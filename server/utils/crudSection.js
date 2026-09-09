import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { candidateFilter, ownershipFields } from './candidateMatch.js';

/**
 * Registers a candidate-owned CRUD section on `router`. Every one of these
 * sections is the same shape — list / create / update / delete, scoped to
 * the logged-in candidate — so they are generated from one definition
 * rather than written out per section.
 *
 * `single: true` gives one record per candidate: GET returns it directly
 * and POST upserts instead of appending.
 */
export function crudSection({ router, path, model, link, fields, single = false }) {
  const scope = (req) => candidateFilter(req.candidate, link);
  const pick = (body) => {
    const out = {};
    for (const f of fields) if (body[f] !== undefined) out[f] = body[f];
    return out;
  };

  // LIST (or, for single-record sections, the one record)
  router.get(path, authenticateCandidate, async (req, res) => {
    try {
      if (single) {
        const doc = await model.findOne(scope(req)).lean();
        return res.status(200).json({ success: true, record: doc || null });
      }
      const records = await model.find(scope(req)).sort({ id: -1 }).lean();
      return res.status(200).json({ success: true, records });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // CREATE (single-record sections upsert instead)
  router.post(path, authenticateCandidate, async (req, res) => {
    try {
      const payload = { ...pick(req.body), ...ownershipFields(req.candidate, link) };

      if (single) {
        const existing = await model.findOne(scope(req));
        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          return res.status(200).json({ success: true, message: 'Saved.', record: existing.toObject() });
        }
      }

      const created = await model.create(payload);
      return res.status(201).json({ success: true, message: 'Saved.', record: created.toObject() });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // UPDATE — scoped so a candidate can only ever touch their own rows
  router.put(path + '/:id', authenticateCandidate, async (req, res) => {
    try {
      const doc = await model.findOne({ $and: [{ _id: req.params.id }, scope(req)] });
      if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
      Object.assign(doc, pick(req.body));
      await doc.save();
      return res.status(200).json({ success: true, message: 'Updated.', record: doc.toObject() });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete(path + '/:id', authenticateCandidate, async (req, res) => {
    try {
      const doc = await model.findOneAndDelete({ $and: [{ _id: req.params.id }, scope(req)] });
      if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
      return res.status(200).json({ success: true, message: 'Deleted.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
}

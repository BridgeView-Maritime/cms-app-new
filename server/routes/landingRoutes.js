import express from 'express';
import { LandingContent } from '../models/LandingContent.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const CONTENT_CODE = 'PUBLIC_LANDING_PAGE';

// PUBLIC: read-only, no auth — this is what the public landing page renders.
router.get('/content', async (req, res) => {
  try {
    let doc = await LandingContent.findOne({ content_code: CONTENT_CODE });
    if (!doc) {
      // First-ever load: materialize the schema defaults so every future
      // GET/PUT has a real document to work against.
      doc = await LandingContent.create({ content_code: CONTENT_CODE });
    }
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ADMIN: full-document replace, upserted, following the same
// findOneAndUpdate(upsert) pattern used for FormMeta in adminRoutes.js.
router.put(
  '/content',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { topbar, hero, process, ranks, services, about, contact, footer } = req.body;

      const updated = await LandingContent.findOneAndUpdate(
        { content_code: CONTENT_CODE },
        {
          topbar,
          hero,
          process,
          ranks,
          services,
          about,
          contact,
          footer,
          updated_by: req.user.id
        },
        { upsert: true, new: true, runValidators: true }
      );

      return res.status(200).json({ success: true, message: 'Landing page content updated', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;

const express = require('express');
const router = express.Router();
const MaritimeIntelligenceService = require('../services/MaritimeIntelligenceService');

// Instantiate service (pass null if IO isn't strictly required for this dry-run check)
const intelligenceService = new MaritimeIntelligenceService(null);

router.post('/verify-safety', async (req, res) => {
  try {
    const { coordinates } = req.body; // Expects [[lng1, lat1], [lng2, lat2], ...]
    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: 'Invalid route coordinates array provided.' });
    }

    const assessment = await intelligenceService.verifyPlannedVoyageSafety(coordinates);
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
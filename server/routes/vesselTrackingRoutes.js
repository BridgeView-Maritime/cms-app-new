import express from 'express';
import {
  searchVesselsByIMO,
  trackAndSaveVessel,
  getVesselFromDB,
} from '../controllers/vesselTrackingController.js';

const router = express.Router();

// Search ships by IMO query
router.post('/search', searchVesselsByIMO);

// Fetch details from provider and persist record to MongoDB
router.post('/track', trackAndSaveVessel);

// Get stored data from Database
router.get('/:imo', getVesselFromDB);

export default router;
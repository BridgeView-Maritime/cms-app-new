const turf = require('@turf/turf');
const AdvisoryZone = require('../models/AdvisoryZone');
const NotificationService = require('./NotificationService'); // Transports for SMS/Email

class MaritimeIntelligenceService {
  constructor(io) {
    this.io = io; // Socket.IO Server Instance passed from app initialization
  }

  /**
   * Evaluates incoming live AIS data against active risk maps using Turf.js
   * @param {Object} vessel { id, name, currentLng, currentLat, currentVoyagePath }
   */
  async processVesselTelemetry(vessel) {
    try {
      // 1. Fetch all active GeoJSON risks from MongoDB
      const activeZones = await AdvisoryZone.find({ isActive: true });
      if (!activeZones.length) return;

      // 2. Convert vessel coordinates into a Turf.js Point
      const vesselPoint = turf.point([vessel.currentLng, vessel.currentLat]);

      for (const zone of activeZones) {
        // 3. Create Turf feature from DB stored geometry
        const zoneFeature = turf.polygon(zone.geometry.coordinates);

        // 4. Check for intersection
        const isInside = turf.booleanPointInPolygon(vesselPoint, zoneFeature);

        if (isInside) {
          await this.triggerRiskBreachAlert(vessel, zone);
        }
      }
    } catch (error) {
      console.error('Error processing vessel telemetry through Turf engine:', error);
    }
  }

  /**
   * Handles instantaneous dispatching of risks to UI components and hardware lines
   */
  async triggerRiskBreachAlert(vessel, zone) {
    const payload = {
      alertType: 'GEOCONSTRAINT_BREACH',
      vesselId: vessel.id,
      vesselName: vessel.name,
      zoneId: zone._id,
      riskLevel: zone.riskLevel,
      source: zone.source,
      message: `Vessel ${vessel.name} entered ${zone.source} Risk Area: ${zone.title}`,
      timestamp: new Date()
    };

    // UI Dispatch: Immediate UI update to React clients
    this.io.to('fleet-monitors').emit('new-maritime-alert', payload);

    // Hardware Alerting: Outbound SMS/Email to Management & Fleet Captains
    await NotificationService.dispatchCriticalAlert({
      vesselId: vessel.id,
      message: payload.message,
      channels: ['email', 'sms', 'in_app']
    });
  }
}

module.exports = MaritimeIntelligenceService;
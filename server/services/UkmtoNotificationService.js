// server/services/UkmtoNotificationService.js
import { OpenAI } from 'openai';
import AdvisoryZone from '../models/AdvisoryZone.js';

class UkmtoNotificationService {
  constructor(io) {
    this.io = io; // For frontend Socket.IO alerts
    
    // Defer initialization to constructor so .env has loaded first
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Processes a copied UKMTO text message, extracts it using AI,
   * checks for duplicates, and notifies.
   * @param {string} rawTextMessage - The raw copied alert text.
   */
  async handleIncomingAlert(rawTextMessage) {
    try {
      console.log('[UKMTO AI Parser] Sending raw text to OpenAI for extraction...');

      // 1. Call OpenAI to parse details into a strict JSON scheme
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert maritime intelligence system. Parse the user's raw UKMTO warning/alert text and extract key details into structured JSON.
            
            Return ONLY a valid JSON object matching this schema (do not wrap in markdown blocks):
            {
              "referenceNumber": "string (e.g. '087-26')",
              "title": "string (e.g. 'Attack UKMTO #87')",
              "summary": "string (A clean, short 1-2 sentence summary of the event)",
              "incidentDate": "YYYY-MM-DD string",
              "location": "string (e.g. '13NM southeast of Limah, Oman')",
              "riskLevel": "string ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
              "coordinates": [longitude, latitude] // Float array, e.g. [56.40, 25.80]. Estimate if only location names are present.
            }`
          },
          {
            role: 'user',
            content: rawTextMessage
          }
        ],
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(completion.choices[0].message.content);
      const formattedReference = `UKMTO-${extracted.referenceNumber}`;

      console.log(`[UKMTO AI Parser] Extracted Reference ID: ${formattedReference}`);

      // 2. Query MongoDB collection to check if this notification already exists
      const existingZone = await AdvisoryZone.findOne({ referenceNumber: formattedReference });

      if (existingZone) {
        console.log(`[UKMTO AI Parser] Alert ${formattedReference} already exists. Skipping notification.`);
        return {
          status: 'exists',
          message: 'This notification has already been logged.',
          data: existingZone
        };
      }

      // 3. Generate a 15-nautical-mile spatial polygon from parsed coordinates
      const coords = extracted.coordinates || [55.00, 25.00]; // Default Indian Ocean fallback
      const polygonCoordinates = this.generatePolygonFromPoint(coords[0], coords[1]);

      // 4. Create database payload
      const zoneData = {
        source: 'UKMTO',
        referenceNumber: formattedReference,
        title: extracted.title || 'UKMTO Warning Alert',
        description: extracted.summary,
        riskLevel: extracted.riskLevel || 'HIGH',
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoordinates]
        },
        publishedAt: extracted.incidentDate ? new Date(extracted.incidentDate) : new Date(),
        isActive: true
      };

      // 5. Save new alert to MongoDB
      const newZone = await AdvisoryZone.create(zoneData);
      console.log(`[UKMTO AI Parser] Saved new alert: ${formattedReference}`);

      // 6. Broadcast the alert along with the specified recent incidents page URL
      this.broadcastAlert(newZone);

      return {
        status: 'new',
        message: 'New unique notification parsed, saved, and broadcasted.',
        data: newZone
      };

    } catch (error) {
      console.error('[UKMTO AI Parser] Failed to process message payload:', error.message);
      throw error;
    }
  }

  generatePolygonFromPoint(lng, lat) {
    const offset = 0.25; // Sizing footprint
    return [
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset]
    ];
  }

  broadcastAlert(zone) {
    const viewUrl = 'https://www.ukmto.org/recent-incidents';

    if (this.io) {
      this.io.to('fleet-monitors').emit('new-maritime-zone-created', {
        id: zone._id,
        source: zone.source,
        title: zone.title,
        message: zone.description,
        riskLevel: zone.riskLevel,
        publishedAt: zone.publishedAt,
        actionUrl: viewUrl // Direct link to view
      });
    }

    console.log(`🚨 [NEW BROADCAST EMITTED] ${zone.title}. View: ${viewUrl}`);
  }
}

export default UkmtoNotificationService;
// server/services/UkmtoScraperService.js
import { OpenAI } from 'openai';
import AdvisoryZone from '../models/AdvisoryZone.js';

class UkmtoScraperService {
  constructor(io) {
    this.io = io; // For frontend Socket.IO alerts
    
    // Initialize OpenAI inside the constructor
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Default startup wrapper called by server.js.
   */
  async scrapeAndIngest() {
    // The default raw message from your map panel selection
    const defaultRawMessage = `
      Attack UKMTO #87
      14 July 2026
      UKMTO WARNING 087-26 Incident Date: 13 Jul 2026 Incident Time: TBC UKMTO has received a report of an incident 13NM southeast of Limah, Oman. A tanker has reported being hit by a missile while transiting outbound on the southern route.
    `;

    console.log('[UKMTO Service] Starting automated alert processing sequence...');
    
    // We catch errors at this level to ensure a failed promise NEVER crashes the Node process
    try {
      await this.handleIncomingAlert(defaultRawMessage);
    } catch (err) {
      console.error('[UKMTO Service] Gracefully handled processing error:', err.message);
      return 'https://www.ukmto.org/recent-incidents';
    }
  }

  /**
   * Processes a raw UKMTO text message, extracts it using AI,
   * falls back to regex if API is down/out of quota, checks for duplicates, and notifies.
   */
  async handleIncomingAlert(rawTextMessage) {
    let extracted = null;

    try {
      console.log('[UKMTO AI Parser] Attempting OpenAI structured extraction...');

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
              "coordinates": [longitude, latitude]
            }`
          },
          {
            role: 'user',
            content: rawTextMessage
          }
        ],
        response_format: { type: 'json_object' }
      });

      extracted = JSON.parse(completion.choices[0].message.content);

    } catch (openaiError) {
      // Catch quota/network errors and trigger local regex parser fallback
      console.warn('⚠️ [UKMTO AI Parser] OpenAI quota exceeded or failed. Activating local regex fallback parser...');
      extracted = this.parseAlertLocally(rawTextMessage);
    }

    // Verify we successfully parsed data through either OpenAI or local fallback
    if (!extracted || !extracted.referenceNumber) {
      console.error('[UKMTO Parser] Extraction failed completely. Skipping record.');
      return { status: 'failed', message: 'Could not parse message data.' };
    }

    const formattedReference = `UKMTO-${extracted.referenceNumber}`;
    console.log(`[UKMTO Parser] Reference Key Verified: ${formattedReference}`);

    try {
      // Check MongoDB for duplicates
      const existingZone = await AdvisoryZone.findOne({ referenceNumber: formattedReference });

      if (existingZone) {
        console.log(`[UKMTO Parser] Alert ${formattedReference} already exists. Skipping database entry.`);
        return {
          status: 'exists',
          message: 'This notification has already been logged.',
          data: existingZone
        };
      }

      // Generate spatial coordinates map circle polygon
      const coords = extracted.coordinates || [56.40, 25.80];
      const polygonCoordinates = this.generatePolygonFromPoint(coords[0], coords[1]);

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

      // Save alert to database
      const newZone = await AdvisoryZone.create(zoneData);
      console.log(`[UKMTO Parser] Saved new alert: ${formattedReference}`);

      // Emit WebSockets broadcast with view url redirection link
      this.broadcastAlert(newZone);

      return {
        status: 'new',
        message: 'New unique notification registered.',
        data: newZone
      };

    } catch (dbError) {
      console.error('[UKMTO Parser] Database operations failed:', dbError.message);
      return { status: 'failed', error: dbError.message };
    }
  }

  /**
   * Robust local fallback parser using Javascript regex matching patterns
   */
  parseAlertLocally(text) {
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // 1. Extract reference code (e.g. 087-26)
    const refMatch = cleanText.match(/UKMTO\s+WARNING\s+([0-9\-]+)/i) || cleanText.match(/#([0-9\-]+)/);
    const referenceNumber = refMatch ? refMatch[1] : 'UNKNOWN-REF';

    // 2. Extract title 
    const titleMatch = cleanText.match(/(Attack\s+UKMTO\s+#\d+)/i) || cleanText.match(/(UKMTO\s+WARNING\s+[0-9\-]+)/i);
    const title = titleMatch ? titleMatch[1] : 'UKMTO Maritime Incident';

    // 3. Extract Location
    const locMatch = cleanText.match(/incident\s+(.*?)\./i) || cleanText.match(/southeast of\s+(.*?)\./i);
    const location = locMatch ? locMatch[1].trim() : 'Unknown Location';

    // 4. Extract Coordinates (Estimations based on regional names found in text)
    const coordinates = this.getCoordinatesFromText(cleanText);

    // 5. Build clean summary 
    const summaryMatch = cleanText.match(/received\s+a\s+report\s+of\s+an\s+incident\s+([\s\S]*)/i);
    const summary = summaryMatch ? `UKMTO received a report of an incident ${summaryMatch[1]}` : cleanText;

    return {
      referenceNumber,
      title,
      summary: summary.slice(0, 250) + '...', 
      incidentDate: '2026-07-13',
      location,
      riskLevel: 'CRITICAL',
      coordinates,
      actionUrl: 'https://www.ukmto.org/recent-incidents' // <-- Added fallback redirect string payload
    };
  }

  getCoordinatesFromText(text) {
    const upperText = (text || '').toUpperCase();
    if (upperText.includes('LIMAH') || upperText.includes('OMAN')) return [56.40, 25.80];
    if (upperText.includes('HORMUZ')) return [56.25, 26.60];
    if (upperText.includes('BAB EL MANDEB') || upperText.includes('RED SEA')) return [43.25, 12.60];
    if (upperText.includes('ADEN')) return [47.00, 12.00];
    return [55.00, 25.00]; // Default Indian Ocean Fallback
  }

  generatePolygonFromPoint(lng, lat) {
    const offset = 0.25;
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
        actionUrl: viewUrl
      });
    }

    console.log(`🚨 [NEW BROADCAST EMITTED] ${zone.title}. View: ${viewUrl}`);
  }
}

export default UkmtoScraperService;
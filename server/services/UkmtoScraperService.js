// server/services/UkmtoScraperService.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { OpenAI } from 'openai';
import nodemailer from 'nodemailer';
import AdvisoryZone from '../models/AdvisoryZone.js';
import { Notification, UserNotificationMapping } from '../models/Notification.js';
import User from '../models/User.js';

// UKMTO's own site (ukmto.org) is JS-rendered and sits behind Cloudflare bot
// protection, so it can't be polled directly. MSCIO (Maritime Security Centre -
// Indian Ocean) is a recognised maritime safety body that mirrors UKMTO Warning/
// Advisory PDFs in a plain, unprotected document directory - that's the source here.
const MSCIO_BASE_URL = 'https://mscio.eu';
const MSCIO_FOLDER_URL = `${MSCIO_BASE_URL}/folder/documents/UKMTO%20Warnings/`;
const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; BridgeviewCMS/1.0; +maritime-safety-monitor)' };

const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

// Approximate reference points for common Voluntary Reporting Area chokepoints/ports
// mentioned in UKMTO bulletins, used to place a map pin when no better data exists.
const KNOWN_LOCATIONS = [
  { keys: ['AL KHASAB', 'KHASAB'], coords: [56.25, 26.20] },
  { keys: ['LIMAH'], coords: [56.40, 25.80] },
  { keys: ['HORMUZ'], coords: [56.25, 26.60] },
  { keys: ['BAB EL MANDEB', 'BAB-EL-MANDEB', 'BAB EL-MANDEB'], coords: [43.25, 12.60] },
  { keys: ['RED SEA'], coords: [40.50, 16.00] },
  { keys: ['ADEN'], coords: [47.00, 12.00] },
  { keys: ['SOCOTRA'], coords: [53.80, 12.50] },
  { keys: ['MUSCAT'], coords: [58.40, 23.60] },
  { keys: ['FUJAIRAH'], coords: [56.34, 25.35] },
  { keys: ['SALALAH'], coords: [54.09, 17.02] },
  { keys: ['OMAN'], coords: [58.00, 21.00] }
];

// Lines that are template boilerplate (headers/contact info/table labels), not
// incident content - stripped out before building the human-readable summary.
const NOISE_LINE_PATTERNS = [
  /^UKMTO (WARNING|ADVISORY|NOTICE)$/i,
  /watchkeepers@ukmto\.org/i,
  /^\|?\s*\+44/,
  /^\|?\s*www\.ukmto\.org/i,
  /^\d{3}-\d{2}\s*-\s*[A-Z][A-Z /]+$/i,
  /^Report Date:?/i,
  /^Report Time:?/i,
  /^Issue Date:?/i,
  /^Source$/i,
  /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/i,
  /^\d{3,4}\s*UTC/i,
  /^(Military authorities|Master|Company|Coalition Forces|Other)$/i,
  /^--\s*\d+\s*of\s*\d+\s*--$/i
];

class UkmtoScraperService {
  constructor(io) {
    this.io = io; // For frontend Socket.IO alerts
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Exposed via GET /api/notifications/ukmto-status so sync results are visible
    // without needing access to server/host logs (e.g. Railway).
    this.lastRunSummary = null;
  }

  /**
   * Default startup/cron entry point. Checks the MSCIO mirror for UKMTO
   * Warning/Advisory documents that haven't been ingested yet.
   */
  async scrapeAndIngest() {
    console.log('[UKMTO Scraper] Checking MSCIO mirror for new UKMTO documents...');
    const startedAt = new Date();

    let documents;
    try {
      documents = await this.fetchDocumentList();
    } catch (err) {
      // Never let a source outage crash the process - log and retry next cycle.
      console.error('[UKMTO Scraper] Failed to reach MSCIO document listing:', err.message);
      this.lastRunSummary = {
        ranAt: startedAt,
        ok: false,
        stage: 'fetchDocumentList',
        error: err.message
      };
      return;
    }

    if (!documents.length) {
      console.warn('[UKMTO Scraper] No documents found in listing (source layout may have changed).');
      this.lastRunSummary = {
        ranAt: startedAt,
        ok: false,
        stage: 'fetchDocumentList',
        error: 'Listing returned zero documents - MSCIO page structure may have changed.'
      };
      return;
    }

    // Documents are listed newest-first. Regardless of what's already in the DB
    // (a fresh deploy with 90 years of backlog, a catch-up after downtime, or a
    // normal cycle with just one new item), never live-notify for more than one
    // bulletin per sync - only the most recent *new* one gets the real notification/
    // broadcast; anything older that's also new gets backfilled into the map silently.
    let newCount = 0;
    let liveSlotUsed = false;
    let liveBulletin = null;
    const perDocResults = [];
    for (let i = 0; i < documents.length; i++) {
      const wasSilentBeforeThisDoc = liveSlotUsed;
      try {
        // Cheap pre-check from the filename alone (before downloading the PDF) so a
        // steady-state cycle isn't re-fetching all ~90 historical documents every time.
        // Safe even if the guess is wrong/imprecise - it only ever skips a download,
        // never skips the authoritative body-text check inside processDocument.
        const guessedRef = this.guessReferenceFromFilename(documents[i].filename);
        if (guessedRef && await AdvisoryZone.exists({ referenceNumber: guessedRef })) {
          perDocResults.push({ filename: documents[i].filename, status: 'exists' });
          continue;
        }

        const result = await this.processDocument(documents[i], { silent: wasSilentBeforeThisDoc });
        perDocResults.push({ filename: documents[i].filename, status: result?.status });
        if (result?.status === 'new') {
          newCount++;
          if (!wasSilentBeforeThisDoc) {
            liveSlotUsed = true; // this doc claimed the one live slot for this cycle
            liveBulletin = result.data?.title;
          }
        }
      } catch (err) {
        console.error(`[UKMTO Scraper] Failed processing ${documents[i].filename}:`, err.message);
        perDocResults.push({ filename: documents[i].filename, status: 'error', error: err.message });
      }
      // Be a polite citizen towards the mirror - small gap between sequential downloads.
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[UKMTO Scraper] Sync complete. ${newCount} new bulletin(s) ingested, ${documents.length} checked.`);

    this.lastRunSummary = {
      ranAt: startedAt,
      ok: true,
      documentsChecked: documents.length,
      newCount,
      liveNotificationSentFor: liveBulletin,
      perDocResults
    };
  }

  /**
   * Fetches and parses the MSCIO folder listing HTML into a list of candidate documents.
   */
  async fetchDocumentList() {
    const { data: html } = await axios.get(MSCIO_FOLDER_URL, {
      timeout: 20000,
      headers: FETCH_HEADERS
    });

    const $ = cheerio.load(html);
    const documents = [];

    $('#folder-table-list tbody tr').each((_, row) => {
      const link = $(row).find('td a').first();
      const href = link.attr('href');
      const filename = link.attr('title') || link.text().trim();
      if (!href || !filename || !/UKMTO/i.test(filename)) return;

      documents.push({
        filename,
        url: href.startsWith('http') ? href : `${MSCIO_BASE_URL}${href}`
      });
    });

    return documents;
  }

  /**
   * Downloads and parses a single document, ingesting it if it's new.
   */
  async processDocument(doc, opts = {}) {
    const { data: pdfBuffer } = await axios.get(doc.url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: FETCH_HEADERS
    });

    const parser = new PDFParse({ data: Buffer.from(pdfBuffer) });
    let text;
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }

    return this.handleIncomingAlert(text, doc, opts);
  }

  /**
   * Processes a raw UKMTO bulletin's extracted text, extracts structured fields,
   * checks for duplicates, persists it, and notifies connected clients + all users.
   * opts.silent skips notification/broadcast - used for backlog items older than
   * the single most recent new bulletin in a given sync cycle (see scrapeAndIngest).
   */
  async handleIncomingAlert(rawTextMessage, docMeta = {}, opts = {}) {
    // The reference number + category ("104-26 - ATTACK") is a fixed, reliable
    // part of every bulletin's body text - trust that over AI/filename guessing.
    const refInfo = this.extractRefAndCategory(rawTextMessage);
    if (!refInfo) {
      console.warn(`[UKMTO Scraper] Could not find a reference number in document${docMeta.filename ? ` ${docMeta.filename}` : ''}. Skipping.`);
      return { status: 'failed', message: 'No reference number found.' };
    }

    const formattedReference = `UKMTO-${refInfo.referenceNumber}`;

    const existingZone = await AdvisoryZone.findOne({ referenceNumber: formattedReference });
    if (existingZone) {
      return { status: 'exists', data: existingZone };
    }

    // Skip the AI call for silent historical backfill - the regex parser already
    // extracts these fields reliably and there's no point paying for ~90 AI calls
    // on documents nobody will be notified about.
    let extracted = opts.silent ? null : await this.extractWithOpenAI(rawTextMessage);
    if (!extracted) {
      extracted = this.parseAlertLocally(rawTextMessage);
    }

    const title = `${this.toTitleCase(refInfo.category)} UKMTO #${refInfo.sequence}`;
    const coords = extracted.coordinates || this.getCoordinatesFromText(rawTextMessage);
    const polygonCoordinates = this.generatePolygonFromPoint(coords[0], coords[1]);

    const zoneData = {
      source: 'UKMTO',
      referenceNumber: formattedReference,
      title,
      description: extracted.summary || rawTextMessage.replace(/\s+/g, ' ').trim().slice(0, 500),
      riskLevel: extracted.riskLevel || (/ATTACK|HIJACK|BOARDING/i.test(refInfo.category) ? 'CRITICAL' : 'HIGH'),
      geometry: {
        type: 'Polygon',
        coordinates: [polygonCoordinates]
      },
      publishedAt: extracted.incidentDate ? new Date(extracted.incidentDate) : new Date(),
      isActive: true
    };

    let newZone;
    try {
      newZone = await AdvisoryZone.create(zoneData);
    } catch (dbError) {
      if (dbError.code === 11000) {
        // Lost a race with another cycle/instance - treat as already-exists.
        return { status: 'exists' };
      }
      console.error('[UKMTO Scraper] Database operation failed:', dbError.message);
      return { status: 'failed', error: dbError.message };
    }

    if (opts.silent) {
      console.log(`[UKMTO Scraper] Backfilled historical bulletin ${formattedReference} (${title}) - no notification sent.`);
      return { status: 'new', message: 'Historical bulletin backfilled silently.', data: newZone };
    }

    console.log(`[UKMTO Scraper] Saved new bulletin: ${formattedReference} (${title})`);

    await this.persistAsNotification(newZone);
    this.broadcastAlert(newZone);

    return { status: 'new', message: 'New unique bulletin registered.', data: newZone };
  }

  /**
   * Best-effort reference number guess from the filename alone (e.g.
   * "20260803-UKMTO_WARNING_104-26" -> "UKMTO-104-26"), used only to skip a PDF
   * download when we're confident it's already ingested. Never trusted for saving -
   * extractRefAndCategory() on the actual body text remains the source of truth.
   */
  guessReferenceFromFilename(filename) {
    const match = filename.match(/(\d{2,3})[-_](\d{2})(?!\d)/);
    if (!match) return null;
    const [, seq, year] = match;
    return `UKMTO-${seq}-${year}`;
  }

  /**
   * Extracts the "104-26 - ATTACK" style header that appears on every UKMTO bulletin.
   */
  extractRefAndCategory(text) {
    const match = text.match(/(\d{2,3})-(\d{2})\s*-\s*([A-Z][A-Z /]{2,40})/);
    if (!match) return null;

    const [, seq, year, category] = match;
    return {
      referenceNumber: `${seq}-${year}`,
      sequence: String(parseInt(seq, 10)),
      category: category.trim()
    };
  }

  /**
   * Attempts AI-structured extraction. Returns null (triggering local fallback) on any failure.
   */
  async extractWithOpenAI(rawTextMessage) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert maritime intelligence system. Parse the user's raw UKMTO warning/advisory text and extract key details into structured JSON.

            Return ONLY a valid JSON object matching this schema (do not wrap in markdown blocks):
            {
              "summary": "string (A clean, short 1-2 sentence summary of the event)",
              "incidentDate": "YYYY-MM-DD string",
              "location": "string (e.g. '13NM southeast of Limah, Oman')",
              "riskLevel": "string ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
              "coordinates": [longitude, latitude]
            }`
          },
          { role: 'user', content: rawTextMessage }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (openaiError) {
      console.warn('[UKMTO Scraper] OpenAI extraction unavailable, using local regex fallback:', openaiError.message);
      return null;
    }
  }

  /**
   * Robust local fallback parser - strips known template boilerplate lines and
   * treats whatever remains as the incident summary. Order-independent, since
   * PDF text extraction order isn't guaranteed to match visual layout.
   */
  parseAlertLocally(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bodyLines = lines.filter(line => !NOISE_LINE_PATTERNS.some(rx => rx.test(line)));
    const summary = bodyLines.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500) || text.slice(0, 250);

    const dateMatch = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    const incidentDate = dateMatch ? this.normalizeDate(dateMatch[1], dateMatch[2], dateMatch[3]) : new Date().toISOString().slice(0, 10);

    return {
      summary,
      incidentDate,
      riskLevel: null, // resolved from category upstream
      coordinates: this.getCoordinatesFromText(text)
    };
  }

  normalizeDate(day, monthAbbrev, year) {
    const month = MONTHS[monthAbbrev.toUpperCase()] || '01';
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  getCoordinatesFromText(text) {
    const upperText = (text || '').toUpperCase();
    const match = KNOWN_LOCATIONS.find(loc => loc.keys.some(k => upperText.includes(k)));
    return match ? match.coords : [58.00, 21.00]; // Gulf of Oman default fallback
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

  /**
   * Persists the bulletin as a real Notification + per-user mapping (bell/history log)
   * and emails it, but only to users opted in via the UKMTO Notification Settings page
   * (User.receivesUkmtoAlerts) - not to every active user.
   */
  async persistAsNotification(zone) {
    let subscribers;
    try {
      subscribers = await User.find({ status: 'Active', receivesUkmtoAlerts: true }).select('_id email first_name last_name');
      if (!subscribers.length) {
        console.log('[UKMTO Scraper] No subscribers opted in to UKMTO alerts - skipping notification/email.');
        return;
      }

      const receiverIds = subscribers.map(u => u._id);

      const notification = await Notification.create({
        senderId: null,
        source: 'UKMTO_AUTO',
        title: zone.title,
        message: zone.description,
        receiverIds
      });

      const mappings = receiverIds.map(userId => ({
        notificationId: notification._id,
        userId,
        isRead: false
      }));

      await UserNotificationMapping.insertMany(mappings);
    } catch (err) {
      console.error('[UKMTO Scraper] Failed to persist notification records:', err.message);
      return;
    }

    await this.sendEmailAlerts(zone, subscribers);
  }

  /**
   * Emails the bulletin to subscribed users. Never throws - a failed/misconfigured
   * SMTP setup shouldn't stop the in-app notification from having already been saved.
   */
  async sendEmailAlerts(zone, subscribers) {
    const emails = subscribers.map(u => u.email).filter(Boolean);
    if (!emails.length) return;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: process.env.FROM_EMAIL || '"Bridgeview Admin" <alerts@bridgeview.internal>',
        to: emails.join(','),
        subject: `[UKMTO Alert] ${zone.title}`,
        text: `${zone.description}\n\nView recent incidents: https://www.ukmto.org/recent-incidents`
      });

      console.log(`[UKMTO Scraper] Emailed alert to ${emails.length} subscriber(s).`);
    } catch (err) {
      console.error('[UKMTO Scraper] Failed to send subscriber emails:', err.message);
    }
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

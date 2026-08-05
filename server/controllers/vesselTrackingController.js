import axios from 'axios';
import VesselTracking from '../models/VesselTracking.js';

// Default headers mimicking request parameters from source API
const AXIOS_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  Origin: 'https://shipinfo.net',
  Referer: 'https://shipinfo.net/?lang=en',
};

/**
 * Helper to fetch raw details from mmsi_one.php
 */
const fetchVesselDetailsFromApi = async (vesselId) => {
  const params = new URLSearchParams();
  params.append('id', vesselId);
  params.append('mode', 'ship');

  const response = await axios.post(
    'https://shipinfo.net/api/mmsi_one.php',
    params.toString(),
    { headers: AXIOS_HEADERS }
  );

  return response.data;
};

/**
 * @route POST /api/vessels/search
 * @desc Search vessels by IMO
 */
export const searchVesselsByIMO = async (req, res) => {
  try {
    const { imo } = req.body;
    if (!imo) {
      return res
        .status(400)
        .json({ success: false, message: 'IMO number is required.' });
    }

    const params = new URLSearchParams();
    params.append('name', imo);
    params.append('mode', '2');
    params.append('name3', imo);

    const response = await axios.post(
      'https://shipinfo.net/api/find_ship.php',
      params.toString(),
      { headers: AXIOS_HEADERS }
    );

    const vesselList = response.data;

    if (!Array.isArray(vesselList) || vesselList.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'No vessels found with provided IMO.' });
    }

    return res.status(200).json({
      success: true,
      count: vesselList.length,
      data: vesselList.map((v) => ({
        id: v.id,
        shipName: v.shipName,
        shipType: v.shipType ? v.shipType.trim() : null,
        shipImo: v.shipImo,
        shipMMSI: v.shipMMSI,
        country: v.country,
        flag: v.flag,
      })),
    });
  } catch (error) {
    console.error('Error in searchVesselsByIMO:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * @route POST /api/vessels/track
 * @desc Fetch vessel telemetry from API and upsert into MongoDB
 */
export const trackAndSaveVessel = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Vessel ID parameter is required.' });
    }

    const apiResponse = await fetchVesselDetailsFromApi(id);

    if (!Array.isArray(apiResponse) || !apiResponse[0]) {
      return res
        .status(404)
        .json({ success: false, message: 'Vessel tracking info unavailable.' });
    }

    // Array destruction from mmsi_one response structure
    const rawData = apiResponse[0];

    const [
      shipImo,
      shipType,
      country,
      flag,
      , // Reserved index 4
      , // Reserved index 5
      imageUrl,
      provider,
      rawHistory,
      shipName,
      shipMMSI,
      , // Reserved index 11
      lastPositionObj,
    ] = rawData;

    // Map track history array: [speed, course, date, lat, lng]
    const parsedHistory = Array.isArray(rawHistory)
      ? rawHistory.map((point) => ({
          speed: parseFloat(point[0]) || 0,
          course: parseFloat(point[1]) || 0,
          timestamp: new Date(point[2]),
          latitude: parseFloat(point[3]),
          longitude: parseFloat(point[4]),
        }))
      : [];

    // Map latest telemetry status object
    const currentStatus = lastPositionObj
      ? {
          hasFreshPosition: Boolean(lastPositionObj.has_fresh_position),
          freshPositionTime: lastPositionObj.fresh_position_time
            ? new Date(lastPositionObj.fresh_position_time)
            : null,
          freshLocked: Boolean(lastPositionObj.fresh_locked),
          freshAgeMinutes: lastPositionObj.fresh_age_minutes,
          positionDelayHours: lastPositionObj.position_delay_hours,
          accessMode: lastPositionObj.access_mode,
          lastLat: lastPositionObj.last_lat,
          lastLng: lastPositionObj.last_lng,
          lastUpdated: lastPositionObj.last_updated
            ? new Date(lastPositionObj.last_updated)
            : null,
          lastSpeed: lastPositionObj.last_speed,
          lastCourse: lastPositionObj.last_course,
        }
      : {};

    // Upsert to MongoDB
    const vesselRecord = await VesselTracking.findOneAndUpdate(
      { shipId: String(id) },
      {
        shipId: String(id),
        shipName,
        shipImo,
        shipMMSI,
        shipType,
        country,
        flag,
        imageUrl,
        provider,
        currentStatus,
        history: parsedHistory,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Vessel tracking updated successfully.',
      data: vesselRecord,
    });
  } catch (error) {
    console.error('Error in trackAndSaveVessel:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * @route GET /api/vessels/:imo
 * @desc Get saved vessel tracking directly from DB
 */
export const getVesselFromDB = async (req, res) => {
  try {
    const { imo } = req.params;
    const vessel = await VesselTracking.findOne({ shipImo: imo });

    if (!vessel) {
      return res
        .status(404)
        .json({ success: false, message: 'No stored record found for this vessel.' });
    }

    return res.status(200).json({ success: true, data: vessel });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Error retrieving from database.', error: error.message });
  }
};
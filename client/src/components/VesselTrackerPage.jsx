import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import '../styles/VesselTrackerPage.css';
import { AUTH_ENDPOINTS } from '../config/api';

// Custom Leaflet Icons using SVG data URIs
const vesselIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0284c7" width="32" height="32">
      <circle cx="12" cy="12" r="9" fill="#0284c7" fill-opacity="0.2"/>
      <path d="M12 2L15 9H9L12 2Z" fill="#0284c7"/>
      <circle cx="12" cy="12" r="5" fill="#0284c7"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const startWaypointIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#10b981"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const waypointIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#64748b" width="10" height="10">
      <circle cx="12" cy="12" r="6" fill="#64748b"/>
    </svg>
  `),
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

// Helper Function: Format ISO Date into DD/MM/YYYY, HH:mm:ss format
const formatDateTime = (dateString) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
};

export default function VesselTrackerPage() {
  const [imoNumber, setImoNumber] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedVesselDetails, setSelectedVesselDetails] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Inject Leaflet stylesheet dynamically into head to bypass build loader errors
  useEffect(() => {
    const linkId = 'leaflet-css-cdn';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Step 1: Search ship by IMO Number
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!imoNumber.trim()) {
      setErrorMessage('Please enter a valid IMO number.');
      return;
    }

    setErrorMessage('');
    setSearchResults(null);
    setSelectedVesselDetails(null);
    setSelectedId(null);
    setLoadingSearch(true);

    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/vessels/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imo: imoNumber.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch ship list.');
      }

      if (!result.data || result.data.length === 0) {
        setErrorMessage('No vessels found matching this IMO number.');
      } else {
        setSearchResults(result.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during search.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Step 2: Fetch detailed tracking info & vessel history
  const handleSelectVessel = async (vessel) => {
    setSelectedId(vessel.id);
    setSelectedVesselDetails(null);
    setErrorMessage('');
    setLoadingDetails(true);

    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/vessels/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: vessel.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch vessel details.');
      }

      const vesselData = result.data;

      if (vesselData) {
        const current = vesselData.currentStatus || {};
        const rawHistory = vesselData.history || [];

        // Parse history positions into chronological sequence
        const routeHistory = rawHistory
          .filter((item) => item.latitude != null && item.longitude != null)
          .map((item) => ({
            coordinates: [item.latitude, item.longitude],
            speed: item.speed,
            course: item.course,
            formattedTimestamp: formatDateTime(item.timestamp),
            rawTimestamp: item.timestamp,
          }));

        // Sort by timestamp ASCENDING (Oldest departure point first to newest location last)
        const sortedHistory = [...routeHistory].sort(
          (a, b) => new Date(a.rawTimestamp) - new Date(b.rawTimestamp)
        );

        // Include current position in path line if present
        if (current.lastLat != null && current.lastLng != null) {
          const currentPos = {
            coordinates: [current.lastLat, current.lastLng],
            speed: current.lastSpeed ?? 0,
            course: current.lastCourse ?? 0,
            formattedTimestamp: formatDateTime(current.lastUpdated),
            rawTimestamp: current.lastUpdated,
          };

          const lastHistoryItem = sortedHistory[sortedHistory.length - 1];
          if (
            !lastHistoryItem ||
            lastHistoryItem.coordinates[0] !== current.lastLat ||
            lastHistoryItem.coordinates[1] !== current.lastLng
          ) {
            sortedHistory.push(currentPos);
          }
        }

        setSelectedVesselDetails({
          name: vesselData.shipName || vessel.shipName,
          imo: vesselData.shipImo || vessel.shipImo,
          mmsi: vesselData.shipMMSI || vessel.shipMMSI,
          type: vesselData.shipType || 'Container Ship',
          country: vesselData.country || 'N/A',
          flag: vesselData.flag || 'N/A',
          imageUrl: vesselData.imageUrl || null,
          provider: vesselData.provider || 'vesseltracker.com',
          latitude: current.lastLat,
          longitude: current.lastLng,
          speed: current.lastSpeed ?? 0,
          course: current.lastCourse ?? 0,
          updatedAt: formatDateTime(current.lastUpdated),
          history: sortedHistory,
          startLocation: sortedHistory.length > 0 ? sortedHistory[0] : null,
        });
      } else {
        setErrorMessage('Could not process vessel position data.');
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'An error occurred fetching vessel details.'
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="tracker-container">
      {/* Header */}
      <header className="tracker-header">
        <div className="logo-section">
          <div className="radar-icon-wrapper">
            <span className="radar-icon">📡</span>
          </div>
          <div>
            <h1>
              VESSEL TRACKER <span>LIVE</span>
            </h1>
            <p className="header-subtitle">Vessel Tracking Dashboard</p>
          </div>
        </div>
        <div className="status-indicator">
          <span className="pulse-dot"></span> SYSTEM ONLINE
        </div>
      </header>

      {/* Top Section: Search Panel and Telemetry Cards */}
      <main className="tracker-layout">
        {/* Left Sidebar: Query & Vessel Selection */}
        <aside className="tracker-sidebar">
          <div className="card search-card">
            <h2>Vessel Search</h2>
            <form onSubmit={handleSearch} className="search-form">
              <label htmlFor="imoInput">IMO Number</label>
              <div className="input-group">
                <input
                  id="imoInput"
                  type="text"
                  placeholder="e.g. 961 or 9113745"
                  value={imoNumber}
                  onChange={(e) => setImoNumber(e.target.value)}
                />
                <button type="submit" disabled={loadingSearch}>
                  {loadingSearch ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </div>
            </form>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="card error-card">
              <span className="error-icon">⚠️</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Search Results List with Vertical Scroll Bar */}
          {searchResults && searchResults.length > 0 && (
            <div className="card results-card">
              <h3>Search Results ({searchResults.length})</h3>
              <div
                className="vessel-list"
                style={{ maxHeight: '300px', overflowY: 'auto' }}
              >
                {searchResults.map((vessel) => (
                  <div
                    key={vessel.id}
                    className={`vessel-item ${
                      selectedId === vessel.id ? 'active' : ''
                    }`}
                    onClick={() => handleSelectVessel(vessel)}
                  >
                    <div className="vessel-item-header">
                      <strong>{vessel.shipName}</strong>
                      <span className="flag-badge">
                        {vessel.flag || 'N/A'}
                      </span>
                    </div>
                    <div className="vessel-item-details">
                      <p>
                        <strong>IMO:</strong> {vessel.shipImo}
                      </p>
                      <p>
                        <strong>MMSI:</strong> {vessel.shipMMSI}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Dashboard Area: Telemetry Data */}
        <section className="tracker-display">
          {loadingDetails && (
            <div className="card loading-display">
              <div className="spinner"></div>
              <p>Retrieving Data...</p>
            </div>
          )}

          {!loadingDetails && selectedVesselDetails && (
            <div className="display-grid">
              <div className="card telemetry-card">
                <div className="vessel-profile">
                  {selectedVesselDetails.imageUrl && (
                    <img
                      src={selectedVesselDetails.imageUrl}
                      alt={selectedVesselDetails.name}
                      className="vessel-thumbnail"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  )}
                  <div>
                    <h2>{selectedVesselDetails.name}</h2>
                    <span className="type-tag">
                      {selectedVesselDetails.type}
                    </span>
                  </div>
                </div>

                <div className="data-table">
                  <div className="data-row">
                    <span>Flag State</span>
                    <strong>
                      {selectedVesselDetails.country} (
                      {selectedVesselDetails.flag})
                    </strong>
                  </div>
                  <div className="data-row">
                    <span>IMO / MMSI</span>
                    <strong>
                      {selectedVesselDetails.imo} / {selectedVesselDetails.mmsi}
                    </strong>
                  </div>
                  <div className="data-row">
                    <span>Speed / Course</span>
                    <strong>
                      {selectedVesselDetails.speed} knots /{' '}
                      {selectedVesselDetails.course}°
                    </strong>
                  </div>
                  <div className="data-row">
                    <span>Last Update</span>
                    <strong>{selectedVesselDetails.updatedAt}</strong>
                  </div>
                  <div className="data-row">
                    <span>Current Coordinates</span>
                    <strong>
                      {selectedVesselDetails.latitude}° N, {selectedVesselDetails.longitude}° E
                    </strong>
                  </div>
                  {selectedVesselDetails.startLocation && (
                    <div className="data-row">
                      <span>Start Date</span>
                      <strong>
                        {selectedVesselDetails.startLocation.formattedTimestamp}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loadingDetails && !selectedVesselDetails && (
            <div className="card empty-display">
              <div className="radar-screen">
                <div className="radar-sweep"></div>
              </div>
              <h3>No Vessel Selected</h3>
              <p>
                Enter an IMO Number in the search panel to track live data.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Outer Full-Width Map Section Below Main Box */}
      {!loadingDetails && selectedVesselDetails && (
        <section
          className="fullwidth-map-section"
          style={{ width: '100%', marginTop: '24px' }}
        >
          <div className="card map-card">
            <div className="map-card-header">
              <div>
                <h3>Live Track Map</h3>
                {selectedVesselDetails.startLocation && (
                  <p className="route-subtitle">
                    Started on: <strong>{selectedVesselDetails.startLocation.formattedTimestamp}</strong>
                  </p>
                )}
              </div>
              <span className="map-status-badge">🛰️ Live GPS Track</span>
            </div>

            {selectedVesselDetails.latitude && selectedVesselDetails.longitude ? (
              <div className="map-wrapper" style={{ height: '560px', width: '100%' }}>
                <MapContainer
                  center={[
                    selectedVesselDetails.latitude,
                    selectedVesselDetails.longitude,
                  ]}
                  zoom={7}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Base Route Shadow / Glow Line */}
                  {selectedVesselDetails.history.length > 1 && (
                    <Polyline
                      positions={selectedVesselDetails.history.map(
                        (item) => item.coordinates
                      )}
                      color="#0284c7"
                      weight={8}
                      opacity={0.25}
                    />
                  )}

                  {/* Primary Route Path Line */}
                  {selectedVesselDetails.history.length > 1 && (
                    <Polyline
                      positions={selectedVesselDetails.history.map(
                        (item) => item.coordinates
                      )}
                      color="#0284c7"
                      weight={4}
                      opacity={0.9}
                      dashArray="6, 8"
                    />
                  )}

                  {/* Start / Departure Point Marker */}
                  {selectedVesselDetails.startLocation && (
                    <Marker
                      position={selectedVesselDetails.startLocation.coordinates}
                      icon={startWaypointIcon}
                    >
                      <Popup>
                        <strong>Departure Point</strong>
                        <br />
                        Date: {selectedVesselDetails.startLocation.formattedTimestamp}
                        <br />
                        Speed: {selectedVesselDetails.startLocation.speed} knots
                      </Popup>
                    </Marker>
                  )}

                  {/* Waypoint Markers */}
                  {selectedVesselDetails.history.slice(1, -1).map((item, index) => (
                    <Marker
                      key={`waypoint-${index}`}
                      position={item.coordinates}
                      icon={waypointIcon}
                    >
                      <Popup>
                        <strong>Waypoint #{index + 1}</strong>
                        <br />
                        Date: {item.formattedTimestamp}
                        <br />
                        Speed: {item.speed} knots | Course: {item.course}°
                      </Popup>
                    </Marker>
                  ))}

                  {/* Live Position Marker */}
                  <Marker
                    position={[
                      selectedVesselDetails.latitude,
                      selectedVesselDetails.longitude,
                    ]}
                    icon={vesselIcon}
                  >
                    <Popup>
                      <strong>{selectedVesselDetails.name}</strong>
                      <br />
                      Current Speed: {selectedVesselDetails.speed} knots
                      <br />
                      Course: {selectedVesselDetails.course}°
                      <br />
                      Last Updated: {selectedVesselDetails.updatedAt}
                    </Popup>
                  </Marker>
                </MapContainer>

                <div className="coordinates-overlay">
                  <span>LAT: {selectedVesselDetails.latitude}° N</span>
                  <span className="coord-divider">|</span>
                  <span>LNG: {selectedVesselDetails.longitude}° E</span>
                </div>
              </div>
            ) : (
              <div className="no-map-data">
                <p>No valid coordinates available for mapping.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
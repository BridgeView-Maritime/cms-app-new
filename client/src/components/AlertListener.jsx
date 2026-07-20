// client/src/components/AlertListener.jsx
import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { AUTH_ENDPOINTS } from '../config/api';

export default function AlertListener({ onAlertReceived, onNewZoneReceived }) {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const API_URL = AUTH_ENDPOINTS.REACT_APP_API_URL;
    
    const socket = io(API_URL, {
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join-room', 'fleet-monitors');
    });

    // Event 1: A ship enters an active warning zone
    socket.on('new-maritime-alert', (alertData) => {
      if (onAlertReceived) {
        onAlertReceived(alertData);
      }
    });

    // Event 2: The background scraper registers a new active UKMTO hazard zone
    socket.on('new-maritime-zone-created', (zoneData) => {
      if (onNewZoneReceived) {
        onNewZoneReceived(zoneData);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onAlertReceived, onNewZoneReceived]);

  return null; 
}
// client/src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, SlidersHorizontal, AlertTriangle, ShieldCheck, 
  X, Globe, ChevronDown, Languages, Sun, Moon 
} from 'lucide-react';
import '../styles/Header.css';

// Formats timestamp as DD/MM/YYYY, HH:MM:SS AM/PM
const formatNotificationDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Formats city time in 12-hour format with AM/PM
const formatCityTime = (date, timeZone) => {
  if (!date) return '--:-- --';
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '--:-- --';
  }
};

export default function Header({ currentTime, notifications = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClockMenuOpen, setIsClockMenuOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Default theme is 'day' unless saved in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'day';
  });

  const dropdownRef = useRef(null);
  const clockDropdownRef = useRef(null);
  const translateDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);
  const navigate = useNavigate();

  // Apply Theme attribute to <html> tag for global application across all pages
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    setIsThemeOpen(false);
  };

  // --- GOOGLE TRANSLATE ENGINE INTEGRATION ---
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'hi,en',
            autoDisplay: false
          }, 'google_translate_element');
        }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const triggerLanguageSwitch = (langCode) => {
    setIsTranslateOpen(false);
    const selectElem = document.querySelector('.goog-te-combo');
    if (selectElem) {
      selectElem.value = langCode;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      console.warn("Google Translate widget is initializing. Try again in a second.");
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isClockMenuOpen) setIsClockMenuOpen(false);
    if (isTranslateOpen) setIsTranslateOpen(false);
    if (isThemeOpen) setIsThemeOpen(false);
  };

  const toggleClockMenu = () => {
    setIsClockMenuOpen(!isClockMenuOpen);
    if (isOpen) setIsOpen(false);
    if (isTranslateOpen) setIsTranslateOpen(false);
    if (isThemeOpen) setIsThemeOpen(false);
  };

  const toggleTranslateMenu = () => {
    setIsTranslateOpen(!isTranslateOpen);
    if (isOpen) setIsOpen(false);
    if (isClockMenuOpen) setIsClockMenuOpen(false);
    if (isThemeOpen) setIsThemeOpen(false);
  };

  const toggleThemeMenu = () => {
    setIsThemeOpen(!isThemeOpen);
    if (isOpen) setIsOpen(false);
    if (isClockMenuOpen) setIsClockMenuOpen(false);
    if (isTranslateOpen) setIsTranslateOpen(false);
  };

  const handleNotificationClick = () => {
    setIsOpen(false);
    navigate('/dashboard/my-history');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (clockDropdownRef.current && !clockDropdownRef.current.contains(event.target)) {
        setIsClockMenuOpen(false);
      }
      if (translateDropdownRef.current && !translateDropdownRef.current.contains(event.target)) {
        setIsTranslateOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setIsThemeOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const cityTimes = [
    { label: 'Kolkata', timeZone: 'Asia/Kolkata' },
    { label: 'Dubai', timeZone: 'Asia/Dubai' },
    { label: 'Riyadh', timeZone: 'Asia/Riyadh' },
    { label: 'London', timeZone: 'Europe/London' }
  ];

  const primaryDate = currentTime ? new Date(currentTime) : new Date();

  return (
    <header className="mac-os-status-bar">
      {/* Hidden Native Google Element Container */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>

      <div className="status-bar-left">
        <span className="apple-logo-icon"></span>
        <span className="app-focused-title">Bridgeview</span>
      </div>

      <div className="status-bar-right">
        {/* Day / Night Theme Selector */}
        <div ref={themeDropdownRef} className="notification-trigger-wrapper">
          <button
            type="button"
            onClick={toggleThemeMenu}
            className={`status-bar-btn ${isThemeOpen ? 'active-panel-trigger' : ''}`}
            aria-label="Theme Toggle"
            title={`Current Theme: ${theme.toUpperCase()}`}
          >
            {theme === 'night' ? (
              <Moon size={14} className="status-bar-icon" />
            ) : (
              <Sun size={14} className="status-bar-icon" />
            )}
          </button>

          {isThemeOpen && (
            <div className="clock-overlay-dropdown" style={{ minWidth: '130px' }}>
              <div className="clock-dropdown-header">Display Theme</div>
              <div className="clock-dropdown-list">
                <div 
                  className={`clock-dropdown-row ${theme === 'day' ? 'theme-active' : ''}`}
                  onClick={() => handleThemeChange('day')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="row-city-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sun size={13} /> Day
                  </span>
                  <span className="row-city-time">{theme === 'day' ? '✓' : ''}</span>
                </div>

                <div 
                  className={`clock-dropdown-row ${theme === 'night' ? 'theme-active' : ''}`}
                  onClick={() => handleThemeChange('night')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="row-city-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Moon size={13} /> Night
                  </span>
                  <span className="row-city-time">{theme === 'night' ? '✓' : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page Language Translator Menu */}
        <div ref={translateDropdownRef} className="notification-trigger-wrapper">
          <button
            type="button"
            onClick={toggleTranslateMenu}
            className={`status-bar-btn ${isTranslateOpen ? 'active-panel-trigger' : ''}`}
            aria-label="Translate Language"
            title="Translate Page"
          >
            <Languages size={14} className="status-bar-icon" />
          </button>

          {isTranslateOpen && (
            <div className="clock-overlay-dropdown" style={{ minWidth: '150px' }}>
              <div className="clock-dropdown-header">Page Language</div>
              <div className="clock-dropdown-list">
                <div 
                  className="clock-dropdown-row" 
                  onClick={() => triggerLanguageSwitch('en')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="row-city-name">English</span>
                  <span className="row-city-time">EN</span>
                </div>
                <div 
                  className="clock-dropdown-row" 
                  onClick={() => triggerLanguageSwitch('hi')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="row-city-name">हिन्दी (Hindi)</span>
                  <span className="row-city-time">HI</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Icon */}
        <button type="button" className="status-icon-btn" aria-label="Search">
          <Search size={14} className="status-bar-icon" />
        </button>

        {/* Notifications Dropdown */}
        <div ref={dropdownRef} className="notification-trigger-wrapper">
          <button
            type="button"
            onClick={toggleDropdown}
            className={`status-bar-btn ${isOpen ? 'active-panel-trigger' : ''}`}
            aria-label="Notifications"
          >
            <Bell size={14} className="status-bar-icon" />
            {unreadNotifications.length > 0 && (
              <span className="notification-ping-badge" />
            )}
          </button>

          {isOpen && (
            <div className="notification-overlay-dropdown">
              <div className="dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3>Notifications</h3>
                  <span className="count-tag">{unreadNotifications.length} Unread</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="dropdown-close-btn"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="dropdown-body-scroll">
                {unreadNotifications.length === 0 ? (
                  <div className="empty-notification-state">
                    <ShieldCheck size={20} color="#10b981" />
                    <p>No new notification dispatches or unread updates.</p>
                  </div>
                ) : (
                  unreadNotifications.map((item, index) => {
                    const title = item.notificationId?.title || item.title || 'System Alert';
                    const message = item.notificationId?.message || item.message || '';
                    const time = item.notificationId?.createdAt || item.createdAt || null;

                    return (
                      <div
                        key={item._id || index}
                        className="notification-item-card risk-high"
                        onClick={handleNotificationClick}
                      >
                        <div className="item-title-row">
                          <AlertTriangle size={14} className="risk-alert-icon" />
                          <h4>{title}</h4>
                        </div>
                        <p className="item-message-details">{message}</p>

                        {item.notificationId?.attachments?.length > 0 && (
                          <div className="item-attachment-tag">
                            📎 Has Attachments ({item.notificationId.attachments.length})
                          </div>
                        )}

                        <span className="item-timestamp">
                          {formatNotificationDate(time)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sliders Icon */}
        <button type="button" className="status-icon-btn" aria-label="Settings">
          <SlidersHorizontal size={14} className="status-bar-icon" />
        </button>

        {/* Multi-City Clocks Bar (Desktop View) */}
        <div className="multi-city-clock-bar">
          {cityTimes.map((city) => (
            <div key={city.label} className="city-clock-item">
              <span className="city-label">{city.label}:</span>
              <span className="city-time">{formatCityTime(primaryDate, city.timeZone)}</span>
            </div>
          ))}
        </div>

        {/* Multi-City Clocks Dropdown (Mobile / Tablet View) */}
        <div ref={clockDropdownRef} className="mobile-clock-trigger-wrapper">
          <button
            type="button"
            className={`mobile-clock-pill-btn ${isClockMenuOpen ? 'active' : ''}`}
            onClick={toggleClockMenu}
          >
            <Globe size={13} />
            <span>Kolkata {formatCityTime(primaryDate, 'Asia/Kolkata')}</span>
            <ChevronDown size={12} className={`clock-arrow ${isClockMenuOpen ? 'open' : ''}`} />
          </button>

          {isClockMenuOpen && (
            <div className="clock-overlay-dropdown">
              <div className="clock-dropdown-header">World Time Clocks</div>
              <div className="clock-dropdown-list">
                {cityTimes.map((city) => (
                  <div key={city.label} className="clock-dropdown-row">
                    <span className="row-city-name">{city.label}</span>
                    <span className="row-city-time">{formatCityTime(primaryDate, city.timeZone)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
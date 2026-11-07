import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Mail, 
  Share2, 
  Copy, 
  CheckCircle, 
  ShieldAlert, 
  ExternalLink, 
  RotateCw, 
  User, 
  Clock, 
  Compass, 
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  Send,
  BatteryCharging,
  Battery,
  Layers,
  StopCircle,
  Check,
  Eye,
  Info
} from 'lucide-react';
import GpsMap from './GpsMap';

export default function WalkWithMe({ 
  currentUser = null, 
  walkWithMeCoords = { x: 750, y: 180 }, 
  CAMPUS_LOCATIONS = {},
  onBackToHome = null,
  isEmbedded = false
}) {
  // Check if viewing someone else's live walk via URL query code
  const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
  const viewerCode = urlParams.get('code') || urlParams.get('walk');

  // Walker information (no account needed!)
  const [walkerName, setWalkerName] = useState(() => {
    return currentUser?.name || currentUser?.fullName || localStorage.getItem('fulalert_walk_name') || 'FUL Student';
  });
  const [phoneRecipient, setPhoneRecipient] = useState(() => {
    return localStorage.getItem('fulalert_walk_phone') || '';
  });
  const [emailRecipient, setEmailRecipient] = useState(() => {
    return localStorage.getItem('fulalert_walk_email') || '';
  });
  const [comment, setComment] = useState('Walking back to hostel from library');
  const [selectedDuration, setSelectedDuration] = useState(60); // 15, 60, 480 minutes (WhatsApp standard)

  // Active Walk State
  const [isEscortActive, setIsEscortActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState('');
  const [sessionCode] = useState(() => viewerCode || ('WALK-' + Math.floor(100000 + Math.random() * 900000)));

  // Phone Battery Percentage (WhatsApp shows battery level so friends know if phone is low!)
  const [batteryLevel, setBatteryLevel] = useState(85);

  // Hardware GPS state
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(8);
  const watchIdRef = useRef(null);

  // Map display settings
  const [mapStyle, setMapStyle] = useState('google'); // 'google' or 'satellite'

  // Coordinates calculation (Federal University Lokoja campus default)
  const baseLat = 9.0880;
  const baseLon = 7.5340;
  const currentLat = deviceCoords?.lat ?? (baseLat + (walkWithMeCoords?.y || 180) / 10000);
  const currentLon = deviceCoords?.lon ?? (baseLon + (walkWithMeCoords?.x || 750) / 10000);

  // Google Maps URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${currentLat.toFixed(5)},${currentLon.toFixed(5)}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentLat.toFixed(5)},${currentLon.toFixed(5)}`;
  const inAppTrackingUrl = `${window.location.origin}/#/walk?code=${sessionCode}`;

  // Read actual phone battery if supported by browser
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(batt => {
        setBatteryLevel(Math.round(batt.level * 100));
        batt.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(batt.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Hardware GPS Watcher
  useEffect(() => {
    if (useDeviceGps && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setDeviceCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          });
          setGpsAccuracy(Math.round(pos.coords.accuracy));
        },
        (err) => {
          console.warn('Hardware GPS Error:', err.message);
          setUseDeviceGps(false);
        },
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
      watchIdRef.current = id;
    } else {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [useDeviceGps]);

  // Duration countdown timer when live sharing is active
  useEffect(() => {
    let timer;
    if (isEscortActive) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= selectedDuration * 60) {
            clearInterval(timer);
            setIsEscortActive(false);
            showNotification('⏰ Live location sharing expired.');
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isEscortActive, selectedDuration]);

  // Formatted Time Remaining
  const remainingSeconds = Math.max(0, (selectedDuration * 60) - elapsedSeconds);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;
  const timeRemainingStr = `${remainingMinutes}m ${remainingSecs.toString().padStart(2, '0')}s remaining`;

  // Calculated expiration time
  const expiryDate = new Date(Date.now() + remainingSeconds * 1000);
  const expiryTimeStr = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Initials for avatar
  const getInitials = (name) => {
    if (!name) return 'ME';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Build WhatsApp formatted message
  const buildWhatsAppMessage = (isArrival = false) => {
    if (isArrival) {
      return (
`✅ *FULALERT - Safe Arrival Confirmation*
*Walker:* ${walkerName}
*Status:* I have arrived safely at my destination on campus!
*Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Thank you for watching over me! 🙏`
      );
    }

    return (
`📍 *LIVE LOCATION SHARE - FULALERT*
👤 *Walker:* ${walkerName}
💬 *Note:* "${comment}"
⏳ *Live for:* ${selectedDuration >= 60 ? (selectedDuration / 60) + ' hour(s)' : selectedDuration + ' minutes'} (until ${expiryTimeStr})
🔋 *Battery:* ${batteryLevel}%

🗺️ *Click to Open in Google Maps:*
${googleMapsUrl}

🌐 *GPS Coordinates:*
${currentLat.toFixed(5)}° N, ${currentLon.toFixed(5)}° E
(Federal University Lokoja Campus)

📱 *Live Campus Tracker Web Link:*
${inAppTrackingUrl}`
    );
  };

  // Helper to sanitize phone for WhatsApp / SMS
  const cleanPhoneNumber = (phone) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  const getWhatsAppNumber = (phone) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '234' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Dispatch Actions
  const handleSendWhatsApp = (isArrival = false) => {
    const text = buildWhatsAppMessage(isArrival);
    const waPhone = getWhatsAppNumber(phoneRecipient);
    
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const encoded = encodeURIComponent(text);
    const waUrl = waPhone 
      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
    showNotification('💬 Opening WhatsApp live location share...');
  };

  const handleSendSms = (isArrival = false) => {
    const text = buildWhatsAppMessage(isArrival);
    const phone = cleanPhoneNumber(phoneRecipient);
    
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const encoded = encodeURIComponent(text);
    const smsUrl = phone ? `sms:${phone}?body=${encoded}` : `sms:?body=${encoded}`;
    window.open(smsUrl, '_blank');
    showNotification('📱 Opening SMS messenger...');
  };

  const handleSendEmail = (isArrival = false) => {
    const subject = isArrival 
      ? `✅ FULALERT: ${walkerName} Arrived Safely`
      : `📍 FULALERT Live Location Share - ${walkerName}`;
    const text = buildWhatsAppMessage(isArrival);
    
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const mailtoUrl = `mailto:${emailRecipient.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(mailtoUrl, '_blank');
    showNotification('✉️ Opening Email app...');
  };

  const handleCopyDetails = () => {
    const text = buildWhatsAppMessage(false);
    navigator.clipboard?.writeText(text);
    showNotification('📋 WhatsApp location & Google Map link copied!');
  };

  const showNotification = (msg) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(''), 3500);
  };

  // Start Sharing
  const handleStartShare = () => {
    if (!phoneRecipient && !emailRecipient) {
      alert('⚠️ Please enter a phone number or email address so your contact receives the link!');
      return;
    }
    
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);

    setIsEscortActive(true);

    // Auto-prompt WhatsApp or SMS directly
    if (phoneRecipient) {
      handleSendWhatsApp();
    } else if (emailRecipient) {
      handleSendEmail();
    }
  };

  // Stop Sharing
  const handleStopShare = () => {
    if (window.confirm('Stop sharing live location? Send safe arrival message to your contact?')) {
      if (phoneRecipient) {
        handleSendWhatsApp(true);
      } else if (emailRecipient) {
        handleSendEmail(true);
      }
    }
    setIsEscortActive(false);
  };

  return (
    <div style={{
      maxWidth: isEmbedded ? '100%' : '520px',
      margin: isEmbedded ? '0' : '0 auto',
      background: '#111b21', // Authentic WhatsApp dark mode background
      color: '#e9edef',
      borderRadius: isEmbedded ? '0' : '20px',
      overflow: 'hidden',
      border: isEmbedded ? 'none' : '1px solid #202c33',
      boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: isEmbedded ? '600px' : '720px',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>

      {/* 1. WHATSAPP TOP APP BAR */}
      <div style={{
        background: '#202c33',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aebac1',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* User Avatar Circle */}
          <div style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#00a884',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            {getInitials(walkerName)}
            {isEscortActive && (
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#25d366',
                border: '2px solid #202c33'
              }}></span>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Share Live Location</span>
              <span style={{ 
                fontSize: '0.62rem', 
                background: '#00a884', 
                color: '#fff', 
                padding: '1px 6px', 
                borderRadius: '8px', 
                fontWeight: 800 
              }}>
                WhatsApp Mode
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8696a0' }}>
              {isEscortActive ? `Live until ${expiryTimeStr}` : 'No account needed • Instant GPS'}
            </div>
          </div>
        </div>

        {/* Battery and GPS Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#8696a0' }}>
            <Battery size={15} style={{ color: batteryLevel < 20 ? '#ef4444' : '#25d366' }} />
            <span>{batteryLevel}%</span>
          </div>

          <button
            onClick={() => setUseDeviceGps(prev => !prev)}
            style={{
              background: useDeviceGps ? '#00a884' : '#111b21',
              border: useDeviceGps ? '1px solid #25d366' : '1px solid #374248',
              color: '#fff',
              borderRadius: '20px',
              padding: '4px 8px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Toggle Phone GPS"
          >
            <Compass size={12} />
            <span>{useDeviceGps ? 'GPS On' : 'Use GPS'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {copiedNotification && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '16px',
          right: '16px',
          background: '#00a884',
          color: '#fff',
          padding: '9px 14px',
          borderRadius: '10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <CheckCircle size={16} />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* 2. FULL-SCREEN INTERACTIVE MAP (WHATSAPP RADAR BEACON) */}
      <div style={{ position: 'relative', flex: 1, minHeight: '300px' }}>
        <GpsMap 
          lat={currentLat} 
          lon={currentLon}
          zoom={17}
          height="100%"
          showUserMarker={true}
          showBreadcrumbTrail={true}
          userMarkerColor="#25d366" // WhatsApp green marker
          userMarkerInitials={getInitials(walkerName)}
          onLocationUpdate={(lat, lon) => {
            setDeviceCoords({ lat, lon });
          }}
        />

        {/* Floating Top Radar Status Bar */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 500,
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(17, 27, 33, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(134, 150, 160, 0.2)',
            borderRadius: '20px',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#e9edef',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'auto'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#25d366',
              boxShadow: '0 0 8px #25d366',
              animation: 'leaflet-pulse 1.4s infinite'
            }}></span>
            <span>{isEscortActive ? 'Live Location Active' : 'Ready to Share'}</span>
            <span style={{ color: '#8696a0' }}>•</span>
            <span style={{ color: '#8696a0' }}>Accurate to {gpsAccuracy}m</span>
          </div>

          {/* Google Maps External Link Pill */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#2563eb',
              color: '#fff',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              pointerEvents: 'auto'
            }}
          >
            <span>Google Maps</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* 3. WHATSAPP BOTTOM SHEET DRAWER */}
      <div style={{
        background: '#202c33', // WhatsApp dark bottom tray
        borderTop: '1px solid rgba(134, 150, 160, 0.15)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 20
      }}>

        {!isEscortActive ? (
          /* ========================================= */
          /* SETUP STATE: SELECT DURATION & ADD NOTE   */
          /* ========================================= */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#aebac1' }}>
                SHARE LIVE LOCATION FOR:
              </span>
              <span style={{ fontSize: '0.68rem', color: '#8696a0' }}>
                No account required
              </span>
            </div>

            {/* WhatsApp Standard Duration Pills: 15m, 1h, 8h */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: '15 minutes', value: 15 },
                { label: '1 hour', value: 60 },
                { label: '8 hours', value: 480 }
              ].map(d => {
                const isSelected = selectedDuration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDuration(d.value)}
                    style={{
                      background: isSelected ? '#00a884' : '#111b21',
                      border: isSelected ? '1.5px solid #25d366' : '1px solid #374248',
                      color: isSelected ? '#fff' : '#aebac1',
                      padding: '9px 6px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>

            {/* WhatsApp "Add comment..." input */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#111b21', borderRadius: '12px', border: '1px solid #374248', padding: '4px 10px' }}>
              <input 
                type="text"
                placeholder="Add comment (e.g. Walking home from library)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e9edef',
                  fontSize: '0.82rem',
                  padding: '8px 4px',
                  flex: 1
                }}
              />
            </div>

            {/* Contact Phone & Email inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#8696a0', marginBottom: '3px', display: 'block' }}>
                  Trusted Phone (SMS/WhatsApp):
                </label>
                <input 
                  type="tel"
                  placeholder="0803 123 4567"
                  value={phoneRecipient}
                  onChange={(e) => setPhoneRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#111b21',
                    border: '1px solid #374248',
                    borderRadius: '10px',
                    color: '#e9edef',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: '#8696a0', marginBottom: '3px', display: 'block' }}>
                  Trusted Email:
                </label>
                <input 
                  type="email"
                  placeholder="parent@gmail.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#111b21',
                    border: '1px solid #374248',
                    borderRadius: '10px',
                    color: '#e9edef',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* WhatsApp Big Green Share Button */}
            <button
              onClick={handleStartShare}
              style={{
                background: '#00a884',
                color: '#111b21',
                border: 'none',
                padding: '13px',
                borderRadius: '14px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)'
              }}
            >
              <Send size={18} />
              <span>Share Live Location</span>
            </button>

            {/* Direct Quick-Send Channels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              <button 
                onClick={() => handleSendWhatsApp()}
                style={{
                  background: '#128c7e',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '7px 4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </button>

              <button 
                onClick={() => handleSendSms()}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '7px 4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Send size={13} />
                <span>SMS</span>
              </button>

              <button 
                onClick={() => handleSendEmail()}
                style={{
                  background: '#ea580c',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '7px 4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Mail size={13} />
                <span>Email</span>
              </button>

              <button 
                onClick={handleCopyDetails}
                style={{
                  background: '#111b21',
                  border: '1px solid #374248',
                  color: '#aebac1',
                  borderRadius: '10px',
                  padding: '7px 4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Copy size={13} />
                <span>Copy Link</span>
              </button>
            </div>
          </>
        ) : (
          /* ========================================= */
          /* ACTIVE SHARING STATE (WHATSAPP LIVE HUD) */
          /* ========================================= */
          <>
            {/* User Live Beacon Summary */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#111b21',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 168, 132, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#00a884',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {getInitials(walkerName)}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e9edef' }}>
                    You are sharing live location
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#25d366', fontWeight: 600 }}>
                    {timeRemainingStr} (until {expiryTimeStr})
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#8696a0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: '#25d366' }}>
                  <Battery size={14} />
                  <span>{batteryLevel}%</span>
                </div>
                <div>Live Sat GPS</div>
              </div>
            </div>

            {/* Comment Note display */}
            {comment && (
              <div style={{ fontSize: '0.75rem', color: '#aebac1', fontStyle: 'italic', padding: '0 4px' }}>
                💬 "{comment}"
              </div>
            )}

            {/* Update / Resend Location Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: '#8696a0' }}>
                Resend updated location to contact:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <button 
                  onClick={() => handleSendWhatsApp()}
                  style={{
                    background: '#128c7e',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </button>

                <button 
                  onClick={() => handleSendSms()}
                  style={{
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Send size={13} />
                  <span>SMS</span>
                </button>

                <button 
                  onClick={() => handleSendEmail()}
                  style={{
                    background: '#ea580c',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>

                <button 
                  onClick={handleCopyDetails}
                  style={{
                    background: '#111b21',
                    border: '1px solid #374248',
                    color: '#aebac1',
                    borderRadius: '8px',
                    padding: '7px 4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Red "Stop Sharing" Button */}
            <button
              onClick={handleStopShare}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ea4335',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.4)'
              }}
            >
              <StopCircle size={18} />
              <span>Stop Sharing</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Mail, 
  Copy, 
  CheckCircle, 
  ShieldAlert, 
  ExternalLink, 
  Clock, 
  Compass, 
  ArrowLeft,
  MessageSquare,
  Send,
  Battery,
  StopCircle,
  Check,
  ShieldCheck,
  Share2
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
  const [destination, setDestination] = useState('Hostel Block B');
  const [comment, setComment] = useState('Walking back from library / lecture hall');
  const [selectedDuration, setSelectedDuration] = useState(60); // 15, 60, 480 minutes

  // Active Walk State
  const [isEscortActive, setIsEscortActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState('');
  const [sessionCode] = useState(() => viewerCode || ('WALK-' + Math.floor(100000 + Math.random() * 900000)));

  // Phone Battery Percentage
  const [batteryLevel, setBatteryLevel] = useState(85);

  // Hardware GPS state
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(6);
  const watchIdRef = useRef(null);

  // Coordinates calculation (Federal University Lokoja campus default)
  const baseLat = 9.0880;
  const baseLon = 7.5340;
  const currentLat = deviceCoords?.lat ?? (baseLat + (walkWithMeCoords?.y || 180) / 10000);
  const currentLon = deviceCoords?.lon ?? (baseLon + (walkWithMeCoords?.x || 750) / 10000);

  // Google Maps URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${currentLat.toFixed(5)},${currentLon.toFixed(5)}`;
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
            showNotification('⏰ Live location sharing ended.');
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
  const timeRemainingStr = `${remainingMinutes}m ${remainingSecs.toString().padStart(2, '0')}s left`;

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

  // Build clean dispatch text
  const buildLocationMessage = (isArrival = false) => {
    if (isArrival) {
      return (
`✅ *FULALERT - Safe Arrival Confirmed*
👤 *Walker:* ${walkerName}
📍 *Destination:* ${destination}
🕒 *Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
I have arrived safely at my destination on campus. Thank you for walking with me! 🙏`
      );
    }

    return (
`🚨 *FULALERT - Walk With Me Live Escort*
👤 *Walker:* ${walkerName}
📍 *Destination:* ${destination}
💬 *Note:* "${comment}"
⏳ *Active for:* ${selectedDuration >= 60 ? (selectedDuration / 60) + ' hr(s)' : selectedDuration + ' mins'} (until ${expiryTimeStr})
🔋 *Battery:* ${batteryLevel}%

🗺️ *Live Google Maps Location:*
${googleMapsUrl}

🌐 *GPS Coordinates:*
${currentLat.toFixed(5)}° N, ${currentLon.toFixed(5)}° E
(Federal University Lokoja Main Campus)

📱 *Direct Live Campus Tracker:*
${inAppTrackingUrl}`
    );
  };

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
    const text = buildLocationMessage(isArrival);
    const waPhone = getWhatsAppNumber(phoneRecipient);
    
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const encoded = encodeURIComponent(text);
    const waUrl = waPhone 
      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
    showNotification('💬 Opening WhatsApp location share...');
  };

  const handleSendSms = (isArrival = false) => {
    const text = buildLocationMessage(isArrival);
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
      : `📍 FULALERT Live Location Escort - ${walkerName}`;
    const text = buildLocationMessage(isArrival);
    
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const mailtoUrl = `mailto:${emailRecipient.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(mailtoUrl, '_blank');
    showNotification('✉️ Opening Email app...');
  };

  const handleShareAnywhere = async () => {
    const text = buildLocationMessage(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FULALERT Walk With Me - ${walkerName}`,
          text: text,
          url: googleMapsUrl
        });
        showNotification('✅ Location shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyDetails();
      }
    } else {
      handleCopyDetails();
    }
  };

  const handleCopyDetails = () => {
    const text = buildLocationMessage(false);
    navigator.clipboard?.writeText(text);
    showNotification('📋 Live coordinates & Google Maps link copied!');
  };

  const showNotification = (msg) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(''), 3500);
  };

  // Start Sharing
  const handleStartShare = () => {
    if (!phoneRecipient && !emailRecipient) {
      alert('⚠️ Please enter a phone number or email address to receive your live location!');
      return;
    }
    
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);

    setIsEscortActive(true);

    if (phoneRecipient) {
      handleSendWhatsApp();
    } else if (emailRecipient) {
      handleSendEmail();
    }
  };

  // Stop Sharing
  const handleStopShare = () => {
    if (window.confirm('Have you arrived safely? Send safe arrival notification to your contact?')) {
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
      maxWidth: isEmbedded ? '100%' : '600px',
      margin: isEmbedded ? '0' : '0 auto',
      background: 'var(--bg-secondary)',
      color: '#fff',
      borderRadius: isEmbedded ? '0' : '24px',
      overflow: 'hidden',
      border: isEmbedded ? 'none' : '1px solid var(--border-color)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: isEmbedded ? '600px' : '720px',
      position: 'relative'
    }}>

      {/* 1. TOP APP BAR */}
      <div style={{
        background: 'var(--bg-tertiary)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <ArrowLeft size={16} /> Home
            </button>
          )}

          {/* User Avatar Circle */}
          <div style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #006837 0%, #10b981 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.82rem',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            {getInitials(walkerName)}
            {isEscortActive && (
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid var(--bg-tertiary)'
              }}></span>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Walk With Me</span>
              <span style={{ 
                fontSize: '0.62rem', 
                background: 'rgba(16, 185, 129, 0.2)', 
                color: '#10b981', 
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '1px 6px', 
                borderRadius: '6px', 
                fontWeight: 800 
              }}>
                Open Access
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {isEscortActive ? `Live until ${expiryTimeStr} (${timeRemainingStr})` : 'Live GPS Escort • No login required'}
            </div>
          </div>
        </div>

        {/* Battery and GPS Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <Battery size={15} style={{ color: batteryLevel < 20 ? '#ef4444' : '#10b981' }} />
            <span>{batteryLevel}%</span>
          </div>

          <button
            onClick={() => setUseDeviceGps(prev => !prev)}
            style={{
              background: useDeviceGps ? '#006837' : 'rgba(255,255,255,0.06)',
              border: useDeviceGps ? '1px solid #10b981' : '1px solid var(--border-color)',
              color: '#fff',
              borderRadius: '16px',
              padding: '4px 8px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Compass size={12} />
            <span>{useDeviceGps ? 'GPS On' : 'Device GPS'}</span>
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
          background: '#006837',
          color: '#fff',
          padding: '9px 14px',
          borderRadius: '10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <CheckCircle size={16} />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* 2. FULL-SCREEN INTERACTIVE MAP */}
      <div style={{ position: 'relative', flex: 1, minHeight: '300px' }}>
        <GpsMap 
          lat={currentLat} 
          lon={currentLon}
          zoom={17}
          height="100%"
          showUserMarker={true}
          showBreadcrumbTrail={true}
          userMarkerColor="#10b981"
          userMarkerInitials={getInitials(walkerName)}
          onLocationUpdate={(lat, lon) => {
            setDeviceCoords({ lat, lon });
          }}
        />

        {/* Floating Status Bar */}
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
            background: 'rgba(14, 21, 17, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'auto'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              animation: 'leaflet-pulse 1.4s infinite'
            }}></span>
            <span>{isEscortActive ? 'Live Telemetry Active' : 'Ready to Escort'}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>Accurate to {gpsAccuracy}m</span>
          </div>

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

      {/* 3. MODERN BOTTOM CONTROL TRAY */}
      <div style={{
        background: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border-color)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 20
      }}>

        {!isEscortActive ? (
          /* ========================================= */
          /* SETUP STATE: SELECT DURATION & DETAILS    */
          /* ========================================= */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-gold)', letterSpacing: '0.04em' }}>
                ESCORT DURATION:
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Share live path with trusted contact
              </span>
            </div>

            {/* Standard Duration Selection: 15m, 1h, 8h */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: '15 mins', value: 15 },
                { label: '1 hour', value: 60 },
                { label: '8 hours', value: 480 }
              ].map(d => {
                const isSelected = selectedDuration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDuration(d.value)}
                    style={{
                      background: isSelected ? 'rgba(0, 104, 55, 0.4)' : 'var(--bg-secondary)',
                      border: isSelected ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      padding: '8px 6px',
                      borderRadius: '10px',
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
                    {isSelected && <Check size={14} style={{ color: '#10b981' }} />}
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Destination / Activity note */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                  Destination:
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Hostel Block B"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                  Walker Name (Optional):
                </label>
                <input 
                  type="text"
                  placeholder="Your Name / Nickname"
                  value={walkerName}
                  onChange={(e) => setWalkerName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Contact Phone & Email inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                  Trusted Phone (SMS / WhatsApp):
                </label>
                <input 
                  type="tel"
                  placeholder="0803 123 4567"
                  value={phoneRecipient}
                  onChange={(e) => setPhoneRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                  Trusted Email:
                </label>
                <input 
                  type="email"
                  placeholder="guardian@gmail.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Big Green Start Button */}
            <button
              onClick={handleStartShare}
              style={{
                background: 'linear-gradient(135deg, #006837 0%, #064e3b 100%)',
                color: '#fff',
                border: '1px solid #10b981',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 104, 55, 0.4)'
              }}
            >
              <Navigation size={18} />
              <span>Start Live Companion Escort</span>
            </button>

            {/* Direct 1-Tap Share Channels */}
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
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
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
                <span>Copy Link</span>
              </button>
            </div>
          </>
        ) : (
          /* ========================================= */
          /* ACTIVE SHARING STATE (LIVE ESCORT HUD)   */
          /* ========================================= */
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-secondary)',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #006837 0%, #10b981 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.82rem'
                }}>
                  {getInitials(walkerName)}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                    Live Companion Escort Active
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                    {timeRemainingStr} (until {expiryTimeStr})
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: '#10b981' }}>
                  <Battery size={14} />
                  <span>{batteryLevel}%</span>
                </div>
                <div>Walking to {destination}</div>
              </div>
            </div>

            {/* Resend updated location buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Resend live coordinates to contact:
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
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
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

            {/* End Escort & Arrived Safely */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={handleStopShare}
                style={{
                  padding: '11px',
                  background: 'linear-gradient(135deg, #006837 0%, #064e3b 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={15} />
                <span>Arrived Safely</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Cancel and stop sharing live location?')) {
                    setIsEscortActive(false);
                  }
                }}
                style={{
                  padding: '11px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <StopCircle size={15} />
                <span>Stop Sharing</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

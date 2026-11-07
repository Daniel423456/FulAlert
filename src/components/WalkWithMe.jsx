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
  Send
} from 'lucide-react';
import GpsMap from './GpsMap';

export default function WalkWithMe({ 
  currentUser = null, 
  walkWithMeCoords = { x: 750, y: 180 }, 
  CAMPUS_LOCATIONS = {},
  onBackToHome = null,
  isEmbedded = false
}) {
  // Walker information (no account needed!)
  const [walkerName, setWalkerName] = useState(() => {
    return currentUser?.name || currentUser?.fullName || localStorage.getItem('fulalert_walk_name') || '';
  });
  const [phoneRecipient, setPhoneRecipient] = useState(() => {
    return localStorage.getItem('fulalert_walk_phone') || '';
  });
  const [emailRecipient, setEmailRecipient] = useState(() => {
    return localStorage.getItem('fulalert_walk_email') || '';
  });
  const [destination, setDestination] = useState('Hostel Block B');
  const [customDestination, setCustomDestination] = useState('');

  // Active Walk State
  const [isEscortActive, setIsEscortActive] = useState(false);
  const [walkDuration, setWalkDuration] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState('');
  const [sessionCode] = useState(() => 'WALK-' + Math.floor(100000 + Math.random() * 900000));

  // Hardware GPS state
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  // Compute active Latitude and Longitude
  // Default to Federal University Lokoja campus coordinates
  const baseLat = 9.0880;
  const baseLon = 7.5340;
  
  const currentLat = deviceCoords?.lat ?? (baseLat + (walkWithMeCoords?.y || 180) / 10000);
  const currentLon = deviceCoords?.lon ?? (baseLon + (walkWithMeCoords?.x || 750) / 10000);

  // Google Maps URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${currentLat.toFixed(5)},${currentLon.toFixed(5)}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentLat.toFixed(5)},${currentLon.toFixed(5)}`;
  const inAppTrackingUrl = `${window.location.origin}/#/walk?code=${sessionCode}`;

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

  // Duration timer when active
  useEffect(() => {
    let timer;
    if (isEscortActive) {
      timer = setInterval(() => {
        setWalkDuration(prev => prev + 1);
      }, 1000);
    } else {
      setWalkDuration(0);
    }
    return () => clearInterval(timer);
  }, [isEscortActive]);

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Build clean message templates
  const effectiveWalkerName = walkerName.trim() || 'FUL Student';
  const effectiveDestination = customDestination.trim() || destination;

  const buildSafetyMessage = () => {
    return (
`🚨 FULALERT - Walk With Me Safety Tracking
Walker: ${effectiveWalkerName}
Destination: ${effectiveDestination}
I am walking on campus and sharing my live location with you.

📍 Google Maps Link:
${googleMapsUrl}

🌐 Coordinates:
Latitude: ${currentLat.toFixed(5)}° N
Longitude: ${currentLon.toFixed(5)}° E
(Federal University Lokoja Campus)

🔗 Live In-App Tracker:
${inAppTrackingUrl}
Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  };

  const buildArrivalMessage = () => {
    return (
`✅ FULALERT: I have arrived safely at ${effectiveDestination}!
Walker: ${effectiveWalkerName}
Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Thank you for watching over my walk.`
    );
  };

  // Helper to sanitize phone for SMS / WhatsApp
  const cleanPhoneNumber = (phone) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  const getWhatsAppNumber = (phone) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    // If Nigerian number starting with 0, convert to 234
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '234' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Dispatch Actions
  const handleSendSms = (isArrival = false) => {
    const text = isArrival ? buildArrivalMessage() : buildSafetyMessage();
    const phone = cleanPhoneNumber(phoneRecipient);
    
    // Save to local storage for quick access next time
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const encoded = encodeURIComponent(text);
    // iOS and Android SMS URI format
    const smsUrl = phone ? `sms:${phone}?body=${encoded}` : `sms:?body=${encoded}`;
    window.open(smsUrl, '_blank');
    showNotification('📱 Opening SMS messaging app...');
  };

  const handleSendWhatsApp = (isArrival = false) => {
    const text = isArrival ? buildArrivalMessage() : buildSafetyMessage();
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

  const handleSendEmail = (isArrival = false) => {
    const subject = isArrival 
      ? `✅ FULALERT: ${effectiveWalkerName} Arrived Safely`
      : `🚨 FULALERT: Live Campus Walk Location - ${effectiveWalkerName}`;
    const text = isArrival ? buildArrivalMessage() : buildSafetyMessage();
    
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);

    const mailtoUrl = `mailto:${emailRecipient.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(mailtoUrl, '_blank');
    showNotification('✉️ Opening Email client...');
  };

  const handleNativeShare = async () => {
    const text = buildSafetyMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FULALERT Walk With Me - ${effectiveWalkerName}`,
          text: text,
          url: googleMapsUrl
        });
        showNotification('✅ Location shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyDetails();
        }
      }
    } else {
      handleCopyDetails();
    }
  };

  const handleCopyDetails = () => {
    const text = buildSafetyMessage();
    navigator.clipboard?.writeText(text);
    showNotification('📋 Google Map & Coordinates copied to clipboard!');
  };

  const showNotification = (msg) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(''), 3500);
  };

  // Start the escort
  const handleStartWalk = () => {
    if (!phoneRecipient && !emailRecipient) {
      alert('⚠️ Please enter either a phone number or an email address to send your location to!');
      return;
    }
    
    if (walkerName) localStorage.setItem('fulalert_walk_name', walkerName);
    if (phoneRecipient) localStorage.setItem('fulalert_walk_phone', phoneRecipient);
    if (emailRecipient) localStorage.setItem('fulalert_walk_email', emailRecipient);

    setIsEscortActive(true);

    // Auto-prompt the most appropriate channel
    if (phoneRecipient) {
      handleSendWhatsApp();
    } else if (emailRecipient) {
      handleSendEmail();
    }
  };

  const handleEndWalk = () => {
    if (window.confirm('Are you at your destination safely? Would you like to send a safe arrival notification to your contact?')) {
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
      maxWidth: isEmbedded ? '100%' : '800px',
      margin: isEmbedded ? '0' : '0 auto',
      padding: isEmbedded ? '0' : '16px',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Banner / Header */}
      {!isEmbedded && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onBackToHome && (
              <button 
                onClick={onBackToHome}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} /> Home
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={22} style={{ color: '#006837' }} />
                <span>Walk With Me</span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  background: 'rgba(245, 158, 11, 0.2)', 
                  color: '#f59e0b', 
                  border: '1px solid #f59e0b', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontWeight: 700
                }}>
                  No Login Required
                </span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Send live GPS coordinates & Google Maps directly to your trusted contact's phone or email
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              Public Safety Link
            </span>
          </div>
        </div>
      )}

      {/* Embedded header when inside phone mockup */}
      {isEmbedded && (
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            background: 'rgba(0, 104, 55, 0.2)', 
            color: '#006837',
            marginBottom: '6px'
          }}>
            <Navigation size={22} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Walk With Me</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Send your Google Map location to friends or parents instantly
          </p>
        </div>
      )}

      {/* Toast Notification Banner */}
      {copiedNotification && (
        <div style={{
          background: '#006837',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '10px',
          marginBottom: '14px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0, 104, 55, 0.4)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle size={18} />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* NO LOGIN CALLOUT */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 104, 55, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
        border: '1px solid rgba(0, 104, 55, 0.35)',
        borderRadius: '12px',
        padding: '10px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span>
            <strong>Open Access:</strong> Anyone walking at night can send their coordinates. No account creation or login required!
          </span>
        </div>
        <button
          onClick={() => setUseDeviceGps(prev => !prev)}
          style={{
            background: useDeviceGps ? '#006837' : 'rgba(255,255,255,0.1)',
            border: useDeviceGps ? '1px solid #10b981' : '1px solid var(--border-color)',
            color: '#fff',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Compass size={13} />
          {useDeviceGps ? 'Phone GPS Active' : 'Enable Real GPS'}
        </button>
      </div>

      {!isEscortActive ? (
        /* SETUP MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Map Preview Card */}
          <div style={{ 
            position: 'relative', 
            height: isEmbedded ? '150px' : '200px', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
          }}>
            <img 
              src="/campus_night_map.jpg" 
              alt="Campus GPS Map" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.75)' }} 
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,11,16,0.9) 0%, transparent 60%)' }} />
            
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} style={{ color: '#f59e0b' }} /> Federal University Lokoja Walkways
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  Lat: {currentLat.toFixed(4)}°, Lon: {currentLon.toFixed(4)}°
                </span>
              </div>
              <a 
                href={googleMapsUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  fontSize: '0.68rem',
                  background: 'rgba(0, 104, 55, 0.4)',
                  border: '1px solid #006837',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none'
                }}
              >
                <span>Google Maps</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Walker Name (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Your Name / Nickname (Optional):
            </label>
            <input 
              type="text" 
              placeholder="e.g. Fatima Bello or Anonymous Student" 
              value={walkerName} 
              onChange={(e) => setWalkerName(e.target.value)} 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Trusted Phone Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} style={{ color: '#10b981' }} />
              Trusted Friend / Parent Phone Number (SMS & WhatsApp):
            </label>
            <input 
              type="tel" 
              placeholder="e.g. 08031234567 or +2348031234567" 
              value={phoneRecipient} 
              onChange={(e) => setPhoneRecipient(e.target.value)} 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Trusted Email Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} style={{ color: '#f59e0b' }} />
              Trusted Friend / Family Email Address:
            </label>
            <input 
              type="email" 
              placeholder="e.g. friend@gmail.com or guardian@yahoo.com" 
              value={emailRecipient} 
              onChange={(e) => setEmailRecipient(e.target.value)} 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Walking Towards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Where are you walking to?
            </label>
            <select 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            >
              <option value="Hostel Block A (Male)">Hostel Block A (Male)</option>
              <option value="Hostel Block B (Female)">Hostel Block B (Female)</option>
              <option value="Main Library">University Main Library</option>
              <option value="Lecture Theatre 1">Lecture Theatre 1 / Faculty</option>
              <option value="University Health Centre">University Health Centre</option>
              <option value="Main Security Post">Main School Security Gate</option>
              <option value="Other">Custom Destination...</option>
            </select>
            {destination === 'Other' && (
              <input 
                type="text" 
                placeholder="Enter specific campus location..."
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  marginTop: '4px'
                }}
              />
            )}
          </div>

          {/* Quick Location Preview Box */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: '#fff' }}>📍 Live Link to be Sent:</span>
              <button 
                onClick={handleCopyDetails}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f59e0b',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '8px', 
              borderRadius: '6px', 
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: '#93c5fd'
            }}>
              {googleMapsUrl}
            </div>
          </div>

          {/* START & SEND BUTTONS */}
          <button 
            onClick={handleStartWalk}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #006837 0%, #064e3b 100%)',
              border: '1px solid #10b981',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(0, 104, 55, 0.4)'
            }}
          >
            <Navigation size={18} />
            <span>Start Walk & Send Live Location</span>
          </button>

          {/* Direct Sending Options Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button 
              onClick={() => handleSendWhatsApp()}
              style={{
                background: '#128c7e',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                padding: '10px 6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MessageSquare size={16} />
              <span>Send WhatsApp</span>
            </button>

            <button 
              onClick={() => handleSendSms()}
              style={{
                background: '#2563eb',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                padding: '10px 6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Send size={16} />
              <span>Send SMS</span>
            </button>

            <button 
              onClick={() => handleSendEmail()}
              style={{
                background: '#ea580c',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                padding: '10px 6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Mail size={16} />
              <span>Send Email</span>
            </button>
          </div>

        </div>
      ) : (
        /* ACTIVE ESCORT HUD */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Active Status Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 104, 55, 0.25) 0%, rgba(6, 78, 59, 0.35) 100%)',
            border: '1.5px solid #10b981',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                  animation: 'leaflet-pulse 1.4s infinite'
                }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>
                  LIVE ESCORT ACTIVE
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Walking to <strong>{effectiveDestination}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: '#f59e0b' }}>
                <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                {formatTime(walkDuration)}
              </div>
            </div>
          </div>

          {/* High-Resolution GPS Map */}
          <GpsMap 
            lat={currentLat} 
            lon={currentLon}
            zoom={17}
            height={isEmbedded ? '240px' : '320px'}
            showUserMarker={true}
            showBreadcrumbTrail={true}
            onLocationUpdate={(lat, lon) => {
              setDeviceCoords({ lat, lon });
            }}
          />

          {/* Current Coordinates Banner & Direct Google Maps */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current GPS Coordinates:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                {currentLat.toFixed(5)}° N, {currentLon.toFixed(5)}° E
              </div>
            </div>

            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Open Google Maps</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* One-Tap Resend Buttons as Coordinates Update */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Update / Resend Live Location to Contact:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              <button 
                onClick={() => handleSendWhatsApp()}
                style={{
                  background: '#128c7e',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 4px',
                  fontSize: '0.72rem',
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
                  padding: '8px 4px',
                  fontSize: '0.72rem',
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
                  padding: '8px 4px',
                  fontSize: '0.72rem',
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
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 4px',
                  fontSize: '0.72rem',
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

          {/* END ESCORT & EMERGENCY SOS BUTTONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button 
              onClick={handleEndWalk}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #006837 0%, #064e3b 100%)',
                border: '1px solid #10b981',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              <span>I Have Arrived Safely (End Walk)</span>
            </button>

            <a 
              href="tel:08000003852"
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '10px',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShieldAlert size={15} />
              <span>Emergency Campus SOS Hotline (0800 000 3852)</span>
            </a>
          </div>

        </div>
      )}
    </div>
  );
}

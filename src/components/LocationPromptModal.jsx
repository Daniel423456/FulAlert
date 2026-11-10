import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Lock, 
  Radio, 
  Compass,
  ArrowRight
} from 'lucide-react';

export default function LocationPromptModal({
  isOpen,
  onClose,
  onLocationGranted,
  currentUser
}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedCoords, setDetectedCoords] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
      // Check existing permission state if supported
      if ('permissions' in navigator && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            // Already granted in browser, fetch fresh coords quietly
            fetchQuickCoords();
          }
        }).catch(() => {});
      }
    }
  }, [isOpen]);

  const fetchQuickCoords = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10),
          timestamp: Date.now()
        };
        setDetectedCoords(coords);
        localStorage.setItem('fulalert_user_coords', JSON.stringify(coords));
        sessionStorage.setItem('fulalert_user_coords', JSON.stringify(coords));
        localStorage.setItem('fulalert_location_allowed', 'true');
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!isOpen) return null;

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      setErrorMessage('Your browser or device does not support GPS Geolocation.');
      return;
    }

    setStatus('requesting');
    setErrorMessage('');

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 5),
          timestamp: Date.now()
        };

        setDetectedCoords(coords);
        localStorage.setItem('fulalert_user_coords', JSON.stringify(coords));
        sessionStorage.setItem('fulalert_user_coords', JSON.stringify(coords));
        localStorage.setItem('fulalert_location_allowed', 'true');
        sessionStorage.setItem('fulalert_loc_prompt_dismissed', 'true');

        setStatus('granted');

        if (onLocationGranted) {
          onLocationGranted(coords);
        }

        // Auto close after brief celebration
        setTimeout(() => {
          onClose();
        }, 1600);
      },
      (error) => {
        setStatus('denied');
        if (error.code === 1) {
          setErrorMessage('Location permission was denied. Please enable location permissions in your browser or phone settings.');
        } else if (error.code === 2) {
          setErrorMessage('GPS signal unavailable. Please ensure device Location / GPS is turned ON in your phone settings.');
        } else if (error.code === 3) {
          setErrorMessage('Location request timed out. Please check your signal and tap Try Again.');
        } else {
          setErrorMessage(error.message || 'Unable to retrieve location at this time.');
        }
      },
      options
    );
  };

  const handleDismiss = () => {
    sessionStorage.setItem('fulalert_loc_prompt_dismissed', 'true');
    onClose();
  };

  const displayName = currentUser?.fullName || currentUser?.name || 'Student / Officer';

  return (
    <div className="auth-modal-backdrop" style={{ zIndex: 10000 }}>
      <div 
        className="auth-modal-card" 
        style={{
          maxWidth: '480px',
          background: 'radial-gradient(120% 120% at 50% 0%, #0d1e19 0%, #06100d 60%, #020504 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.25)',
          padding: '28px 24px',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="auth-close-btn"
          title="Dismiss for now"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Icon with Pulse */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            margin: '0 auto 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: status === 'granted' 
                ? 'rgba(16, 185, 129, 0.25)' 
                : status === 'denied' 
                ? 'rgba(239, 68, 68, 0.25)' 
                : 'rgba(0, 104, 55, 0.35)',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: status === 'granted'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : status === 'denied'
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #006837 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(0, 104, 55, 0.4)',
              zIndex: 1
            }}>
              {status === 'granted' ? (
                <CheckCircle2 size={30} />
              ) : status === 'denied' ? (
                <AlertTriangle size={28} />
              ) : status === 'requesting' ? (
                <RefreshCw size={28} style={{ animation: 'spin 1.2s linear infinite' }} />
              ) : (
                <MapPin size={30} />
              )}
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <Radio size={12} className="live-pulse" />
            <span>Campus Emergency Dispatch</span>
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            margin: '0 0 6px'
          }}>
            {status === 'granted' 
              ? 'GPS Location Enabled!' 
              : status === 'denied'
              ? 'Location Permission Needed'
              : 'Turn On Device Location'}
          </h2>

          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0
          }}>
            {status === 'granted' 
              ? 'Your coordinates are registered. Emergency teams can now route directly to you.'
              : `Hello ${displayName}, enable location so campus security, medical ambulances, and fire rescue can find you instantly in an emergency.`}
          </p>
        </div>

        {/* Main Content Area */}
        {status === 'granted' ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '14px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
              📍 High-Precision Coordinates Active
            </div>
            {detectedCoords && (
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#e2e8f0',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                Lat: {detectedCoords.latitude} | Lon: {detectedCoords.longitude} (±{detectedCoords.accuracy}m)
              </div>
            )}
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px', marginBottom: 0 }}>
              Closing and returning to dashboard in a moment...
            </p>
          </div>
        ) : status === 'denied' ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '12px'
            }}>
              <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#fca5a5', display: 'block', marginBottom: '2px' }}>
                  Permission Blocked or GPS Off
                </strong>
                <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                  {errorMessage}
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.74rem',
              color: '#cbd5e1',
              lineHeight: 1.5
            }}>
              <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '4px' }}>
                💡 Quick Fix in 2 Steps:
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>1. Tap the <strong>Lock / Settings icon (🔒 / ⚙️)</strong> in your browser's address bar.</div>
                <div>2. Set <strong>Location</strong> to <strong>Allow</strong>, then tap "Try Again" below.</div>
              </div>
            </div>
          </div>
        ) : (
          /* Benefit Highlights */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Navigation size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'block' }}>
                  Instant Emergency Routing
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Auto-attaches your GPS pin to SOS alarms so teams arrive without phone call delays.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Compass size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'block' }}>
                  Live Walk With Me Safety
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Share real-time tracking links with security & friends when walking campus at night.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'block' }}>
                  Privacy & Battery Safe
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Location is only transmitted during active emergency triggers or walking sessions.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
          {status !== 'granted' && (
            <button
              onClick={handleRequestLocation}
              disabled={status === 'requesting'}
              style={{
                width: '100%',
                padding: '14px',
                background: status === 'denied'
                  ? 'linear-gradient(135deg, #006837 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #006837 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: status === 'requesting' ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(0, 104, 55, 0.45)',
                transition: 'all 0.2s',
                opacity: status === 'requesting' ? 0.8 : 1
              }}
            >
              {status === 'requesting' ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span>Requesting Browser GPS...</span>
                </>
              ) : status === 'denied' ? (
                <>
                  <RefreshCw size={18} />
                  <span>Try Again / Check Permission</span>
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  <span>Allow & Turn On Location</span>
                </>
              )}
            </button>
          )}

          {status !== 'granted' && (
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 0',
                textAlign: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.target.style.color = '#fff')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              Maybe Later (I'll enable before emergency)
            </button>
          )}

          {status === 'granted' && (
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '12px',
                color: '#34d399',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

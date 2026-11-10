import React, { useState, useEffect } from 'react';
import { Shield, Bell, Zap, Clock, Navigation } from 'lucide-react';
import StudentPortal from './components/StudentPortal';
import AdminDashboard from './components/AdminDashboard';
import WalkWithMe from './components/WalkWithMe';
import HomePage from './components/HomePage';
import AuthModal from './components/AuthModal';
import InstallPwaModal from './components/InstallPwaModal';
import LocationPromptModal from './components/LocationPromptModal';
import { 
  subscribeToCloudAlerts, 
  subscribeToCloudBroadcasts, 
  subscribeToCloudUsers,
  subscribeToAuthChanges,
  logoutUser 
} from './services/firebase';
import DepartmentLoginPage, { DEPARTMENT_CONFIGS } from './components/DepartmentLoginPage';

// Define campus map locations
const CAMPUS_LOCATIONS = {
  security_post: { name: 'Main Security Post', x: 150, y: 480 },
  health_center: { name: 'University Health Center', x: 300, y: 150 },
  hostel_a: { name: 'Hostel Block A (Male)', x: 750, y: 180 },
  hostel_b: { name: 'Hostel Block B (Female)', x: 750, y: 380 },
  dean_office: { name: 'Dean of Student Affairs Office', x: 480, y: 300 },
  sug_secretariat: { name: 'SUG Secretariat', x: 620, y: 120 },
  lecture_theatre: { name: 'Lecture Theatre 1', x: 280, y: 340 },
  school_gate: { name: 'North School Gate', x: 120, y: 100 }
};

// Initial Mock Alerts
const INITIAL_ALERTS = [
  {
    id: 'alt-001',
    senderName: 'Musa Ibrahim',
    senderMatric: 'UG/18/SCI/1004',
    senderPhone: '08034567890',
    senderAllergies: 'Penicillin',
    senderContact: 'Dr. Ibrahim (08011223344)',
    category: 'medical',
    isAnonymous: false,
    isSilent: false,
    timestamp: new Date(Date.now() - 3600000).toLocaleString(), // 1 hour ago
    status: 'resolved',
    locationName: 'Lecture Theatre 1',
    coordinates: CAMPUS_LOCATIONS.lecture_theatre,
    assignedResponder: 'Health Center',
    attachmentUrl: null,
    feedback: { rating: 5, comment: 'Medical team arrived within 5 minutes. Super fast!' },
    escalated: false,
    triggeredVia: 'app',
    elapsedSeconds: 300
  },
  {
    id: 'alt-002',
    senderName: 'Grace Chima',
    senderMatric: 'UG/19/ART/2045',
    senderPhone: '08123456789',
    senderAllergies: 'None',
    senderContact: 'Mrs. Chima (08099887766)',
    category: 'harassment',
    isAnonymous: true,
    isSilent: true,
    timestamp: new Date(Date.now() - 1800000).toLocaleString(), // 30 mins ago
    status: 'responding',
    locationName: 'Hostel Block B (Female)',
    coordinates: CAMPUS_LOCATIONS.hostel_b,
    assignedResponder: 'Dean of Student Affairs',
    attachmentUrl: null,
    feedback: null,
    escalated: false,
    triggeredVia: 'app',
    elapsedSeconds: 15,
    audioClips: [
      {
        timestamp: new Date(Date.now() - 1790000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        clipName: 'Audio_Clip_1.wav',
        transcript: "[Low voices whispering in dark corner]"
      },
      {
        timestamp: new Date(Date.now() - 1780000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        clipName: 'Audio_Clip_2.wav',
        transcript: "[Distressed voice: 'Stop following me! Leave me alone!']"
      }
    ]
  }
];

// Initial mock registered students
const INITIAL_USERS = [
  {
    matric: 'UG/20/SCI/1021',
    name: 'Samuel Adekunle',
    phone: '08098765432',
    password: 'password123',
    allergies: 'Peanuts',
    emergencyContact: 'Mr. Adekunle (07055554444)',
    strikes: 0,
    email: 'samuel@university.edu.ng'
  },
  {
    matric: 'UG/18/SCI/1004',
    name: 'Musa Ibrahim',
    phone: '08034567890',
    password: 'password123',
    allergies: 'Penicillin',
    emergencyContact: 'Dr. Ibrahim (08011223344)',
    strikes: 1, // Start with 1 strike to demonstrate warnings!
    email: 'musa@university.edu.ng'
  },
  {
    matric: 'UG/19/ART/2045',
    name: 'Grace Chima',
    phone: '08123456789',
    password: 'password123',
    allergies: 'None',
    emergencyContact: 'Mrs. Chima (08099887766)',
    strikes: 0,
    email: 'grace@university.edu.ng'
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (hash.startsWith('#/admin')) return hash.replace('#/', '');
    if (path.startsWith('/admin')) {
      // Return sub-route, clean trailing slashes
      const subPath = path.substring(1).replace(/\/$/, ''); // e.g. 'admin/security'
      return subPath || 'admin';
    }

    if (hash.startsWith('#/walk') || path.startsWith('/walk') || hash.startsWith('#/track') || path.startsWith('/track')) {
      return 'walk';
    }

    if (hash === '#/student' || path.startsWith('/student')) return 'student';
    return 'landing';
  });

  // Authentication Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [authTarget, setAuthTarget] = useState('student'); // 'student' or 'admin'

  const handleOpenAuth = (mode = 'signin', target = 'student') => {
    setAuthMode(mode);
    setAuthTarget(target);
    setIsAuthOpen(true);
  };

  // Persistent User Session (checks sessionStorage for temporary admin sessions, and localStorage for students)
  const [currentUser, setCurrentUser] = useState(() => {
    const adminSaved = sessionStorage.getItem('fulalert_auth_user');
    if (adminSaved) return JSON.parse(adminSaved);

    const saved = localStorage.getItem('fulalert_auth_user');
    const parsed = saved ? JSON.parse(saved) : null;
    // Don't auto-login admin/responder from localStorage on tab startup
    if (parsed && parsed.role === 'admin') {
      return null;
    }
    return parsed;
  });

  // Post-Login Location Permission & Live Coordinates State
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fulalert_user_coords') || localStorage.getItem('fulalert_user_coords');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [bypassFirebase, setBypassFirebase] = useState(() => {
    return localStorage.getItem('fulalert_bypass_firebase') === 'true';
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('fulalert_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Handle URL query parameters for Firebase Password Reset links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const oobCodeParam = urlParams.get('oobCode');
    if (modeParam === 'resetPassword' && oobCodeParam) {
      handleOpenAuth('resetPassword', 'student');
    }
  }, []);

  // Firebase Authentication State Listener
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges((firebaseUser, profile) => {
      // If we are currently on an admin page, do not let a student session overwrite the logged-in officer
      const isCurrentlyAdminView = window.location.hash.startsWith('#/admin');
      
      if (firebaseUser && profile) {
        if (isCurrentlyAdminView && profile.role !== 'admin') {
          return; // Ignore student profile overwrite
        }

        const mergedUser = {
          ...profile,
          emailVerified: firebaseUser.emailVerified,
          lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toLocaleString()
        };
        setCurrentUser(mergedUser);
        if (profile.role === 'admin') {
          sessionStorage.setItem('fulalert_auth_user', JSON.stringify(mergedUser));
        } else {
          localStorage.setItem('fulalert_auth_user', JSON.stringify(mergedUser));
        }
      } else {
        // If logged in locally as an admin/officer, keep the session
        const storedLocal = localStorage.getItem('fulalert_auth_user');
        const storedSession = sessionStorage.getItem('fulalert_auth_user');
        const parsedLocal = storedLocal ? JSON.parse(storedLocal) : null;
        const parsedSession = storedSession ? JSON.parse(storedSession) : null;

        if (parsedSession && parsedSession.role === 'admin') {
          setCurrentUser(parsedSession);
        } else if (parsedLocal && parsedLocal.role === 'admin') {
          setCurrentUser(parsedLocal);
          sessionStorage.setItem('fulalert_auth_user', JSON.stringify(parsedLocal));
          localStorage.removeItem('fulalert_auth_user'); // Clean up from local storage
        } else {
          setCurrentUser(null);
          localStorage.removeItem('fulalert_auth_user');
          sessionStorage.removeItem('fulalert_auth_user');
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Automatically prompt logged-in users to turn on location if not yet allowed/dismissed
  useEffect(() => {
    if (!currentUser) return;
    const dismissed = sessionStorage.getItem('fulalert_loc_prompt_dismissed');
    const coords = sessionStorage.getItem('fulalert_user_coords') || localStorage.getItem('fulalert_user_coords');
    if (!dismissed && !coords) {
      if ('permissions' in navigator && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state !== 'granted') {
            setShowLocationPrompt(true);
          } else {
            // Quietly fetch GPS if already permitted
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                const c = {
                  latitude: Number(pos.coords.latitude.toFixed(6)),
                  longitude: Number(pos.coords.longitude.toFixed(6)),
                  accuracy: Math.round(pos.coords.accuracy || 10),
                  timestamp: Date.now()
                };
                setUserLocation(c);
                localStorage.setItem('fulalert_user_coords', JSON.stringify(c));
                sessionStorage.setItem('fulalert_user_coords', JSON.stringify(c));
              },
              () => {},
              { enableHighAccuracy: true, timeout: 6000 }
            );
          }
        }).catch(() => {
          setShowLocationPrompt(true);
        });
      } else {
        setShowLocationPrompt(true);
      }
    }
  }, [currentUser]);

  const handleAuthSuccess = (user, role) => {
    setCurrentUser(user);
    if (role === 'student') {
      localStorage.setItem('fulalert_auth_user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('fulalert_auth_user', JSON.stringify(user));
    }
    
    // Prompt user to enable & turn on location immediately upon login
    setShowLocationPrompt(true);

    if (role === 'student') {
      navigateTo('student');
    } else {
      const targetDesk = user.desk || 'security';
      navigateTo(`admin/${targetDesk}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem('fulalert_auth_user');
    sessionStorage.removeItem('fulalert_auth_user');
    navigateTo('landing');
  };

  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('fulalert_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [broadcasts, setBroadcasts] = useState(() => {
    const saved = localStorage.getItem('fulalert_broadcasts');
    return saved ? JSON.parse(saved) : [
      {
        id: 'bc-1',
        title: 'Inclement Weather Warning',
        message: 'Heavy rain and strong winds expected on campus this evening. Secure all hostel windows.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: 'warning'
      }
    ];
  });

  // Sync route hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/admin')) {
        setCurrentView(hash.replace('#/', ''));
      } else if (hash.startsWith('#/walk') || hash.startsWith('#/track')) {
        setCurrentView('walk');
      } else if (hash === '#/student') {
        setCurrentView('student');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persistent bypass setting
  useEffect(() => {
    localStorage.setItem('fulalert_bypass_firebase', bypassFirebase ? 'true' : 'false');
  }, [bypassFirebase]);

  // Multi-tab and Firebase Cloud Database Real-time Sync
  useEffect(() => {
    if (bypassFirebase) {
      // Force initial load from local storage
      const localAlerts = localStorage.getItem('fulalert_alerts');
      const localBc = localStorage.getItem('fulalert_broadcasts');
      const localUsers = localStorage.getItem('fulalert_users');
      
      setAlerts(localAlerts ? JSON.parse(localAlerts) : INITIAL_ALERTS);
      setBroadcasts(localBc ? JSON.parse(localBc) : [
        {
          id: 'bc-1',
          title: 'Inclement Weather Warning',
          message: 'Heavy rain and strong winds expected on campus this evening. Secure all hostel windows.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          category: 'warning'
        }
      ]);
      setUsers(localUsers ? JSON.parse(localUsers) : INITIAL_USERS);
      return () => {};
    }

    // 1. Firebase Cloud Real-time Alerts Listener
    const unsubscribeCloudAlerts = subscribeToCloudAlerts((cloudAlerts) => {
      setAlerts(cloudAlerts);
    });

    // 2. Firebase Cloud Real-time Broadcasts Listener
    const unsubscribeCloudBc = subscribeToCloudBroadcasts((cloudBc) => {
      setBroadcasts(cloudBc);
    });

    // 3. Firebase Cloud Real-time Users Listener (Syncs registered accounts across all devices)
    const unsubscribeCloudUsers = subscribeToCloudUsers((cloudUsers) => {
      setUsers(cloudUsers);
    });

    // 4. Multi-tab fallback via storage events
    const handleStorage = (e) => {
      if (e.key === 'fulalert_alerts' && e.newValue) {
        setAlerts(JSON.parse(e.newValue));
      }
      if (e.key === 'fulalert_users' && e.newValue) {
        setUsers(JSON.parse(e.newValue));
        const parsedUsers = JSON.parse(e.newValue);
        if (currentUser) {
          const fresh = parsedUsers.find(u => u.matric === currentUser.matric);
          if (fresh) setCurrentUser(fresh);
        }
      }
      if (e.key === 'fulalert_broadcasts' && e.newValue) {
        setBroadcasts(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribeCloudAlerts();
      unsubscribeCloudBc();
      unsubscribeCloudUsers();
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  const navigateTo = (view) => {
    setCurrentView(view);
    window.location.hash = view && view !== 'landing' ? `/${view}` : '';
  };

  const [simSpeed, setSimSpeed] = useState(1); // 1x, 5x, 10x speed multiplier
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [walkWithMeActive, setWalkWithMeActive] = useState(false);
  const [walkWithMeCoords, setWalkWithMeCoords] = useState(CAMPUS_LOCATIONS.hostel_a);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('fulalert_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('fulalert_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('fulalert_broadcasts', JSON.stringify(broadcasts));
  }, [broadcasts]);

  // Main simulation tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Walk With Me movement simulation (simulates GPS location moving over time)
      if (walkWithMeActive) {
        setWalkWithMeCoords(prev => {
          // Slowly move coordinates towards the male hostel and health center in a loop
          let dx = (CAMPUS_LOCATIONS.hostel_b.x - prev.x) * 0.05;
          let dy = (CAMPUS_LOCATIONS.health_center.y - prev.y) * 0.05;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            // Swap targets or reset
            return CAMPUS_LOCATIONS.hostel_a;
          }
          return {
            x: Math.round(prev.x + dx),
            y: Math.round(prev.y + dy)
          };
        });
      }

      // 2. Auto-escalation Logic:
      // If a pending alert is unacknowledged for more than 15 seconds (representing 3 mins in scaled simulator),
      // auto-escalate and assign to Security or notify secondary contact.
      setAlerts(prevAlerts => {
        let changed = false;
        const nextAlerts = prevAlerts.map(alert => {
          let updated = { ...alert };

          // Handle automatic simulation tick coordinates for active walk-with-me alerts
          if (walkWithMeActive && alert.senderMatric === currentUser.matric && ['pending', 'acknowledged', 'responding'].includes(alert.status)) {
            updated.coordinates = walkWithMeCoords;
            changed = true;
          }

          // Auto-escalation check: FOR SECURITY & FIRE OUTBREAK EMERGENCIES
          if (['security', 'fire'].includes(alert.category) && alert.status === 'pending' && !alert.escalated) {
            const timeLimit = 30; // 30 seconds threshold for unacknowledged critical threat
            const triggerTime = new Date(alert.timestamp).getTime();
            const elapsed = (Date.now() - triggerTime) / 1000;

            if (elapsed > timeLimit) {
              updated.escalated = true;
              if (alert.category === 'fire') {
                updated.assignedResponder = 'Campus Fire Safety Command & Chief Security (Auto-Escalated)';
                updated.notes = '🚨 URGENT FIRE AUTO-ESCALATION: Fire outbreak unacknowledged over 30s. Escalated to Fire Safety Command & Chief Security.';
              } else {
                updated.assignedResponder = 'Chief Security Officer (Priority 1 Auto-Escalated)';
                updated.notes = '🚨 PRIORITY 1 AUTO-ESCALATION: Security threat unacknowledged over 30s. Escalated to Chief Security Officer.';
              }
              changed = true;
            }
          }

          // 3. Audio Sniffing logic: Add sound clips every 10 simulated seconds when silent alarm is active
          if (alert.isSilent && ['pending', 'acknowledged', 'responding'].includes(alert.status)) {
            const currSeconds = alert.elapsedSeconds || 0;
            const nextSeconds = currSeconds + 1;
            updated.elapsedSeconds = nextSeconds;
            changed = true;

            const clipInterval = Math.max(1, Math.round(10 / simSpeed));
            if (nextSeconds > 0 && nextSeconds % clipInterval === 0) {
              const currentClips = alert.audioClips || [];
              const nextClipIndex = currentClips.length + 1;

              // Transcripts bank
              let transcript = "[Ambient noise]";
              if (alert.category === 'security') {
                const trs = [
                  "[Footsteps running, heavy breathing]",
                  "[Aggressive yelling: 'Give me your phone!']",
                  "[Sounds of scuffle, rustling branches]",
                  "[Running footsteps fading away]"
                ];
                transcript = trs[(nextClipIndex - 1) % trs.length];
              } else if (alert.category === 'harassment') {
                const trs = [
                  "[Low voices whispering in dark corner]",
                  "[Distressed voice: 'Stop following me! Leave me alone!']",
                  "[Aggressive shouting in background]",
                  "[Footsteps running on concrete]"
                ];
                transcript = trs[(nextClipIndex - 1) % trs.length];
              } else if (alert.category === 'medical') {
                const trs = [
                  "[Heavy coughing, gasping for air]",
                  "[Weak groaning noises, shuffling]",
                  "[Faint voice: 'Help, I cannot breathe...']"
                ];
                transcript = trs[(nextClipIndex - 1) % trs.length];
              } else {
                const trs = [
                  "[Crackling sounds, smoke alarm beeping]",
                  "[Shouting: 'Fire! Everyone run outside!']",
                  "[Coughing, heavy breathing]"
                ];
                transcript = trs[(nextClipIndex - 1) % trs.length];
              }

              updated.audioClips = [
                ...currentClips,
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  clipName: `Audio_Clip_${nextClipIndex}.wav`,
                  transcript: transcript
                }
              ];
            }
          }

          return updated;
        });
        return changed ? nextAlerts : prevAlerts;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [walkWithMeActive, walkWithMeCoords, simSpeed, currentUser]);

  // Sync active alert ID based on user status
  useEffect(() => {
    if (currentUser) {
      const active = alerts.find(a => 
        (a.senderUid === currentUser.uid || (currentUser.matric && a.senderMatric === currentUser.matric)) && 
        ['pending', 'acknowledged', 'responding'].includes(a.status)
      );
      setActiveAlertId(active ? active.id : null);
    } else {
      setActiveAlertId(null);
    }
  }, [alerts, currentUser]);

  // Handle striking user (penalty system)
  const applyUserStrike = (matric) => {
    setUsers(prev => prev.map(u => {
      if (u.matric === matric) {
        const nextStrikes = u.strikes + 1;
        // If current user strikes updated, update active profile
        if (currentUser && currentUser.matric === matric) {
          setCurrentUser(prevUser => ({ ...prevUser, strikes: nextStrikes }));
        }
        return { ...u, strikes: nextStrikes };
      }
      return u;
    }));
  };

  return (
    <div className="app-container">
      {/* If viewing admin or student while logged out, show header to let user navigate or sign in. If logged in, the portal renders its own dedicated bar */}
      {currentView !== 'landing' && currentView !== 'walk' && !currentUser && (
        <header className="app-header">
          <div className="logo-section" style={{ cursor: 'pointer' }} onClick={() => navigateTo('landing')}>
            <div className="brand-logo-badge small">
              <img src="/logo.png" alt="FULALERT" className="brand-logo-img" style={{ height: '30px' }} />
            </div>
            <div className="logo-text">
              <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FULALERT</h1>
              <span style={{ fontSize: '0.65rem', color: 'var(--brand-orange)', fontWeight: 700, letterSpacing: '0.05em' }}>NOTIFY • INFORM • PROTECT</span>
            </div>
          </div>

          <div className="system-status">
            {/* Real User Profile Chip */}
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  marginRight: '8px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></div>
                  <strong>{currentUser.name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>({currentUser.matric || currentUser.badgeId})</span>
                  <button 
                    onClick={handleLogout}
                    style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--accent-sos)', fontWeight: 700, borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}
                  >
                    Logout
                  </button>
                </div>

                {/* Location GPS Status / Quick Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowLocationPrompt(true)}
                  title={userLocation ? `Location active (${userLocation.latitude}, ${userLocation.longitude}). Tap to refresh.` : "Location inactive. Tap to allow & enable."}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    padding: '5px 12px',
                    background: userLocation ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: userLocation ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '20px',
                    color: userLocation ? '#34d399' : '#fbbf24',
                    fontWeight: 700,
                    marginRight: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Navigation size={12} className={userLocation ? "" : "live-pulse"} />
                  <span>{userLocation ? 'GPS: Active' : '📍 Enable GPS'}</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleOpenAuth('signin', currentView)}
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 14px',
                  background: 'var(--brand-blue-gradient)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 700,
                  marginRight: '8px'
                }}
              >
                Sign In
              </button>
            )}

            <button 
              onClick={() => navigateTo('landing')}
              style={{
                fontSize: '0.75rem',
                padding: '6px 12px',
                background: '#272a3d',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                marginRight: '12px'
              }}
            >
              ← Exit to Home
            </button>

            <button 
              onClick={() => setBypassFirebase(prev => !prev)}
              style={{
                fontSize: '0.72rem',
                padding: '6px 12px',
                background: bypassFirebase ? 'rgba(245, 158, 11, 0.15)' : '#1b223c',
                border: bypassFirebase ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                borderRadius: '8px',
                color: bypassFirebase ? '#fbbf24' : 'var(--text-secondary)',
                fontWeight: 600,
                marginRight: '12px',
                cursor: 'pointer'
              }}
            >
              {bypassFirebase ? '🔌 Local Demo Mode' : '⚡ Live Cloud Mode'}
            </button>

            <div className="status-badge">
              <span className="status-dot" style={{ backgroundColor: bypassFirebase ? '#f59e0b' : '#10b981' }}></span>
              {bypassFirebase ? 'Local Sync' : (currentView === 'student' ? 'Client Active' : 'Command Sync Active')}
            </div>
          </div>
        </header>
      )}

      {/* Render Current View */}
      {currentView === 'landing' ? (
        <HomePage 
          onNavigate={navigateTo} 
          currentUser={currentUser} 
          onOpenAuth={handleOpenAuth} 
          onLogout={handleLogout} 
          bypassFirebase={bypassFirebase}
          setBypassFirebase={setBypassFirebase}
          userLocation={userLocation}
          onOpenLocationPrompt={() => setShowLocationPrompt(true)}
        />
      ) : currentView === 'student' ? (
        /* Student view full screen wrapper */
        <div className="student-view-wrapper">
          {currentUser ? (
            <StudentPortal 
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              users={users}
              setUsers={setUsers}
              alerts={alerts}
              setAlerts={setAlerts}
              activeAlertId={activeAlertId}
              broadcasts={broadcasts}
              walkWithMeActive={walkWithMeActive}
              setWalkWithMeActive={setWalkWithMeActive}
              walkWithMeCoords={walkWithMeCoords}
              CAMPUS_LOCATIONS={CAMPUS_LOCATIONS}
              bypassFirebase={bypassFirebase}
              userLocation={userLocation}
              onOpenLocationPrompt={() => setShowLocationPrompt(true)}
              onBackToHome={() => navigateTo('landing')}
              onLogout={handleLogout}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center' }}>
              <div className="brand-logo-badge large" style={{ marginBottom: '16px' }}>
                <img src="/logo.png" alt="FULALERT" style={{ height: '56px', objectFit: 'contain' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Sign In to FULALERT</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '340px', marginBottom: '24px' }}>
                Please sign in or register your student safety profile to access campus panic SOS and emergency services.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handleOpenAuth('signin', 'student')}
                  className="auth-submit-btn"
                  style={{ padding: '12px 24px' }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => handleOpenAuth('signup', 'student')}
                  className="hero-btn secondary"
                  style={{ padding: '12px 24px' }}
                >
                  Create Account
                </button>
              </div>

              {/* Instant Walk With Me (No Login Required) */}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', width: '100%', maxWidth: '360px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Walking across campus at night? No account needed:
                </p>
                <button 
                  onClick={() => navigateTo('walk')}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 104, 55, 0.2)',
                    border: '1.5px solid #006837',
                    color: '#10b981',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Navigation size={16} />
                  <span>Launch Walk With Me (No Login Needed)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : currentView.startsWith('admin') ? (
        (() => {
          // Determine the department key from currentView
          let deptKey = 'all';
          if (currentView.includes('security')) deptKey = 'security';
          else if (currentView.includes('medical')) deptKey = 'medical';
          else if (currentView.includes('fire')) deptKey = 'fire';
          else if (currentView.includes('dsa') || currentView.includes('welfare')) deptKey = 'harassment';

          // Check if officer is authenticated for this department
          const isDeptAuthenticated = currentUser && currentUser.role === 'admin' && (deptKey === 'all' || currentUser.desk === deptKey || currentUser.desk === 'all');

          if (!isDeptAuthenticated) {
            return (
              <DepartmentLoginPage 
                deptKey={deptKey}
                onLoginSuccess={(officerUser) => {
                  setCurrentUser(officerUser);
                  sessionStorage.setItem('fulalert_auth_user', JSON.stringify(officerUser));
                  setShowLocationPrompt(true);
                  if (bypassFirebase) {
                    setUsers(prev => {
                      if (!prev.some(u => u.badgeId === officerUser.badgeId)) {
                        return [...prev, officerUser];
                      }
                      return prev;
                    });
                  }
                }}
                onBackToHome={() => navigateTo('landing')}
                bypassFirebase={bypassFirebase}
                users={users}
              />
            );
          }

          return (
            <div className="admin-view-wrapper">
              <AdminDashboard 
                alerts={alerts}
                setAlerts={setAlerts}
                users={users}
                setUsers={setUsers}
                applyUserStrike={applyUserStrike}
                broadcasts={broadcasts}
                setBroadcasts={setBroadcasts}
                CAMPUS_LOCATIONS={CAMPUS_LOCATIONS}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onOpenAuth={handleOpenAuth}
                onLogout={handleLogout}
                bypassFirebase={bypassFirebase}
                setBypassFirebase={setBypassFirebase}
              />
            </div>
          );
        })()
      ) : currentView === 'walk' ? (
        <div className="walk-view-wrapper">
          <WalkWithMe 
            currentUser={currentUser}
            walkWithMeCoords={walkWithMeCoords}
            CAMPUS_LOCATIONS={CAMPUS_LOCATIONS}
            onBackToHome={() => navigateTo('landing')}
            isEmbedded={false}
          />
        </div>
      ) : null}

      {/* Global Authentication Modal */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
        targetPortal={authTarget}
        users={users}
        setUsers={setUsers}
        bypassFirebase={bypassFirebase}
      />

      {/* Post-Login Device Location Permission Prompt */}
      <LocationPromptModal 
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        currentUser={currentUser}
        onLocationGranted={(coords) => {
          setUserLocation(coords);
        }}
      />

      {/* Progressive Web App Install Prompt */}
      <InstallPwaModal />
    </div>
  );
}


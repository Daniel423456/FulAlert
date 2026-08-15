import React, { useState, useEffect } from 'react';
import { Shield, Bell, Zap, Clock } from 'lucide-react';
import StudentPortal from './components/StudentPortal';
import AdminDashboard from './components/AdminDashboard';
import HomePage from './components/HomePage';
import AuthModal from './components/AuthModal';
import InstallPwaModal from './components/InstallPwaModal';
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
    senderBlood: 'O+',
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
    senderBlood: 'A-',
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
    blood: 'B+',
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
    blood: 'O+',
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
    blood: 'A-',
    allergies: 'None',
    emergencyContact: 'Mrs. Chima (08099887766)',
    strikes: 0,
    email: 'grace@university.edu.ng'
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/admin')) return hash.replace('#/', '');
    if (hash === '#/student') return 'student';
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

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('fulalert_users');
    return saved ? JSON.parse(saved) : [];
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
        localStorage.setItem('fulalert_auth_user', JSON.stringify(mergedUser));
      } else {
        // If logged in locally as an admin/officer, keep the session
        const storedLocal = localStorage.getItem('fulalert_auth_user');
        const storedSession = sessionStorage.getItem('fulalert_auth_user');
        const parsedLocal = storedLocal ? JSON.parse(storedLocal) : null;
        const parsedSession = storedSession ? JSON.parse(storedSession) : null;

        if ((parsedLocal && parsedLocal.role === 'admin') || (parsedSession && parsedSession.role === 'admin')) {
          // Do not log out officer
        } else {
          setCurrentUser(null);
          localStorage.removeItem('fulalert_auth_user');
          sessionStorage.removeItem('fulalert_auth_user');
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAuthSuccess = (user, role) => {
    setCurrentUser(user);
    if (role === 'student') {
      localStorage.setItem('fulalert_auth_user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('fulalert_auth_user', JSON.stringify(user));
    }
    
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
    return saved ? JSON.parse(saved) : [];
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
      } else if (hash === '#/student') {
        setCurrentView('student');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Multi-tab and Firebase Cloud Database Real-time Sync
  useEffect(() => {
    // 1. Firebase Cloud Real-time Alerts Listener
    const unsubscribeCloudAlerts = subscribeToCloudAlerts((cloudAlerts) => {
      setAlerts(prev => {
        // Merge cloud alerts with local alerts preserving latest status
        const mergedMap = new Map();
        [...cloudAlerts, ...prev].forEach(item => {
          if (!mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        });
        return Array.from(mergedMap.values());
      });
    });

    // 2. Firebase Cloud Real-time Broadcasts Listener
    const unsubscribeCloudBc = subscribeToCloudBroadcasts((cloudBc) => {
      setBroadcasts(prev => {
        const mergedMap = new Map();
        [...cloudBc, ...prev].forEach(item => {
          if (!mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        });
        return Array.from(mergedMap.values());
      });
    });

    // 3. Firebase Cloud Real-time Users Listener (Syncs registered accounts across all devices)
    const unsubscribeCloudUsers = subscribeToCloudUsers((cloudUsers) => {
      setUsers(prev => {
        const mergedMap = new Map();
        [...cloudUsers, ...prev].forEach(item => {
          if (!mergedMap.has(item.matric)) {
            mergedMap.set(item.matric, item);
          }
        });
        return Array.from(mergedMap.values());
      });
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
      {/* If viewing student or admin, show top header with Navigation back to landing */}
      {currentView !== 'landing' && (
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

            <div className="status-badge">
              <span className="status-dot"></span>
              {currentView === 'student' ? 'Client Active' : 'Command Sync Active'}
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
            </div>
          )}
        </div>
      ) : currentView.startsWith('admin') ? (
        (() => {
          // Determine the department key from currentView
          let deptKey = 'all';
          if (currentView === 'admin/security') deptKey = 'security';
          else if (currentView === 'admin/medical') deptKey = 'medical';
          else if (currentView === 'admin/fire') deptKey = 'fire';
          else if (currentView === 'admin/dsa') deptKey = 'harassment';
          else if (currentView === 'admin/central' || currentView === 'admin') deptKey = 'all';

          // Check if officer is authenticated for this department
          const isDeptAuthenticated = currentUser && currentUser.role === 'admin' && (deptKey === 'all' || currentUser.desk === deptKey || currentUser.desk === 'all');

          if (!isDeptAuthenticated) {
            return (
              <DepartmentLoginPage 
                deptKey={deptKey}
                onLoginSuccess={(officerUser) => {
                  setCurrentUser(officerUser);
                  localStorage.setItem('fulalert_auth_user', JSON.stringify(officerUser));
                }}
                onBackToHome={() => navigateTo('landing')}
              />
            );
          }

          return (
            <div style={{ flex: 1, padding: '24px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
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
              />
            </div>
          );
        })()
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
      />

      {/* Progressive Web App Install Prompt */}
      <InstallPwaModal />
    </div>
  );
}


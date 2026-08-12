import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  HeartPulse, 
  Flame, 
  AlertTriangle, 
  UserX, 
  User, 
  History, 
  Navigation, 
  UserCheck, 
  FileText, 
  Radio, 
  Volume2, 
  VolumeX, 
  Camera, 
  Star,
  PhoneCall,
  GraduationCap,
  Users,
  PhoneForwarded,
  MapPin,
  Compass,
  Activity
} from 'lucide-react';
import GpsMap from './GpsMap';
import { audioAlerts, emergencyBus } from '../utils/audioAlerts';
import { pushAlertToCloud } from '../services/firebase';

const EMERGENCY_CONTACTS = [
  {
    id: 'sec',
    name: 'Campus Security Unit',
    shortName: 'Security',
    phone: '+234 803 111 0001',
    hours: '24/7 Rapid Response',
    role: 'Physical threats, theft, intrusion, safety patrol',
    icon: ShieldAlert,
    color: 'var(--color-security)',
    category: 'security'
  },
  {
    id: 'med',
    name: 'University Health Centre',
    shortName: 'Health Centre',
    phone: '+234 803 222 0002',
    hours: '24/7 Ambulance On-Call',
    role: 'Medical emergencies, injuries, acute health triage',
    icon: HeartPulse,
    color: 'var(--color-medical)',
    category: 'medical'
  },
  {
    id: 'hostel',
    name: 'Hostel Administration',
    shortName: 'Hostel Admin',
    phone: '+234 803 333 0003',
    hours: '24/7 Hall Warden Desk',
    role: 'Hostel disputes, room emergencies, fire hazards',
    icon: Flame,
    color: 'var(--color-fire)',
    category: 'fire'
  },
  {
    id: 'dsa',
    name: 'Dean of Student Affairs',
    shortName: 'Dean of Student Affairs',
    phone: '+234 803 444 0004',
    hours: '8:00 AM - 10:00 PM (Emergency Desk)',
    role: 'Disciplinary, welfare, harassment/GBV & escalated cases',
    icon: GraduationCap,
    color: 'var(--color-harass)',
    category: 'harassment'
  },
  {
    id: 'hotline',
    name: 'School Emergency Hotlines',
    shortName: 'School Hotlines',
    phone: '+234 800 000 3852',
    hours: 'Toll-Free 24/7 Dispatch',
    role: 'Central campus emergency lines & backup routing',
    icon: PhoneCall,
    color: 'var(--color-other)',
    category: 'other'
  },
  {
    id: 'sug',
    name: 'Student Union Government (SUG)',
    shortName: 'SUG Secretariat',
    phone: '+234 803 666 0006',
    hours: '24/7 Student Care Desk',
    role: 'Student welfare, mediation, and advocacy-related alerts',
    icon: Users,
    color: '#8b5cf6',
    category: 'other'
  }
];

export default function StudentPortal({
  currentUser,
  setCurrentUser,
  users,
  setUsers,
  alerts,
  setAlerts,
  activeAlertId,
  broadcasts,
  walkWithMeActive,
  setWalkWithMeActive,
  walkWithMeCoords,
  CAMPUS_LOCATIONS
}) {
  const [activeTab, setActiveTab] = useState('sos'); // 'sos', 'walk', 'contacts', 'history', 'profile'
  const [activeCategory, setActiveCategory] = useState('security'); // default
  
  // Registration and Switch states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({
    matric: '', name: '', phone: '', blood: 'O+', allergies: '', emergencyContact: '', email: ''
  });

  // Hold-to-Confirm SOS States
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef(null);
  
  // Incident input states
  const [customLocation, setCustomLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  // Toggle states
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachment, setAttachment] = useState('none'); // 'none', 'photo', 'voice'

  // "Walk With Me" state
  const [trustedFriend, setTrustedFriend] = useState('');
  const [walkMapType, setWalkMapType] = useState('google'); // 'google' or 'satellite'

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Handle switching users for simulator demonstration
  const handleUserChange = (matric) => {
    const selected = users.find(u => u.matric === matric);
    if (selected) {
      setCurrentUser(selected);
    }
  };

  // SOS Hold-to-Confirm handlers
  const startSOSHold = (e) => {
    e.preventDefault();
    if (activeAlertId) return; // Alert already active

    // Start interval incrementing progress to 100 over 3 seconds (30 ticks of 100ms)
    setHoldProgress(0);
    let current = 0;
    audioAlerts.vibrateChargingPulse();

    holdIntervalRef.current = setInterval(() => {
      current += 3.33; // ~30 steps for 3 seconds
      if (current >= 100) {
        clearInterval(holdIntervalRef.current);
        setHoldProgress(100);
        triggerSOS();
      } else {
        setHoldProgress(current);
        audioAlerts.vibrateChargingPulse();
      }
    }, 100);
  };

  const cancelSOSHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      setHoldProgress(0);
    }
  };

  const resolveLocationCoordinates = (text) => {
    const t = text.toLowerCase();
    if (t.includes('health') || t.includes('clinic') || t.includes('medical') || t.includes('hospital')) {
      return { x: 300, y: 140 };
    }
    if (t.includes('hostel') || t.includes('hall') || t.includes('block a') || t.includes('block b') || t.includes('dorm') || t.includes('room')) {
      return { x: 750, y: 380 };
    }
    if (t.includes('gate') || t.includes('security') || t.includes('entrance') || t.includes('post')) {
      return { x: 150, y: 480 };
    }
    if (t.includes('dean') || t.includes('dsa') || t.includes('affair')) {
      return { x: 480, y: 300 };
    }
    if (t.includes('sug') || t.includes('union') || t.includes('secretariat')) {
      return { x: 620, y: 120 };
    }
    if (t.includes('science') || t.includes('quad') || t.includes('east') || t.includes('faculty') || t.includes('lab')) {
      return { x: 750, y: 180 };
    }
    if (t.includes('academic') || t.includes('lecture') || t.includes('theatre') || t.includes('theater') || t.includes('complex') || t.includes('class')) {
      return { x: 280, y: 340 };
    }
    // Default realistic campus coordinate
    return { x: 480 + Math.floor(Math.random() * 60 - 30), y: 300 + Math.floor(Math.random() * 60 - 30) };
  };

  const triggerSOS = () => {
    let locName = customLocation.trim() || 'University Campus (Live Location)';
    let resolvedCoords = resolveLocationCoordinates(locName);

    const newAlert = {
      id: `alt-${Date.now().toString().slice(-6)}`,
      senderName: isAnonymous ? 'Anonymous Student' : currentUser.name,
      senderMatric: isAnonymous ? 'ANON' : currentUser.matric,
      senderPhone: isAnonymous ? 'N/A' : currentUser.phone,
      senderBlood: isAnonymous ? 'N/A' : (currentUser.blood || 'O+'),
      senderAllergies: isAnonymous ? 'N/A' : (currentUser.allergies || 'None'),
      senderContact: isAnonymous ? 'N/A' : (currentUser.emergencyContact || 'Campus Security'),
      category: activeCategory,
      description: incidentDescription.trim() || 'Distress signal raised by student. Immediate response requested.',
      isAnonymous: isAnonymous,
      isSilent: isSilentMode,
      timestamp: new Date().toLocaleString(),
      status: 'pending',
      locationName: locName,
      coordinates: resolvedCoords,
      assignedResponder: getCategoryResponder(activeCategory),
      responderNotes: [],
      attachmentUrl: attachment === 'photo' ? 'incident_photo.jpg' : attachment === 'voice' ? 'voice_clip.mp3' : null,
      feedback: null,
      escalated: false,
      triggeredVia: 'app',
      elapsedSeconds: 0
    };

    setAlerts(prev => [newAlert, ...prev]);
    setHoldProgress(0);

    // Broadcast live alert to all open Admin Responder desks
    try {
      emergencyBus.postMessage({ type: 'NEW_EMERGENCY_ALERT', alert: newAlert });
    } catch (err) {}

    // Push real-time distress signal to Firebase Cloud Database
    pushAlertToCloud(newAlert);

    // Silent Haptic SOS Feedback for student safety (sound plays on Admin dispatch desk)
    audioAlerts.vibrateSOS();
  };

  const getCategoryResponder = (cat) => {
    switch (cat) {
      case 'medical': return 'University Health Centre';
      case 'security': return 'Campus Security Unit';
      case 'fire': return 'Campus Fire Safety & Warden';
      case 'harassment': return 'Dean of Student Affairs (DSA)';
      default: return 'Campus Security Unit';
    }
  };

  const cancelActiveAlert = () => {
    if (!activeAlertId) return;
    audioAlerts.vibrateConfirm();

    setAlerts(prev => prev.map(a => {
      if (a.id === activeAlertId) {
        return { ...a, status: 'resolved' };
      }
      return a;
    }));
  };

  // Submit Feedback
  const submitFeedback = (alertId) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === alertId) {
        return {
          ...a,
          feedback: {
            rating: feedbackRating,
            comment: feedbackComment
          }
        };
      }
      return a;
    }));
    setFeedbackRating(5);
    setFeedbackComment('');
  };


  const activeAlert = alerts.find(a => a.id === activeAlertId);
  const categories = [
    { id: 'security', label: 'Security', icon: ShieldAlert, rgb: '239, 68, 68', color: 'var(--color-security)' },
    { id: 'medical', label: 'Medical', icon: HeartPulse, rgb: '16, 185, 129', color: 'var(--color-medical)' },
    { id: 'fire', label: 'Fire Outbreak', icon: Flame, rgb: '249, 115, 22', color: 'var(--color-fire)' },
    { id: 'harassment', label: 'Harassment/GBV', icon: UserX, rgb: '217, 70, 239', color: 'var(--color-harass)' },
  ];

  const selectedCategoryColor = categories.find(c => c.id === activeCategory);

  return (
    <div className={`phone-mockup silent-hide-parent`}>
      {/* Speaker and Camera Bezel */}
      <div className="phone-notch"></div>
      
      {/* Phone Screen Container */}
      <div className={`phone-screen ${isSilentMode && activeAlertId ? 'silent-mode-active' : ''}`}>
        
        {/* Status Bar */}
        <div className="phone-statusbar silent-hide">
          <span>9:41 AM</span>
          <div className="phone-statusbar-icons">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Dynamic Broadcast Notification */}
        {broadcasts.length > 0 && !activeAlertId && (
          <div className="broadcast-alert-banner silent-hide">
            <Radio size={16} className="status-dot" style={{ color: 'var(--status-pending)' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.75rem' }}>{broadcasts[0].title}</strong>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{broadcasts[0].message}</p>
            </div>
          </div>
        )}

        {/* Student Mobile App Brand Top Header */}
        <div className="student-app-topbar silent-hide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-logo-badge small">
              <img src="/logo.png" alt="FULALERT" style={{ height: '26px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.02em', color: '#fff' }}>FULALERT</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--brand-orange)', fontWeight: 700, letterSpacing: '0.05em' }}>NOTIFY • INFORM • PROTECT</div>
            </div>
          </div>
          <span className="status-badge" style={{ padding: '3px 8px', fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <span className="status-dot" style={{ backgroundColor: '#10b981' }}></span> Live
          </span>
        </div>

        {/* Screen Content Scroll Area */}
        <div className="phone-content">
          
          {/* 1. SOS Tab */}
          {activeTab === 'sos' && (
            <div className="sos-container">
              {/* Active Student Safety Profile */}
              <div className="user-profile-summary silent-hide" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>CAMPUS SAFETY PROFILE</span>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    🟢 Verified
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '4px', color: '#fff' }}>{currentUser.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Matric: <strong>{currentUser.matric}</strong> • Blood: <strong>{currentUser.blood || 'O+'}</strong>
                </p>
                {currentUser.strikes > 0 && (
                  <p style={{ color: 'var(--accent-sos)', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '4px' }}>
                    ⚠️ Penalty Warning: {currentUser.strikes} False Alarm Strikes
                  </p>
                )}
              </div>

              {!activeAlertId ? (
                <>
                  <h3 className="silent-hide" style={{ fontSize: '1.1rem', textAlign: 'center' }}>Need Help? Pick a Category</h3>
                  
                  {/* Category Selection Grid */}
                  <div className="category-pill-grid silent-hide">
                    {categories.map(cat => {
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                          style={{
                            '--active-color': cat.color,
                            '--active-rgb': cat.rgb
                          }}
                          onClick={() => setActiveCategory(cat.id)}
                        >
                          <IconComp style={{ color: activeCategory === cat.id ? cat.color : 'inherit' }} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Location and Incident Explanation Inputs */}
                  <div className="silent-hide" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', margin: '6px 0 12px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        📍 Exact Location / Hall / Landmark
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="e.g. Science Complex, Room 14, Main Gate..."
                          value={customLocation}
                          onChange={e => setCustomLocation(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#fff',
                            fontSize: '0.78rem'
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => setCustomLocation(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Campus)`),
                                () => setCustomLocation('Main Campus Quadrangle')
                              );
                            } else {
                              setCustomLocation('Main Campus Quadrangle');
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(0, 82, 212, 0.2)',
                            border: '1px solid rgba(0, 82, 212, 0.4)',
                            color: '#60a5fa',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                          title="Auto-fill with live device GPS"
                        >
                          🎯 GPS
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        📝 Brief Explanation / Details (Optional)
                      </label>
                      <textarea 
                        placeholder="Describe what is happening (e.g. Sudden severe allergy, suspect spotted near hostel, accident...)"
                        value={incidentDescription}
                        onChange={e => setIncidentDescription(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '0.78rem',
                          resize: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Attachment selectors */}
                  <div className="feature-toggle-card silent-hide">
                    <div className="toggle-details">
                      <span>Include Media Attachment</span>
                      <p>Send immediate audio/photo files</p>
                    </div>
                    <select 
                      value={attachment} 
                      onChange={(e) => setAttachment(e.target.value)}
                      style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                    >
                      <option value="none">None</option>
                      <option value="photo">Camera snapshot</option>
                      <option value="voice">12s Voice Note</option>
                    </select>
                  </div>

                  {/* Hold-to-Confirm Button */}
                  <div className="sos-trigger-wrapper">
                    <div className="sos-outer-ring"></div>
                    <svg className="sos-progress-svg">
                      <circle cx="95" cy="95" r="85" className="sos-progress-bg" />
                      <circle 
                        cx="95" 
                        cy="95" 
                        r="85" 
                        className="sos-progress-bar"
                        strokeDasharray="534"
                        strokeDashoffset={534 - (534 * holdProgress) / 100}
                        style={{ stroke: selectedCategoryColor?.color }}
                      />
                    </svg>
                    <button 
                      className="sos-btn"
                      onMouseDown={startSOSHold}
                      onMouseUp={cancelSOSHold}
                      onMouseLeave={cancelSOSHold}
                      onTouchStart={startSOSHold}
                      onTouchEnd={cancelSOSHold}
                      style={{
                        background: `linear-gradient(135deg, ${selectedCategoryColor?.color} 0%, #000000 150%)`,
                        boxShadow: `0 10px 25px rgba(${selectedCategoryColor?.rgb}, 0.3)`
                      }}
                    >
                      <span className="sos-btn-text">SOS</span>
                      <span className="sos-btn-subtext">Hold 3s</span>
                    </button>
                  </div>

                  {/* Settings toggles */}
                  <div className="feature-toggle-card silent-hide">
                    <div className="toggle-details">
                      <span>Stealth / Silent Mode</span>
                      <p>Trigger without screen flashing/sound</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={isSilentMode} 
                        onChange={(e) => setIsSilentMode(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="feature-toggle-card silent-hide">
                    <div className="toggle-details">
                      <span>Anonymous Trigger</span>
                      <p>Hide profile details from responders</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={isAnonymous} 
                        onChange={(e) => setIsAnonymous(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                </>
              ) : (
                /* Active SOS Screen */
                <div className="active-alert-screen">
                  <div className="pulse-circle" style={{ background: selectedCategoryColor?.color }}>
                    <ShieldAlert size={44} />
                  </div>
                  
                  {isSilentMode ? (
                    <div style={{ color: '#2b2d38', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <p style={{ opacity: 0.15 }}>Stealth SOS active...</p>
                      
                      {/* Audio Snippet Sniffing Simulator Visual */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.01)', border: '1px solid rgba(255, 255, 255, 0.01)', padding: '8px', borderRadius: '8px', opacity: 0.2 }}>
                        <span style={{ fontSize: '0.65rem', color: '#555', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <span className="status-dot" style={{ backgroundColor: '#ef4444', width: '6px', height: '6px' }}></span> 
                          🎤 Stealth Audio Uplink Active
                        </span>
                        {activeAlert?.audioClips && activeAlert.audioClips.length > 0 && (
                          <span style={{ fontSize: '0.6rem', color: '#444' }}>
                            Uplinked {activeAlert.audioClips.length} audio frames
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={cancelActiveAlert} 
                        style={{ marginTop: '10px', color: '#222', border: '1px solid #1e202c', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', opacity: 0.15 }}
                      >
                        Cancel Alarm
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 style={{ fontSize: '1.4rem', color: selectedCategoryColor?.color }}>
                        {activeAlert?.category.toUpperCase()} ALERT ACTIVE
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {activeAlert?.isAnonymous ? 'Anonymous SOS Routed.' : `Routed to ${activeAlert?.assignedResponder}.`} Live GPS tracking active.
                      </p>

                      {activeAlert?.attachmentUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
                          {attachment === 'photo' ? <Camera size={14} /> : <Volume2 size={14} />}
                          <span>Attachment Sent: {activeAlert.attachmentUrl}</span>
                        </div>
                      )}

                      {/* Tracker Visual */}
                      <div className="alert-status-tracker">
                        <div className={`tracker-step ${['pending', 'acknowledged', 'responding', 'resolved'].includes(activeAlert?.status) ? 'completed' : ''}`}>
                          <div className="tracker-step-icon">1</div>
                          <div>
                            <strong style={{ fontSize: '0.8rem' }}>Alert Dispatched</strong>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Sent via {activeAlert?.triggeredVia.toUpperCase()}</p>
                          </div>
                        </div>

                        <div className={`tracker-step ${['acknowledged', 'responding', 'resolved'].includes(activeAlert?.status) ? 'completed' : ''}`}>
                          <div className="tracker-step-icon">2</div>
                          <div>
                            <strong style={{ fontSize: '0.8rem' }}>Acknowledged</strong>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              {activeAlert?.status !== 'pending' ? 'Responder confirmed' : 'Awaiting confirmation'}
                            </p>
                          </div>
                        </div>

                        <div className={`tracker-step ${['responding', 'resolved'].includes(activeAlert?.status) ? 'completed' : ''}`}>
                          <div className="tracker-step-icon">3</div>
                          <div>
                            <strong style={{ fontSize: '0.8rem' }}>Responder En Route</strong>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              {activeAlert?.status === 'responding' || activeAlert?.status === 'resolved' ? 'Team is responding' : 'Pending dispatch'}
                            </p>
                          </div>
                        </div>

                        <div className={`tracker-step ${activeAlert?.status === 'resolved' ? 'completed' : ''}`}>
                          <div className="tracker-step-icon">4</div>
                          <div>
                            <strong style={{ fontSize: '0.8rem' }}>Resolved</strong>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              {activeAlert?.status === 'resolved' ? 'Case closed' : 'Action in progress'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {activeAlert?.escalated && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '0.75rem', color: 'var(--accent-sos)' }}>
                          <strong>⚠️ Auto-Escalation Fired</strong>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Responder failed to respond, routing alert to Security command!
                          </p>
                        </div>
                      )}

                      <button 
                        className="action-btn resolve" 
                        onClick={cancelActiveAlert}
                        style={{ width: '100%', padding: '12px' }}
                      >
                        Cancel / Resolve Alert
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Walk With Me Tab */}
          {activeTab === 'walk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <Navigation size={30} style={{ color: '#6366f1' }} />
                <h3 style={{ fontSize: '1.1rem', marginTop: '6px' }}>Walk With Me</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Live GPS escort sharing with your trusted friend during night movement
                </p>
              </div>

              {!walkWithMeActive ? (
                <>
                  {/* Map Preview Card */}
                  <div style={{ 
                    position: 'relative', 
                    height: '160px', 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
                  }}>
                    <img 
                      src="/campus_night_map.jpg" 
                      alt="Campus GPS Satellite Map" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,11,16,0.9) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ color: '#6366f1' }} /> Campus Safe Walkways Monitored
                      </span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        ● Active Sat-GPS
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trusted Friend Phone or Email:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 08012345678 or friend@university.edu.ng" 
                      value={trustedFriend} 
                      onChange={(e) => setTrustedFriend(e.target.value)} 
                    />
                  </div>

                  <button 
                    className="action-btn ack" 
                    onClick={() => {
                      if (!trustedFriend) {
                        alert('Please enter a trusted contact first!');
                        return;
                      }
                      setWalkWithMeActive(true);
                    }}
                    style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Navigation size={16} /> Start Live Path Escort
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '10px', borderRadius: '12px' }}>
                    <span className="status-badge" style={{ margin: '0 auto 6px auto', display: 'table' }}>
                      <span className="status-dot"></span> Live Telemetry Active
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Broadcasting real-time position coordinates to <strong>{trustedFriend}</strong>.
                    </p>
                    
                    <div className="share-link-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', gap: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {window.location.origin}/#/track/{currentUser.matric.replace(/\//g, '')}
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/#/track/${currentUser.matric.replace(/\//g, '')}`);
                          alert('Live tracking link copied to clipboard!');
                        }}
                        style={{ fontSize: '0.65rem', background: '#6366f1', color: '#fff', padding: '4px 8px', borderRadius: '6px', flexShrink: 0 }}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  {/* High-Performance Real-Time GPS Tracking Map */}
                  <GpsMap 
                    lat={9.08 + walkWithMeCoords.y/10000} 
                    lon={7.53 + walkWithMeCoords.x/10000}
                    zoom={17}
                    height="270px"
                    showUserMarker={true}
                    showBreadcrumbTrail={true}
                  />

                  <button 
                    className="action-btn false-alarm" 
                    onClick={() => setWalkWithMeActive(false)}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    End Escort & Stop Sharing Path
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. History & Feedback Tab */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Alert History</h3>
              
              {alerts.filter(a => a.senderMatric === currentUser.matric || (a.isAnonymous && currentUser.matric === 'UG/20/SCI/1021' /* Allow viewing for simulator user */)).length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>No logged emergency alerts.</p>
              ) : (
                alerts
                  .filter(a => a.senderMatric === currentUser.matric || (a.isAnonymous && currentUser.matric === 'UG/20/SCI/1021'))
                  .map(alert => (
                    <div key={alert.id} className="history-item">
                      <div className="history-header">
                        <span className="history-category" style={{ color: categories.find(c => c.id === alert.category)?.color }}>
                          {alert.category}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{alert.timestamp.split(',')[0]}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Status: {alert.status.toUpperCase()}</span>
                        <span style={{ textTransform: 'capitalize' }}>Via: {alert.triggeredVia}</span>
                      </div>

                      {/* Feedback Form for Resolved Alert */}
                      {alert.status === 'resolved' && !alert.feedback && (
                        <div style={{ marginTop: '10px', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Rate Responder Service</span>
                          
                          <div style={{ display: 'flex', margin: '6px 0' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star} 
                                className={`rating-star-btn ${star <= feedbackRating ? 'active' : ''}`}
                                onClick={() => setFeedbackRating(star)}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          
                          <input 
                            type="text" 
                            placeholder="Add a comment..." 
                            value={feedbackComment} 
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            style={{ width: '100%', fontSize: '0.7rem', padding: '6px', marginBottom: '6px' }}
                          />
                          <button 
                            className="action-btn resolve" 
                            style={{ width: '100%', fontSize: '0.65rem', padding: '6px' }}
                            onClick={() => submitFeedback(alert.id)}
                          >
                            Submit Feedback
                          </button>
                        </div>
                      )}

                      {alert.feedback && (
                        <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(16,185,129,0.05)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.1)' }}>
                          <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{'★'.repeat(alert.feedback.rating)}</div>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>"{alert.feedback.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 4. Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>User Registration Profile</h3>
              
              {!isRegistering ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Full Name:</span>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.name}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Matric ID / Staff ID:</span>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.matric}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Blood Group:</span>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.blood}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Allergies:</span>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.allergies || 'None'}</p>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Next of Kin:</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.emergencyContact}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Verified Email:</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.email}</p>
                  </div>

                  <button 
                    className="action-btn ack" 
                    onClick={() => {
                      setRegForm(currentUser);
                      setIsRegistering(true);
                    }}
                    style={{ width: '100%', padding: '10px', background: '#272a3d', marginTop: '10px' }}
                  >
                    Edit Registration Details
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setUsers(prev => prev.map(u => u.matric === regForm.matric ? { ...regForm, strikes: u.strikes } : u));
                    setCurrentUser({ ...regForm, strikes: currentUser.strikes });
                    setIsRegistering(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <input type="text" placeholder="Full Name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
                  <input type="text" placeholder="Matric / Staff ID" value={regForm.matric} disabled style={{ opacity: 0.5 }} />
                  <input type="text" placeholder="Phone Number" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} required />
                  <input type="text" placeholder="Blood Group" value={regForm.blood} onChange={(e) => setRegForm({ ...regForm, blood: e.target.value })} />
                  <input type="text" placeholder="Allergies" value={regForm.allergies} onChange={(e) => setRegForm({ ...regForm, allergies: e.target.value })} />
                  <input type="text" placeholder="Next of Kin Contact" value={regForm.emergencyContact} onChange={(e) => setRegForm({ ...regForm, emergencyContact: e.target.value })} required />
                  <input type="email" placeholder="School Email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" className="action-btn false-alarm" style={{ flex: 1 }} onClick={() => setIsRegistering(false)}>Cancel</button>
                    <button type="submit" className="action-btn resolve" style={{ flex: 1 }}>Save Changes</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 5. Contacts & Directory Tab */}
          {activeTab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1rem' }}>Emergency Directory</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Direct campus responders & 24/7 emergency units
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {EMERGENCY_CONTACTS.map(contact => {
                  const IconComp = contact.icon;
                  return (
                    <div key={contact.id} className="contact-card">
                      <div className="contact-card-header">
                        <div className="contact-icon-box" style={{ color: contact.color, borderColor: contact.color }}>
                          <IconComp size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.85rem' }}>{contact.name}</h4>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
                            ● {contact.hours}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {contact.role}
                      </p>

                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        📞 {contact.phone}
                      </div>

                      <div className="contact-actions">
                        <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`} className="contact-call-btn">
                          <PhoneCall size={13} /> Call Hotline
                        </a>
                        <button 
                          className="contact-sos-btn"
                          onClick={() => {
                            setActiveCategory(contact.category);
                            setActiveTab('sos');
                          }}
                        >
                          <ShieldAlert size={13} style={{ color: contact.color }} /> Route SOS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Phone Bottom Tab Navigator */}
        <nav className="phone-navbar silent-hide">
          <button className={`nav-tab ${activeTab === 'sos' ? 'active' : ''}`} onClick={() => setActiveTab('sos')}>
            <ShieldAlert />
            <span>SOS</span>
          </button>
          <button className={`nav-tab ${activeTab === 'walk' ? 'active' : ''}`} onClick={() => setActiveTab('walk')}>
            <Navigation />
            <span>Walk</span>
          </button>
          <button className={`nav-tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            <PhoneCall />
            <span>Contacts</span>
          </button>
          <button className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <History />
            <span>History</span>
          </button>
          <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User />
            <span>Profile</span>
          </button>
        </nav>


      </div>
    </div>
  );
}

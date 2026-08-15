import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  BarChart2, 
  Radio, 
  UserMinus, 
  Shield, 
  PhoneCall, 
  Clock, 
  AlertOctagon, 
  CheckCircle,
  Send,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldAlert,
  HeartPulse,
  Flame,
  GraduationCap,
  Users,
  Building
} from 'lucide-react';
import GpsMap from './GpsMap';
import { audioAlerts, emergencyBus } from '../utils/audioAlerts';
import { updateAlertInCloud, pushBroadcastToCloud, deleteAlertFromCloud, deleteBroadcastFromCloud, deleteUserFromCloud } from '../services/firebase';

const DEPARTMENT_DESKS = [
  {
    id: 'all',
    name: 'Unified Central Command Desk',
    shortName: 'Central Command',
    categoryFilter: null,
    icon: Shield,
    themeColor: '#6366f1',
    description: 'Central campus-wide oversight & multi-unit coordination'
  },
  {
    id: 'security',
    name: 'Campus Security & Patrol Desk',
    shortName: 'Security Desk',
    categoryFilter: ['security'],
    icon: ShieldAlert,
    themeColor: '#ef4444',
    description: 'Physical threats, intruders, theft, assault & auto-escalations'
  },
  {
    id: 'medical',
    name: 'University Health Centre Medical Desk',
    shortName: 'Health Centre',
    categoryFilter: ['medical'],
    icon: HeartPulse,
    themeColor: '#10b981',
    description: 'Ambulance triage, medical emergencies & student health records'
  },
  {
    id: 'fire',
    name: 'Campus Fire Safety & Warden Desk',
    shortName: 'Fire & Warden Desk',
    categoryFilter: ['fire'],
    icon: Flame,
    themeColor: '#f97316',
    description: 'Fire outbreaks, hostel room safety hazards & building evacuations'
  },
  {
    id: 'harassment',
    name: 'Dean of Student Affairs (DSA) Desk',
    shortName: 'DSA Welfare Desk',
    categoryFilter: ['harassment'],
    icon: GraduationCap,
    themeColor: '#d946ef',
    description: 'Confidential harassment/GBV triage, disciplinary reviews & strikes'
  }
];

export default function AdminDashboard({
  alerts = [],
  setAlerts,
  users = [],
  setUsers,
  applyUserStrike,
  broadcasts = [],
  setBroadcasts,
  CAMPUS_LOCATIONS,
  currentUser,
  onOpenAuth,
  onLogout
}) {
  // Safely compute active department desk from logged-in officer
  const activeDesk = currentUser?.desk || 'security';
  const activeDeskObj = DEPARTMENT_DESKS.find(d => d.id === activeDesk) || DEPARTMENT_DESKS[1] || DEPARTMENT_DESKS[0];
  const DeptIcon = activeDeskObj?.icon || Shield;

  const [activeTab, setActiveTab] = useState('live'); // 'live', 'broadcast', 'analytics', 'penalties'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'active', 'resolved'
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [adminMapType, setAdminMapType] = useState('blueprint'); // 'blueprint' or 'google'
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTestingSiren, setIsTestingSiren] = useState(false);
  const [responderNoteText, setResponderNoteText] = useState('');

  // Broadcast form states
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcCategory, setBcCategory] = useState('warning');

  // Heatmap Canvas Ref
  const canvasRef = useRef(null);
  const prevAlertsCountRef = useRef(alerts.length);

  // Cross-tab real-time emergency listener
  useEffect(() => {
    const handleBusMessage = (event) => {
      if (event.data && event.data.type === 'NEW_EMERGENCY_ALERT') {
        const incoming = event.data.alert;
        setAlerts(prev => {
          if (prev.some(a => a.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        setSelectedAlertId(incoming.id);
        if (!isAudioMuted) {
          audioAlerts.unlockAudio();
          audioAlerts.playEmergencySiren();
        }
      }
    };

    if (emergencyBus.addEventListener) {
      emergencyBus.addEventListener('message', handleBusMessage);
    } else if (emergencyBus.onmessage !== undefined) {
      emergencyBus.onmessage = handleBusMessage;
    }

    return () => {
      if (emergencyBus.removeEventListener) {
        emergencyBus.removeEventListener('message', handleBusMessage);
      }
    };
  }, [isAudioMuted, setAlerts]);

  // Play emergency dispatch siren on Admin Dashboard when incoming pending alert arrives
  useEffect(() => {
    // Strictly filter alerts for this specific department to avoid false sirens for other desks
    const deskAlerts = alerts.filter(a => {
      if (activeDeskObj.categoryFilter && !activeDeskObj.categoryFilter.includes(a.category)) {
        return false;
      }
      return true;
    });

    const hasPending = deskAlerts.some(a => a.status === 'pending');
    
    if (hasPending && !isAudioMuted) {
      audioAlerts.unlockAudio();
      audioAlerts.playEmergencySiren();
    } else if (!hasPending && !isTestingSiren) {
      audioAlerts.stopEmergencySiren();
    }

    return () => {
      audioAlerts.stopEmergencySiren();
    };
  }, [alerts, isAudioMuted, isTestingSiren, activeDeskObj]);

  // Status handlers
  const updateAlertStatus = (id, newStatus, assigned = null) => {
    // Silence siren when responder starts handling the emergency
    audioAlerts.stopEmergencySiren();

    if (!isAudioMuted && (newStatus === 'acknowledged' || newStatus === 'resolved')) {
      audioAlerts.playSuccessChime();
    }

    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: newStatus,
          assignedResponder: assigned || a.assignedResponder,
          notes: newStatus === 'resolved' ? 'Resolved by responder.' : a.notes
        };
      }
      return a;
    }));
    
    // Sync status change to Firebase Cloud Database
    const cloudUpdates = { status: newStatus };
    if (assigned) {
      cloudUpdates.assignedResponder = assigned;
    }
    if (newStatus === 'resolved') {
      cloudUpdates.notes = 'Resolved by responder.';
    }
    updateAlertInCloud(id, cloudUpdates);
  };

  // Add Responder Field Note & Explanation
  const handleAddResponderNote = (alertId) => {
    if (!responderNoteText.trim()) return;
    const newNote = {
      id: Date.now(),
      text: responderNoteText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Security Dispatch'
    };
    setAlerts(prev => prev.map(a => {
      if (a.id === alertId) {
        const currentNotes = a.responderNotes || [];
        return { ...a, responderNotes: [...currentNotes, newNote] };
      }
      return a;
    }));
    
    // Sync notes to Firebase Cloud Database
    const targetAlert = alerts.find(a => a.id === alertId);
    if (targetAlert) {
      updateAlertInCloud(alertId, {
        responderNotes: [...(targetAlert.responderNotes || []), newNote]
      });
    }

    setResponderNoteText('');
  };

  // False Alarm / Penalty Trigger
  const handleFalseAlarm = (alertItem) => {
    if (alertItem.senderMatric === 'ANON') {
      alert('Cannot penalize anonymous reports.');
      return;
    }

    // Apply Strike to the User
    applyUserStrike(alertItem.senderMatric);

    // Resolve incident as False Alarm
    setAlerts(prev => prev.map(a => {
      if (a.id === alertItem.id) {
        return {
          ...a,
          status: 'resolved',
          notes: 'RESOLVED AS FALSE ALARM - Disciplinary action triggered.'
        };
      }
      return a;
    }));

    alert(`Alert flagged as False. Strike logged for student: ${alertItem.senderName}.`);
  };

  // Delete Alert permanently
  const handleDeleteAlert = (alertId) => {
    if (!window.confirm('🚨 Permanent Action: Are you sure you want to permanently delete this emergency alert document from the database? This cannot be undone.')) {
      return;
    }
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setSelectedAlertId(null);
    deleteAlertFromCloud(alertId);
    alert('Alert deleted successfully.');
  };

  // Delete Broadcast permanently
  const handleDeleteBroadcast = (broadcastId) => {
    if (!window.confirm('🚨 Permanent Action: Are you sure you want to permanently delete this broadcast advisory?')) {
      return;
    }
    setBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
    deleteBroadcastFromCloud(broadcastId);
    alert('Broadcast deleted successfully.');
  };

  // Delete User permanently
  const handleDeleteUser = (userId) => {
    if (!window.confirm('🚨 Permanent Action: Are you sure you want to permanently delete this student profile account from the system?')) {
      return;
    }
    if (setUsers) {
      setUsers(prev => prev.filter(u => (u.uid === userId || u.matric === userId) ? false : true));
    }
    deleteUserFromCloud(userId);
    alert('User account deleted successfully.');
  };

  // Post Broadcast
  const handlePostBroadcast = (e) => {
    e.preventDefault();
    if (!bcTitle || !bcMessage) return;

    const newBroadcast = {
      id: `bc-${Date.now()}`,
      title: bcTitle,
      message: bcMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: bcCategory
    };

    setBroadcasts(prev => [newBroadcast, ...prev]);
    pushBroadcastToCloud(newBroadcast);
    setBcTitle('');
    setBcMessage('');
    alert('Campus Broadcast Sent Successfully!');
  };

  // Render heat-map clusters when Analytics tab loaded
  useEffect(() => {
    if (activeTab === 'analytics' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw vector outline representation of campus map onto canvas as a backdrop
      ctx.fillStyle = '#0d0f17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw coordinates lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
      }

      // Plot coordinates
      alerts.forEach(alert => {
        const { x, y } = alert.coordinates;
        // Scaled coordinates mapping
        const scaleX = (x / 1000) * canvas.width;
        const scaleY = (y / 600) * canvas.height;

        // Draw heat radius (blur circle)
        const radGrad = ctx.createRadialGradient(scaleX, scaleY, 4, scaleX, scaleY, 45);
        
        let colorStart = 'rgba(239, 68, 68, 0.6)';
        if (alert.category === 'medical') colorStart = 'rgba(16, 185, 129, 0.6)';
        if (alert.category === 'fire') colorStart = 'rgba(249, 115, 22, 0.6)';
        
        radGrad.addColorStop(0, colorStart);
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(scaleX, scaleY, 45, 0, 2 * Math.PI);
        ctx.fill();

        // Pin center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(scaleX, scaleY, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, [activeTab, alerts]);

  // Helper colors
  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'medical': return 'var(--color-medical)';
      case 'security': return 'var(--color-security)';
      case 'fire': return 'var(--color-fire)';
      case 'harassment': return 'var(--color-harass)';
      default: return 'var(--color-other)';
    }
  };

  // Get department dispatch base coordinates
  const getDeptBase = (deskId) => {
    switch (deskId) {
      case 'medical':
        return { x: 300, y: 140, name: 'Health Centre Ambulance Base', icon: '🚑', color: '#10b981' };
      case 'fire':
        return { x: 680, y: 340, name: 'Hostel Fire & Warden Base', icon: '🚒', color: '#f97316' };
      case 'harassment':
        return { x: 480, y: 300, name: 'DSA Welfare Unit', icon: '⚖️', color: '#d946ef' };
      case 'all':
        return { x: 150, y: 480, name: 'Central Command Post', icon: '🌐', color: '#6366f1' };
      default:
        return { x: 150, y: 480, name: 'Main Security Post Base', icon: '🚓', color: '#ef4444' };
    }
  };

  const deptBase = getDeptBase(activeDesk);

  // Alert filter logic: Strictly filter by officer's isolated department
  const filteredAlerts = alerts.filter(a => {
    // 1. Department desk isolation filtering
    if (activeDeskObj.categoryFilter && !activeDeskObj.categoryFilter.includes(a.category)) {
      return false;
    }
    // 2. Status filtering
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return a.status === 'pending';
    if (filterStatus === 'active') return ['acknowledged', 'responding'].includes(a.status);
    if (filterStatus === 'resolved') return a.status === 'resolved';
    return true;
  });

  const selectedAlert = alerts.find(a => a.id === selectedAlertId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      
      {/* 1. Isolated Dedicated Department Header Banner */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: `1px solid ${activeDeskObj.themeColor}50`, 
        borderRadius: '14px', 
        padding: '12px 18px',
        boxShadow: `0 4px 20px ${activeDeskObj.themeColor}15`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Department Branding & Emblem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: `${activeDeskObj.themeColor}20`,
              border: `1px solid ${activeDeskObj.themeColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeDeskObj.themeColor
            }}>
              <DeptIcon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: activeDeskObj.themeColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  ● AUTHORIZED DEPARTMENT PORTAL
                </span>
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {activeDeskObj.name}
              </h2>
            </div>
          </div>

          {/* Officer Profile & Sign Out Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{currentUser.name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Badge ID: {currentUser.badgeId} • {currentUser.unit}</span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              style={{
                fontSize: '0.75rem',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Sign out of this department desk and return to portal"
            >
              🚪 Officer Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* 2. Admin Tab Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <nav className="admin-tabs" style={{ marginBottom: 0 }}>
          <button className={`admin-tab ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
            <Map size={16} /> Live Incident Desk
          </button>
          <button className={`admin-tab ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
            <Radio size={16} /> Department Broadcasts
          </button>
          <button className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart2 size={16} /> Hotspots & Heatmap
          </button>
          <button className={`admin-tab ${activeTab === 'penalties' ? 'active' : ''}`} onClick={() => setActiveTab('penalties')}>
            <UserMinus size={16} /> Misuse & Penalties
          </button>
        </nav>

        {/* Audio Dispatch Sound Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => {
              audioAlerts.unlockAudio();
              if (isTestingSiren || audioAlerts.isSirenPlaying) {
                audioAlerts.stopEmergencySiren();
                setIsTestingSiren(false);
              } else {
                audioAlerts.playEmergencySiren();
                setIsTestingSiren(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: isTestingSiren ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: isTestingSiren ? '#ffffff' : '#ef4444',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              animation: isTestingSiren ? 'pulse-dot 1s infinite' : 'none'
            }}
            title="Test the loud emergency siren through your speakers"
          >
            <AlertOctagon size={15} />
            <span>{isTestingSiren ? '🚨 Stop Siren Test' : '🚨 Test Dispatch Siren'}</span>
          </button>

          <button 
            onClick={() => {
              const nextState = !isAudioMuted;
              setIsAudioMuted(nextState);
              audioAlerts.isAudioMuted = nextState;
              if (nextState) {
                audioAlerts.stopEmergencySiren();
                setIsTestingSiren(false);
              } else {
                audioAlerts.unlockAudio();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: isAudioMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${isAudioMuted ? '#ef4444' : '#10b981'}`,
              color: isAudioMuted ? '#ef4444' : '#10b981',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Toggle dispatch siren and chime audio alert"
          >
            {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isAudioMuted ? 'Dispatch Audio Muted' : '🔊 Dispatch Audio Active'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="admin-content">
        
        {/* 1. Live Responding View */}
        {activeTab === 'live' && (
          <div className="admin-dashboard-view">
            
            {/* Sidebar Feed */}
            <div className="alerts-sidebar">
              <div className="section-title">
                <span>Active Incident Queue</span>
                <span className="badge-count">{filteredAlerts.length} Alerts</span>
              </div>

              {/* Status filter buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                {['all', 'pending', 'active', 'resolved'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      fontSize: '0.65rem',
                      padding: '4px 8px',
                      background: filterStatus === status ? '#6366f1' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: filterStatus === status ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {status.toUpperCase()}
                  </button>
                ))}
              </div>

              {filteredAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', background: 'var(--bg-tertiary)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  No alerts matched.
                </div>
              ) : (
                filteredAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`alert-card ${alert.status} ${selectedAlertId === alert.id ? 'focused' : ''}`}
                    onClick={() => setSelectedAlertId(alert.id)}
                    style={{
                      borderWidth: selectedAlertId === alert.id ? '2px' : '1px',
                      borderColor: selectedAlertId === alert.id ? '#6366f1' : 'var(--border-color)'
                    }}
                  >
                    <div className="alert-card-header">
                      <span 
                        className="alert-category-tag" 
                        style={{ background: getCategoryColor(alert.category) }}
                      >
                        {alert.category}
                      </span>
                      <span className="alert-time">{alert.timestamp.split(',')[1]}</span>
                    </div>

                    <div className="alert-sender-info">
                      <h4>{alert.senderName}</h4>
                      <p>Loc: {alert.locationName}</p>
                    </div>

                    <div className="alert-card-footer">
                      <span className="alert-status-lbl">
                        <span className="status-dot" style={{ color: 
                          alert.status === 'pending' ? 'var(--status-pending)' :
                          alert.status === 'resolved' ? 'var(--status-resolved)' : 'var(--status-ack)'
                        }}></span>
                        {alert.status.toUpperCase()}
                      </span>
                      
                      {alert.isSilent && (
                        <span style={{ color: 'var(--accent-sos)', fontWeight: 'bold', fontSize: '0.65rem' }}>
                          🔇 SILENT
                        </span>
                      )}

                      {alert.escalated && (
                        <span style={{ color: 'var(--accent-sos)', fontWeight: 'bold', fontSize: '0.65rem', animation: 'pulse-dot 1s infinite' }}>
                          ⚠️ ESCALATED
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Canvas Interactive Blueprint Map */}
            <div className="map-view-container">
              <div className="map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>University Campus Live Dispatch Map</strong>
                  <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {adminMapType === 'blueprint' ? 'Tactical Vector Blueprint' : 'Interactive Google Maps Live'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setAdminMapType('blueprint')}
                    style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: adminMapType === 'blueprint' ? '#6366f1' : 'transparent', color: '#fff', fontWeight: 600 }}
                  >
                    Tactical Blueprint
                  </button>
                  <button 
                    onClick={() => setAdminMapType('gps')}
                    style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: adminMapType === 'gps' ? '#6366f1' : 'transparent', color: '#fff', fontWeight: 600 }}
                  >
                    Realtime GPS Map
                  </button>
                </div>
              </div>

              <div className="map-canvas-area">
                {adminMapType === 'gps' ? (
                  /* High-Performance Realtime GPS Engine plotting all active incidents */
                  <GpsMap 
                    lat={selectedAlert ? (9.08 + selectedAlert.coordinates.y/10000) : 9.0950}
                    lon={selectedAlert ? (7.53 + selectedAlert.coordinates.x/10000) : 7.5500}
                    zoom={16}
                    height="100%"
                    showUserMarker={false}
                    showBreadcrumbTrail={false}
                    markers={alerts
                      .filter(a => ['pending', 'acknowledged', 'responding'].includes(a.status))
                      .map(a => ({
                        lat: 9.08 + a.coordinates.y/10000,
                        lon: 7.53 + a.coordinates.x/10000,
                        title: `${a.senderName} (${a.locationName})`,
                        category: a.category,
                        id: a.id
                      }))
                    }
                    onMarkerClick={(m) => setSelectedAlertId(m.id)}
                  />
                ) : (
                  /* SVG Blueprint Representation */
                  <svg className="campus-vector-map" viewBox="0 0 1000 600">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="grid" width="40" width-units="userSpaceOnUse" height="40" height-units="userSpaceOnUse" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Roads Grid */}
                  <path className="map-road" d="M 150,50 L 150,550 M 150,300 L 850,300 M 750,100 L 750,500 M 300,150 L 750,150" />

                  {/* Map Buildings */}
                  <rect 
                    x="80" y="440" width="140" height="80" rx="6" 
                    className={`map-building ${activeDesk === 'security' || activeDesk === 'all' ? 'base-highlight' : ''}`}
                    stroke={activeDesk === 'security' ? '#ef4444' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={activeDesk === 'security' ? 2 : 1}
                  />
                  <text x="150" y="485" className="map-label" fill="#fff">Main Security Post</text>

                  <rect 
                    x="230" y="100" width="140" height="80" rx="6" 
                    className={`map-building ${activeDesk === 'medical' ? 'base-highlight' : ''}`}
                    stroke={activeDesk === 'medical' ? '#10b981' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={activeDesk === 'medical' ? 2 : 1}
                  />
                  <text x="300" y="145" className="map-label" fill="#fff">Health Centre</text>

                  <rect 
                    x="680" y="140" width="140" height="80" rx="6" 
                    className="map-building" 
                  />
                  <text x="750" y="185" className="map-label">East Campus Quad</text>

                  <rect 
                    x="680" y="340" width="140" height="80" rx="6" 
                    className={`map-building ${activeDesk === 'fire' ? 'base-highlight' : ''}`}
                    stroke={activeDesk === 'fire' ? '#f97316' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={activeDesk === 'fire' ? 2 : 1}
                  />
                  <text x="750" y="385" className="map-label" fill="#fff">Student Halls Area</text>

                  <rect 
                    x="410" y="260" width="140" height="80" rx="6" 
                    className={`map-building ${activeDesk === 'harassment' ? 'base-highlight' : ''}`}
                    stroke={activeDesk === 'harassment' ? '#d946ef' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={activeDesk === 'harassment' ? 2 : 1}
                  />
                  <text x="480" y="305" className="map-label" fill="#fff">Dean of Students</text>

                  <rect 
                    x="550" y="80" width="140" height="80" rx="6" 
                    className="map-building" 
                  />
                  <text x="620" y="125" className="map-label">SUG Secretariat</text>

                  <rect 
                    x="210" y="300" width="140" height="80" rx="6" 
                    className="map-building" 
                  />
                  <text x="280" y="345" className="map-label">Academic Complex</text>

                  {/* Active Department Base Dispatch Station Marker */}
                  <g transform={`translate(${deptBase.x}, ${deptBase.y})`}>
                    <circle cx="0" cy="0" r="16" fill={deptBase.color} opacity="0.25" />
                    <circle cx="0" cy="0" r="8" fill={deptBase.color} />
                    <text x="0" y="22" textAnchor="middle" fill={deptBase.color} fontSize="10" fontWeight="bold">
                      {deptBase.icon} {deptBase.name.split(' ')[0]} Base
                    </text>
                  </g>

                  {/* Draw correlated dispatch route from Department Base to target incident */}
                  {selectedAlert && ['pending', 'acknowledged', 'responding'].includes(selectedAlert.status) && (
                    <g>
                      <line 
                        x1={deptBase.x} y1={deptBase.y} 
                        x2={selectedAlert.coordinates.x} y2={selectedAlert.coordinates.y} 
                        stroke={deptBase.color} strokeWidth="3" strokeDasharray="8,8"
                      />
                      {/* Midpoint Dispatch En-Route Vehicle Badge */}
                      <g transform={`translate(${(deptBase.x + selectedAlert.coordinates.x)/2}, ${(deptBase.y + selectedAlert.coordinates.y)/2})`}>
                        <rect x="-40" y="-12" width="80" height="24" rx="12" fill="var(--bg-primary)" stroke={deptBase.color} strokeWidth="1.5" />
                        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                          {deptBase.icon} EN-ROUTE
                        </text>
                      </g>
                    </g>
                  )}

                  {/* Active Alert Map Pins */}
                  {filteredAlerts
                    .filter(a => ['pending', 'acknowledged', 'responding'].includes(a.status))
                    .map(alert => {
                      const isSelected = selectedAlertId === alert.id;
                      const catColor = getCategoryColor(alert.category);
                      return (
                        <g 
                          key={alert.id} 
                          className="map-pin" 
                          transform={`translate(${alert.coordinates.x}, ${alert.coordinates.y})`}
                          onClick={() => setSelectedAlertId(alert.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx="0" cy="0" r={isSelected ? "24" : "18"} fill="none" stroke={catColor} strokeWidth="2.5" className="map-pin-pulse" />
                          <circle cx="0" cy="0" r={isSelected ? "11" : "8"} fill={catColor} className="map-pin-circle" />
                          
                          {/* Pin Label Tag */}
                          <rect x="-45" y="-32" width="90" height="18" rx="6" fill="var(--bg-secondary)" stroke={catColor} strokeWidth="1" />
                          <text x="0" y="-20" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                            📍 {alert.senderName.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })
                  }
                </svg>
                )}

                {/* Detail overlay panel for selected incident */}
                {selectedAlert && (
                  <div className="map-overlay-detail">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: getCategoryColor(selectedAlert.category) }}>
                        {selectedAlert.category.toUpperCase()} ALERT
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Case ID: {selectedAlert.id}</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p><strong>Reporter:</strong> {selectedAlert.senderName} ({selectedAlert.senderMatric})</p>
                      <p><strong>Phone:</strong> {selectedAlert.senderPhone}</p>
                      <p><strong>Medical Details:</strong> Blood {selectedAlert.senderBlood} | Allergies: {selectedAlert.senderAllergies}</p>
                      <p><strong>Next of Kin:</strong> {selectedAlert.senderContact}</p>
                      <p><strong>Location Spot:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{selectedAlert.locationName}</span></p>
                      <p><strong>Assigned Response Unit:</strong> <span style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>{selectedAlert.assignedResponder || (selectedAlert.category === 'medical' ? 'University Health Centre' : 'Campus Security Unit')}</span></p>
                      <p><strong>Dispatch Method:</strong> Triggered via {selectedAlert.triggeredVia.toUpperCase()}</p>
                      
                      {/* Student's Emergency Explanation */}
                      {selectedAlert.description && (
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #6366f1', marginTop: '6px' }}>
                          <strong style={{ fontSize: '0.7rem', color: '#818cf8', display: 'block', marginBottom: '2px' }}>
                            STUDENT EMERGENCY EXPLANATION:
                          </strong>
                          <p style={{ fontSize: '0.78rem', color: '#fff', margin: 0, fontStyle: 'italic' }}>
                            "{selectedAlert.description}"
                          </p>
                        </div>
                      )}

                      {/* Incident Media Attachment (Photo or Audio) */}
                      {selectedAlert.attachmentUrl && (
                        <div style={{ marginTop: '8px', background: 'rgba(251, 191, 36, 0.05)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                          {selectedAlert.attachmentUrl.startsWith('data:image/') ? (
                            <>
                              <strong style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', display: 'block', marginBottom: '6px' }}>
                                📸 ATTACHED INCIDENT PHOTO:
                              </strong>
                              <a href={selectedAlert.attachmentUrl} target="_blank" rel="noreferrer">
                                <img 
                                  src={selectedAlert.attachmentUrl} 
                                  alt="Attached Incident" 
                                  style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'zoom-in' }} 
                                />
                              </a>
                            </>
                          ) : selectedAlert.attachmentUrl.startsWith('data:audio/') ? (
                            <>
                              <strong style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', display: 'block', marginBottom: '6px' }}>
                                🔊 ATTACHED VOICE MEMO (12s):
                              </strong>
                              <audio 
                                controls 
                                src={selectedAlert.attachmentUrl} 
                                style={{ width: '100%', height: '32px' }} 
                              />
                            </>
                          ) : (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              🔗 <a href={selectedAlert.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Download Attachment File</a>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Responder Field Notes & Explanation Log */}
                      <div style={{ marginTop: '8px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.72rem', color: 'var(--brand-orange)', display: 'block', marginBottom: '4px' }}>
                          ✍️ RESPONDER ACTION NOTES & EXPLANATION:
                        </strong>
                        
                        {selectedAlert.responderNotes && selectedAlert.responderNotes.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                            {selectedAlert.responderNotes.map(n => (
                              <div key={n.id} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', padding: '5px 8px', borderRadius: '6px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>[{n.timestamp} - {n.author}]: </span>
                                <span>{n.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            No responder explanation notes logged yet.
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type="text" 
                            placeholder="Type officer explanation / situation update..."
                            value={responderNoteText}
                            onChange={e => setResponderNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddResponderNote(selectedAlert.id); }}
                            style={{
                              flex: 1,
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.72rem',
                              color: '#fff'
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => handleAddResponderNote(selectedAlert.id)}
                            style={{
                              background: 'var(--brand-blue-gradient)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Add Note
                          </button>
                        </div>
                      </div>

                      {/* Google Maps Turn-by-Turn Driving Navigation button */}
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${(9.08 + selectedAlert.coordinates.y/10000).toFixed(5)},${(7.53 + selectedAlert.coordinates.x/10000).toFixed(5)}`}
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#2563eb', color: '#fff', padding: '7px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none', marginTop: '4px' }}
                      >
                        🚗 Turn-by-Turn Google Maps Route
                      </a>
                    </div>

                    {/* Stealth Audio Sniffer Widget */}
                    {selectedAlert.isSilent && (
                      <div style={{ marginTop: '4px', padding: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="status-dot" style={{ backgroundColor: '#ef4444', width: '6px', height: '6px' }}></span> 
                          🎤 Live Audio Sniffing Uplink
                        </span>
                        
                        {(!selectedAlert.audioClips || selectedAlert.audioClips.length === 0) ? (
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Awaiting audio clip feed (sniffs every 10s)...
                          </p>
                        ) : (
                          <div style={{ maxHeight: '90px', overflowY: 'auto', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedAlert.audioClips.map((clip, idx) => (
                              <div key={idx} style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                  <span>🔊 {clip.clipName}</span>
                                  <span>{clip.timestamp}</span>
                                </div>
                                <p style={{ color: '#10b981', fontStyle: 'italic', margin: 0 }}>Transcript: "{clip.transcript}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Incident control actions */}
                    <div className="overlay-actions-row" style={{ marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      {['pending', 'acknowledged', 'responding'].includes(selectedAlert.status) && (
                        <>
                          {selectedAlert.status === 'pending' && (
                            <button 
                              className="action-btn ack" 
                              onClick={() => updateAlertStatus(selectedAlert.id, 'acknowledged')}
                            >
                              ACK
                            </button>
                          )}
                          {['pending', 'acknowledged'].includes(selectedAlert.status) && (
                            <button 
                              className="action-btn respond" 
                              onClick={() => updateAlertStatus(selectedAlert.id, 'responding')}
                            >
                              DISPATCH
                            </button>
                          )}
                          <button 
                            className="action-btn resolve" 
                            onClick={() => updateAlertStatus(selectedAlert.id, 'resolved')}
                          >
                            RESOLVE
                          </button>
                          <button 
                            className="action-btn false-alarm" 
                            style={{ background: 'var(--accent-sos)' }}
                            onClick={() => handleFalseAlarm(selectedAlert)}
                          >
                            FALSE ALARM
                          </button>
                        </>
                      )}
                      
                      {/* Delete Alert Button (Available for all statuses to clean up tests/false alarms) */}
                      <button 
                        className="action-btn"
                        style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fff', flex: 1, minWidth: '90px' }}
                        onClick={() => handleDeleteAlert(selectedAlert.id)}
                      >
                        🗑️ DELETE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Broadcasts view */}
        {activeTab === 'broadcast' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Send Campus-Wide Broadcast</h3>
            <form onSubmit={handlePostBroadcast} className="broadcast-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title / Danger Level:</label>
                <input 
                  type="text" 
                  placeholder="e.g. Fire in Male Hostel Block A" 
                  value={bcTitle} 
                  onChange={(e) => setBcTitle(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alert Message Description:</label>
                <textarea 
                  placeholder="Provide immediate instructions for students (evacuation paths, safety posts)..." 
                  value={bcMessage} 
                  rows={4}
                  onChange={(e) => setBcMessage(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Broadcast Classification:</label>
                <select 
                  value={bcCategory} 
                  onChange={(e) => setBcCategory(e.target.value)}
                >
                  <option value="info">Information (Blue)</option>
                  <option value="warning">Warning / Alert (Amber)</option>
                  <option value="danger">Critical Emergency (Red)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="action-btn resolve" 
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Send size={16} /> Broadcast Incident Notice
              </button>
            </form>

            <h4 style={{ marginTop: '30px', marginBottom: '12px' }}>Past Broadcasts Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {broadcasts.map(bc => (
                <div 
                  key={bc.id} 
                  style={{ 
                    padding: '12px', 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    borderLeft: `4px solid ${
                      bc.category === 'danger' ? 'var(--accent-sos)' : bc.category === 'warning' ? '#f59e0b' : '#3b82f6'
                    }` 
                  }}
                >
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>{bc.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{bc.timestamp}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteBroadcast(bc.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', padding: '2px 4px' }}
                        title="Delete this advisory"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>{bc.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Hotspots & Heatmap Analytics */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div className="analytics-grid">
              <div className="stat-card">
                <Shield size={24} style={{ color: '#ef4444', margin: '0 auto' }} />
                <div className="stat-val">{alerts.length}</div>
                <div className="stat-lbl">Total Logged Incidents</div>
              </div>
              <div className="stat-card">
                <AlertOctagon size={24} style={{ color: '#f59e0b', margin: '0 auto' }} />
                <div className="stat-val">
                  {((alerts.filter(a => a.notes?.includes('FALSE')).length / (alerts.length || 1)) * 100).toFixed(0)}%
                </div>
                <div className="stat-lbl">False Alarm Ratio</div>
              </div>
              <div className="stat-card">
                <Clock size={24} style={{ color: '#10b981', margin: '0 auto' }} />
                <div className="stat-val">2.8m</div>
                <div className="stat-lbl">Avg Response Speed</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <strong>Campus Density Incident Hotspot Clusters (Canvas overlay)</strong>
                <span>Density clusters calculated via coordinate triggers</span>
              </div>
              
              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', minHeight: '340px' }}>
                <canvas 
                  ref={canvasRef} 
                  width={900} 
                  height={400} 
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Misuse & Penalties log */}
        {activeTab === 'penalties' && (
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Student Strike & Misuse Tracking</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Tracks false alarm infractions per NDPR compliance and school safety regulations. Under the tiered disciplinary system:
              <br />Strike 1: Formal warning banner | Strike 2: Referral to Dean of Student Affairs | Strike 3: Suspended status.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(u => (
                <div key={u.matric} className="user-strike-row">
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>{u.name}</strong>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      ID: {u.matric} | Email: {u.email}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Disciplinary status badge */}
                    <span 
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: u.strikes >= 3 ? 'rgba(239, 68, 68, 0.15)' : u.strikes === 2 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: u.strikes >= 3 ? 'var(--color-security)' : u.strikes === 2 ? 'var(--status-pending)' : 'var(--status-resolved)'
                      }}
                    >
                      {u.strikes >= 3 ? '🚨 SUSPENDED / REVIEW' : u.strikes === 2 ? '⚠️ DEAN REVIEW' : '✔ ACTIVE STATUS'}
                    </span>

                    {/* Delete Student Account button */}
                    <button 
                      type="button"
                      onClick={() => handleDeleteUser(u.uid || u.matric)}
                      style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef444450', color: '#ef4444', cursor: 'pointer', fontSize: '0.68rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}
                      title="Permanently remove student safety account from database"
                    >
                      🗑️ Delete User
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>False Alarm Strikes</span>
                      <div className="strike-pills">
                        {[1, 2, 3].map(s => (
                          <div 
                            key={s} 
                            className={`strike-dot ${u.strikes >= s ? 'filled' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

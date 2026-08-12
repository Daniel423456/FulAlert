import React from 'react';
import { 
  Shield, 
  HeartPulse, 
  Flame, 
  UserX, 
  Navigation, 
  PhoneCall, 
  Radio, 
  CheckCircle, 
  ArrowRight, 
  Lock, 
  Activity, 
  MapPin, 
  Users, 
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export default function HomePage({ onNavigate, currentUser, onOpenAuth, onLogout }) {
  const hotlines = [
    { title: 'Campus Security', phone: '+234 803 111 0001', icon: Shield, color: '#ef4444' },
    { title: 'Health Centre', phone: '+234 803 222 0002', icon: HeartPulse, color: '#10b981' },
    { title: 'Hostel Admin', phone: '+234 803 333 0003', icon: Flame, color: '#f97316' },
    { title: 'Dean Student Affairs', phone: '+234 803 444 0004', icon: UserX, color: '#d946ef' },
    { title: 'SUG Secretariat', phone: '+234 803 666 0006', icon: Users, color: '#8b5cf6' },
    { title: 'School Emergency', phone: '0800 000 3852', icon: PhoneCall, color: '#3b82f6' }
  ];

  const features = [
    {
      icon: ShieldAlert,
      title: 'Hold-to-Confirm SOS',
      desc: '3-second intentional touch trigger prevents accidental false alarms while ensuring instantaneous routing to security posts.',
      color: '#ef4444'
    },
    {
      icon: Navigation,
      title: 'Real-Time GPS Escort',
      desc: 'Share live GPS movement paths on interactive multi-layer maps with trusted friends during late-night walks across campus.',
      color: '#0052d4'
    },
    {
      icon: Radio,
      title: 'Stealth Audio Sniffing',
      desc: 'Silent alarm suppresses screen light and audio alarms, capturing situational audio clips to keep responders fully briefed.',
      color: '#10b981'
    },
    {
      icon: MapPin,
      title: 'Unified Command Desk',
      desc: 'Real-time multi-incident map plotting, student medical profiles, turn-by-turn routing, and campus-wide safety broadcasts.',
      color: '#f97316'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Trigger Distress Signal',
      desc: 'Select Security, Medical, Fire, or Harassment. Hold the SOS button or activate Silent Stealth Mode.'
    },
    {
      step: '02',
      title: 'Instant Automated Dispatch',
      desc: 'Your live GPS coordinates, medical profile (blood/allergies), and contacts are relayed directly to on-duty responders.'
    },
    {
      step: '03',
      title: 'Track Help in Real-Time',
      desc: 'Watch responder acknowledgement and en-route status update live on your phone until safety is secured.'
    }
  ];

  return (
    <div className="home-page-container">
      
      {/* Top Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-logo-badge small">
            <img src="/logo.png" alt="FULALERT" style={{ height: '30px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.02em' }}>FULALERT</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--brand-orange)', fontWeight: 700 }}>NOTIFY • INFORM • PROTECT</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--bg-secondary)', 
                padding: '6px 14px', 
                borderRadius: '20px', 
                border: '1px solid var(--border-color)' 
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{currentUser.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({currentUser.matric || currentUser.badgeId})</span>
              </div>
              <button 
                onClick={onLogout}
                style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => onOpenAuth('signin', 'student')}
                style={{ 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  padding: '8px 18px', 
                  borderRadius: '10px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  color: '#ffffff' 
                }}
              >
                Sign In
              </button>
              <button 
                onClick={() => onOpenAuth('signup', 'student')}
                style={{ 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  padding: '8px 18px', 
                  borderRadius: '10px', 
                  background: 'var(--brand-blue-gradient)', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0, 82, 212, 0.4)'
                }}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="hero-glow-blob blob-1"></div>
        <div className="hero-glow-blob blob-2"></div>

        <div className="hero-content">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-badge large">
              <img 
                src="/logo.png" 
                alt="FULALERT Logo" 
                style={{ height: '70px', maxWidth: '100%', objectFit: 'contain' }} 
              />
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--brand-orange)', letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 0 20px rgba(249, 115, 22, 0.4)' }}>
              — NOTIFY • INFORM • PROTECT —
            </div>
          </div>

          <div className="live-status-pill" style={{ marginTop: '8px' }}>
            <span className="live-pulse-dot"></span>
            <span>FULALERT Dispatch Network • 24/7 Operations Active</span>
          </div>

          <h1 className="hero-title" style={{ marginTop: '6px' }}>
            Campus Emergency Response <br />
            <span className="gradient-text">& Real-Time Protection</span>
          </h1>

          <p className="hero-subtitle">
            An advanced emergency alert, GPS escort, and unified responder routing platform 
            built to protect students and staff across university hostels, lecture halls, and walkways.
          </p>

          <div className="hero-cta-group">
            <button 
              className="hero-btn primary"
              onClick={() => onNavigate('student')}
            >
              <ShieldAlert size={20} />
              <span>Launch Student SOS App</span>
              <ArrowRight size={18} />
            </button>

            <button 
              className="hero-btn secondary"
              onClick={() => onNavigate('admin')}
            >
              <MapPin size={20} />
              <span>Responder Command Desk</span>
            </button>

            {!currentUser && (
              <button 
                className="hero-btn secondary"
                style={{ border: '1px solid var(--brand-orange)', color: 'var(--brand-orange)' }}
                onClick={() => onOpenAuth('signup', 'student')}
              >
                <span>Register Safety Profile</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-metrics-bar">
            <div className="metric-item">
              <strong>&lt; 3 Mins</strong>
              <span>Target Response Time</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-item">
              <strong>100%</strong>
              <span>Campus Coverage</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-item">
              <strong>6 Units</strong>
              <span>Dedicated Responders</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-item">
              <strong>NDPR</strong>
              <span>Privacy Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Emergency Quick-Dial Hotlines Strip */}
      <section className="hotlines-strip-section">
        <div className="section-header-compact">
          <PhoneCall size={18} style={{ color: '#ef4444' }} />
          <span>Direct Campus Emergency Hotlines</span>
        </div>

        <div className="hotlines-grid">
          {hotlines.map((h, idx) => {
            const IconC = h.icon;
            return (
              <a 
                key={idx} 
                href={`tel:${h.phone.replace(/[^0-9+]/g, '')}`} 
                className="hotline-card"
              >
                <div className="hotline-icon-box" style={{ color: h.color, borderColor: `${h.color}30` }}>
                  <IconC size={18} />
                </div>
                <div className="hotline-text">
                  <h4>{h.title}</h4>
                  <span>{h.phone}</span>
                </div>
                <ChevronRight size={14} className="hotline-arrow" />
              </a>
            );
          })}
        </div>
      </section>

      {/* 3. Role Portals Selection Section */}
      <section className="portals-section">
        <div className="section-title-wrapper">
          <h2>Select System Access Portal</h2>
          <p>Access the mobile safety interface as a student/faculty member or sign in as an authorized emergency responder.</p>
        </div>

        <div className="portals-grid">
          {/* Card 1: Student Portal */}
          <div className="portal-choice-card student-card" onClick={() => onNavigate('student')} style={{ cursor: 'pointer' }}>
            <div className="portal-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              For Students & Campus Community
            </div>
            <div className="portal-card-header">
              <div className="portal-icon-circle" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                <ShieldAlert size={32} />
              </div>
              <div>
                <h3>Student Panic SOS Client</h3>
                <p>Mobile Web Safety Interface & Emergency Triggers</p>
              </div>
            </div>

            <ul className="portal-feature-list">
              <li><CheckCircle size={15} color="#10b981" /> 3-Second Hold-to-Confirm Panic SOS with live GPS auto-fill</li>
              <li><CheckCircle size={15} color="#10b981" /> "Walk With Me" Real-Time GPS Companion tracking</li>
              <li><CheckCircle size={15} color="#10b981" /> Silent alarm stealth audio sniffing uplink</li>
              <li><CheckCircle size={15} color="#10b981" /> Emergency hotlines directory & incident feedback</li>
            </ul>

            <button className="portal-enter-btn red-btn">
              <span>Launch Student SOS Client</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Card 2: Responder Portal */}
          <div className="portal-choice-card admin-card" onClick={() => onOpenAuth('signin', 'admin')} style={{ cursor: 'pointer' }}>
            <div className="portal-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              Authorized Department Officers Only
            </div>
            <div className="portal-card-header">
              <div className="portal-icon-circle" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }}>
                <MapPin size={32} />
              </div>
              <div>
                <h3>Responder Department Portal</h3>
                <p>Isolated Emergency Dispatch Console</p>
              </div>
            </div>

            <ul className="portal-feature-list">
              <li><CheckCircle size={15} color="#10b981" /> Dedicated isolated dashboard for each emergency department</li>
              <li><CheckCircle size={15} color="#10b981" /> Dual Dispatch Maps (Interactive GPS & Tactical Vector)</li>
              <li><CheckCircle size={15} color="#10b981" /> Reporter Medical & Emergency Profile Cards</li>
              <li><CheckCircle size={15} color="#10b981" /> Responder field action logs & situation updates</li>
            </ul>

            <button className="portal-enter-btn indigo-btn">
              <span>Officer Secure Login</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Core Features Showcase */}
      <section className="features-section">
        <div className="section-title-wrapper">
          <h2>Engineered for Campus Safety</h2>
          <p>Cutting-edge features tailored to prevent misuse and ensure rapid, dependable crisis management.</p>
        </div>

        <div className="features-grid">
          {features.map((f, idx) => {
            const IconF = f.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-icon-wrapper" style={{ color: f.color, backgroundColor: `${f.color}15` }}>
                  <IconF size={26} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. How It Works Step Process */}
      <section className="steps-section">
        <div className="section-title-wrapper">
          <h2>How FULALERT Protects You</h2>
          <p>From the moment you raise an alert to on-site resolution in three automated steps.</p>
        </div>

        <div className="steps-grid">
          {steps.map((s, idx) => (
            <div key={idx} className="step-card">
              <div className="step-number">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-logo-badge small">
              <img src="/logo.png" alt="FULALERT" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em' }}>FULALERT</span>
              <p style={{ fontSize: '0.72rem', color: 'var(--brand-orange)', fontWeight: 700 }}>NOTIFY • INFORM • PROTECT</p>
            </div>
          </div>

          <div className="footer-links">
            <span>🛡️ 24/7 Security Division</span>
            <span>🏥 University Medical Centre</span>
            <span>⚖️ NDPR Privacy Compliant</span>
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} FULALERT Emergency Dispatch System. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

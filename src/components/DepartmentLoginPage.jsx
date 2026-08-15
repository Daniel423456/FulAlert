import React, { useState } from 'react';
import { 
  ShieldAlert, 
  HeartPulse, 
  Flame, 
  GraduationCap, 
  Shield, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  FileText
} from 'lucide-react';
import { db, auth, registerUserWithEmail } from '../services/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const OFFICIAL_DEPARTMENT_CREDENTIALS = {
  security: {
    passcode: 'sec2026@ful',
    validBadges: ['SEC-101', 'SEC-102', 'SEC-103', 'SEC-201'],
    officerNames: {
      'SEC-101': 'Capt. James Bello (Security Lead)',
      'SEC-102': 'Sgt. Garba Musa (Patrol Unit)',
      'SEC-103': 'Officer Chinedu Obi (Gate Command)'
    }
  },
  medical: {
    passcode: 'med2026@ful',
    validBadges: ['MED-204', 'MED-205', 'MED-206', 'MED-301'],
    officerNames: {
      'MED-204': 'Dr. Amina Bello (Chief Medical Officer)',
      'MED-205': 'Dr. Emmanuel Okafor (ER Triage)',
      'MED-206': 'Nurse Fatima Aliyu (Ambulance Lead)'
    }
  },
  fire: {
    passcode: 'fire2026@ful',
    validBadges: ['FIRE-012', 'FIRE-015', 'FIRE-018'],
    officerNames: {
      'FIRE-012': 'Commander T. Adamu (Fire Safety Command)',
      'FIRE-015': 'Warden Yakubu Haruna (Hostel Safety)'
    }
  },
  harassment: {
    passcode: 'dsa2026@ful',
    validBadges: ['DSA-005', 'DSA-008', 'DSA-010'],
    officerNames: {
      'DSA-005': 'Barr. Aisha Yusuf (DSA Welfare Director)',
      'DSA-008': 'Dr. Solomon Danladi (Guidance Counselor)'
    }
  },
  all: {
    passcode: 'admin2026@ful',
    validBadges: ['ADM-001', 'ADM-002'],
    officerNames: {
      'ADM-001': 'Dispatch Operations Chief (VC Command)'
    }
  }
};

export const DEPARTMENT_CONFIGS = {
  security: {
    id: 'security',
    route: '#/admin/security',
    name: 'Campus Security Division',
    shortName: 'Security Desk',
    subtitle: 'Tactical Patrol, Intrusion Response & Physical Safety',
    icon: ShieldAlert,
    themeColor: '#ef4444',
    badgePrefix: 'SEC',
    defaultOfficer: 'Capt. James Bello (Security Lead)',
    badgePlaceholder: 'SEC-101',
    description: 'Authorized security officers, rapid patrol division and campus gate command.'
  },
  medical: {
    id: 'medical',
    route: '#/admin/medical',
    name: 'University Health Centre',
    shortName: 'Health Centre Desk',
    subtitle: 'Emergency Medical Triage, Ambulance & Patient Care',
    icon: HeartPulse,
    themeColor: '#10b981',
    badgePrefix: 'MED',
    defaultOfficer: 'Dr. Amina Bello (Chief Medical Officer)',
    badgePlaceholder: 'MED-204',
    description: 'Authorized medical doctors, emergency triage nurses and ambulance dispatchers.'
  },
  fire: {
    id: 'fire',
    route: '#/admin/fire',
    name: 'Campus Fire Safety & Warden Desk',
    shortName: 'Fire & Warden Desk',
    subtitle: 'Fire Hazards, Room Evacuations & Hostel Safety',
    icon: Flame,
    themeColor: '#f97316',
    badgePrefix: 'FIRE',
    defaultOfficer: 'Commander T. Adamu (Fire Safety Command)',
    badgePlaceholder: 'FIRE-012',
    description: 'Campus fire prevention officers, hall wardens and disaster evacuation units.'
  },
  harassment: {
    id: 'harassment',
    route: '#/admin/dsa',
    name: 'Dean of Student Affairs (DSA)',
    shortName: 'DSA Welfare Desk',
    subtitle: 'Confidential Harassment / GBV Triage & Student Welfare',
    icon: GraduationCap,
    themeColor: '#d946ef',
    badgePrefix: 'DSA',
    defaultOfficer: 'Barr. Aisha Yusuf (DSA Welfare Director)',
    badgePlaceholder: 'DSA-005',
    description: 'Dean of Student Affairs welfare officers, guidance counselors and disciplinary committee.'
  },
  all: {
    id: 'all',
    route: '#/admin/central',
    name: 'Central University Command',
    shortName: 'Unified Command Desk',
    subtitle: 'Master Campus-Wide Emergency Dispatch & Oversight',
    icon: Shield,
    themeColor: '#6366f1',
    badgePrefix: 'ADM',
    defaultOfficer: 'Dispatch Operations Chief (VC Command)',
    badgePlaceholder: 'ADM-001',
    description: 'University Vice-Chancellor emergency room and central university dispatchers.'
  }
};

export default function DepartmentLoginPage({ 
  deptKey = 'security', 
  onLoginSuccess, 
  onBackToHome 
}) {
  const [selectedDeptKey, setSelectedDeptKey] = useState(deptKey || 'security');

  const dept = DEPARTMENT_CONFIGS[selectedDeptKey] || DEPARTMENT_CONFIGS.security;
  const deptCreds = OFFICIAL_DEPARTMENT_CREDENTIALS[dept.id] || OFFICIAL_DEPARTMENT_CREDENTIALS.security;
  const DeptIcon = dept.icon;

  // View modes
  const [formMode, setFormMode] = useState('login'); // 'login' or 'register'
  const [isLoading, setIsLoading] = useState(false);

  // Login inputs
  const [officerName, setOfficerName] = useState(dept.defaultOfficer);
  const [badgeId, setBadgeId] = useState(dept.badgePlaceholder);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register inputs (High Security Standard)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBadgeId, setRegBadgeId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMasterKey, setRegMasterKey] = useState(''); // Authorized department passcode

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleDeptChange = (key) => {
    setSelectedDeptKey(key);
    const targetDept = DEPARTMENT_CONFIGS[key];
    if (targetDept) {
      setOfficerName(targetDept.defaultOfficer);
      setBadgeId(targetDept.badgePlaceholder);
      setPassword('');
      setRegBadgeId(targetDept.badgePrefix + '-');
      setErrorMsg('');
      setSuccessMsg('');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!regName.trim()) {
      setErrorMsg('❌ Please enter your full name.');
      setIsLoading(false);
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('❌ Please enter your official email.');
      setIsLoading(false);
      return;
    }
    if (!regBadgeId.trim()) {
      setErrorMsg('❌ Please enter your Service Badge ID.');
      setIsLoading(false);
      return;
    }
    if (!regPassword.trim() || regPassword.length < 8) {
      setErrorMsg('❌ Password must be at least 8 characters for high security.');
      setIsLoading(false);
      return;
    }
    if (!regMasterKey.trim()) {
      setErrorMsg('❌ Please enter the Department Master Key.');
      setIsLoading(false);
      return;
    }

    const formattedBadge = regBadgeId.trim().toUpperCase();

    // 1. Verify Master Key (matches the department's predefined passcode)
    if (regMasterKey.trim() !== deptCreds.passcode) {
      setErrorMsg(`❌ Access Denied: Incorrect Master Key for ${dept.name}.`);
      setIsLoading(false);
      return;
    }

    // 2. Verify Badge ID Prefix matches Selected Department
    const expectedPrefix = dept.badgePrefix;
    if (!formattedBadge.startsWith(expectedPrefix + '-')) {
      setErrorMsg(`❌ Invalid Badge: Prefix must be "${expectedPrefix}-" (e.g., ${dept.badgePlaceholder}).`);
      setIsLoading(false);
      return;
    }

    // 3. Verify official email domain for safety
    const emailLower = regEmail.trim().toLowerCase();
    if (!emailLower.endsWith('.edu.ng') && !emailLower.endsWith('@fulalert.edu.ng') && !emailLower.endsWith('@ful.edu.ng')) {
      setErrorMsg('❌ Access Denied: Official university email required (@fulalert.edu.ng or .edu.ng domain).');
      setIsLoading(false);
      return;
    }

    try {
      // 4. Register in Firebase Auth & Create Firestore Profile
      const { user, profile } = await registerUserWithEmail(regEmail.trim(), regPassword.trim(), {
        name: regName.trim(),
        badgeId: formattedBadge,
        desk: dept.id,
        unit: dept.name,
        role: 'admin',
        strikes: 0
      });

      setSuccessMsg('✅ Authorized Responder Registered! Logging in...');
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(profile);
      }, 1500);
    } catch (err) {
      setErrorMsg(`❌ Sign-Up Failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!badgeId.trim()) {
      setErrorMsg('❌ Please enter your Badge ID.');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setErrorMsg('❌ Please enter your passcode.');
      setIsLoading(false);
      return;
    }

    const formattedBadge = badgeId.trim().toUpperCase();

    // 1. Check if Badge ID belongs to a registered Firebase Auth admin in Firestore
    let emailToAuth = null;
    try {
      if (db) {
        const q = query(collection(db, 'users'), where('badgeId', '==', formattedBadge), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          emailToAuth = userDoc.email;
        }
      }
    } catch (err) {
      console.warn("Failed to check Firestore admin registration:", err);
    }

    // 2. If it is a registered cloud admin, sign them in securely via Firebase Auth
    if (emailToAuth && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, password.trim());
        const user = userCredential.user;
        
        // Fetch fresh profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setSuccessMsg(`✅ Verified! Access Granted to ${dept.name} Console...`);
          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(profile);
          }, 600);
          return;
        }
      } catch (err) {
        setErrorMsg(`❌ Authentication Failed: Incorrect password/passcode.`);
        setIsLoading(false);
        return;
      }
    }

    // 3. Fallback to Legacy Predefined Dictionary Verification
    const isOfficialPasscode = password.trim() === deptCreds.passcode;
    const isOfficialBadge = deptCreds.validBadges.includes(formattedBadge);

    if (isOfficialPasscode && isOfficialBadge) {
      const officialName = deptCreds.officerNames[formattedBadge] || 'Officer In-Charge';
      const adminUser = {
        name: officialName,
        badgeId: formattedBadge,
        unit: dept.name,
        desk: dept.id,
        role: 'admin'
      };

      setSuccessMsg(`✅ Verified! Access Granted to ${dept.name} Console...`);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(adminUser);
      }, 600);
      return;
    }

    setErrorMsg(`❌ Access Denied: Invalid Badge ID or Passcode.`);
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, rgba(13, 15, 23, 0.9) 0%, #08090d 100%)',
      position: 'relative'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        background: dept.themeColor,
        opacity: 0.12,
        filter: 'blur(100px)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--bg-secondary)',
        border: `1px solid ${dept.themeColor}40`,
        borderRadius: '20px',
        padding: '32px 28px',
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px ${dept.themeColor}20`,
        position: 'relative',
        zIndex: 2
      }}>
        
        {/* Back navigation */}
        <button
          onClick={onBackToHome}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            marginBottom: '18px',
            padding: 0,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Campus Portal</span>
        </button>

        {/* Header Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: `rgba(255, 255, 255, 0.05)`,
            border: `1px solid ${dept.themeColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dept.themeColor,
            boxShadow: `0 0 20px ${dept.themeColor}30`
          }}>
            <DeptIcon size={30} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: dept.themeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SECURE DEPARTMENT ACCESS
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '2px 0 0 0' }}>
              {dept.name}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '20px' }}>
          {dept.description}
        </p>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="auth-alert error" style={{ marginBottom: '16px' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success" style={{ marginBottom: '16px' }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Official Credentials Helper Pill & 1-Click Autofill */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '18px',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', marginBottom: '6px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: dept.themeColor, fontWeight: 700 }}>
              <KeyRound size={13} />
              <span>Official Department Access:</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBadgeId(dept.badgePlaceholder);
                setPassword(deptCreds.passcode);
                setErrorMsg('');
              }}
              style={{
                fontSize: '0.68rem',
                padding: '3px 8px',
                borderRadius: '6px',
                background: `${dept.themeColor}20`,
                border: `1px solid ${dept.themeColor}`,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚡ Auto-Fill Credentials
            </button>
          </div>
          <div>Badge: <code style={{ color: '#fff', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{dept.badgePlaceholder}</code></div>
          <div style={{ marginTop: '3px' }}>Passcode: <code style={{ color: '#fff', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{deptCreds.passcode}</code></div>
        </div>

        {/* Mode Selector Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setFormMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: formMode === 'login' ? `2px solid ${dept.themeColor}` : 'none',
              color: formMode === 'login' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🔑 Verify Access
          </button>
          <button
            type="button"
            onClick={() => { setFormMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: formMode === 'register' ? `2px solid ${dept.themeColor}` : 'none',
              color: formMode === 'register' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🛡️ Create Officer Account
          </button>
        </div>

        {/* Login Form */}
        {formMode === 'login' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Department Select Dropdown (Unified Responder Login Page) */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Select Responder Department
              </label>
              <div className="auth-input-wrapper">
                <Shield size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <select
                  value={selectedDeptKey}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px 12px 42px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                >
                  <option value="security">🚓 Campus Security Division</option>
                  <option value="medical">🚑 University Health Centre</option>
                  <option value="fire">🚒 Campus Fire Safety & Warden</option>
                  <option value="harassment">⚖️ Dean of Student Affairs (DSA)</option>
                  <option value="all">🌐 Central University Command</option>
                </select>
              </div>
            </div>

            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Official Service Badge ID / Staff No
              </label>
              <div className="auth-input-wrapper">
                <DeptIcon size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <input 
                  type="text" 
                  placeholder={`e.g. ${dept.badgePlaceholder}`}
                  value={badgeId}
                  onChange={e => setBadgeId(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Department Security Passcode
              </label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={`Enter ${dept.shortName} passcode`}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
                />
                <button 
                  type="button" 
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: isLoading ? 'var(--text-muted)' : `linear-gradient(135deg, ${dept.themeColor}, #0052d4)`,
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                boxShadow: isLoading ? 'none' : `0 4px 18px ${dept.themeColor}40`,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>{isLoading ? 'Verifying Session...' : `Verify & Enter ${dept.shortName}`}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* High-Security Registration Form */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Department Selection */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Select Department to Join
              </label>
              <div className="auth-input-wrapper">
                <Shield size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <select
                  value={selectedDeptKey}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 42px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                >
                  <option value="security">Campus Security Division</option>
                  <option value="medical">University Health Centre</option>
                  <option value="fire">Campus Fire Safety & Warden</option>
                  <option value="harassment">Dean of Student Affairs (DSA)</option>
                  <option value="all">Central University Command</option>
                </select>
              </div>
            </div>

            {/* Officer Full Name */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Officer Full Name
              </label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <input 
                  type="text" 
                  placeholder="e.g. Sgt. Garba Musa"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Official Email */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Official Duty Email
              </label>
              <div className="auth-input-wrapper">
                <FileText size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <input 
                  type="email" 
                  placeholder="e.g. g.musa@fulalert.edu.ng"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Service Badge ID */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Service Badge ID
              </label>
              <div className="auth-input-wrapper">
                <DeptIcon size={18} className="auth-icon" style={{ color: dept.themeColor }} />
                <input 
                  type="text" 
                  placeholder={`Format: ${dept.badgePlaceholder}`}
                  value={regBadgeId}
                  onChange={e => setRegBadgeId(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Account Password */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Create Strong Password (min 8 chars)
              </label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Choose secure password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem' }}
                />
                <button 
                  type="button" 
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Master Key authorization */}
            <div className="auth-input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-orange)', marginBottom: '4px', display: 'block' }}>
                ⚠️ Department Master security Key
              </label>
              <div className="auth-input-wrapper" style={{ border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                <KeyRound size={18} className="auth-icon" style={{ color: 'var(--brand-orange)' }} />
                <input 
                  type="password" 
                  placeholder="Enter signup authorization key"
                  value={regMasterKey}
                  onChange={e => setRegMasterKey(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: isLoading ? 'var(--text-muted)' : `linear-gradient(135deg, ${dept.themeColor}, #10b981)`,
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                boxShadow: isLoading ? 'none' : `0 4px 18px ${dept.themeColor}40`,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>{isLoading ? 'Authorizing Account...' : 'Register & Join Desk'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Protected by FULALERT Campus Security Protocol • Strict Access Control
          </span>
        </div>
      </div>
    </div>
  );
}

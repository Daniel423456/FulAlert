import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Lock, 
  Phone, 
  Mail, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  X, 
  ArrowRight, 
  ShieldAlert,
  Building,
  UserCheck
} from 'lucide-react';

import { OFFICIAL_DEPARTMENT_CREDENTIALS } from './DepartmentLoginPage';
import { authenticateWithCloud, saveUserToCloud } from '../services/firebase';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  initialMode = 'signin', // 'signin' or 'signup'
  targetPortal = 'student', // 'student' or 'admin'
  users = [],
  setUsers
}) {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [role, setRole] = useState(targetPortal === 'admin' ? 'admin' : 'student'); // 'student' or 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [adminDepartment, setAdminDepartment] = useState('security'); // 'security', 'medical', 'fire', 'harassment', 'all'

  // Sign In Form State
  const [identifier, setIdentifier] = useState(''); // Matric or Badge ID or Phone
  const [password, setPassword] = useState('');

  // Sign Up Form State
  const [formData, setFormData] = useState({
    name: '',
    matric: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: 'Computer Science',
    residence: 'Hostel Block A (Male)',
    blood: 'O+',
    allergies: 'None',
    emergencyContactName: '',
    emergencyContactPhone: '',
    // Admin fields
    badgeId: '',
    adminUnit: 'Campus Security Division'
  });

  if (!isOpen) return null;

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setErrorMsg('');
  };

  // Sign In Submit with Firebase Cloud & Local Verification
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!identifier.trim()) {
      setErrorMsg('❌ Please enter your Matric No, Email, or Badge ID.');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setErrorMsg('❌ Please enter your account password or department passcode.');
      setIsLoading(false);
      return;
    }

    if (role === 'admin') {
      const formattedBadge = identifier.trim().toUpperCase();
      const deptCreds = OFFICIAL_DEPARTMENT_CREDENTIALS[adminDepartment] || OFFICIAL_DEPARTMENT_CREDENTIALS.security;

      // Check saved custom officers in localStorage
      const savedOfficers = JSON.parse(localStorage.getItem('fulalert_officers') || '[]');
      const registeredOfficer = savedOfficers.find(o => o.badgeId === formattedBadge && o.desk === adminDepartment);

      const isOfficialPasscode = password.trim() === deptCreds.passcode;
      const isOfficialBadge = deptCreds.validBadges.includes(formattedBadge);
      const isRegisteredMatch = registeredOfficer && registeredOfficer.password === password.trim();

      if (!isOfficialPasscode && !isRegisteredMatch) {
        setErrorMsg(`❌ Access Denied: Incorrect security passcode for this department.`);
        setIsLoading(false);
        return;
      }

      if (!isOfficialBadge && !registeredOfficer) {
        setErrorMsg(`❌ Access Denied: Badge ID "${formattedBadge}" is not authorized for this department.`);
        setIsLoading(false);
        return;
      }

      const deskNames = {
        security: 'Campus Security Division',
        medical: 'University Health Centre',
        fire: 'Campus Fire Safety & Warden',
        harassment: 'Dean of Student Affairs (DSA)',
        all: 'Central Command Dispatch'
      };

      const officialName = deptCreds.officerNames[formattedBadge] || registeredOfficer?.name || 'Officer In-Charge';

      const adminUser = {
        name: officialName,
        badgeId: formattedBadge,
        unit: deskNames[adminDepartment],
        desk: adminDepartment,
        role: 'admin'
      };

      setSuccessMsg(`✅ Verified! Access Granted to ${deskNames[adminDepartment]} Portal...`);
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(adminUser, 'admin');
        onClose();
      }, 500);
    } else {
      // Student Login: Check local cache first
      const cleanIdent = identifier.trim().toLowerCase();
      const localMatch = users.find(u => 
        (u.matric && u.matric.toLowerCase() === cleanIdent) ||
        (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanIdent.replace(/[^0-9]/g, '')) ||
        (u.email && u.email.toLowerCase() === cleanIdent)
      );

      if (localMatch) {
        if (localMatch.password && localMatch.password !== password.trim()) {
          setErrorMsg('❌ Incorrect password. Please try again.');
          setIsLoading(false);
          return;
        }
        setSuccessMsg(`✅ Welcome back, ${localMatch.name}!`);
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(localMatch, 'student');
          onClose();
        }, 500);
        return;
      }

      // If not in local cache, query live Firebase Cloud Database
      const cloudResult = await authenticateWithCloud(identifier, password);
      
      if (cloudResult && cloudResult.success) {
        const cloudUser = cloudResult.user;
        if (setUsers) {
          setUsers(prev => [cloudUser, ...prev.filter(u => u.matric !== cloudUser.matric)]);
        }
        setSuccessMsg(`✅ Authenticated via Cloud! Welcome back, ${cloudUser.name}!`);
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(cloudUser, 'student');
          onClose();
        }, 500);
        return;
      }

      if (cloudResult && cloudResult.error === 'INCORRECT_PASSWORD') {
        setErrorMsg('❌ Incorrect password for this student account.');
      } else {
        setErrorMsg('❌ Account not found. Please click "Create Safety Account" below to register.');
      }
      setIsLoading(false);
    }
  };

  // Sign Up Submit with Firebase Cloud Persistence
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!formData.name.trim()) {
      setErrorMsg('❌ Please enter your full legal name.');
      return;
    }

    if (role === 'student') {
      if (!formData.matric.trim()) {
        setErrorMsg('❌ Please enter your Matriculation / Staff Number.');
        return;
      }
      if (!formData.phone.trim()) {
        setErrorMsg('❌ Please enter your emergency contact phone number.');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setErrorMsg('❌ Password must be at least 6 characters long for safety.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('❌ Passwords do not match. Please re-enter.');
        return;
      }

      const formattedMatric = formData.matric.trim().toUpperCase();
      if (users.some(u => u.matric.toUpperCase() === formattedMatric)) {
        setErrorMsg('❌ An account with this Matriculation Number is already registered. Please Sign In.');
        return;
      }

      const newUser = {
        name: formData.name.trim(),
        matric: formattedMatric,
        phone: formData.phone.trim(),
        email: formData.email.trim() || `${formData.matric.toLowerCase().replace(/[^a-z0-9]/g, '')}@ful.edu.ng`,
        password: formData.password.trim(),
        blood: formData.blood,
        allergies: formData.allergies.trim() || 'None',
        department: formData.department,
        residence: formData.residence,
        emergencyContact: `${formData.emergencyContactName || 'Next of Kin'} (${formData.emergencyContactPhone || formData.phone})`,
        strikes: 0
      };

      if (setUsers) {
        setUsers(prev => [newUser, ...prev]);
      }

      // Save student profile to Firebase Firestore Cloud Database
      await saveUserToCloud(newUser);

      setSuccessMsg('✅ Safety Account Created & Saved to Cloud! Logging you in...');
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(newUser, 'student');
        onClose();
      }, 600);
    } else {
      // Department Officer Sign Up
      if (!formData.name.trim()) {
        setErrorMsg('❌ Please enter officer full name.');
        return;
      }
      if (!formData.badgeId.trim()) {
        setErrorMsg('❌ Please enter assigned Badge ID.');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setErrorMsg('❌ Security Passcode must be at least 6 characters.');
        return;
      }

      const formattedBadge = formData.badgeId.trim().toUpperCase();
      const deskNames = {
        security: 'Campus Security Division',
        medical: 'University Health Centre',
        fire: 'Campus Fire Safety & Warden',
        harassment: 'Dean of Student Affairs (DSA)',
        all: 'Central Command Dispatch'
      };

      const newOfficer = {
        name: formData.name.trim(),
        badgeId: formattedBadge,
        password: formData.password.trim(),
        unit: deskNames[adminDepartment] || formData.adminUnit,
        desk: adminDepartment,
        role: 'admin'
      };

      const savedOfficers = JSON.parse(localStorage.getItem('fulalert_officers') || '[]');
      localStorage.setItem('fulalert_officers', JSON.stringify([newOfficer, ...savedOfficers.filter(o => o.badgeId !== formattedBadge)]));

      setSuccessMsg('✅ Department Officer Account Registered! Entering Dispatch Console...');
      setTimeout(() => {
        onAuthSuccess(newOfficer, 'admin');
        onClose();
      }, 600);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
        
        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Modal Brand Header */}
        <div className="auth-header">
          <div className="brand-logo-badge small">
            <img src="/logo.png" alt="FULALERT" style={{ height: '32px', objectFit: 'contain' }} />
          </div>
          <h2>{mode === 'signin' ? 'Welcome Back' : 'Create Campus Safety Account'}</h2>
          <p>{mode === 'signin' ? 'Sign in to access emergency dispatch & SOS protection' : 'Register your medical and emergency safety profile'}</p>
        </div>

        {/* Role Toggle */}
        <div className="auth-role-tabs">
          <button 
            className={`auth-role-tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => { setRole('student'); setErrorMsg(''); }}
          >
            <User size={16} />
            <span>Student & Faculty</span>
          </button>
          <button 
            className={`auth-role-tab ${role === 'admin' ? 'active' : ''}`}
            onClick={() => { setRole('admin'); setErrorMsg(''); }}
          >
            <ShieldAlert size={16} />
            <span>Responder Unit</span>
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Area */}
        {mode === 'signin' ? (
          /* ================= SIGN IN FORM ================= */
          <form onSubmit={handleSignIn} className="auth-form">
            {role === 'admin' && (
              <div className="auth-input-group">
                <label>Admin Department Branch</label>
                <select 
                  value={adminDepartment} 
                  onChange={e => setAdminDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  <option value="security">🛡️ Campus Security Division (Patrol & Threats)</option>
                  <option value="medical">🏥 University Health Centre (Ambulance & Triage)</option>
                  <option value="fire">🔥 Campus Fire Safety & Warden Desk</option>
                  <option value="harassment">⚖️ Dean of Student Affairs (DSA Welfare Desk)</option>
                  <option value="all">🌐 Unified Central Command (Chief Dispatcher)</option>
                </select>
              </div>
            )}

            <div className="auth-input-group">
              <label>
                {role === 'student' ? 'Matriculation No, Email or Phone' : 'Officer Badge ID / Staff No'}
              </label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-icon" />
                <input 
                  type="text" 
                  placeholder={role === 'student' ? 'e.g. FUL/2022/1048 or 08031234567' : `e.g. ${adminDepartment.toUpperCase().slice(0,3)}-101 or Officer Name`}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password / Access Code</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <button type="submit" className="auth-submit-btn">
              <span>Sign In to {role === 'student' ? 'Student SOS' : 'Command Desk'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* ================= SIGN UP FORM ================= */
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="auth-input-group">
              <label>Full Legal Name</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-icon" />
                <input 
                  type="text" 
                  placeholder="e.g. Fatima Abubakar"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
            </div>

            {role === 'student' ? (
              <>
                <div className="auth-grid-2">
                  <div className="auth-input-group">
                    <label>Matric / Staff ID</label>
                    <div className="auth-input-wrapper">
                      <Building size={18} className="auth-icon" />
                      <input 
                        type="text" 
                        placeholder="FUL/2023/1089"
                        value={formData.matric}
                        onChange={e => handleInputChange('matric', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Phone Number</label>
                    <div className="auth-input-wrapper">
                      <Phone size={18} className="auth-icon" />
                      <input 
                        type="tel" 
                        placeholder="0803 000 0000"
                        value={formData.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-grid-2">
                  <div className="auth-input-group">
                    <label>Blood Group</label>
                    <select 
                      value={formData.blood} 
                      onChange={e => handleInputChange('blood', e.target.value)}
                    >
                      <option value="O+">O+ (Universal Donor)</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div className="auth-input-group">
                    <label>Known Allergies / Medical</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Asthma, Penicillin, None"
                      value={formData.allergies}
                      onChange={e => handleInputChange('allergies', e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-grid-2">
                  <div className="auth-input-group">
                    <label>Next of Kin Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mr. Adekunle"
                      value={formData.emergencyContactName}
                      onChange={e => handleInputChange('emergencyContactName', e.target.value)}
                    />
                  </div>

                  <div className="auth-input-group">
                    <label>Next of Kin Phone</label>
                    <input 
                      type="tel" 
                      placeholder="0809 999 9999"
                      value={formData.emergencyContactPhone}
                      onChange={e => handleInputChange('emergencyContactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Admin specific fields */
              <>
                <div className="auth-grid-2">
                  <div className="auth-input-group">
                    <label>Badge / Officer ID</label>
                    <div className="auth-input-wrapper">
                      <Shield size={18} className="auth-icon" />
                      <input 
                        type="text" 
                        placeholder="SEC-004"
                        value={formData.badgeId}
                        onChange={e => handleInputChange('badgeId', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Department Unit</label>
                    <select 
                      value={formData.adminUnit} 
                      onChange={e => handleInputChange('adminUnit', e.target.value)}
                    >
                      <option value="Campus Security Division">Campus Security Division</option>
                      <option value="University Health Centre">University Health Centre</option>
                      <option value="Hostel Administration">Hostel Administration</option>
                      <option value="Dean of Student Affairs">Dean of Student Affairs</option>
                      <option value="SUG Emergency Response">SUG Emergency Response</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="auth-input-group">
              <label>Create Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              <span>Complete Safety Registration</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Toggle Mode (Sign in vs Sign up) */}
        <div className="auth-switch-mode">
          {mode === 'signin' ? (
            <p>
              Don't have a safety profile yet?{' '}
              <button onClick={() => { setMode('signup'); setErrorMsg(''); }}>
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button onClick={() => { setMode('signin'); setErrorMsg(''); }}>
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

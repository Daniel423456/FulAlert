import React, { useState, useEffect } from 'react';
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
  UserCheck,
  KeyRound
} from 'lucide-react';

import { OFFICIAL_DEPARTMENT_CREDENTIALS } from './DepartmentLoginPage';
import { 
  registerUserWithEmail, 
  loginUserWithEmail, 
  loginWithGoogle, 
  sendPasswordReset, 
  resetPassword,
  auth 
} from '../services/firebase';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  initialMode = 'signin', // 'signin', 'signup', 'forgot', 'resetPassword'
  targetPortal = 'student', // 'student' or 'admin'
  users = [],
  setUsers
}) {
  const [mode, setMode] = useState(initialMode); // 'signin', 'signup', 'forgot', 'resetPassword'
  const [role, setRole] = useState(targetPortal === 'admin' ? 'admin' : 'student'); // 'student' or 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [adminDepartment, setAdminDepartment] = useState('security'); // 'security', 'medical', 'fire', 'harassment', 'all'

  // Sign In Form State
  const [identifier, setIdentifier] = useState(''); // Matric, Email, or Badge ID or Phone
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

  // Password Reset Form State (for reset link action)
  const [resetPass, setResetPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  // Sync mode with initialMode and check URL for password reset parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const urlMode = urlParams.get('mode');
    
    if (urlMode === 'resetPassword' && oobCode) {
      setMode('resetPassword');
    } else {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setErrorMsg('');
  };

  // Sign In Submit with Firebase Auth & Firestore Sync
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!identifier.trim()) {
      setErrorMsg('❌ Please enter your Matric No, Email, or Badge ID.');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setErrorMsg('❌ Please enter your account password or passcode.');
      setIsLoading(false);
      return;
    }

    if (role === 'admin') {
      const formattedBadge = identifier.trim().toUpperCase();
      const deptCreds = OFFICIAL_DEPARTMENT_CREDENTIALS[adminDepartment] || OFFICIAL_DEPARTMENT_CREDENTIALS.security;

      const isOfficialPasscode = password.trim() === deptCreds.passcode;
      const isOfficialBadge = deptCreds.validBadges.includes(formattedBadge);

      if (!isOfficialPasscode) {
        setErrorMsg(`❌ Access Denied: Incorrect passcode for this department.`);
        setIsLoading(false);
        return;
      }

      if (!isOfficialBadge) {
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

      const officialName = deptCreds.officerNames[formattedBadge] || 'Officer In-Charge';

      const adminUser = {
        name: officialName,
        badgeId: formattedBadge,
        unit: deskNames[adminDepartment],
        desk: adminDepartment,
        role: 'admin'
      };

      // Under-the-hood Firebase Auth sync for Admins
      try {
        const badgeEmail = `${formattedBadge.toLowerCase()}@fulalert.edu.ng`;
        try {
          await loginUserWithEmail(badgeEmail, password.trim());
        } catch (loginErr) {
          if (loginErr.code === 'auth/user-not-found' || loginErr.message === 'USER_PROFILE_NOT_FOUND') {
            await registerUserWithEmail(badgeEmail, password.trim(), {
              name: officialName,
              role: 'admin',
              desk: adminDepartment,
              badgeId: formattedBadge
            });
          }
        }
      } catch (authErr) {
        console.warn("Admin Auth Sync notice:", authErr);
      }

      setSuccessMsg(`✅ Verified! Access Granted to ${deskNames[adminDepartment]} Portal...`);
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(adminUser, 'admin');
        onClose();
      }, 500);
    } else {
      // Student / Faculty Login via Firebase Auth
      try {
        let emailToAuthenticate = identifier.trim().toLowerCase();

        // If matric number or phone number was input instead of email, resolve it
        if (!emailToAuthenticate.includes('@')) {
          const matchedStudent = users.find(u => 
            (u.matric && u.matric.toLowerCase() === emailToAuthenticate) ||
            (u.phone && u.phone.replace(/[^0-9]/g, '') === emailToAuthenticate.replace(/[^0-9]/g, ''))
          );
          if (matchedStudent && matchedStudent.email) {
            emailToAuthenticate = matchedStudent.email;
          } else {
            setErrorMsg('❌ Profile not found. Please sign in with your email or register a new safety account.');
            setIsLoading(false);
            return;
          }
        }

        const { user, profile } = await loginUserWithEmail(emailToAuthenticate, password.trim());

        if (profile.role === 'admin') {
          setErrorMsg('❌ Access Denied: Admin portals must be logged in via the Responder Unit tab.');
          setIsLoading(false);
          return;
        }

        if (!user.emailVerified) {
          setErrorMsg('⚠️ Your email is not verified yet. Please check your inbox or request a verification email.');
          setIsLoading(false);
          return;
        }

        setSuccessMsg(`✅ Welcome back, ${profile.fullName || profile.name}!`);
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(profile, 'student');
          onClose();
        }, 500);
      } catch (err) {
        setIsLoading(false);
        if (err.code === 'auth/wrong-password') {
          setErrorMsg('❌ Incorrect password. Please try again.');
        } else if (err.code === 'auth/user-not-found' || err.message === 'USER_PROFILE_NOT_FOUND') {
          setErrorMsg('❌ Account not found. Please check your credentials or register below.');
        } else if (err.code === 'auth/invalid-email') {
          setErrorMsg('❌ Invalid email format.');
        } else {
          setErrorMsg(`❌ Login Failed: ${err.message}`);
        }
      }
    }
  };

  // Sign Up Submit with Firebase Auth & Firestore Sync
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!formData.name.trim()) {
      setErrorMsg('❌ Please enter your full legal name.');
      setIsLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('❌ Please enter your email address.');
      setIsLoading(false);
      return;
    }

    if (role === 'student') {
      if (!formData.matric.trim()) {
        setErrorMsg('❌ Please enter your Matriculation / Staff Number.');
        setIsLoading(false);
        return;
      }
      if (!formData.phone.trim()) {
        setErrorMsg('❌ Please enter your emergency contact phone number.');
        setIsLoading(false);
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setErrorMsg('❌ Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('❌ Passwords do not match.');
        setIsLoading(false);
        return;
      }

      try {
        const { user, profile } = await registerUserWithEmail(formData.email.trim(), formData.password.trim(), {
          name: formData.name.trim(),
          matric: formData.matric.trim().toUpperCase(),
          phone: formData.phone.trim(),
          blood: formData.blood,
          allergies: formData.allergies.trim(),
          department: formData.department,
          residence: formData.residence,
          emergencyContact: `${formData.emergencyContactName || 'Next of Kin'} (${formData.emergencyContactPhone || formData.phone})`,
          role: 'user'
        });

        setSuccessMsg('✅ Verification Email Sent! Please verify your email to activate your account.');
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(profile, 'student');
          onClose();
        }, 4000);
      } catch (err) {
        setIsLoading(false);
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('❌ This email address is already in use.');
        } else if (err.code === 'auth/weak-password') {
          setErrorMsg('❌ Password is too weak (minimum 6 characters).');
        } else {
          setErrorMsg(`❌ Registration Failed: ${err.message}`);
        }
      }
    } else {
      // Admin / Responder Signup
      if (!formData.badgeId.trim()) {
        setErrorMsg('❌ Please enter your Badge ID.');
        setIsLoading(false);
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setErrorMsg('❌ Passcode must be at least 6 characters.');
        setIsLoading(false);
        return;
      }

      try {
        const formattedBadge = formData.badgeId.trim().toUpperCase();
        const badgeEmail = `${formattedBadge.toLowerCase()}@fulalert.edu.ng`;
        
        const deskNames = {
          security: 'Campus Security Division',
          medical: 'University Health Centre',
          fire: 'Campus Fire Safety & Warden',
          harassment: 'Dean of Student Affairs (DSA)',
          all: 'Central Command Dispatch'
        };

        const { user, profile } = await registerUserWithEmail(badgeEmail, formData.password.trim(), {
          name: formData.name.trim(),
          role: 'admin',
          desk: adminDepartment,
          badgeId: formattedBadge,
          unit: deskNames[adminDepartment]
        });

        setSuccessMsg('✅ Responder registered and authorized in Firebase Auth!');
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(profile, 'admin');
          onClose();
        }, 1500);
      } catch (err) {
        setIsLoading(false);
        setErrorMsg(`❌ Responder Registration Failed: ${err.message}`);
      }
    }
  };

  // Google Authentication Helper
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const { user, profile } = await loginWithGoogle();
      setSuccessMsg(`✅ Welcome back, ${profile.fullName || profile.name}!`);
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(profile, 'student');
        onClose();
      }, 500);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(`❌ Google Authentication failed: ${err.message}`);
    }
  };

  // Forgot Password Submit
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!identifier.trim()) {
      setErrorMsg('❌ Please enter your registered email address.');
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordReset(identifier);
      setSuccessMsg('✅ Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        setIsLoading(false);
        setMode('signin');
      }, 3000);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(`❌ Password Reset Failed: ${err.message}`);
    }
  };

  // Password Reset Link Submit
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (resetPass.length < 6) {
      setErrorMsg('❌ Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }
    if (resetPass !== resetConfirmPass) {
      setErrorMsg('❌ Passwords do not match.');
      setIsLoading(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');

    if (!oobCode) {
      setErrorMsg('❌ Expired or invalid password reset link.');
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(oobCode, resetPass);
      setSuccessMsg('✅ Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setIsLoading(false);
        setMode('signin');
        // Clear params from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3000);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(`❌ Failed to reset password: ${err.message}`);
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
          <h2>
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Safety Profile'}
            {mode === 'forgot' && 'Reset Safety Password'}
            {mode === 'resetPassword' && 'New Secure Password'}
          </h2>
          <p>
            {mode === 'signin' && 'Sign in to access emergency dispatch & P2P SOS protection'}
            {mode === 'signup' && 'Register your medical and emergency campus safety profile'}
            {mode === 'forgot' && 'Enter your email to receive a secure password reset link'}
            {mode === 'resetPassword' && 'Choose a new password for your safety profile'}
          </p>
        </div>

        {/* Role Toggle (Disabled in forgot / reset modes) */}
        {(mode === 'signin' || mode === 'signup') && (
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
        )}

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

        {/* ================= LOADING STATE ================= */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--brand-orange)', fontWeight: 700 }}>Processing security request...</span>
          </div>
        )}

        {/* Form Area */}
        {mode === 'signin' && !isLoading && (
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
                {role === 'student' ? 'Email, Matric No or Phone' : 'Officer Badge ID / Staff No'}
              </label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-icon" />
                <input 
                  type="text" 
                  placeholder={role === 'student' ? 'e.g. fatima@fulalert.edu.ng' : `e.g. ${adminDepartment.toUpperCase().slice(0,3)}-101`}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password / Access Code</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ fontSize: '0.72rem', color: 'var(--brand-orange)', fontWeight: 700 }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter account passcode"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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

            {/* Google Sign-In Integration */}
            {role === 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>OR</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)' }} />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#1f2937',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    transition: 'transform 0.2s'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.797 2.717v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.93 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.549 0 9s.347 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.507.454 3.44 1.347l2.581-2.58C13.464.891 11.427 0 9 0 5.482 0 2.438 2.07 1.057 5.061l3.007 2.332C4.772 5.164 6.756 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </form>
        )}

        {mode === 'signup' && !isLoading && (
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

            <div className="auth-input-group">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-icon" />
                <input 
                  type="email" 
                  placeholder="e.g. fatima@fulalert.edu.ng"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
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

            <div className="auth-grid-2">
              <div className="auth-input-group">
                <label>Create Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={e => handleInputChange('password', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Confirm Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={e => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              <span>Complete Safety Registration</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {mode === 'forgot' && !isLoading && (
          /* ================= FORGOT PASSWORD FORM ================= */
          <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
            <div className="auth-input-group">
              <label>Registered Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-icon" />
                <input 
                  type="email" 
                  placeholder="e.g. fatima@fulalert.edu.ng"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              <span>Send Reset Password Link</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {mode === 'resetPassword' && !isLoading && (
          /* ================= RESET PASSWORD FORM ================= */
          <form onSubmit={handlePasswordResetSubmit} className="auth-form">
            <div className="auth-input-group">
              <label>New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type="password" 
                  placeholder="Min 6 characters"
                  value={resetPass}
                  onChange={e => setResetPass(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Confirm New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-icon" />
                <input 
                  type="password" 
                  placeholder="Re-enter new password"
                  value={resetConfirmPass}
                  onChange={e => setResetConfirmPass(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              <span>Update Password</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Toggle Mode (Sign in vs Sign up vs Forgot vs Reset) */}
        <div className="auth-switch-mode" style={{ marginTop: '16px' }}>
          {mode === 'signin' && (
            <p>
              Don't have a safety profile yet?{' '}
              <button type="button" onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}>
                Create Account
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already registered?{' '}
              <button type="button" onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}>
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remembered your passcode?{' '}
              <button type="button" onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}>
                Back to Sign In
              </button>
            </p>
          )}
          {mode === 'resetPassword' && (
            <p>
              Go back to{' '}
              <button type="button" onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}>
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

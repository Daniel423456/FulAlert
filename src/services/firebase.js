// Firebase Realtime Cloud Database & Authentication Service for FULALERT
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

// Official Production Firebase Configuration for FULALERT
const firebaseConfig = {
  apiKey: "AIzaSyB0opbzhK6qPxVthGECotO3W3T55YI-eWg",
  authDomain: "fulalert.firebaseapp.com",
  projectId: "fulalert",
  storageBucket: "fulalert.firebasestorage.app",
  messagingSenderId: "1025089729956",
  appId: "1:1025089729956:web:cae6d8012a9bbc40c43d31",
  measurementId: "G-PPRCPWX1HK"
};

let app = null;
let db = null;
let auth = null;
let isFirebaseConnected = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseConnected = true;
  console.log("✅ FULALERT Connected to Live Firebase Cloud Database & Authentication (Project: fulalert)");
} catch (err) {
  console.warn("Firebase initialization notice:", err);
}

// ==========================================
// FIREBASE AUTHENTICATION FUNCTIONS
// ==========================================

// Register a new user with Email/Password
export async function registerUserWithEmail(email, password, extraData) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  
  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const uid = user.uid;

  // 2. Send verification email
  try {
    await sendEmailVerification(user);
  } catch (emailErr) {
    console.warn("Verification email send warning:", emailErr);
  }

  // 3. Create profile document in Firestore (users/{uid})
  const userDocRef = doc(db, 'users', uid);
  const userProfile = {
    uid: uid,
    fullName: extraData.name || extraData.fullName || '',
    email: email.toLowerCase().trim(),
    photoURL: extraData.photoURL || '',
    role: extraData.role || 'user',
    status: 'active',
    emailVerified: false,
    plan: 'free',
    subscriptionStatus: 'inactive',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    
    // Application-specific fields
    matric: (extraData.matric || '').toUpperCase().trim(),
    phone: (extraData.phone || '').trim(),
    department: extraData.department || '',
    residence: extraData.residence || '',
    blood: extraData.blood || 'O+',
    allergies: extraData.allergies || 'None',
    emergencyContact: extraData.emergencyContact || '',
    strikes: 0
  };

  await setDoc(userDocRef, userProfile);
  return { user, profile: userProfile };
}

// Log in user with Email/Password
export async function loginUserWithEmail(email, password) {
  if (!auth) throw new Error("Firebase Auth not initialized");

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const uid = user.uid;

  // Fetch profile from Firestore
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    throw new Error("USER_PROFILE_NOT_FOUND");
  }

  const profile = userDoc.data();

  // Update lastLoginAt and emailVerified status
  await updateDoc(userDocRef, {
    lastLoginAt: serverTimestamp(),
    emailVerified: user.emailVerified,
    updatedAt: serverTimestamp()
  });

  profile.emailVerified = user.emailVerified;
  profile.lastLoginAt = new Date().toLocaleString();

  return { user, profile };
}

// Google Sign-In Integration
export async function loginWithGoogle() {
  if (!auth) throw new Error("Firebase Auth not initialized");

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const uid = user.uid;

  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);

  let profile = {};

  if (!userDoc.exists()) {
    // Create new profile with sensible defaults
    profile = {
      uid: uid,
      fullName: user.displayName || '',
      email: user.email.toLowerCase().trim(),
      photoURL: user.photoURL || '',
      role: 'user',
      status: 'active',
      emailVerified: true,
      plan: 'free',
      subscriptionStatus: 'inactive',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      
      // Application-specific fields
      matric: '',
      phone: user.phoneNumber || '',
      department: '',
      residence: '',
      blood: 'O+',
      allergies: 'None',
      emergencyContact: '',
      strikes: 0
    };
    await setDoc(userDocRef, profile);
  } else {
    // Retrieve and update existing profile (preserve existing application role/plan/subscription)
    profile = userDoc.data();
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      emailVerified: true,
      updatedAt: serverTimestamp()
    });
    profile.emailVerified = true;
  }

  return { user, profile };
}

// Send Password Reset Email
export async function sendPasswordReset(email) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  await sendPasswordResetEmail(auth, email.trim());
}

// Confirm Password Reset with Code
export async function resetPassword(actionCode, newPassword) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  await confirmPasswordReset(auth, actionCode, newPassword);
}

// Log Out User
export async function logoutUser() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

// Listen to Auth State changes
export function subscribeToAuthChanges(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          callback(user, userDoc.data());
        } else {
          // Fallback if profile doc is not created yet
          callback(user, {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            role: 'user'
          });
        }
      } catch (err) {
        callback(user, null);
      }
    } else {
      callback(null, null);
    }
  });
}

// ==========================================
// FIRESTORE DATABASE DISPATCH FUNCTIONS
// ==========================================

// 1. Send Emergency Alert to Cloud Database
export async function pushAlertToCloud(alert) {
  try {
    if (db) {
      const alertRef = doc(db, 'alerts', alert.id);
      await setDoc(alertRef, {
        ...alert,
        serverTime: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Cloud push fallback to local broadcast:", err);
  }
}

// 2. Update Alert in Cloud Database (Status, Assigned Responder, Field Notes)
export async function updateAlertInCloud(alertId, updates) {
  try {
    if (db) {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Cloud update fallback to local:", err);
  }
}

// 3. Real-Time Cloud Alert Listener (Subscribes all devices to live distress signals)
export function subscribeToCloudAlerts(onUpdate) {
  if (!db) return () => {};

  try {
    const q = query(collection(db, 'alerts'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const cloudAlerts = [];
      snapshot.forEach(doc => {
        cloudAlerts.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally in memory by timestamp descending
      cloudAlerts.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });
      if (cloudAlerts.length > 0) {
        onUpdate(cloudAlerts);
      }
    }, (error) => {
      console.warn("Firestore snapshot listener error:", error);
    });
  } catch (err) {
    console.warn("Real-time listener setup error:", err);
    return () => {};
  }
}

// 4. Send Broadcast Advisory to Cloud Database
export async function pushBroadcastToCloud(broadcast) {
  try {
    if (db) {
      const bcRef = doc(db, 'broadcasts', broadcast.id);
      await setDoc(bcRef, {
        ...broadcast,
        serverTime: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Cloud broadcast push error:", err);
  }
}

// 5. Real-Time Broadcast Listener
export function subscribeToCloudBroadcasts(onUpdate) {
  if (!db) return () => {};

  try {
    const q = query(collection(db, 'broadcasts'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const cloudBc = [];
      snapshot.forEach(doc => {
        cloudBc.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally in memory by timestamp descending
      cloudBc.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });
      if (cloudBc.length > 0) {
        onUpdate(cloudBc);
      }
    }, (error) => {
      console.warn("Firestore broadcast listener error:", error);
    });
  } catch (err) {
    return () => {};
  }
}

// 6. Real-Time User Accounts Listener
export function subscribeToCloudUsers(onUpdate) {
  if (!db) return () => {};

  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(usersCol, (snapshot) => {
      const cloudUsers = [];
      snapshot.forEach(doc => {
        cloudUsers.push({ id: doc.id, ...doc.data() });
      });
      if (cloudUsers.length > 0) {
        onUpdate(cloudUsers);
      }
    }, (error) => {
      console.warn("Firestore users listener error:", error);
    });
  } catch (err) {
    console.warn("Users subscription error:", err);
    return () => {};
  }
}

export { isFirebaseConnected, db, auth };

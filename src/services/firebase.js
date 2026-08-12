// Firebase Realtime Cloud Database Service for FULALERT
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
let isFirebaseConnected = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  isFirebaseConnected = true;
  console.log("✅ FULALERT Connected to Live Firebase Cloud Database (Project: fulalert)");
} catch (err) {
  console.warn("Firebase initialization notice:", err);
}

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
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const cloudAlerts = [];
      snapshot.forEach(doc => {
        cloudAlerts.push({ id: doc.id, ...doc.data() });
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
    const q = query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
      const cloudBc = [];
      snapshot.forEach(doc => {
        cloudBc.push({ id: doc.id, ...doc.data() });
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

// 6. Save User Profile in Cloud Database (Registration)
export async function saveUserToCloud(user) {
  try {
    if (db && user.matric) {
      const cleanDocId = user.matric.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const userRef = doc(db, 'users', cleanDocId);
      await setDoc(userRef, {
        ...user,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    }
  } catch (err) {
    console.warn("Cloud user save error:", err);
    return { success: false, error: err.message };
  }
}

// 7. Real-Time User Accounts Listener (Keeps student registry synced across all devices)
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

// 8. Authenticate User against Cloud Database
export async function authenticateWithCloud(identifier, password) {
  if (!db) return null;

  try {
    const cleanId = identifier.trim();
    const cleanDocId = cleanId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

    // Check direct doc by matric
    const directDocRef = doc(db, 'users', cleanDocId);
    const directDoc = await getDoc(directDocRef);
    
    if (directDoc.exists()) {
      const userData = directDoc.data();
      if (!userData.password || userData.password === password.trim()) {
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'INCORRECT_PASSWORD' };
      }
    }

    // Query by phone, email, or matric case-insensitively
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    
    let matchedUser = null;
    snapshot.forEach(d => {
      const u = d.data();
      if (
        (u.matric && u.matric.toLowerCase() === cleanId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) ||
        (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
      ) {
        matchedUser = u;
      }
    });

    if (matchedUser) {
      if (!matchedUser.password || matchedUser.password === password.trim()) {
        return { success: true, user: matchedUser };
      } else {
        return { success: false, error: 'INCORRECT_PASSWORD' };
      }
    }

    return { success: false, error: 'USER_NOT_FOUND' };
  } catch (err) {
    console.warn("Cloud auth error:", err);
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

export { isFirebaseConnected, db };

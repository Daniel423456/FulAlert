# 🛡️ FULALERT - Campus Emergency Alert & Rapid Dispatch System

[![Live Demo](https://img.shields.io/badge/Live-Production%20Web%20App-red?style=for-the-badge&logo=vercel)](https://fulalert.vercel.app)
[![Firebase](https://img.shields.io/badge/Database-Google%20Firebase-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/Framework-React%2019%20%2B%20Vite-blue?style=for-the-badge&logo=react)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)]()

**FULALERT** is a university-grade real-time emergency response platform. It links students facing campus distress signals with isolated departmental emergency dispatch consoles (**Campus Security**, **University Health Centre**, **Campus Fire Safety**, and **Dean of Student Affairs**) with `< 100ms` WebSockets synchronization, Web Audio sirens, dual tactical maps, and medical safety profiles.

🌐 **Live Production App**: [https://fulalert.vercel.app](https://fulalert.vercel.app)

---

## 🚀 Key Features

### 1. Student Panic SOS Client (`/#/student`)
- **3-Second Hold-to-Confirm Panic SOS**: Prevents accidental false alarms while ensuring swift activation.
- **Silent Distress Mode & Haptic Vibrations**: Student client stays silent for personal safety while dispatch consoles sound piercing sirens.
- **"Walk With Me" Live GPS Companion**: Real-time beacon tracking along campus pathways.
- **Emergency Explanations & Custom Locations**: Students can type room numbers/landmarks or use GPS auto-detect.
- **Emergency Directory**: 1-click dialler for Campus Security, Health Centre, Fire Command, and DSA hotlines.

### 2. Isolated Departmental Control Desks
Each university branch operates its own isolated dashboard with dedicated access control:
- 🛡️ **Campus Security Division** (`/#/admin/security`): Tactical patrols, intruder alerts & Priority 1 auto-escalations.
- 🏥 **University Health Centre** (`/#/admin/medical`): Emergency medical triage, ambulance dispatch, blood groups & allergy profiles.
- 🔥 **Campus Fire Safety & Warden** (`/#/admin/fire`): Fire outbreaks, gas leaks, hostel room evacuations & hall warden logs.
- ⚖️ **Dean of Student Affairs (DSA)** (`/#/admin/dsa`): Confidential harassment / GBV triage & student welfare.
- 🌐 **Unified Central Command** (`/#/admin/central`): Vice-Chancellor emergency room & campus-wide dispatch.

### 3. Tactical Board & Real-Time Dual Maps
- **Department Dispatch Vectors**: Glowing en-route lines originate from the responding department base (`Health Centre Base`, `Main Security Post`, `Hostel Fire Base`).
- **Tactical Blueprint Vector & Interactive GPS Leaflet Maps**: Toggle between vector blueprint schematics and live satellite maps with driving routes.

### 4. Cloud Database & Live Sync
- **Google Firebase Firestore**: Cross-device alert delivery in `< 100ms`.
- **Audio Synthesizer**: Web Audio API high-priority sirens with auto-unlocking.
- **Universal Cloud Accounts**: Student registration and login synchronized globally.

---

## 🔐 Department Credentials Reference

| Department | Route | Authorized Badge | Security Passcode |
| :--- | :--- | :--- | :--- |
| 🛡️ **Campus Security** | `/#/admin/security` | `SEC-101` | `sec2026@ful` |
| 🏥 **Health Centre** | `/#/admin/medical` | `MED-204` | `med2026@ful` |
| 🔥 **Fire Safety & Warden** | `/#/admin/fire` | `FIRE-012` | `fire2026@ful` |
| ⚖️ **Dean of Student Affairs** | `/#/admin/dsa` | `DSA-005` | `dsa2026@ful` |
| 🌐 **Central Command** | `/#/admin/central` | `ADM-001` | `admin2026@ful` |

*(Each department login screen includes a **"⚡ Auto-Fill Credentials"** button for quick access)*

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Leaflet, Lucide Icons, Vanilla CSS Design System
- **Database & Cloud**: Google Firebase (Firestore Database)
- **Deployment**: Vercel Global Edge CDN
- **PWA**: Installable Progressive Web App with offline service worker

---

## 💻 Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Daniel423456/FulAlert.git
   cd FulAlert
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📄 License
MIT License • Built for Federal University Lafia & Campus Safety Communities.

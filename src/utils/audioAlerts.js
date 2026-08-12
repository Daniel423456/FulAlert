// FULALERT Real-Time Audio Synthesizer & Cross-Tab Emergency Broadcast Bus

class AudioAlertSystem {
  constructor() {
    this.audioCtx = null;
    this.sirenOscillator = null;
    this.sirenGain = null;
    this.sirenInterval = null;
    this.isSirenPlaying = false;
    this.isAudioMuted = false;
    this.isUnlocked = false;

    // Auto-unlock AudioContext on first user interaction anywhere on page
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // Play a silent buffer to fully unlock Web Audio in iOS Safari / Chrome
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  }

  // 1. Loud High-Priority Emergency Dispatch Siren (for Admin Control Center)
  playEmergencySiren() {
    if (this.isAudioMuted || this.isSirenPlaying) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.isSirenPlaying = true;
      
      // Dual oscillator alarm (high and piercing)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      // Audible, clear volume for security control room
      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let high = true;
      this.sirenInterval = setInterval(() => {
        if (!this.isSirenPlaying) return;
        const now = ctx.currentTime;
        if (high) {
          osc.frequency.exponentialRampToValueAtTime(1300, now + 0.35);
        } else {
          osc.frequency.exponentialRampToValueAtTime(750, now + 0.35);
        }
        high = !high;
      }, 400);

      this.sirenOscillator = osc;
      this.sirenGain = gain;
    } catch (err) {
      console.warn('Siren playback error:', err);
    }
  }

  // Stop siren immediately
  stopEmergencySiren() {
    this.isSirenPlaying = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      } catch (e) {}
      this.sirenOscillator = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch (e) {}
      this.sirenGain = null;
    }
  }

  // 2. High-Priority Dispatch Chime
  playDispatchChime() {
    if (this.isAudioMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 880, time: 0, duration: 0.15 },      // A5
        { freq: 1174.66, time: 0.18, duration: 0.18 }, // D6
        { freq: 1567.98, time: 0.38, duration: 0.4 }   // G6
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0.4, ctx.currentTime + n.time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.duration);
      });
    } catch (err) {
      console.warn('Dispatch chime error:', err);
    }
  }

  // 3. Success / Resolution Chime
  playSuccessChime() {
    if (this.isAudioMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 523.25, time: 0, duration: 0.12 },   // C5
        { freq: 659.25, time: 0.12, duration: 0.12 },  // E5
        { freq: 783.99, time: 0.24, duration: 0.12 },  // G5
        { freq: 1046.50, time: 0.36, duration: 0.3 }   // C6
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + n.time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.duration);
      });
    } catch (err) {}
  }

  // ==========================================
  // HAPTIC PHONE VIBRATION API (FOR STUDENT)
  // ==========================================

  // Morse Code SOS: ... --- ...
  vibrateSOS() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 60, 120, 60, 120, 180, 300, 80, 300, 80, 300, 180, 120, 60, 120, 60, 120]);
      } catch (e) {}
    }
  }

  // Subtle Holding pulse
  vibrateChargingPulse() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }
  }

  // Short Confirmation Buzz
  vibrateConfirm() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 60, 180]);
      } catch (e) {}
    }
  }
}

export const audioAlerts = new AudioAlertSystem();

// Real-Time Cross-Tab & Cross-Device Emergency Bus
export const emergencyBus = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('fulalert_emergency_bus')
  : {
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };

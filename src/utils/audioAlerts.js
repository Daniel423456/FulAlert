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
      
      // Dual oscillators for a rich, gritty, and piercing wailing emergency siren
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const masterGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(600, ctx.currentTime);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(605, ctx.currentTime); // slightly detuned for chorus wail

      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      masterGain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      masterGain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let phase = 0;
      this.sirenInterval = setInterval(() => {
        if (!this.isSirenPlaying) return;
        const now = ctx.currentTime;
        
        // Fast, high-urgency piercing wail sweep between 600Hz and 1100Hz
        if (phase === 0) {
          osc1.frequency.linearRampToValueAtTime(1100, now + 0.25);
          osc2.frequency.linearRampToValueAtTime(1105, now + 0.25);
        } else {
          osc1.frequency.linearRampToValueAtTime(600, now + 0.25);
          osc2.frequency.linearRampToValueAtTime(605, now + 0.25);
        }
        phase = (phase + 1) % 2;
      }, 300);

      this.sirenOscillator = [osc1, osc2];
      this.sirenGain = masterGain;
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
      const oscillators = Array.isArray(this.sirenOscillator) ? this.sirenOscillator : [this.sirenOscillator];
      oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
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

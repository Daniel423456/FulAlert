import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, Share2, PlusSquare, Shield } from 'lucide-react';

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const isApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isApp) {
      setIsStandalone(true);
      return;
    }

    // Check if device is iOS (iPhone/iPad)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIos(isIosDevice);

    // Listen for Chrome/Edge/Android beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert("To install FULALERT on your phone:\n1. Tap your browser's menu (⋮ or ⋯)\n2. Select 'Install app' or 'Add to Home screen'.");
    }
  };

  if (isStandalone || dismissed) return null;

  return (
    <>
      {/* Floating Bottom App Installation Banner */}
      <div className="pwa-install-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div className="brand-logo-badge small" style={{ flexShrink: 0 }}>
            <img src="/logo.png" alt="FULALERT" style={{ height: '28px', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📲 Install FULALERT on Phone
            </strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              1-touch instant SOS access, offline protection & sirens
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="pwa-install-btn"
            onClick={handleInstallClick}
          >
            <Download size={14} />
            <span>Install App</span>
          </button>
          <button 
            className="pwa-dismiss-btn"
            onClick={() => setDismissed(true)}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Installation Helper Modal */}
      {showIosGuide && (
        <div className="auth-modal-backdrop" onClick={() => setShowIosGuide(false)}>
          <div className="auth-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <button className="auth-close-btn" onClick={() => setShowIosGuide(false)}>
              <X size={18} />
            </button>

            <div className="brand-logo-badge large" style={{ margin: '0 auto 12px auto' }}>
              <img src="/logo.png" alt="FULALERT" style={{ height: '48px', objectFit: 'contain' }} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Install on iPhone / iPad</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Follow these 2 simple steps in Safari to add FULALERT to your Home Screen:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', background: 'var(--bg-secondary)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 82, 212, 0.2)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Share2 size={20} />
                </div>
                <div style={{ fontSize: '0.82rem' }}>
                  <strong>1. Tap the Share button</strong> at the bottom of Safari (square with an up arrow).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.2)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusSquare size={20} />
                </div>
                <div style={{ fontSize: '0.82rem' }}>
                  <strong>2. Select "Add to Home Screen"</strong> from the menu options.
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowIosGuide(false)}
              className="auth-submit-btn"
              style={{ width: '100%', marginTop: '16px' }}
            >
              <span>Got it!</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

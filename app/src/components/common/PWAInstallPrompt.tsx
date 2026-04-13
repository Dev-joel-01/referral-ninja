import { useState } from 'react';
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt';

export function PWAInstallPrompt() {
  const { deferredPrompt, installApp } = usePWAInstallPrompt();
  const [installing, setInstalling] = useState(false);

  if (!deferredPrompt) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-3xl border border-white/10 bg-[#071007]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="mb-3 text-sm text-slate-100">
        Install Referral Ninja to open it quickly on mobile or desktop.
      </div>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="w-full rounded-2xl bg-[#39FF14] px-4 py-3 text-sm font-semibold text-black transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {installing ? 'Installing…' : 'Install app'}
      </button>
    </div>
  );
}

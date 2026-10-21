import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'prominent' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'prominent',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold rounded shadow-lg transition cursor-pointer ${className}`}
        >
          <Download size={14} />
          <span>INSTALL APP</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-110 text-black font-black text-xs sm:text-sm tracking-wider uppercase rounded shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-400/40 ${className}`}
      >
        <Smartphone size={18} />
        <span>INSTALL AS MOBILE APP (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs font-bold rounded shadow-lg transition cursor-pointer ${className}`}
        >
          <Smartphone size={16} className="text-amber-400" />
          <span>INSTALL ON IPHONE / IPAD</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
            <div className="w-full max-w-sm rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative text-zinc-200 font-sans">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/pwa-192x192.png"
                  alt="Night Shift Icon"
                  className="w-12 h-12 rounded-xl border border-zinc-700 shadow-md object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Night Shift: Sector 09</h3>
                  <p className="text-xs text-amber-400 font-mono">Install on iOS Home Screen</p>
                </div>
              </div>
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">1.</span>
                  <span>Tap the <strong>Share</strong> button (box with arrow) at the bottom or top of Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">2.</span>
                  <span>Scroll down and select <strong>"Add to Home Screen"</strong> (На экран «Домой»).</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-400">3.</span>
                  <span>Tap <strong>Add</strong> in the top right to launch full-screen with custom icon!</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded bg-amber-500 py-2.5 text-xs font-bold text-black uppercase tracking-wider hover:bg-amber-400 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

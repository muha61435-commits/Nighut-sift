import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, HelpCircle, ExternalLink } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'prominent' | 'compact' | 'badge';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'prominent',
  label,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone inside installed app
  if (isInstalled) {
    if (variant === 'badge') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[11px] font-mono rounded-full ${className}`}>
          <Check size={12} />
          <span>УСТАНОВЛЕНО КАК ПРИЛОЖЕНИЕ (PWA)</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const defaultLabel = label || (isInstallable ? 'УСТАНОВИТЬ НА ТЕЛЕФОН (PWA)' : 'КАК УСТАНОВИТЬ НА ТЕЛЕФОН');

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold rounded shadow-lg transition active:scale-95 cursor-pointer ${className}`}
          title="Установить игру как приложение на смартфон"
        >
          <Smartphone size={14} />
          <span>{label || 'УСТАНОВИТЬ APP'}</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-110 active:scale-98 text-black font-black text-xs sm:text-sm tracking-wider uppercase rounded-lg shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-amber-300/40 ${className}`}
        >
          <Smartphone size={18} className="text-black" />
          <span>{defaultLabel}</span>
          <Download size={16} className="text-black/80 ml-1" />
        </button>
      )}

      {/* Mobile PWA Installation Guide Modal for Android & iOS */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative text-zinc-200 font-sans">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>

            {/* App Icon Preview */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-zinc-800/80">
              <img
                src="/assets/aistudio/da_5bd68de8.jpg"
                alt="Night Shift Sector 09 Icon"
                className="w-14 h-14 rounded-2xl border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] object-cover"
                onError={(e) => {
                  // Fallback to pwa-192x192 if needed
                  (e.target as HTMLImageElement).src = '/pwa-192x192.png';
                }}
              />
              <div>
                <h3 className="text-base font-bold text-white font-mono tracking-wide">
                  Night Shift: Sector 09
                </h3>
                <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono font-medium">
                  <span>📱 Мобильное приложение PWA / FWA</span>
                </div>
              </div>
            </div>

            {/* Platform Instructions */}
            {isIOS ? (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="text-amber-400 font-bold uppercase text-[11px] font-mono mb-1">
                  Инструкция для iPhone / iPad (Safari):
                </div>
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Нажмите кнопку <strong>«Поделиться»</strong> (квадрат со стрелкой вверх) в меню Safari.</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Пролистайте вниз и выберите <strong>«На экран "Домой"»</strong> (Add to Home Screen).</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Нажмите <strong>«Добавить»</strong>. Игра появится на рабочем столе телефона с этой иконкой и откроется на весь экран без рамок браузера!</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="text-amber-400 font-bold uppercase text-[11px] font-mono mb-1">
                  Инструкция для Android (Chrome / Яндекс / Samsung):
                </div>
                {isInstallable ? (
                  <p className="text-amber-300">
                    Браузер готов к мгновенной установке! Нажмите кнопку ниже:
                  </p>
                ) : (
                  <>
                    <p className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">1</span>
                      <span>Нажмите на меню браузера <strong>три точки (⋮)</strong> в верхнем правом углу экрана.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">2</span>
                      <span>Выберите пункт <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">3</span>
                      <span>Подтвердите установку — игра будет запускаться как нативное мобильное приложение с выбранной иконкой!</span>
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-5 space-y-2">
              {isInstallable && (
                <button
                  onClick={async () => {
                    await install();
                    setShowGuide(false);
                  }}
                  className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black text-black uppercase tracking-wider hover:bg-amber-400 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Download size={16} /> Установить прямо сейчас
                </button>
              )}
              <button
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-xs font-bold text-zinc-300 uppercase tracking-wider transition"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

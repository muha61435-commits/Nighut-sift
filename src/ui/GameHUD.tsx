import React, { useState } from 'react';
import { Objective, InventoryItem, DocumentNote, AudioLog, InteractiveObject, QualitySettings } from '../types/game';
import { Volume2, Eye, Shield, Battery, Zap, Key, FileText, Disc, X, Play, RefreshCw, Settings, Info } from 'lucide-react';

interface GameHUDProps {
  currentObjective: Objective;
  inventory: InventoryItem[];
  battery: number;
  stamina: number;
  isFlashlightOn: boolean;
  currentTarget: InteractiveObject | null;
  notificationMessage: string;
  activeDocument: DocumentNote | null;
  activeAudioLog: AudioLog | null;
  activeCCTVFeed: number | null;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  isJumpscaring?: boolean;
  isCrouching?: boolean;
  qualitySettings: QualitySettings;
  onCloseDocument: () => void;
  onCloseAudioLog: () => void;
  onCloseCCTV: () => void;
  onSelectCCTVFeed: (index: number) => void;
  onResume: () => void;
  onRestart: () => void;
  onUpdateQuality: (newSettings: Partial<QualitySettings>) => void;
  isPointerLocked: boolean;
  onLockPointer: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentObjective,
  inventory,
  battery,
  stamina,
  isFlashlightOn,
  currentTarget,
  notificationMessage,
  activeDocument,
  activeAudioLog,
  activeCCTVFeed,
  isPaused,
  isGameOver,
  isVictory,
  isJumpscaring,
  isCrouching,
  qualitySettings,
  onCloseDocument,
  onCloseAudioLog,
  onCloseCCTV,
  onSelectCCTVFeed,
  onResume,
  onRestart,
  onUpdateQuality,
  isPointerLocked,
  onLockPointer,
}) => {
  const [showSettingsTab, setShowSettingsTab] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-zinc-300">
      {/* 0. AUTHENTIC FNAF-STYLE ANIMATRONIC JUMPSCARE OVERLAY */}
      {isJumpscaring && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center justify-between p-6">
          {/* FNAF Rapid Strobe Flashes */}
          <div className="absolute inset-0 bg-red-600/35 mix-blend-color-dodge animate-ping" />
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />

          {/* Heavy blood vignette & horror shadow */}
          <div className="absolute inset-0 border-[40px] border-red-950/90 shadow-[inset_0_0_150px_rgba(255,0,0,1)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_10%,rgba(150,0,0,0.95)_95%)]" />

          {/* CRT Animatronic Noise / Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.15)_50%,rgba(0,0,0,0.7)_50%)] bg-[length:100%_4px] opacity-90" />

          {/* Glitch text overlay */}
          <div className="relative z-10 text-red-500 font-mono text-3xl font-black tracking-widest uppercase drop-shadow-[0_0_25px_rgba(255,0,0,1)] animate-bounce mt-4">
            ⚠️ SUBJECT 09 CAUGHT YOU ⚠️
          </div>
          <div className="relative z-10 text-white font-mono font-extrabold text-2xl tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] mb-6 animate-pulse">
            [ FATAL SYSTEM FAILURE ]
          </div>
        </div>
      )}

      {/* 1. CINEMATIC VIGNETTE & GRAIN OVERLAY */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/80 pointer-events-none" />

      {/* 2. CENTER RETICLE & INTERACTION PROMPT */}
      {!isPaused && !isGameOver && !isVictory && !activeDocument && !activeCCTVFeed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Subtle crosshair dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
              currentTarget ? 'scale-150 bg-emerald-400 ring-4 ring-emerald-500/30' : 'bg-zinc-400/60'
            }`}
          />

          {/* Contextual interaction tooltip */}
          {currentTarget && (
            <div className="mt-4 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-zinc-700/80 rounded text-xs text-zinc-100 flex items-center gap-2 shadow-2xl animate-fade-in">
              <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[10px] text-amber-300 font-bold">
                E
              </span>
              <span>{currentTarget.actionText}</span>
            </div>
          )}

          {/* Click to lock mouse prompt if unlocked during active gameplay */}
          {!isPointerLocked && (
            <div
              onClick={onLockPointer}
              className="pointer-events-auto mt-8 px-4 py-2 bg-zinc-900/90 border border-amber-500/40 rounded text-xs text-amber-200 cursor-pointer hover:bg-zinc-800 transition shadow-lg"
            >
              [ CLICK SCREEN TO ENTER FIRST-PERSON VIEW ]
            </div>
          )}
        </div>
      )}

      {/* 3. TOP NOTIFICATION BANNER */}
      {notificationMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/90 border border-amber-500/60 text-amber-300 text-xs tracking-wider rounded uppercase shadow-2xl animate-bounce">
          {notificationMessage}
        </div>
      )}

      {/* 4. TOP LEFT: OBJECTIVE TRACKER */}
      <div className="absolute top-6 left-6 max-w-sm pointer-events-none">
        <div className="text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">
          CHAPTER {currentObjective.chapter} · {currentObjective.chapterTitle}
        </div>
        <div className="text-sm font-bold text-zinc-100 tracking-wide mt-0.5 drop-shadow">
          {currentObjective.title}
        </div>
        <div className="text-xs text-zinc-400 leading-relaxed mt-1 bg-black/60 backdrop-blur-sm p-2 rounded border-l-2 border-amber-500/80">
          {currentObjective.description}
        </div>
      </div>

      {/* 5. TOP RIGHT: TIME & SECTOR TELEMETRY */}
      <div className="absolute top-6 right-6 text-right pointer-events-none">
        <div className="text-xs text-zinc-500 tracking-widest">FACILITY STATUS</div>
        <div className="text-sm font-semibold text-zinc-300 tracking-wider">SECTOR 09 · 02:17 AM</div>
        <div className="text-[10px] text-red-400/90 tracking-widest uppercase mt-0.5 animate-pulse">
          LOCKDOWN LEVEL 2 ACTIVE
        </div>
      </div>

      {/* 6. BOTTOM LEFT: FLASHLIGHT & STAMINA GAUGES */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none">
        {/* Flashlight status */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded border border-zinc-800">
          <Battery
            size={16}
            className={`${isFlashlightOn ? (battery > 20 ? 'text-amber-400' : 'text-red-400 animate-pulse') : 'text-zinc-600'}`}
          />
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${battery > 20 ? 'bg-amber-400' : 'bg-red-500'}`}
              style={{ width: `${battery}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-400 font-mono w-8">{Math.round(battery)}%</span>
          <span className="text-[9px] text-zinc-500 font-sans">[F] LIGHT</span>
        </div>

        {/* Stamina bar */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded border border-zinc-800">
          <Zap size={14} className="text-emerald-400" />
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-150"
              style={{ width: `${stamina}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-500 font-sans">[SHIFT] RUN</span>
        </div>

        {/* Crouch / Sitting stealth indicator */}
        {isCrouching && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/90 border border-emerald-500/70 rounded text-[10px] text-emerald-300 font-bold tracking-wider animate-pulse shadow-lg">
            <Eye size={12} className="text-emerald-400" />
            <span>CROUCHING [C] — HIDDEN FROM CREATURE</span>
          </div>
        )}
      </div>

      {/* 7. BOTTOM RIGHT: INVENTORY BELT */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 pointer-events-none">
        {inventory.length === 0 ? (
          <div className="text-[10px] text-zinc-600 bg-black/50 px-3 py-1.5 rounded border border-zinc-900">
            INVENTORY EMPTY
          </div>
        ) : (
          inventory.map((item, idx) => (
            <div
              key={idx}
              className="px-2.5 py-1.5 bg-black/80 backdrop-blur-md border border-zinc-800 rounded flex items-center gap-1.5 text-xs text-zinc-200 shadow-lg"
              title={item.description}
            >
              {item.type === 'key' || item.type === 'keycard' ? (
                <Key size={13} className="text-amber-400" />
              ) : item.type === 'battery' ? (
                <Battery size={13} className="text-emerald-400" />
              ) : (
                <FileText size={13} className="text-blue-400" />
              )}
              <span className="text-[11px] font-sans">{item.name}</span>
            </div>
          ))
        )}
      </div>

      {/* 8. DOCUMENT VIEWER MODAL */}
      {activeDocument && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto z-40">
          <div className="max-w-xl w-full bg-stone-900 border border-stone-700 p-8 rounded shadow-2xl relative text-stone-200">
            <button
              onClick={onCloseDocument}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>
            <div className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">
              SECTOR 09 ARCHIVES · CONFIDENTIAL
            </div>
            <h2 className="text-lg font-bold text-stone-100 tracking-wider mt-1">{activeDocument.title}</h2>
            <div className="text-xs text-stone-400 mt-1 pb-3 border-b border-stone-800 flex justify-between">
              <span>SOURCE: {activeDocument.author}</span>
              <span>DATE: {activeDocument.date}</span>
            </div>
            <p className="mt-4 text-xs font-sans leading-relaxed text-stone-300 whitespace-pre-line">
              {activeDocument.content}
            </p>
            <div className="mt-6 pt-4 border-t border-stone-800 text-center">
              <button
                onClick={onCloseDocument}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 rounded transition"
              >
                CLOSE DOCUMENT [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. AUDIO LOG TAPE PLAYER MODAL */}
      {activeAudioLog && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto z-40">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-6 rounded shadow-2xl relative">
            <button
              onClick={onCloseAudioLog}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              <Disc className="text-violet-400 animate-spin" size={24} />
              <div>
                <h3 className="text-sm font-bold text-zinc-100">{activeAudioLog.title}</h3>
                <div className="text-[11px] text-zinc-400">{activeAudioLog.speaker} · {activeAudioLog.duration}</div>
              </div>
            </div>
            {/* Audio tape wave visualization */}
            <div className="my-4 h-8 bg-zinc-900 rounded flex items-center justify-center gap-1 px-4 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-violet-400 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.sin(i * 1.5) * 60}%`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded border border-zinc-800/80 font-sans leading-relaxed italic">
              "{activeAudioLog.transcript}"
            </div>
            <div className="mt-5 text-center">
              <button
                onClick={onCloseAudioLog}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded transition"
              >
                STOP PLAYBACK [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. CCTV MONITOR CONSOLE MODAL */}
      {activeCCTVFeed !== null && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 pointer-events-auto z-40">
          <div className="max-w-3xl w-full bg-zinc-950 border border-emerald-900/80 p-5 rounded shadow-2xl relative text-emerald-400">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-bold tracking-widest text-emerald-300">
                  SECURITY TERMINAL · CAM-0{activeCCTVFeed + 1} LIVE FEED
                </span>
              </div>
              <button
                onClick={onCloseCCTV}
                className="text-zinc-500 hover:text-emerald-300 transition text-xs border border-emerald-900 px-2 py-1 rounded"
              >
                EXIT CONSOLE [ESC]
              </button>
            </div>

            {/* CRT Monitor Feed Viewport */}
            <div className="relative mt-4 aspect-video bg-[#041208] border border-emerald-800/60 rounded overflow-hidden flex items-center justify-center">
              {/* Scanlines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none" />

              {/* Feed Visuals */}
              <div className="text-center">
                {activeCCTVFeed === 1 ? (
                  <div className="space-y-2">
                    <div className="text-red-500 text-sm font-bold tracking-widest animate-pulse">
                      MOTION DETECTED IN STORAGE AISLE 2
                    </div>
                    <div className="text-xs text-zinc-400 font-sans">
                      [Distorted Silhouette Visible Between Cargo Shelves]
                    </div>
                    <div className="w-16 h-36 mx-auto bg-black border border-emerald-600/40 opacity-70 blur-[1px] animate-pulse" />
                  </div>
                ) : (
                  <div className="text-emerald-600/70 text-xs tracking-wider">
                    NO ACTIVE SENSORY DISRUPTION ON FEED 0{activeCCTVFeed + 1}
                  </div>
                )}
              </div>

              <div className="absolute bottom-3 left-3 text-[10px] text-emerald-500/80">
                CAM: {['STORAGE AISLE 1', 'STORAGE AISLE 2', 'COLD AIRLOCK', 'GENERATOR SUB-LEVEL'][activeCCTVFeed]}
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] text-emerald-500/80">
                REC: 02:17:48 AM · 30 FPS
              </div>
            </div>

            {/* Switch Camera Channel buttons */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {[0, 1, 2, 3].map((feedIdx) => (
                <button
                  key={feedIdx}
                  onClick={() => onSelectCCTVFeed(feedIdx)}
                  className={`px-4 py-1.5 text-xs font-bold rounded border transition ${
                    activeCCTVFeed === feedIdx
                      ? 'bg-emerald-800 text-white border-emerald-400 shadow-md'
                      : 'bg-zinc-900 text-emerald-600 border-zinc-800 hover:border-emerald-700'
                  }`}
                >
                  CAM 0{feedIdx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. PAUSE / SETTINGS MENU */}
      {isPaused && !isGameOver && !isVictory && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto z-50">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded shadow-2xl text-center">
            <h2 className="text-xl font-bold tracking-widest text-zinc-100">SYSTEM PAUSED</h2>
            <p className="text-xs text-zinc-500 mt-1">SECTOR 09 · INCIDENT PROTOCOL</p>

            <div className="flex justify-center gap-4 mt-6 border-b border-zinc-800 pb-3">
              <button
                onClick={() => setShowSettingsTab(false)}
                className={`text-xs font-bold pb-1 transition ${!showSettingsTab ? 'text-amber-400 border-b-2 border-amber-400' : 'text-zinc-500'}`}
              >
                MISSION OVERVIEW
              </button>
              <button
                onClick={() => setShowSettingsTab(true)}
                className={`text-xs font-bold pb-1 transition ${showSettingsTab ? 'text-amber-400 border-b-2 border-amber-400' : 'text-zinc-500'}`}
              >
                SETTINGS
              </button>
            </div>

            {!showSettingsTab ? (
              <div className="mt-6 space-y-4 text-left">
                <div className="bg-black/40 p-4 rounded border border-zinc-800">
                  <div className="text-[11px] text-amber-400 font-bold">CONTROLS:</div>
                  <div className="text-xs text-zinc-300 mt-2 space-y-1 font-sans">
                    <div><strong>WASD:</strong> Movement</div>
                    <div><strong>Shift:</strong> Sprint (Consumes Stamina)</div>
                    <div><strong>C / Ctrl:</strong> Crouch (Sneak past creature)</div>
                    <div><strong>F:</strong> Flashlight Toggle</div>
                    <div><strong>E:</strong> Interact with Doors / Terminals / Pickups</div>
                    <div><strong>ESC:</strong> Pause / Resume</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-6">
                  <button
                    onClick={onResume}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs tracking-wider rounded transition"
                  >
                    RESUME GAME
                  </button>
                  <button
                    onClick={onRestart}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> RESTART RUN
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-left">
                <div>
                  <label className="text-xs text-zinc-400 flex justify-between">
                    <span>Mouse Sensitivity</span>
                    <span>{(qualitySettings.sensitivity * 1000).toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.005"
                    step="0.0002"
                    value={qualitySettings.sensitivity}
                    onChange={(e) => onUpdateQuality({ sensitivity: parseFloat(e.target.value) })}
                    className="w-full mt-1 accent-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 flex justify-between">
                    <span>Master Volume</span>
                    <span>{Math.round(qualitySettings.masterVolume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={qualitySettings.masterVolume}
                    onChange={(e) => onUpdateQuality({ masterVolume: parseFloat(e.target.value) })}
                    className="w-full mt-1 accent-amber-500"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={onResume}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs tracking-wider rounded transition"
                  >
                    SAVE & RESUME
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12. GAME OVER / CAUGHT SCREEN */}
      {isGameOver && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto z-50 animate-fade-in">
          <div className="max-w-md w-full bg-black/90 border border-red-700 p-8 rounded shadow-2xl text-center text-red-500">
            <h1 className="text-3xl font-black tracking-widest uppercase">TERMINATED</h1>
            <p className="text-xs text-red-400 mt-2 font-sans tracking-wide">
              Subject 09 has eliminated the technician. Sector 09 remains dark.
            </p>

            <div className="my-6 p-4 bg-red-950/40 rounded border border-red-900/80 text-xs text-zinc-300 text-left font-sans space-y-1">
              <div><strong>SURVIVAL TIP:</strong> Crouching dampens your footsteps on concrete.</div>
              <div>Avoid shining the flashlight directly at the creature's face.</div>
              <div>Shelving units block line of sight.</div>
            </div>

            <button
              onClick={onRestart}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-widest uppercase rounded transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} /> TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* 13. VICTORY / ESCAPED SCREEN */}
      {isVictory && (
        <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto z-50 animate-fade-in">
          <div className="max-w-md w-full bg-black/90 border border-emerald-600 p-8 rounded shadow-2xl text-center text-emerald-400">
            <h1 className="text-3xl font-black tracking-widest uppercase">ESCAPED</h1>
            <p className="text-xs text-emerald-300 mt-2 font-sans tracking-wide">
              You cleared Loading Bay 4 and escaped the perimeter into the night.
            </p>

            <div className="my-6 p-4 bg-emerald-950/40 rounded border border-emerald-900/80 text-xs text-zinc-300 text-left font-sans space-y-1.5">
              <div className="text-amber-400 font-bold uppercase text-[11px]">DEBRIEFING REPORT:</div>
              <div>· Incident Evidence Recovered from Sector 09</div>
              <div>· Facility Power Circuit Triggered</div>
              <div>· Creature Containment Status: Unresolved</div>
            </div>

            <button
              onClick={onRestart}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-black font-bold text-xs tracking-widest uppercase rounded transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} /> REPLAY NIGHT SHIFT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

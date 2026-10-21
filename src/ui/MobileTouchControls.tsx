import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerController } from '../entities/PlayerController';
import { InteractiveObject } from '../types/game';
import { Zap, Eye, Battery, Hand, Menu } from 'lucide-react';

interface MobileTouchControlsProps {
  player: PlayerController;
  currentTarget: InteractiveObject | null;
  onInteract: () => void;
  onTogglePause: () => void;
  isCrouching: boolean;
  isFlashlightOn: boolean;
  battery: number;
  forceShow?: boolean;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  player,
  currentTarget,
  onInteract,
  onTogglePause,
  isCrouching,
  isFlashlightOn,
  battery,
  forceShow = false,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickBase, setJoystickBase] = useState<{ x: number; y: number } | null>(null);
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintHeld, setIsSprintHeld] = useState(false);

  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  // Responsive touch detection
  useEffect(() => {
    const updateTouchSupport = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 1024;
      setIsTouchDevice(hasTouch);
    };

    updateTouchSupport();
    window.addEventListener('resize', updateTouchSupport);
    return () => window.removeEventListener('resize', updateTouchSupport);
  }, []);

  // Joystick touch handlers (Left screen zone)
  const handleJoystickStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (joystickTouchIdRef.current === null) {
        joystickTouchIdRef.current = touch.identifier;
        setJoystickBase({ x: touch.clientX, y: touch.clientY });
        setJoystickThumb({ x: 0, y: 0 });
        setJoystickActive(true);
        player.setTouchMove(0, 0);
        break;
      }
    }
  }, [player]);

  const handleJoystickMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchIdRef.current === null || !joystickBase) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickBase.x;
        const dy = touch.clientY - joystickBase.y;
        const maxRadius = 45;
        const dist = Math.hypot(dx, dy);

        let normX = 0;
        let normY = 0;

        if (dist > 0) {
          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);
          const thumbX = Math.cos(angle) * clampedDist;
          const thumbY = Math.sin(angle) * clampedDist;

          setJoystickThumb({ x: thumbX, y: thumbY });

          normX = thumbX / maxRadius;
          // dy positive is downwards on screen, which is backwards in 3D (-y forward)
          normY = -(thumbY / maxRadius);
        }

        player.setTouchMove(normX, normY);
        break;
      }
    }
  }, [joystickBase, player]);

  const handleJoystickEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setJoystickBase(null);
        setJoystickThumb({ x: 0, y: 0 });
        player.setTouchMove(0, 0);
        break;
      }
    }
  }, [player]);

  // Look touch handlers (Right screen zone)
  const handleLookStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  }, []);

  const handleLookMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null || !lastLookPosRef.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        player.applyTouchLook(dx, dy);
        break;
      }
    }
  }, [player]);

  const handleLookEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        lastLookPosRef.current = null;
        break;
      }
    }
  }, []);

  // Toggle sprint
  const toggleSprint = useCallback((state?: boolean) => {
    setIsSprintHeld((prev) => {
      const next = state !== undefined ? state : !prev;
      player.touchSprint = next;
      return next;
    });
  }, [player]);

  // Toggle crouch
  const toggleCrouch = useCallback(() => {
    player.touchCrouch = !player.touchCrouch;
  }, [player]);

  if (!isTouchDevice && !forceShow) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden touch-none"
      style={{ touchAction: 'none' }}
    >
      {/* 1. TOP RIGHT PAUSE / MENU BUTTON FOR MOBILE */}
      <button
        onTouchStart={(e) => {
          e.stopPropagation();
          onTogglePause();
        }}
        onClick={onTogglePause}
        className="absolute top-4 right-4 pointer-events-auto p-3 bg-black/80 backdrop-blur-md border border-zinc-700/80 rounded-full text-zinc-300 hover:text-white active:scale-90 transition cursor-pointer shadow-2xl z-40"
        aria-label="Pause Menu"
      >
        <Menu size={20} />
      </button>

      {/* 2. LEFT HALF: VIRTUAL JOYSTICK MOVEMENT ZONE */}
      <div
        className="absolute left-0 bottom-0 w-1/2 h-[80%] pointer-events-auto touch-none z-10"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Dynamic Floating Joystick Base & Thumbstick */}
        {joystickActive && joystickBase && (
          <div
            className="absolute rounded-full border-2 border-amber-500/50 bg-black/50 backdrop-blur-md pointer-events-none transition-opacity duration-150"
            style={{
              width: 100,
              height: 100,
              left: joystickBase.x - 50,
              top: joystickBase.y - 50,
            }}
          >
            {/* Center Thumbstick */}
            <div
              className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-200/70 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
              style={{
                left: 50 - 24 + joystickThumb.x,
                top: 50 - 24 + joystickThumb.y,
              }}
            />
          </div>
        )}

        {/* Ambient indicator when not touching */}
        {!joystickActive && (
          <div className="absolute left-6 bottom-6 flex flex-col items-center opacity-45 pointer-events-none">
            <div className="w-20 h-20 rounded-full border border-dashed border-amber-500/50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-amber-500/30 border border-amber-400/40" />
            </div>
            <span className="text-[10px] text-zinc-300 font-mono mt-1 tracking-wider uppercase">
              ДЖОЙСТИК (ДВИЖЕНИЕ)
            </span>
          </div>
        )}
      </div>

      {/* 3. RIGHT HALF: TOUCH CAMERA LOOK DRAG ZONE */}
      <div
        className="absolute right-0 bottom-0 w-1/2 h-full pointer-events-auto touch-none z-10"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Ambient look instruction */}
        <div className="absolute right-6 top-16 opacity-35 pointer-events-none text-right">
          <span className="text-[10px] text-zinc-300 font-mono tracking-widest uppercase">
            СВАЙП ДЛЯ ОБЗОРА
          </span>
        </div>
      </div>

      {/* 4. ERGONOMIC ACTION BUTTONS (BOTTOM RIGHT OVERLAY) */}
      <div className="absolute right-4 bottom-5 flex flex-col items-end gap-3 pointer-events-none z-20">
        {/* INTERACTION / USE BUTTON (Appears prominently when looking at interactable object) */}
        {currentTarget && (
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            onClick={onInteract}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 bg-emerald-600/95 hover:bg-emerald-500 active:scale-92 border-2 border-emerald-300 rounded-full text-white font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-pulse transition cursor-pointer"
          >
            <Hand size={18} />
            <span>[E] {currentTarget.actionText.length > 20 ? currentTarget.actionText.substring(0, 18) + '...' : currentTarget.actionText}</span>
          </button>
        )}

        {/* CLUSTER OF 3 ACTION BUTTONS: RUN, CROUCH, FLASHLIGHT */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* FLASHLIGHT TOGGLE */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              player.toggleFlashlight();
            }}
            onClick={() => player.toggleFlashlight()}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition active:scale-90 shadow-2xl cursor-pointer ${
              isFlashlightOn
                ? 'bg-amber-500 border-amber-200 text-black shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                : 'bg-zinc-950/90 border-zinc-700 text-zinc-400'
            }`}
            aria-label="Фонарик"
          >
            <Battery size={18} />
            <span className="text-[10px] font-mono font-bold mt-0.5">{Math.round(battery)}%</span>
          </button>

          {/* CROUCH / SIT STEALTH TOGGLE */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              toggleCrouch();
            }}
            onClick={toggleCrouch}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition active:scale-90 shadow-2xl cursor-pointer ${
              isCrouching
                ? 'bg-emerald-600 border-emerald-200 text-white shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse'
                : 'bg-zinc-950/90 border-zinc-700 text-zinc-300'
            }`}
            aria-label="Присесть"
          >
            <Eye size={18} />
            <span className="text-[9px] font-mono font-bold mt-0.5 tracking-tighter">
              {isCrouching ? 'ТИХО' : 'ПРИСЕСТЬ'}
            </span>
          </button>

          {/* SPRINT BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              toggleSprint(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              toggleSprint(false);
            }}
            onMouseDown={() => toggleSprint(true)}
            onMouseUp={() => toggleSprint(false)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition active:scale-90 shadow-2xl cursor-pointer ${
              isSprintHeld
                ? 'bg-amber-500 border-amber-200 text-black shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                : 'bg-zinc-950/90 border-zinc-700 text-zinc-300'
            }`}
            aria-label="Бег"
          >
            <Zap size={20} />
            <span className="text-[9px] font-mono font-bold mt-0.5 tracking-tighter">БЕГ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

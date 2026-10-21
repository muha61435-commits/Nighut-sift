import React, { useEffect, useRef, useState } from 'react';
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
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  player,
  currentTarget,
  onInteract,
  onTogglePause,
  isCrouching,
  isFlashlightOn,
  battery,
}) => {
  // Touch detection: active if device supports touch or on small screen
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickBase, setJoystickBase] = useState<{ x: number; y: number } | null>(null);
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintHeld, setIsSprintHeld] = useState(false);

  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
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
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
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
          // dy positive is downwards on screen, which is backwards in 3D (-y in forward sense)
          normY = -(thumbY / maxRadius);
        }

        player.setTouchMove(normX, normY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
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
  };

  // Look touch handlers (right side)
  const handleLookStart = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleLookMove = (e: React.TouchEvent<HTMLDivElement>) => {
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
  };

  const handleLookEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        lastLookPosRef.current = null;
        break;
      }
    }
  };

  // Toggle sprint
  const toggleSprint = (state?: boolean) => {
    const next = state !== undefined ? state : !isSprintHeld;
    setIsSprintHeld(next);
    player.touchSprint = next;
  };

  // Toggle crouch
  const toggleCrouch = () => {
    player.touchCrouch = !player.touchCrouch;
  };

  if (!isTouchDevice) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden touch-none"
      style={{ touchAction: 'none' }}
    >
      {/* 1. TOP PAUSE BUTTON */}
      <button
        onClick={onTogglePause}
        className="absolute top-4 right-4 pointer-events-auto p-2.5 bg-black/70 backdrop-blur-md border border-zinc-700 rounded-full text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer shadow-lg"
        aria-label="Pause Menu"
      >
        <Menu size={18} />
      </button>

      {/* 2. LEFT HALF: VIRTUAL JOYSTICK MOVEMENT ZONE */}
      <div
        className="absolute left-0 bottom-0 w-1/2 h-3/4 pointer-events-auto touch-none"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Dynamic Floating Joystick Base & Thumbstick */}
        {joystickActive && joystickBase && (
          <div
            className="absolute rounded-full border-2 border-amber-500/50 bg-black/40 backdrop-blur-sm pointer-events-none transition-opacity duration-200"
            style={{
              width: 100,
              height: 100,
              left: joystickBase.x - 50,
              top: joystickBase.y - 50,
            }}
          >
            {/* Center Thumbstick */}
            <div
              className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-200/60 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
              style={{
                left: 50 - 24 + joystickThumb.x,
                top: 50 - 24 + joystickThumb.y,
              }}
            />
          </div>
        )}

        {/* Ambient indicator when not touching */}
        {!joystickActive && (
          <div className="absolute left-8 bottom-8 flex flex-col items-center opacity-40 pointer-events-none">
            <div className="w-20 h-20 rounded-full border border-dashed border-zinc-500 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-600/50" />
            </div>
            <span className="text-[10px] text-zinc-400 font-mono mt-1 tracking-wider">MOVE</span>
          </div>
        )}
      </div>

      {/* 3. RIGHT HALF: TOUCH CAMERA LOOK DRAG ZONE */}
      <div
        className="absolute right-0 bottom-0 w-1/2 h-full pointer-events-auto touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Ambient look instruction */}
        <div className="absolute right-8 top-16 opacity-30 pointer-events-none text-right">
          <span className="text-[10px] text-zinc-400 font-mono tracking-widest">DRAG TO LOOK</span>
        </div>
      </div>

      {/* 4. ERGONOMIC ACTION BUTTONS (BOTTOM RIGHT OVERLAY) */}
      <div className="absolute right-5 bottom-6 flex flex-col items-end gap-3 pointer-events-none">
        {/* INTERACTION / USE BUTTON (Appears prominently when near object) */}
        {currentTarget ? (
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            onClick={onInteract}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 border-2 border-emerald-400 rounded-full text-white font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-pulse transition"
          >
            <Hand size={18} />
            <span>[E] {currentTarget.actionText.length > 18 ? currentTarget.actionText.substring(0, 16) + '...' : currentTarget.actionText}</span>
          </button>
        ) : null}

        {/* CLUSTER OF 3 ACTION BUTTONS: RUN, CROUCH, FLASHLIGHT */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* FLASHLIGHT TOGGLE */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              player.toggleFlashlight();
            }}
            onClick={() => player.toggleFlashlight()}
            className={`w-13 h-13 rounded-full flex flex-col items-center justify-center border transition active:scale-90 shadow-xl ${
              isFlashlightOn
                ? 'bg-amber-500/90 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-400'
            }`}
            aria-label="Toggle Torch"
          >
            <Battery size={18} />
            <span className="text-[9px] font-bold mt-0.5">{Math.round(battery)}%</span>
          </button>

          {/* CROUCH / SIT STEALTH TOGGLE */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              toggleCrouch();
            }}
            onClick={toggleCrouch}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition active:scale-90 shadow-xl ${
              isCrouching
                ? 'bg-emerald-600 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-pulse'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
            }`}
            aria-label="Crouch Stealth"
          >
            <Eye size={18} />
            <span className="text-[9px] font-bold mt-0.5 tracking-tighter">
              {isCrouching ? 'HIDDEN' : 'CROUCH'}
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
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition active:scale-90 shadow-xl ${
              isSprintHeld
                ? 'bg-amber-500 border-amber-200 text-black shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
            }`}
            aria-label="Sprint"
          >
            <Zap size={20} />
            <span className="text-[9px] font-bold mt-0.5 tracking-tighter">RUN</span>
          </button>
        </div>
      </div>
    </div>
  );
};

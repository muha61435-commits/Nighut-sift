import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, QualitySettings } from './types/game';
import { LevelBuilder } from './level/LevelBuilder';
import { SoundSystem } from './audio/SoundSystem';
import { NavigationGraph } from './level/NavigationGraph';
import { PlayerController } from './entities/PlayerController';
import { MonsterEntity } from './entities/MonsterEntity';
import { MonsterAI } from './ai/MonsterAI';
import { StoryManager } from './systems/StoryManager';
import { GameHUD } from './ui/GameHUD';
import { Play, Volume2, ShieldAlert } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // React state for HUD
  const [gameState, setGameState] = useState<GameState>('menu');
  const gameStateRef = useRef<GameState>('menu');
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [isJumpscare, setIsJumpscare] = useState<boolean>(false);
  const [isCrouched, setIsCrouched] = useState<boolean>(false);
  const [battery, setBattery] = useState<number>(100);
  const [stamina, setStamina] = useState<number>(100);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(true);
  const [notification, setNotification] = useState<string>('');
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [activeAudio, setActiveAudio] = useState<any>(null);
  const [cctvFeed, setCctvFeed] = useState<number | null>(null);
  const [inv, setInv] = useState<any[]>([]);
  const [obj, setObj] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);

  const [quality, setQuality] = useState<QualitySettings>({
    shadows: true,
    fog: true,
    particles: true,
    sensitivity: 0.0022,
    masterVolume: 0.85,
    sfxVolume: 0.9,
    ambientVolume: 0.4,
  });

  // Engine references
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    levelBuilder: LevelBuilder;
    soundSystem: SoundSystem;
    navGraph: NavigationGraph;
    player: PlayerController;
    monster: MonsterEntity;
    monsterAI: MonsterAI;
    story: StoryManager;
  } | null>(null);

  // Initialize Game Engine on Mount
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    containerRef.current.appendChild(renderer.domElement);

    // 2. Systems
    const soundSystem = new SoundSystem();
    const levelBuilder = new LevelBuilder(scene);
    levelBuilder.buildAll();

    const navGraph = new NavigationGraph();
    const player = new PlayerController(camera, renderer.domElement, levelBuilder, soundSystem);
    scene.add(camera);

    const monster = new MonsterEntity(scene);
    const monsterAI = new MonsterAI(monster, navGraph, levelBuilder, soundSystem, player);
    const story = new StoryManager(levelBuilder, monsterAI, soundSystem, player, navGraph);

    engineRef.current = {
      renderer,
      scene,
      camera,
      levelBuilder,
      soundSystem,
      navGraph,
      player,
      monster,
      monsterAI,
      story,
    };

    setObj(story.getCurrentObjective());

    // 3. Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 4. Interaction Key Listener ('E' / Click)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        if (player.currentTarget && engineRef.current) {
          engineRef.current.story.handleInteraction(player.currentTarget);
          setInv([...engineRef.current.story.inventory]);
          setObj(engineRef.current.story.getCurrentObjective());
          setActiveDoc(engineRef.current.story.activeDocument);
          setActiveAudio(engineRef.current.story.activeAudioLog);
          setCctvFeed(engineRef.current.story.activeCCTVFeed);
        }
      } else if (e.code === 'Escape') {
        if (engineRef.current?.story.activeDocument) {
          engineRef.current.story.activeDocument = null;
          setActiveDoc(null);
        } else if (engineRef.current?.story.activeAudioLog) {
          engineRef.current.story.activeAudioLog = null;
          setActiveAudio(null);
        } else if (engineRef.current?.story.activeCCTVFeed !== null && engineRef.current?.story.activeCCTVFeed !== undefined) {
          engineRef.current.story.activeCCTVFeed = null;
          setCctvFeed(null);
        } else {
          const next = gameStateRef.current === 'playing' ? 'paused' : 'playing';
          gameStateRef.current = next;
          setGameState(next);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 5. Game Loop
    let lastTime = performance.now();
    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const engine = engineRef.current;
      if (!engine) return;

      // Update engine when playing
      if (gameStateRef.current === 'playing') {
        engine.player.update(delta);
        engine.monsterAI.update(delta);
        engine.levelBuilder.updateAnimations(delta);
        engine.story.update(delta);
        engine.soundSystem.updateListener(engine.camera);

        // Sync React HUD state throttled
        setBattery(engine.player.battery);
        setStamina(engine.player.stamina);
        setIsFlashlightOn(engine.player.isFlashlightOn);
        setTarget(engine.player.currentTarget);
        setNotification(engine.story.notificationMessage);
        setIsPointerLocked(engine.player.isLocked);
        setIsJumpscare(engine.monsterAI.isJumpscaring);
        setIsCrouched(engine.player.isCrouching);

        // Check caught / game over
        if (engine.monsterAI.isPlayerCaught) {
          setIsJumpscare(false);
          gameStateRef.current = 'gameover';
          setGameState('gameover');
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
        }

        // Check victory
        if (engine.story.isEscaped) {
          gameStateRef.current = 'victory';
          setGameState('victory');
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
        }
      }

      engine.renderer.render(engine.scene, engine.camera);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Start game handler
  const handleStartGame = () => {
    if (!engineRef.current) return;
    engineRef.current.soundSystem.init();
    engineRef.current.soundSystem.resume();
    engineRef.current.player.isFlashlightOn = true;
    engineRef.current.player.flashlight.intensity = 9.0;
    engineRef.current.player.flashlightFill.intensity = 2.4;
    gameStateRef.current = 'playing';
    setGameState('playing');
    try {
      engineRef.current.renderer.domElement.requestPointerLock?.();
    } catch (e) {
      console.warn('Pointer lock request error:', e);
    }
  };

  // Restart game handler
  const handleRestart = () => {
    if (engineRef.current) {
      const e = engineRef.current;
      e.player.position.set(0, 0, 36);
      e.player.velocity.set(0, 0, 0);
      e.player.yaw = 0;
      e.player.pitch = 0;
      e.player.battery = 100;
      e.player.stamina = 100;
      e.player.isFlashlightOn = true;
      e.player.flashlight.intensity = 9.0;
      e.player.flashlightFill.intensity = 2.4;
      e.monsterAI.isJumpscaring = false;
      e.monsterAI.isPlayerCaught = false;
      e.monsterAI.state = 'PATROL';
      e.monsterAI.entity.position.set(-12, 0, -18);
      gameStateRef.current = 'playing';
      setGameState('playing');
      try {
        e.renderer.domElement.requestPointerLock?.();
      } catch (err) {
        console.warn('Pointer lock request on restart:', err);
      }
    } else {
      window.location.reload();
    }
  };

  // Lock pointer helper
  const handleLockPointer = () => {
    engineRef.current?.renderer.domElement.requestPointerLock();
  };

  // Quality settings update
  const handleUpdateQuality = (newSettings: Partial<QualitySettings>) => {
    setQuality((prev) => {
      const updated = { ...prev, ...newSettings };
      if (engineRef.current) {
        if (newSettings.sensitivity !== undefined) {
          engineRef.current.player.sensitivity = newSettings.sensitivity;
        }
        if (newSettings.masterVolume !== undefined || newSettings.sfxVolume !== undefined || newSettings.ambientVolume !== undefined) {
          engineRef.current.soundSystem.setVolumes(updated.masterVolume, updated.sfxVolume, updated.ambientVolume);
        }
      }
      return updated;
    });
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />

      {/* Main Start Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-zinc-100 z-50 font-mono">
          <div className="max-w-xl w-full text-center space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs tracking-widest text-red-500 uppercase">
                <ShieldAlert size={16} />
                <span>RESTRICTED FACILITY ACCESS</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-widest text-zinc-100">
                NIGHT SHIFT
              </h1>
              <div className="text-sm font-semibold tracking-widest text-amber-500">
                SECTOR 09
              </div>
            </div>

            <div className="p-4 bg-zinc-950/80 rounded border border-zinc-800 text-left text-xs text-zinc-400 space-y-2 font-sans leading-relaxed">
              <p>
                <strong>02:17 AM.</strong> An emergency breaker triggered at Warehouse Sector 09, a distribution complex sealed twelve years ago following an unverified biological anomaly.
              </p>
              <p>
                You are on maintenance duty. Restore the backup generator power and recover the incident archive.
              </p>
              <p className="text-amber-400/90 font-mono text-[11px] space-y-1">
                <span>· SOMETHING IS IN THE WAREHOUSE.</span><br />
                <span>· SPRINTING [SHIFT] MAKES NOISE — THE CREATURE WILL HUNT AND CHASE YOU!</span><br />
                <span>· SITTING/CROUCHING [C / CTRL] BREAKS PURSUIT — IT WILL STOP AND WALK AWAY.</span><br />
                <span>· IF IT CATCHES YOU, AN EXTREME JUMPSCARE OCCURS.</span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartGame}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-widest uppercase rounded shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={18} /> ENTER SECTOR 09
              </button>
              <div className="text-[11px] text-zinc-500">
                Headphones recommended · Pointer lock mouse controls enabled
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Game HUD */}
      {gameState !== 'menu' && obj && (
        <GameHUD
          currentObjective={obj}
          inventory={inv}
          battery={battery}
          stamina={stamina}
          isFlashlightOn={isFlashlightOn}
          currentTarget={target}
          notificationMessage={notification}
          activeDocument={activeDoc}
          activeAudioLog={activeAudio}
          activeCCTVFeed={cctvFeed}
          isPaused={gameState === 'paused'}
          isGameOver={gameState === 'gameover'}
          isVictory={gameState === 'victory'}
          isJumpscaring={isJumpscare}
          isCrouching={isCrouched}
          qualitySettings={quality}
          onCloseDocument={() => {
            if (engineRef.current) engineRef.current.story.activeDocument = null;
            setActiveDoc(null);
          }}
          onCloseAudioLog={() => {
            if (engineRef.current) engineRef.current.story.activeAudioLog = null;
            setActiveAudio(null);
          }}
          onCloseCCTV={() => {
            if (engineRef.current) engineRef.current.story.activeCCTVFeed = null;
            setCctvFeed(null);
          }}
          onSelectCCTVFeed={(feedIdx) => {
            if (engineRef.current) engineRef.current.story.activeCCTVFeed = feedIdx;
            setCctvFeed(feedIdx);
          }}
          onResume={() => {
            gameStateRef.current = 'playing';
            setGameState('playing');
          }}
          onRestart={handleRestart}
          onUpdateQuality={handleUpdateQuality}
          isPointerLocked={isPointerLocked}
          onLockPointer={handleLockPointer}
        />
      )}
    </div>
  );
}

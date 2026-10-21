import * as THREE from 'three';
import { SoundEvent } from '../types/game';

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  // Ambient sound nodes
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  // Sound event listeners (for Monster AI detection)
  private soundListeners: ((event: SoundEvent) => void)[] = [];

  private isMuted: boolean = false;
  private monsterPanner: PannerNode | null = null;
  private monsterFootstepStep: number = 0;

  constructor() {
    // Initialized on user gesture
  }

  public init(): void {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Create 3D spatial panner for monster
    this.monsterPanner = this.ctx.createPanner();
    this.monsterPanner.panningModel = 'HRTF';
    this.monsterPanner.distanceModel = 'inverse';
    this.monsterPanner.refDistance = 3;
    this.monsterPanner.maxDistance = 60;
    this.monsterPanner.rolloffFactor = 1.2;
    this.monsterPanner.connect(this.sfxGain);

    this.startIndustrialAmbience();
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, ambient: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setValueAtTime(master, t);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, t);
    if (this.ambientGain) this.ambientGain.gain.setValueAtTime(ambient, t);
  }

  public updateListener(camera: THREE.Camera): void {
    if (!this.ctx || !this.ctx.listener) return;
    const pos = camera.position;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const up = camera.up;

    if (this.ctx.listener.positionX) {
      const t = this.ctx.currentTime;
      this.ctx.listener.positionX.setValueAtTime(pos.x, t);
      this.ctx.listener.positionY.setValueAtTime(pos.y, t);
      this.ctx.listener.positionZ.setValueAtTime(pos.z, t);
      this.ctx.listener.forwardX.setValueAtTime(forward.x, t);
      this.ctx.listener.forwardY.setValueAtTime(forward.y, t);
      this.ctx.listener.forwardZ.setValueAtTime(forward.z, t);
      this.ctx.listener.upX.setValueAtTime(up.x, t);
      this.ctx.listener.upY.setValueAtTime(up.y, t);
      this.ctx.listener.upZ.setValueAtTime(up.z, t);
    }
  }

  public updateMonsterPosition(pos: THREE.Vector3): void {
    if (!this.ctx || !this.monsterPanner) return;
    const t = this.ctx.currentTime;
    if (this.monsterPanner.positionX) {
      this.monsterPanner.positionX.setValueAtTime(pos.x, t);
      this.monsterPanner.positionY.setValueAtTime(pos.y, t);
      this.monsterPanner.positionZ.setValueAtTime(pos.z, t);
    }
  }

  public onSoundEmitted(listener: (event: SoundEvent) => void): void {
    this.soundListeners.push(listener);
  }

  public emitSoundEvent(
    category: SoundEvent['category'],
    position: [number, number, number],
    intensity: number,
    radius: number
  ): void {
    const event: SoundEvent = {
      id: Math.random().toString(36).substring(2, 9),
      category,
      position,
      intensity,
      radius,
      timestamp: Date.now(),
    };
    for (const listener of this.soundListeners) {
      listener(event);
    }
  }

  // --- AMBIENT SOUND GENERATION ---
  private startIndustrialAmbience(): void {
    if (!this.ctx || !this.ambientGain) return;

    // Deep low-frequency drone (40Hz - 60Hz) simulating industrial warehouse resonance
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sawtooth';
    this.ambientOsc1.frequency.setValueAtTime(46, this.ctx.currentTime);

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.setValueAtTime(68, this.ctx.currentTime);

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.ambientOsc1.connect(this.ambientFilter);
    this.ambientOsc2.connect(this.ambientFilter);
    this.ambientFilter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    this.ambientOsc1.start();
    this.ambientOsc2.start();

    // Occasional pipe clank / metallic creak loop
    setInterval(() => {
      if (Math.random() < 0.35) {
        this.playDistantPipeCreak();
      }
    }, 7000);
  }

  public playDistantPipeCreak(): void {
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(70 + Math.random() * 40, t + 1.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, t);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(t);
    osc.stop(t + 1.7);
  }

  // --- PLAYER FOOTSTEPS & SOUNDS ---
  public playPlayerFootstep(surface: 'concrete' | 'metal' | 'asphalt', isSprinting: boolean, isCrouching: boolean, pos: THREE.Vector3): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Procedural noise burst for footstep
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (surface === 'metal') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(6, t);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isSprinting ? 450 : 280, t);
    }

    const vol = isCrouching ? 0.05 : isSprinting ? 0.35 : 0.18;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);

    // Emit sound event for monster AI
    const radius = isCrouching ? 4 : isSprinting ? 24 : 10;
    const intensity = isCrouching ? 0.15 : isSprinting ? 0.9 : 0.45;
    const category = isCrouching
      ? 'footstep_crouch'
      : isSprinting
      ? 'footstep_sprint'
      : surface === 'metal'
      ? 'footstep_metal'
      : 'footstep_walk';

    this.emitSoundEvent(category, [pos.x, pos.y, pos.z], intensity, surface === 'metal' ? radius * 1.3 : radius);
  }

  // --- MONSTER SOUNDS (SPATIALIZED) ---
  public playMonsterFootstep(pos: THREE.Vector3, isHunting: boolean): void {
    if (!this.ctx || !this.monsterPanner) return;
    const t = this.ctx.currentTime;
    this.updateMonsterPosition(pos);

    // Asymmetric limp: alternating heavy thud and dragging scrape
    this.monsterFootstepStep++;
    const isHeavyStep = this.monsterFootstepStep % 2 === 0;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (isHeavyStep) {
      // Heavy sickening thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, t);

      gain.gain.setValueAtTime(isHunting ? 0.9 : 0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    } else {
      // Shuffling scrape / limp drag
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280, t);
      filter.Q.setValueAtTime(3, t);

      gain.gain.setValueAtTime(isHunting ? 0.7 : 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.monsterPanner);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playMonsterRoar(pos: THREE.Vector3): void {
    if (!this.ctx || !this.monsterPanner) return;
    const t = this.ctx.currentTime;
    this.updateMonsterPosition(pos);

    // Unsettling metallic screech and low rumble
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(90, t);
    osc1.frequency.linearRampToValueAtTime(160, t + 0.4);
    osc1.frequency.exponentialRampToValueAtTime(50, t + 1.8);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(86, t); // slight detune
    osc2.frequency.linearRampToValueAtTime(165, t + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(48, t + 1.8);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.9, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.monsterPanner);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.1);
    osc2.stop(t + 2.1);
  }

  // --- INTERACTION SOUNDS ---
  public playDoorSound(open: boolean, pos: [number, number, number]): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(open ? 180 : 120, t);
    osc.frequency.exponentialRampToValueAtTime(open ? 80 : 50, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.6);

    // Noise alert
    this.emitSoundEvent('door', pos, 0.6, 16);
  }

  public playFlashlightToggle(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playGeneratorStart(pos: [number, number, number]): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Engine crank then loud low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.linearRampToValueAtTime(120, t + 1.5);
    osc.frequency.setValueAtTime(80, t + 2.5);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 1.2);
    gain.gain.setValueAtTime(0.6, t + 4.0);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 5.0);

    // Huge sound event that wakes and calls monster!
    this.emitSoundEvent('generator', pos, 1.0, 50);
  }

  public playAlarmSiren(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.6);
    osc.frequency.linearRampToValueAtTime(440, t + 1.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 1.3);
  }

  public playTapeAudio(textLength: number): void {
    if (!this.ctx || !this.sfxGain) return;
    // Tape hiss and garbled radio static
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 2.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  public playHeartbeat(fast: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(fast ? 0.45 : 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- ICONIC FNAF-STYLE ANIMATRONIC HORROR JUMPSCARE ---
  public playJumpscareScreech(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // High-gain master output for very loud FNAF scream
    const masterScare = this.ctx.createGain();
    masterScare.gain.setValueAtTime(2.2, t);
    masterScare.gain.linearRampToValueAtTime(2.0, t + 0.9);
    masterScare.gain.exponentialRampToValueAtTime(0.01, t + 2.2);
    masterScare.connect(this.ctx.destination);

    // Distortion WaveShaper for raw animatronic crunch
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; ++i) {
      const x = (i * 2) / 512 - 1;
      curve[i] = ((3 + 12) * x * 20 * (Math.PI / 180)) / (Math.PI + 12 * Math.abs(x));
    }
    shaper.curve = curve;
    shaper.connect(masterScare);

    // 1. FNAF Signature Stutter LFO (30Hz AM/FM Modulation)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(32, t); // Rapid robotic stutter

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, t); // Pitch modulation depth
    lfo.connect(lfoGain);

    // Dual FNAF carrier screams (740Hz & 1120Hz)
    const scareOsc1 = this.ctx.createOscillator();
    scareOsc1.type = 'sawtooth';
    scareOsc1.frequency.setValueAtTime(740, t);
    scareOsc1.frequency.linearRampToValueAtTime(980, t + 0.3);
    scareOsc1.frequency.exponentialRampToValueAtTime(320, t + 2.0);
    lfoGain.connect(scareOsc1.frequency);

    const scareOsc2 = this.ctx.createOscillator();
    scareOsc2.type = 'square';
    scareOsc2.frequency.setValueAtTime(1120, t);
    scareOsc2.frequency.linearRampToValueAtTime(1460, t + 0.2);
    scareOsc2.frequency.exponentialRampToValueAtTime(450, t + 2.0);
    lfoGain.connect(scareOsc2.frequency);

    const oscMix = this.ctx.createGain();
    oscMix.gain.setValueAtTime(0.5, t);
    scareOsc1.connect(oscMix);
    scareOsc2.connect(oscMix);
    oscMix.connect(shaper);

    lfo.start(t);
    scareOsc1.start(t);
    scareOsc2.start(t);
    lfo.stop(t + 2.2);
    scareOsc1.stop(t + 2.2);
    scareOsc2.stop(t + 2.2);

    // 2. Heavy Sub-Bass Jolt (Impact boom)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.8);
    subGain.gain.setValueAtTime(1.2, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(masterScare);
    sub.start(t);
    sub.stop(t + 1.3);

    // 3. Harsh distorted white noise burst
    const bufLen = this.ctx.sampleRate * 1.8;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.9));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1800, t);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(shaper);
    noise.start(t);
  }
}

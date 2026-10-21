import * as THREE from 'three';
import { InteractiveObject } from '../types/game';
import { LevelBuilder } from '../level/LevelBuilder';
import { SoundSystem } from '../audio/SoundSystem';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 48); // Start in outside yard
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isLocked: boolean = false;

  // Camera angles
  public pitch: number = 0;
  public yaw: number = 0;
  public sensitivity: number = 0.0022;

  // States
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public stamina: number = 100; // 0 to 100
  public maxStamina: number = 100;
  public battery: number = 100; // 0 to 100
  public isFlashlightOn: boolean = true;

  // Physical stats
  private normalHeight: number = 1.75;
  private crouchHeight: number = 0.95;
  private currentEyeHeight: number = 1.75;
  private playerRadius: number = 0.45;

  // Head bob
  private bobTimer: number = 0;
  private strideDist: number = 0;

  // Flashlight lights
  public flashlight: THREE.SpotLight;
  public flashlightFill: THREE.PointLight;
  public flashlightTarget: THREE.Object3D;

  // Keyboard input
  private keys: { [key: string]: boolean } = {};

  // Raycaster for interactions
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  public currentTarget: InteractiveObject | null = null;

  private levelBuilder: LevelBuilder;
  private soundSystem: SoundSystem;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, levelBuilder: LevelBuilder, soundSystem: SoundSystem) {
    this.camera = camera;
    this.levelBuilder = levelBuilder;
    this.soundSystem = soundSystem;

    // Flashlight setup: Ultra-bright wide-beam industrial torch
    this.flashlight = new THREE.SpotLight(0xffffff, 9.0, 52, Math.PI / 4.2, 0.45, 1.1);
    this.flashlight.castShadow = true;
    this.flashlightTarget = new THREE.Object3D();
    camera.add(this.flashlight);
    camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlightTarget.position.set(0, 0, -8);

    // Wide ambient camera fill so ground and immediate surroundings are clearly visible
    this.flashlightFill = new THREE.PointLight(0xe8f2ff, 2.4, 16, 1.2);
    camera.add(this.flashlightFill);

    this.bindEvents(domElement);
  }

  public isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  public crouchToggle: boolean = false;

  private bindEvents(domElement: HTMLElement): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') {
        this.toggleFlashlight();
      }
      if (e.code === 'KeyC') {
        this.crouchToggle = !this.crouchToggle;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    domElement.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      if (!this.isLocked) {
        domElement.requestPointerLock?.();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.yaw -= e.movementX * this.sensitivity;
        this.pitch -= e.movementY * this.sensitivity;
      } else if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.yaw -= dx * this.sensitivity;
        this.pitch -= dy * this.sensitivity;
      }

      const limit = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });
  }

  public toggleFlashlight(): void {
    if (this.battery <= 0 && !this.isFlashlightOn) return;
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.intensity = this.isFlashlightOn ? 9.0 : 0;
    this.flashlightFill.intensity = this.isFlashlightOn ? 2.4 : 0;
    this.soundSystem.playFlashlightToggle();
  }

  public rechargeBattery(amount: number = 60): void {
    this.battery = Math.min(100, this.battery + amount);
    if (!this.isFlashlightOn) {
      this.toggleFlashlight();
    }
  }

  public update(delta: number): void {
    // 1. Drain / Recharge Flashlight (Long battery life + auto trickle recharge)
    if (this.isFlashlightOn) {
      // Slow, comfortable drain (~7-8 minutes continuous use)
      this.battery = Math.max(0, this.battery - delta * 0.22);
      if (this.battery <= 0) {
        this.isFlashlightOn = false;
        this.flashlight.intensity = 0;
        this.flashlightFill.intensity = 0;
      } else if (this.battery < 8) {
        // Subtle battery dying flicker only at very low charge
        const flicker = Math.random() < 0.1 ? 2.5 : 8.0;
        this.flashlight.intensity = flicker;
        this.flashlightFill.intensity = 0.8;
      } else {
        this.flashlight.intensity = 9.0;
        this.flashlightFill.intensity = 2.4;
      }
    } else {
      // Natural battery recharge when switched off
      this.battery = Math.min(100, this.battery + delta * 0.4);
      this.flashlight.intensity = 0;
      this.flashlightFill.intensity = 0;
    }

    // 2. Crouch & Sprint states
    this.isCrouching = this.crouchToggle || !!this.keys['ControlLeft'] || !!this.keys['ControlRight'] || !!this.keys['KeyC'];
    const canSprint = !this.isCrouching && this.stamina > 10;
    this.isSprinting = !!this.keys['ShiftLeft'] && canSprint && (!!this.keys['KeyW'] || !!this.keys['KeyS'] || !!this.keys['KeyA'] || !!this.keys['KeyD']);

    // Stamina calculation
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 22);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 14);
    }

    // Smooth eye height adjustment
    const targetEyeHeight = this.isCrouching ? this.crouchHeight : this.normalHeight;
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, targetEyeHeight, delta * 10.0);

    // 3. Movement Direction
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;

    let speed = 3.6; // Base walk speed
    if (this.isCrouching) speed = 1.7;
    else if (this.isSprinting) speed = 6.4;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      // Transform by yaw angle
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const desiredVel = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z * speed)
        .addScaledVector(right, moveDir.x * speed);

      this.velocity.lerp(desiredVel, delta * 10);

      // Head Bobbing
      this.bobTimer += delta * (this.isSprinting ? 14 : this.isCrouching ? 6 : 9);
      const bobAmount = this.isCrouching ? 0.02 : this.isSprinting ? 0.08 : 0.045;
      const bobY = Math.sin(this.bobTimer) * bobAmount;

      // Footstep sound triggering
      this.strideDist += this.velocity.length() * delta;
      const stepInterval = this.isSprinting ? 1.4 : this.isCrouching ? 0.8 : 1.1;
      if (this.strideDist >= stepInterval) {
        this.strideDist = 0;
        const surface = this.position.y < -2 ? 'metal' : this.position.z > 26 ? 'asphalt' : 'concrete';
        this.soundSystem.playPlayerFootstep(surface, this.isSprinting, this.isCrouching, this.position);
      }

      this.camera.position.y = this.position.y + this.currentEyeHeight + bobY;
    } else {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), delta * 12);
      this.camera.position.y = this.position.y + this.currentEyeHeight;
    }

    // 4. Collision Detection & Wall Sliding
    this.moveWithCollision(this.velocity.clone().multiplyScalar(delta));

    // Floor height calculation (handling Basement stairwell ramp)
    this.updateVerticalPosition();

    // 5. Update Camera Rotation & Position
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
    this.camera.position.x = this.position.x;
    this.camera.position.z = this.position.z;

    // 6. Raycast Center Interaction Check
    this.checkInteraction();
  }

  private updateVerticalPosition(): void {
    // Basement ramp check: between X in [-38, -34], Z in [-14, -2]
    if (this.position.x <= -32 && this.position.z <= -2 && this.position.z >= -14) {
      // Ramp from Y = 0 (at Z = -24) down to Y = -6 (at Z = -2)
      const t = THREE.MathUtils.clamp((this.position.z - (-2)) / (-14 - (-2)), 0, 1);
      this.position.y = THREE.MathUtils.lerp(-6, 0, t);
    } else if (this.position.x <= -14 && this.position.z >= -12 && this.position.z <= 12 && this.position.y < -2) {
      // Inside Basement Generator Room
      this.position.y = -6;
    } else {
      // Ground floor
      this.position.y = 0;
    }
  }

  private moveWithCollision(displacement: THREE.Vector3): void {
    // Test X movement
    const nextPosX = this.position.x + displacement.x;
    if (!this.checkWallCollision(nextPosX, this.position.y, this.position.z)) {
      this.position.x = nextPosX;
    }

    // Test Z movement
    const nextPosZ = this.position.z + displacement.z;
    if (!this.checkWallCollision(this.position.x, this.position.y, nextPosZ)) {
      this.position.z = nextPosZ;
    }
  }

  private checkWallCollision(x: number, y: number, z: number): boolean {
    const playerBox = new THREE.Box3();
    const min = new THREE.Vector3(x - this.playerRadius, y + 0.1, z - this.playerRadius);
    const max = new THREE.Vector3(x + this.playerRadius, y + this.currentEyeHeight, z + this.playerRadius);
    playerBox.set(min, max);

    // Check level geometry static boxes
    for (const box of this.levelBuilder.collisionBoxes) {
      if (box.intersectsBox(playerBox)) {
        return true;
      }
    }

    // Check doors collision
    for (const door of this.levelBuilder.doors.values()) {
      if (!door.isOpen && door.box.intersectsBox(playerBox)) {
        return true;
      }
    }

    return false;
  }

  private checkInteraction(): void {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const ray = this.raycaster.ray;

    let closest: InteractiveObject | null = null;
    let closestDist = 2.8;

    for (const obj of this.levelBuilder.interactiveObjects) {
      const objPos = new THREE.Vector3(...obj.position);
      // Distance from ray to object point
      const distToRay = ray.distanceToPoint(objPos);
      if (distToRay < 0.85) {
        const distFromPlayer = ray.origin.distanceTo(objPos);
        if (distFromPlayer < closestDist) {
          closestDist = distFromPlayer;
          closest = obj;
        }
      }
    }

    this.currentTarget = closest;
  }
}

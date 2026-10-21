import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { MonsterStateType } from '../types/game';

export interface MonsterAnimationClips {
  idle?: string;
  walk?: string;
  investigate?: string;
  run?: string;
  search?: string;
  attack?: string;
}

export class MonsterEntity {
  public rootGroup: THREE.Group;
  public visualGroup: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, -18);
  public rotationY: number = 0;

  // Visual parts for procedural horror rig (fallback & structure)
  private proceduralRigGroup: THREE.Group;
  private headBone!: THREE.Group;
  private torsoBone!: THREE.Group;
  private leftArmBone!: THREE.Group;
  private rightArmBone!: THREE.Group;
  private leftLegBone!: THREE.Group;
  private rightLegBone!: THREE.Group;
  private eyeGlowLeft!: THREE.Mesh;
  private eyeGlowRight!: THREE.Mesh;

  // External GLTF Custom Model
  public customModel: THREE.Group | null = null;
  private customModelPivot: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animationActions: Map<string, THREE.AnimationAction> = new Map();
  public hasCustomModel: boolean = false;

  // Aura / Glow for custom model
  private eyeLight: THREE.PointLight | null = null;

  // Shader uniforms for organic vertex deformation animation on custom model
  private shaderUniforms = {
    uTime: { value: 0 },
    uWalkCycle: { value: 0 },
    uHuntIntensity: { value: 0 },
    uTwitch: { value: 0 },
    uIsMoving: { value: 0 },
  };

  // Animation cycle timers
  private animTimer: number = 0;
  private limpTimer: number = 0;
  private headTwitchTimer: number = 0;
  private targetHeadTilt: THREE.Vector3 = new THREE.Vector3();
  private currentHeadTilt: THREE.Vector3 = new THREE.Vector3();

  // Current visual animation state
  public currentState: MonsterStateType = 'DORMANT';
  public isMoving: boolean = false;
  public isLimpFootstepTrigger: boolean = false;

  constructor(scene: THREE.Scene) {
    this.rootGroup = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.proceduralRigGroup = new THREE.Group();
    this.visualGroup.add(this.proceduralRigGroup);
    this.rootGroup.add(this.visualGroup);
    scene.add(this.rootGroup);

    this.buildProceduralRig();

    // Automatically load the supplied GLB model
    this.loadCustomGLBModel('/monster.glb');
  }

  // --- PROCEDURAL HORROR RIG ---
  private buildProceduralRig(): void {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x070809,
      roughness: 0.9,
      metalness: 0.1,
    });

    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c1e,
      roughness: 0.8,
    });

    this.torsoBone = new THREE.Group();
    this.torsoBone.position.set(0, 1.4, 0);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), skinMat);
    chest.position.set(0, 0.45, 0);
    this.torsoBone.add(chest);

    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.38), ribMat);
      rib.position.set(0, 0.25 + i * 0.15, 0);
      this.torsoBone.add(rib);
    }

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.15), skinMat);
    spine.position.set(0, 0.4, -0.15);
    this.torsoBone.add(spine);

    this.headBone = new THREE.Group();
    this.headBone.position.set(0, 1.0, 0.05);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35), skinMat);
    neck.position.set(0, 0.15, 0);
    this.headBone.add(neck);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.4), skinMat);
    skull.position.set(0, 0.42, 0);
    this.headBone.add(skull);

    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.eyeGlowLeft = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowLeft.position.set(-0.09, 0.45, 0.21);

    this.eyeGlowRight = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowRight.position.set(0.09, 0.45, 0.21);

    this.headBone.add(this.eyeGlowLeft, this.eyeGlowRight);
    this.torsoBone.add(this.headBone);

    this.leftArmBone = new THREE.Group();
    this.leftArmBone.position.set(-0.35, 0.85, 0);
    const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8), skinMat);
    upperArmL.position.set(0, -0.4, 0);
    const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.95), skinMat);
    forearmL.position.set(0, -1.2, 0);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), skinMat);
    handL.position.set(0, -1.75, 0);
    this.leftArmBone.add(upperArmL, forearmL, handL);
    this.torsoBone.add(this.leftArmBone);

    this.rightArmBone = new THREE.Group();
    this.rightArmBone.position.set(0.35, 0.85, 0);
    const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8), skinMat);
    upperArmR.position.set(0, -0.4, 0);
    const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.95), skinMat);
    forearmR.position.set(0, -1.2, 0);
    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), skinMat);
    handR.position.set(0, -1.75, 0);
    this.rightArmBone.add(upperArmR, forearmR, handR);
    this.torsoBone.add(this.rightArmBone);

    this.leftLegBone = new THREE.Group();
    this.leftLegBone.position.set(-0.2, 0, 0);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.75), skinMat);
    thighL.position.set(0, -0.375, 0);
    const shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.75), skinMat);
    shinL.position.set(0, -1.05, 0);
    this.leftLegBone.add(thighL, shinL);
    this.torsoBone.add(this.leftLegBone);

    this.rightLegBone = new THREE.Group();
    this.rightLegBone.position.set(0.2, 0, 0);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.7), skinMat);
    thighR.position.set(0, -0.35, 0);
    const shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.65), skinMat);
    shinR.position.set(0, -0.95, -0.05);
    this.rightLegBone.add(thighR, shinR);
    this.torsoBone.add(this.rightLegBone);

    this.proceduralRigGroup.add(this.torsoBone);
  }

  // --- EXTERNAL GLTF MODEL LOADER ---
  public async loadCustomGLBModel(
    url: string,
    clipMapping?: MonsterAnimationClips
  ): Promise<boolean> {
    try {
      if (MeshoptDecoder && (MeshoptDecoder as any).ready) {
        await (MeshoptDecoder as any).ready;
      }

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      return new Promise((resolve) => {
        loader.load(
          url,
          (gltf) => {
            // Hide procedural placeholder
            this.proceduralRigGroup.visible = false;

            const model = gltf.scene;

            // Enable shadows & enhance materials with organic horror vertex deformation
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                  const setupMaterial = (mat: THREE.Material) => {
                    if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                      const stdMat = mat as THREE.MeshStandardMaterial;
                      stdMat.roughness = 0.85;

                      // Inject organic vertex deformation shader
                      stdMat.onBeforeCompile = (shader) => {
                        shader.uniforms.uTime = this.shaderUniforms.uTime;
                        shader.uniforms.uWalkCycle = this.shaderUniforms.uWalkCycle;
                        shader.uniforms.uHuntIntensity = this.shaderUniforms.uHuntIntensity;
                        shader.uniforms.uTwitch = this.shaderUniforms.uTwitch;
                        shader.uniforms.uIsMoving = this.shaderUniforms.uIsMoving;

                        shader.vertexShader = `
                          uniform float uTime;
                          uniform float uWalkCycle;
                          uniform float uHuntIntensity;
                          uniform float uTwitch;
                          uniform float uIsMoving;
                        ` + shader.vertexShader;

                        shader.vertexShader = shader.vertexShader.replace(
                          '#include <begin_vertex>',
                          `
                          #include <begin_vertex>

                          // Normalized vertical coordinate (approx 0.0 ground to 1.0 head)
                          float relY = clamp(position.y / 2.75, 0.0, 1.0);

                          // 1. Lower Body Striding Motion (legs alternating steps)
                          if (uIsMoving > 0.5 && relY < 0.48) {
                            float legSide = sign(position.x);
                            float stridePhase = uWalkCycle + (legSide > 0.0 ? 0.0 : 3.14159);
                            float strideOffset = sin(stridePhase) * 0.16 * (1.0 - relY / 0.48);
                            float liftOffset = max(0.0, cos(stridePhase)) * 0.10 * (1.0 - relY / 0.48);
                            transformed.z += strideOffset;
                            transformed.y += liftOffset;
                          }

                          // 2. Chest & Torso Organic Breathing Pulse
                          if (relY > 0.32 && relY < 0.78) {
                            float breath = sin(uTime * 2.4) * 0.03 * (1.0 + uHuntIntensity * 1.5);
                            transformed += normal * breath;
                          }

                          // 3. Head & Upper Body Sudden Horrific Jitter
                          if (relY > 0.72) {
                            transformed.x += sin(uTime * 45.0) * uTwitch * 0.035;
                            transformed.y += cos(uTime * 40.0) * uTwitch * 0.025;
                            transformed.z += sin(uTime * 50.0) * uTwitch * 0.035;
                          }

                          // 4. Stalking hunch curvature (bends spine forward when hunting)
                          if (relY > 0.35) {
                            float hunch = pow((relY - 0.35) / 0.65, 1.4) * (0.12 + uHuntIntensity * 0.32);
                            transformed.z += hunch;
                          }
                          `
                        );
                      };
                    }
                  };

                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(setupMaterial);
                  } else {
                    setupMaterial(mesh.material);
                  }
                }
              }
            });

            // Normalize scale & pivot
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);

            const targetHeight = 2.75; // Tall, imposing 2.75m monster
            const currentHeight = size.y > 0.001 ? size.y : 1.0;
            const autoScale = targetHeight / currentHeight;

            this.customModelPivot = new THREE.Group();
            model.scale.set(autoScale, autoScale, autoScale);

            // Recompute bounding box after scale to ground feet at y = 0
            const scaledBox = new THREE.Box3().setFromObject(model);
            model.position.set(
              -(scaledBox.min.x + scaledBox.max.x) / 2,
              -scaledBox.min.y,
              -(scaledBox.min.z + scaledBox.max.z) / 2
            );

            this.customModelPivot.add(model);
            this.customModel = model;

            // Add sinister eye / bio-light near face
            this.eyeLight = new THREE.PointLight(0xff3333, 1.2, 8, 2);
            this.eyeLight.position.set(0, targetHeight * 0.9, 0.4);
            this.customModelPivot.add(this.eyeLight);

            this.visualGroup.add(this.customModelPivot);

            // Check if model has baked animation clips
            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(model);

              gltf.animations.forEach((clip) => {
                const action = this.mixer!.clipAction(clip);
                this.animationActions.set(clip.name.toLowerCase(), action);
              });

              if (clipMapping?.walk && this.animationActions.has(clipMapping.walk.toLowerCase())) {
                this.animationActions.get(clipMapping.walk.toLowerCase())!.play();
              } else {
                const firstAction = this.animationActions.values().next().value;
                if (firstAction) firstAction.play();
              }
            }

            this.hasCustomModel = true;
            console.log('Custom monster GLB model loaded and rigged successfully!');
            resolve(true);
          },
          undefined,
          (err) => {
            console.warn('Could not load custom GLB model, keeping procedural rig:', err);
            resolve(false);
          }
        );
      });
    } catch (e) {
      console.warn('Exception during GLB load:', e);
      return false;
    }
  }

  // --- ANIMATION UPDATE ---
  public update(delta: number, state: MonsterStateType, isMoving: boolean, moveSpeed: number): void {
    this.currentState = state;
    this.isMoving = isMoving;
    this.rootGroup.position.copy(this.position);
    this.rootGroup.rotation.y = this.rotationY;

    this.animTimer += delta * 1.5;
    this.limpTimer += delta * (isMoving ? moveSpeed * 1.8 : 0.8);
    this.headTwitchTimer += delta;

    // Update dynamic shader uniforms for vertex deformation
    this.shaderUniforms.uTime.value = this.animTimer;
    this.shaderUniforms.uWalkCycle.value = this.limpTimer;
    this.shaderUniforms.uHuntIntensity.value = state === 'HUNT' ? 1.0 : (state === 'INVESTIGATE_SOUND' || state === 'SEARCH' ? 0.4 : 0.0);
    this.shaderUniforms.uIsMoving.value = isMoving ? 1.0 : 0.0;
    this.shaderUniforms.uTwitch.value = Math.sin(this.headTwitchTimer * 10.0) > 0.65 ? 1.0 : 0.0;

    // Footstep trigger
    this.isLimpFootstepTrigger = Math.abs(Math.sin(this.limpTimer)) < 0.15;

    // Check baked skeletal mixer
    if (this.hasCustomModel && this.mixer) {
      this.mixer.update(delta);
    }

    // Procedural horror kinematics for the custom 3D model
    if (this.hasCustomModel && this.customModelPivot) {
      // 1. Moving state: horrifying limping walk with asymmetric drag
      if (isMoving) {
        // Asymmetric side-to-side limp sway
        const limpRollZ = Math.sin(this.limpTimer) * 0.16 + (Math.sin(this.limpTimer * 0.5) > 0 ? 0.07 : -0.03);
        // Heavy vertical drop on dragging foot
        const bobY = Math.abs(Math.sin(this.limpTimer)) * 0.20;
        // Hunting / stalking forward lean
        const pitchX = state === 'HUNT' ? 0.35 : 0.12 + Math.sin(this.limpTimer) * 0.07;
        // Unsteady twitching yaw
        const yawY = Math.sin(this.limpTimer * 0.5) * 0.14;

        this.customModelPivot.rotation.z = THREE.MathUtils.lerp(this.customModelPivot.rotation.z, limpRollZ, delta * 12);
        this.customModelPivot.rotation.x = THREE.MathUtils.lerp(this.customModelPivot.rotation.x, pitchX, delta * 10);
        this.customModelPivot.rotation.y = THREE.MathUtils.lerp(this.customModelPivot.rotation.y, yawY, delta * 10);
        this.customModelPivot.position.y = -bobY;
      } else {
        // Idle / Paused:
        if (state === 'RETURN_TO_PATROL' || state === 'SEARCH') {
          // Confused searching tilts when player is crouching/sitting!
          // Slow inquisitive tilt left, then right
          const tiltPhase = Math.sin(this.animTimer * 1.8);
          const tiltRollZ = tiltPhase * 0.22;
          const tiltPitchX = 0.18 + Math.cos(this.animTimer * 1.2) * 0.10;
          const tiltYawY = Math.sin(this.animTimer * 0.9) * 0.35;

          this.customModelPivot.rotation.z = THREE.MathUtils.lerp(this.customModelPivot.rotation.z, tiltRollZ, delta * 4);
          this.customModelPivot.rotation.x = THREE.MathUtils.lerp(this.customModelPivot.rotation.x, tiltPitchX, delta * 4);
          this.customModelPivot.rotation.y = THREE.MathUtils.lerp(this.customModelPivot.rotation.y, tiltYawY, delta * 4);
          this.customModelPivot.position.y = Math.sin(this.animTimer * 1.5) * 0.04;
        } else {
          // Normal idle: unsettling heavy breathing and subtle head twitches
          const breathY = Math.sin(this.animTimer * 2.2) * 0.06;
          const breathRoll = Math.sin(this.animTimer * 1.1) * 0.05;

          this.customModelPivot.position.y = breathY;
          this.customModelPivot.rotation.z = THREE.MathUtils.lerp(this.customModelPivot.rotation.z, breathRoll, delta * 5);
          this.customModelPivot.rotation.x = THREE.MathUtils.lerp(this.customModelPivot.rotation.x, 0.08, delta * 5);
          this.customModelPivot.rotation.y = THREE.MathUtils.lerp(this.customModelPivot.rotation.y, 0, delta * 5);
        }
      }

      // 2. Hunting state eye light
      if (this.eyeLight) {
        if (state === 'HUNT') {
          this.eyeLight.color.setHex(0xff1111);
          this.eyeLight.intensity = 2.5;
        } else if (state === 'SEARCH' || state === 'INVESTIGATE_SOUND') {
          this.eyeLight.color.setHex(0xf59e0b);
          this.eyeLight.intensity = 1.0;
        } else {
          this.eyeLight.color.setHex(0x94a3b8);
          this.eyeLight.intensity = 0.4;
        }
      }
      return;
    }

    // Procedural Fallback Rig Kinematics
    if (this.headTwitchTimer > 3.0 + Math.random() * 4.0) {
      this.headTwitchTimer = 0;
      this.targetHeadTilt.set(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.6
      );
    }
    this.currentHeadTilt.lerp(this.targetHeadTilt, delta * 8.0);
    this.headBone.rotation.set(this.currentHeadTilt.x, this.currentHeadTilt.y, this.currentHeadTilt.z);

    if (isMoving) {
      const cycle = this.limpTimer % (Math.PI * 2);
      const isDraggingRight = cycle > Math.PI;

      const torsoTiltZ = Math.sin(this.limpTimer) * 0.12 + 0.05;
      const torsoBobY = Math.abs(Math.sin(this.limpTimer)) * 0.08;
      this.torsoBone.position.y = 1.4 - torsoBobY;
      this.torsoBone.rotation.z = torsoTiltZ;

      this.leftLegBone.rotation.x = Math.sin(this.limpTimer) * 0.65;
      this.rightLegBone.rotation.x = -Math.sin(this.limpTimer) * 0.35 - (isDraggingRight ? 0.2 : 0);

      this.leftArmBone.rotation.x = -Math.sin(this.limpTimer) * 0.45;
      this.rightArmBone.rotation.x = Math.sin(this.limpTimer) * 0.25;
      this.leftArmBone.rotation.z = -0.15;
      this.rightArmBone.rotation.z = 0.25;
    } else {
      const breath = Math.sin(this.animTimer * 2.0) * 0.04;
      this.torsoBone.position.y = 1.4 + breath;
      this.torsoBone.rotation.z = 0.08;
      this.leftArmBone.rotation.x = breath * 0.5;
      this.rightArmBone.rotation.x = -breath * 0.5;
      this.leftLegBone.rotation.x = 0;
      this.rightLegBone.rotation.x = 0;
    }

    if (state === 'HUNT') {
      (this.eyeGlowLeft.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
      (this.eyeGlowRight.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
      this.torsoBone.rotation.x = 0.25;
    } else {
      (this.eyeGlowLeft.material as THREE.MeshBasicMaterial).color.setHex(0xe2e8f0);
      (this.eyeGlowRight.material as THREE.MeshBasicMaterial).color.setHex(0xe2e8f0);
      this.torsoBone.rotation.x = 0;
    }
  }

  public lookAtSound(soundPos: [number, number, number]): void {
    const dx = soundPos[0] - this.position.x;
    const dz = soundPos[2] - this.position.z;
    const angle = Math.atan2(dx, dz) - this.rotationY;
    this.targetHeadTilt.y = THREE.MathUtils.clamp(angle, -1.2, 1.2);
    this.targetHeadTilt.z = 0.35;

    if (this.customModelPivot) {
      this.customModelPivot.rotation.y = THREE.MathUtils.clamp(angle * 0.6, -0.6, 0.6);
    }
  }
}

import * as THREE from 'three';
import { MonsterStateType, SoundEvent } from '../types/game';
import { NavigationGraph } from '../level/NavigationGraph';
import { MonsterEntity } from '../entities/MonsterEntity';
import { LevelBuilder } from '../level/LevelBuilder';
import { SoundSystem } from '../audio/SoundSystem';
import { PlayerController } from '../entities/PlayerController';

export class MonsterAI {
  // Starts active in PATROL so he immediately explores and hunts
  public state: MonsterStateType = 'PATROL';
  public entity: MonsterEntity;
  private navGraph: NavigationGraph;
  private levelBuilder: LevelBuilder;
  private soundSystem: SoundSystem;
  private player: PlayerController;

  // Path following
  public currentPath: THREE.Vector3[] = [];
  public currentPathIndex: number = 0;
  private currentPatrolWaypointId: string = 'aisle_2_north';

  // Suspicion / Sensory memory
  private lastKnownPlayerPos: THREE.Vector3 = new THREE.Vector3();
  private investigatedSoundPos: THREE.Vector3 | null = null;
  private searchTimer: number = 0;
  private stateTimer: number = 0;
  private pauseListenTimer: number = 0;

  // Anti-stuck system
  private lastPos: THREE.Vector3 = new THREE.Vector3();
  private stuckDuration: number = 0;

  // Speeds
  private patrolSpeed: number = 2.0;
  private investigateSpeed: number = 3.0;
  private huntSpeed: number = 5.8; // High-speed aggressive FNAF pursuit
  private currentSpeed: number = 2.0;

  // Footstep audio throttle
  private footstepAudioTimer: number = 0;

  // Jumpscare / Caught sequence
  public isJumpscaring: boolean = false;
  public jumpscareTimer: number = 0;
  public isPlayerCaught: boolean = false;

  constructor(
    entity: MonsterEntity,
    navGraph: NavigationGraph,
    levelBuilder: LevelBuilder,
    soundSystem: SoundSystem,
    player: PlayerController
  ) {
    this.entity = entity;
    this.navGraph = navGraph;
    this.levelBuilder = levelBuilder;
    this.soundSystem = soundSystem;
    this.player = player;

    // Start in the wide open Aisle 2 North of the Main Warehouse Floor (no obstacles!)
    this.entity.position.set(-12, 0, -18);
    this.lastPos.copy(this.entity.position);

    // Register sound listener
    this.soundSystem.onSoundEmitted((event) => this.handleSoundEvent(event));

    // Immediately start active patrol
    this.pickNextPatrolPoint();
  }

  public wakeMonster(): void {
    if (this.state === 'DORMANT') {
      this.state = 'PATROL';
      this.soundSystem.playMonsterRoar(this.entity.position);
      this.pickNextPatrolPoint();
    }
  }

  // --- SOUND EVENT LISTENER ---
  private handleSoundEvent(event: SoundEvent): void {
    if (this.isJumpscaring || this.isPlayerCaught) return;

    // If player is SITTING/CROUCHING: ignore quiet footsteps
    if (this.player.isCrouching) {
      return;
    }

    const monsterPos = this.entity.position;
    const soundPos = new THREE.Vector3(...event.position);
    const dist = monsterPos.distanceTo(soundPos);

    // If player is SPRINTING/RUNNING: HEARS IMMEDIATELY AND GIVES CHASE!
    if (event.category === 'footstep_sprint') {
      let sprintDetectRadius = 38;
      if (this.isAcousticallyOccluded(monsterPos, soundPos)) {
        sprintDetectRadius = 28;
      }
      if (dist <= sprintDetectRadius) {
        // CHARGE! Immediate sprint pursuit!
        this.state = 'HUNT';
        this.soundSystem.playMonsterRoar(this.entity.position);
        this.lastKnownPlayerPos.copy(soundPos);
        this.recalculateHuntPath();
        return;
      }
    }

    // Normal footsteps or interactions
    let effectiveRadius = event.radius;
    if (this.isAcousticallyOccluded(monsterPos, soundPos)) {
      effectiveRadius *= 0.55;
    }

    if (dist <= effectiveRadius) {
      this.entity.lookAtSound(event.position);

      if (this.state !== 'HUNT') {
        this.state = 'INVESTIGATE_SOUND';
        this.investigatedSoundPos = soundPos.clone();
        this.investigatedSoundPos.x += (Math.random() - 0.5) * 1.5;
        this.investigatedSoundPos.z += (Math.random() - 0.5) * 1.5;

        this.currentPath = this.navGraph.findPath(this.entity.position, this.investigatedSoundPos);
        this.currentPathIndex = 0;
        this.currentSpeed = this.investigateSpeed;
      }
    }
  }

  private isAcousticallyOccluded(p1: THREE.Vector3, p2: THREE.Vector3): boolean {
    const ray = new THREE.Ray(p1, p2.clone().sub(p1).normalize());
    const maxDist = p1.distanceTo(p2);
    for (const box of this.levelBuilder.collisionBoxes) {
      const intersect = ray.intersectBox(box, new THREE.Vector3());
      if (intersect && p1.distanceTo(intersect) < maxDist - 0.5) {
        return true;
      }
    }
    return false;
  }

  // --- VISUAL LINE-OF-SIGHT CHECK ---
  private checkVisualLineOfSight(): { hasLOS: boolean; dist: number } {
    const dist = this.entity.position.distanceTo(this.player.position);

    // If player is CROUCHING/SITTING:
    // Breaks line-of-sight unless practically touching the creature!
    if (this.player.isCrouching && dist > 1.45) {
      return { hasLOS: false, dist };
    }

    const eyePos = this.entity.position.clone().add(new THREE.Vector3(0, 2.5, 0));
    const playerEye = this.player.camera.position.clone();
    const toPlayer = playerEye.clone().sub(eyePos);

    let maxVisionRange = this.player.isSprinting ? 34 : 24;
    if (this.player.isFlashlightOn) {
      const playerForward = new THREE.Vector3();
      this.player.camera.getWorldDirection(playerForward);
      const angleToMonster = playerForward.angleTo(eyePos.clone().sub(playerEye).normalize());
      if (angleToMonster < 0.45 && dist < 36) {
        maxVisionRange = 38;
      }
    }

    if (dist > maxVisionRange) return { hasLOS: false, dist };

    const monsterForward = new THREE.Vector3(-Math.sin(this.entity.rotationY), 0, -Math.cos(this.entity.rotationY));
    const angle = monsterForward.angleTo(toPlayer.clone().setY(0).normalize());
    if (angle > (Math.PI * 0.65)) {
      return { hasLOS: false, dist };
    }

    // Raycast obstacle check against level geometry & shelves
    const ray = new THREE.Ray(eyePos, toPlayer.clone().normalize());
    for (const box of this.levelBuilder.collisionBoxes) {
      const hit = ray.intersectBox(box, new THREE.Vector3());
      if (hit && eyePos.distanceTo(hit) < dist - 0.5) {
        return { hasLOS: false, dist };
      }
    }

    // Raycast closed door check
    for (const door of this.levelBuilder.doors.values()) {
      if (!door.isOpen) {
        const hit = ray.intersectBox(door.box, new THREE.Vector3());
        if (hit && eyePos.distanceTo(hit) < dist - 0.5) {
          return { hasLOS: false, dist };
        }
      }
    }

    return { hasLOS: true, dist };
  }

  // Check if a direct floor walking path is free of solid walls/shelves
  private hasDirectWalkPath(start: THREE.Vector3, end: THREE.Vector3): boolean {
    const ray = new THREE.Ray(
      new THREE.Vector3(start.x, start.y + 0.5, start.z),
      new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize()
    );
    const maxDist = Math.hypot(end.x - start.x, end.z - start.z);

    for (const box of this.levelBuilder.collisionBoxes) {
      const hit = ray.intersectBox(box, new THREE.Vector3());
      if (hit && start.distanceTo(hit) < maxDist - 0.4) {
        return false;
      }
    }
    for (const door of this.levelBuilder.doors.values()) {
      if (!door.isOpen) {
        const hit = ray.intersectBox(door.box, new THREE.Vector3());
        if (hit && start.distanceTo(hit) < maxDist - 0.4) {
          return false;
        }
      }
    }
    return true;
  }

  // --- AI MAIN TICK ---
  public update(delta: number): void {
    // 1. ICONIC FNAF-STYLE ANIMATRONIC JUMPSCARE
    if (this.isJumpscaring) {
      this.jumpscareTimer -= delta;

      // Lock monster directly in front of the player's face
      const camPos = this.player.camera.position.clone();
      const camForward = new THREE.Vector3();
      this.player.camera.getWorldDirection(camForward);

      // FNAF jumpscare distance: 0.46m in front of camera lens!
      const scarePos = camPos.clone().add(camForward.clone().multiplyScalar(0.46));
      scarePos.y = camPos.y - 1.6; // Align head at eye height

      // Rapid FNAF Animatronic Shaking Tremor (45Hz vibration)
      const now = performance.now();
      const tremorY = Math.sin(now * 0.08) * 0.16;
      const tremorX = Math.cos(now * 0.07) * 0.14;
      const tremorRoll = Math.sin(now * 0.06) * 0.18;

      scarePos.x += tremorX;
      scarePos.y += tremorY;

      this.entity.position.copy(scarePos);
      this.entity.rotationY = Math.atan2(-camForward.x, -camForward.z) + tremorRoll;

      // Violent camera shake / seizure
      this.player.camera.position.x += (Math.random() - 0.5) * 0.15;
      this.player.camera.position.y += (Math.random() - 0.5) * 0.15;

      this.entity.update(delta, 'HUNT', true, 18.0);

      if (this.jumpscareTimer <= 0) {
        this.isJumpscaring = false;
        this.isPlayerCaught = true;
      }
      return;
    }

    if (this.isPlayerCaught) {
      this.entity.update(delta, this.state, false, 0);
      return;
    }

    this.stateTimer += delta;

    // 2. CROUCH / SITTING MECHANIC:
    // When player sits/crouches during pursuit or investigation:
    // Monster IMMEDIATELY STOPS in confusion, looks around, then stalks away!
    if (this.player.isCrouching && (this.state === 'HUNT' || this.state === 'INVESTIGATE_SOUND')) {
      this.state = 'RETURN_TO_PATROL';
      this.pauseListenTimer = 1.9; // Freezes, tilts head, looks around in confusion
      this.currentSpeed = 0;

      // Pick a destination FAR AWAY in another part of the warehouse!
      const awayWp = this.navGraph.getWaypointAwayFrom(this.entity.position, this.player.position);
      this.currentPatrolWaypointId = awayWp.id;
      this.currentPath = this.navGraph.findPath(this.entity.position, new THREE.Vector3(awayWp.x, awayWp.y, awayWp.z));
      this.currentPathIndex = 0;
      return;
    }

    // Check Player Sight & Distance
    const { hasLOS, dist } = this.checkVisualLineOfSight();

    // Check kill distance (even if crouching, if player touches monster!)
    if (dist < 1.45) {
      this.triggerJumpscare();
      return;
    }

    // 3. STATE MACHINE LOGIC
    switch (this.state) {
      case 'PATROL': {
        if (hasLOS) {
          this.state = 'HUNT';
          this.soundSystem.playMonsterRoar(this.entity.position);
          this.lastKnownPlayerPos.copy(this.player.position);
          this.recalculateHuntPath();
          break;
        }

        // Pause to listen occasionally
        if (this.pauseListenTimer > 0) {
          this.pauseListenTimer -= delta;
          this.entity.update(delta, 'PATROL', false, 0);
          return;
        }

        this.followCurrentPath(delta, this.patrolSpeed);
        if (this.hasReachedEndOfPath()) {
          this.pauseListenTimer = 1.6 + Math.random() * 1.5;
          this.pickNextPatrolPoint();
        }
        break;
      }

      case 'INVESTIGATE_SOUND': {
        if (hasLOS) {
          this.state = 'HUNT';
          this.soundSystem.playMonsterRoar(this.entity.position);
          this.lastKnownPlayerPos.copy(this.player.position);
          this.recalculateHuntPath();
          break;
        }

        this.followCurrentPath(delta, this.investigateSpeed);
        if (this.hasReachedEndOfPath()) {
          this.state = 'SEARCH';
          this.searchTimer = 3.5;
        }
        break;
      }

      case 'SEARCH': {
        if (hasLOS) {
          this.state = 'HUNT';
          this.soundSystem.playMonsterRoar(this.entity.position);
          this.lastKnownPlayerPos.copy(this.player.position);
          this.recalculateHuntPath();
          break;
        }

        this.searchTimer -= delta;
        this.entity.rotationY += delta * 1.1;

        if (this.searchTimer <= 0) {
          this.state = 'PATROL';
          this.pickNextPatrolPoint();
        }
        break;
      }

      case 'HUNT': {
        this.currentSpeed = this.huntSpeed;

        if (hasLOS) {
          this.lastKnownPlayerPos.copy(this.player.position);

          // Direct line-of-sight chase: if aisle is open, CHARGE DIRECTLY!
          if (this.hasDirectWalkPath(this.entity.position, this.player.position)) {
            const diff = this.player.position.clone().sub(this.entity.position);
            diff.y = 0;
            const dist2D = diff.length();

            const targetAngle = Math.atan2(diff.x, diff.z);
            this.entity.rotationY = THREE.MathUtils.lerp(this.entity.rotationY, targetAngle, Math.min(1.0, delta * 9.0));

            const moveDist = Math.min(dist2D, this.huntSpeed * delta);
            const moveX = (diff.x / (dist2D || 1)) * moveDist;
            const moveZ = (diff.z / (dist2D || 1)) * moveDist;

            this.moveMonsterWithCollision(moveX, moveZ);
            this.entity.position.y = THREE.MathUtils.lerp(this.entity.position.y, this.player.position.y, delta * 5.0);
            break;
          }

          // Otherwise follow A* path around obstacles
          if (this.stateTimer > 0.8 || this.currentPath.length === 0) {
            this.stateTimer = 0;
            this.recalculateHuntPath();
          }
        } else {
          // Lost line of sight
          this.state = 'LOST_TARGET';
          this.stateTimer = 0;
          this.currentPath = this.navGraph.findPath(this.entity.position, this.lastKnownPlayerPos);
          this.currentPathIndex = 0;
          break;
        }

        this.followCurrentPath(delta, this.huntSpeed);
        break;
      }

      case 'LOST_TARGET': {
        this.followCurrentPath(delta, this.investigateSpeed);
        if (hasLOS) {
          this.state = 'HUNT';
          this.soundSystem.playMonsterRoar(this.entity.position);
          this.lastKnownPlayerPos.copy(this.player.position);
          this.recalculateHuntPath();
          break;
        }

        if (this.hasReachedEndOfPath()) {
          this.state = 'SEARCH';
          this.searchTimer = 3.2;
        }
        break;
      }

      case 'RETURN_TO_PATROL': {
        if (this.pauseListenTimer > 0) {
          this.pauseListenTimer -= delta;
          // Slowly look around in confusion
          this.entity.rotationY += delta * 0.7;
          this.entity.update(delta, 'RETURN_TO_PATROL', false, 0);
          return;
        }

        this.followCurrentPath(delta, this.patrolSpeed);
        if (this.hasReachedEndOfPath()) {
          this.state = 'PATROL';
          this.pickNextPatrolPoint();
        }
        break;
      }
    }

    // Footstep audio synchronization
    this.footstepAudioTimer += delta * (this.currentSpeed || 1.0);
    if (this.footstepAudioTimer > 0.85 && (this.state === 'PATROL' || this.state === 'INVESTIGATE_SOUND' || this.state === 'HUNT')) {
      this.footstepAudioTimer = 0;
      this.soundSystem.playMonsterFootstep(this.entity.position, this.state === 'HUNT');
    }

    const isMoving = this.currentPath.length > 0 && this.currentPathIndex < this.currentPath.length && this.pauseListenTimer <= 0;
    this.entity.update(delta, this.state, isMoving, this.currentSpeed);
  }

  public triggerJumpscare(): void {
    if (this.isJumpscaring || this.isPlayerCaught) return;
    this.isJumpscaring = true;
    this.jumpscareTimer = 1.8; // 1.8 seconds of pure FNAF shock

    // LOUD FNAF SCREECH!
    this.soundSystem.playJumpscareScreech();
  }

  private recalculateHuntPath(): void {
    const rawPath = this.navGraph.findPath(this.entity.position, this.player.position);
    // Don't walk backwards if monster is already past waypoint 0
    if (rawPath.length > 1 && this.entity.position.distanceTo(rawPath[1]) < this.entity.position.distanceTo(rawPath[0])) {
      rawPath.shift();
    }
    this.currentPath = rawPath;
    this.currentPathIndex = 0;
  }

  private pickNextPatrolPoint(): void {
    const nextWp = this.navGraph.getRandomPatrolWaypoint(this.currentPatrolWaypointId);
    this.currentPatrolWaypointId = nextWp.id;
    this.currentPath = this.navGraph.findPath(this.entity.position, new THREE.Vector3(nextWp.x, nextWp.y, nextWp.z));
    this.currentPathIndex = 0;
    this.currentSpeed = this.patrolSpeed;
  }

  // --- COLLISION-AWARE MOVEMENT WITH DEPENETRATION & ANTI-STUCK ---
  private followCurrentPath(delta: number, speed: number): void {
    if (this.currentPathIndex >= this.currentPath.length) return;

    // Check if next waypoint is already closer / accessible to prevent backtracking
    if (this.currentPathIndex + 1 < this.currentPath.length) {
      const distToCurrent = this.entity.position.distanceTo(this.currentPath[this.currentPathIndex]);
      if (distToCurrent < 1.1) {
        this.currentPathIndex++;
      }
    }

    const targetPos = this.currentPath[this.currentPathIndex];
    const diff = targetPos.clone().sub(this.entity.position);
    const dist2D = Math.sqrt(diff.x * diff.x + diff.z * diff.z);

    if (dist2D < 0.8) {
      this.currentPathIndex++;
      this.stuckDuration = 0;
      return;
    }

    // Rotate smoothly towards target node
    const targetAngle = Math.atan2(diff.x, diff.z);
    this.entity.rotationY = THREE.MathUtils.lerp(this.entity.rotationY, targetAngle, Math.min(1.0, delta * 8.0));

    // Compute step displacement
    const moveDist = Math.min(dist2D, speed * delta);
    const moveX = (diff.x / (dist2D || 1)) * moveDist;
    const moveZ = (diff.z / (dist2D || 1)) * moveDist;

    // Check anti-stuck
    const traveled = this.entity.position.distanceTo(this.lastPos);
    if (traveled < 0.02) {
      this.stuckDuration += delta;
      if (this.stuckDuration > 0.35) {
        // Resolve penetration push-out
        this.depenetrateMonster();
        // Skip ahead or repath so creature never freezes in place
        this.stuckDuration = 0;
        this.currentPathIndex++;
        if (this.currentPathIndex >= this.currentPath.length) {
          this.pickNextPatrolPoint();
        }
        return;
      }
    } else {
      this.stuckDuration = 0;
    }
    this.lastPos.copy(this.entity.position);

    // Move with strict collision resolution & depenetration
    this.moveMonsterWithCollision(moveX, moveZ);

    // Smooth floor height adaptation
    this.entity.position.y = THREE.MathUtils.lerp(this.entity.position.y, targetPos.y, delta * 5.0);
  }

  // Pushes the monster completely out of any overlapping walls, shelves or doors
  private depenetrateMonster(): void {
    const radius = 0.35;
    const height = 2.5;
    const pos = this.entity.position;

    // Static collision boxes
    for (const box of this.levelBuilder.collisionBoxes) {
      if (
        pos.x + radius > box.min.x &&
        pos.x - radius < box.max.x &&
        pos.z + radius > box.min.z &&
        pos.z - radius < box.max.z &&
        pos.y + height > box.min.y &&
        pos.y < box.max.y
      ) {
        const pushLeft = (box.min.x - radius) - pos.x;
        const pushRight = (box.max.x + radius) - pos.x;
        const pushX = Math.abs(pushLeft) < Math.abs(pushRight) ? pushLeft : pushRight;

        const pushBack = (box.min.z - radius) - pos.z;
        const pushForward = (box.max.z + radius) - pos.z;
        const pushZ = Math.abs(pushBack) < Math.abs(pushForward) ? pushBack : pushForward;

        if (Math.abs(pushX) < Math.abs(pushZ)) {
          pos.x += pushX;
        } else {
          pos.z += pushZ;
        }
      }
    }

    // Closed doors
    for (const door of this.levelBuilder.doors.values()) {
      if (!door.isOpen) {
        const box = door.box;
        if (
          pos.x + radius > box.min.x &&
          pos.x - radius < box.max.x &&
          pos.z + radius > box.min.z &&
          pos.z - radius < box.max.z &&
          pos.y + height > box.min.y &&
          pos.y < box.max.y
        ) {
          const pushLeft = (box.min.x - radius) - pos.x;
          const pushRight = (box.max.x + radius) - pos.x;
          const pushX = Math.abs(pushLeft) < Math.abs(pushRight) ? pushLeft : pushRight;

          const pushBack = (box.min.z - radius) - pos.z;
          const pushForward = (box.max.z + radius) - pos.z;
          const pushZ = Math.abs(pushBack) < Math.abs(pushForward) ? pushBack : pushForward;

          if (Math.abs(pushX) < Math.abs(pushZ)) {
            pos.x += pushX;
          } else {
            pos.z += pushZ;
          }
        }
      }
    }
  }

  private moveMonsterWithCollision(dx: number, dz: number): void {
    const radius = 0.35;
    const height = 2.5;

    // Test X movement
    const nextX = this.entity.position.x + dx;
    if (!this.checkObstacleCollision(nextX, this.entity.position.y, this.entity.position.z, radius, height)) {
      this.entity.position.x = nextX;
    }

    // Test Z movement
    const nextZ = this.entity.position.z + dz;
    if (!this.checkObstacleCollision(this.entity.position.x, this.entity.position.y, nextZ, radius, height)) {
      this.entity.position.z = nextZ;
    }

    // Push out of any grazing penetration
    this.depenetrateMonster();
  }

  private checkObstacleCollision(x: number, y: number, z: number, radius: number, height: number): boolean {
    const testBox = new THREE.Box3(
      new THREE.Vector3(x - radius, y + 0.1, z - radius),
      new THREE.Vector3(x + radius, y + height, z + radius)
    );

    // Check level solid collision boxes (walls, shelves, crates, forklift, machinery)
    for (const box of this.levelBuilder.collisionBoxes) {
      if (box.intersectsBox(testBox)) {
        return true;
      }
    }

    // Check closed doors
    for (const door of this.levelBuilder.doors.values()) {
      if (!door.isOpen && door.box.intersectsBox(testBox)) {
        return true;
      }
    }

    return false;
  }

  private hasReachedEndOfPath(): boolean {
    return this.currentPathIndex >= this.currentPath.length;
  }
}

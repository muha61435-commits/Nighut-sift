import * as THREE from 'three';
import { InteractiveObject } from '../types/game';
import { TextureGenerator } from '../graphics/TextureGenerator';

export interface LevelDoor {
  id: string;
  name: string;
  pivot: THREE.Group;
  doorMesh: THREE.Mesh;
  isOpen: boolean;
  isLocked: boolean;
  requiresItem?: string;
  lockedMessage: string;
  openRotation: number;
  closedRotation: number;
  currentRotation: number;
  box: THREE.Box3;
}

export class LevelBuilder {
  public scene: THREE.Scene;
  public collisionBoxes: THREE.Box3[] = [];
  public interactiveObjects: InteractiveObject[] = [];
  public doors: Map<string, LevelDoor> = new Map();
  public flickeringLights: THREE.PointLight[] = [];
  public cctvMonitors: THREE.Mesh[] = [];
  public mistParticles: THREE.Points | null = null;
  public steamParticles: THREE.Points[] = [];

  // Reusable materials
  private concreteMat: THREE.MeshStandardMaterial;
  private metalMat: THREE.MeshStandardMaterial;
  private rustedMat: THREE.MeshStandardMaterial;
  private hazardMat: THREE.MeshStandardMaterial;
  private cardboardMat: THREE.MeshStandardMaterial;
  private darkTileMat: THREE.MeshStandardMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const concreteTex = TextureGenerator.getConcreteTexture();
    const metalTex = TextureGenerator.getRustedMetalTexture();
    const hazardTex = TextureGenerator.getHazardTexture();
    const cardboardTex = TextureGenerator.getCardboardTexture();

    this.concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x474c52,
      roughness: 0.45,
      metalness: 0.75,
    });

    this.rustedMat = new THREE.MeshStandardMaterial({
      map: metalTex,
      roughness: 0.7,
      metalness: 0.6,
    });

    this.hazardMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.cardboardMat = new THREE.MeshStandardMaterial({
      map: cardboardTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.darkTileMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.3,
      metalness: 0.2,
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa0c4d8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8,
    });
  }

  public buildAll(): void {
    this.buildLightingAndFog();
    this.buildOutsideYard();
    this.buildMainWarehouseFloor();
    this.buildWestLogisticsWing();
    this.buildShippingArea();
    this.buildEastSortingHub();
    this.buildAdminOffices();
    this.buildMaintenanceCorridors();
    this.buildBasementGeneratorRoom();
    this.buildColdStorage();
    this.buildArchiveVault();
    this.spawnInteractiveItems();
  }

  // --- 1. LIGHTING & FOG ---
  private buildLightingAndFog(): void {
    // Atmospheric fog with clear visibility across warehouse aisles
    this.scene.fog = new THREE.FogExp2(0x0b1117, 0.016);

    // Readable industrial ambient light
    const ambientLight = new THREE.AmbientLight(0x1a2632, 0.95);
    this.scene.add(ambientLight);

    // Outside moonlight / urban skylight
    const moonLight = new THREE.DirectionalLight(0x5a7b99, 0.65);
    moonLight.position.set(-20, 35, 60);
    this.scene.add(moonLight);

    // Bright warehouse ceiling lamps
    this.createCeilingLamp(0, 8, 10, 0xe8f0e8, 2.4, true);
    this.createCeilingLamp(-14, 8, -4, 0xe8f0e8, 2.2, true);
    this.createCeilingLamp(14, 8, -4, 0xe8f0e8, 2.2, false);
    this.createCeilingLamp(0, 8, -18, 0xe8f0e8, 2.4, true);

    // Red emergency lights (Sector 09 aesthetic)
    this.createEmergencyBeacon(24, 4, 20, 0xff2222);
    this.createEmergencyBeacon(-28, 3, -24, 0xff2222);
    this.createEmergencyBeacon(0, 4, -48, 0xff2222);
  }

  private createCeilingLamp(x: number, y: number, z: number, color: number, intensity: number, flicker: boolean): void {
    // Fixture
    const fixtureGeo = new THREE.BoxGeometry(2.5, 0.2, 0.6);
    const fixture = new THREE.Mesh(fixtureGeo, this.metalMat);
    fixture.position.set(x, y, z);
    this.scene.add(fixture);

    // Hanging chain
    const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 2);
    const chain1 = new THREE.Mesh(chainGeo, this.metalMat);
    chain1.position.set(x - 0.9, y + 1, z);
    const chain2 = chain1.clone();
    chain2.position.set(x + 0.9, y + 1, z);
    this.scene.add(chain1, chain2);

    // Light tube emission
    const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
    tubeGeo.rotateZ(Math.PI / 2);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xeeffee });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(x, y - 0.15, z);
    this.scene.add(tube);

    const light = new THREE.PointLight(color, intensity, 28, 1.1);
    light.position.set(x, y - 0.4, z);
    this.scene.add(light);

    if (flicker) {
      this.flickeringLights.push(light);
    }
  }

  private createEmergencyBeacon(x: number, y: number, z: number, color: number): void {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.15), this.metalMat);
    base.position.set(x, y, z);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color }));
    dome.position.set(x, y + 0.08, z);
    this.scene.add(base, dome);

    const light = new THREE.PointLight(color, 0.8, 10, 1.2);
    light.position.set(x, y + 0.2, z);
    this.scene.add(light);
  }

  // --- HELPER: STATIC WALL / BLOCK WITH COLLISION ---
  private addWall(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = this.concreteMat): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.collisionBoxes.push(box);
    return mesh;
  }

  private addFloor(x: number, y: number, z: number, w: number, d: number, mat: THREE.Material = this.concreteMat): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, 0.2, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y - 0.1, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  // --- 2. OUTSIDE LOADING YARD ---
  private buildOutsideYard(): void {
    // Ground
    this.addFloor(0, 0, 44, 48, 36, this.concreteMat);

    // Perimeter chain-link fence
    this.addWall(-24, 0, 44, 0.4, 4, 36, this.rustedMat); // West fence
    this.addWall(24, 0, 44, 0.4, 4, 36, this.rustedMat);  // East fence
    this.addWall(0, 0, 62, 48, 4, 0.4, this.rustedMat);   // South gate

    // Abandoned Delivery Truck
    this.buildDeliveryTruck(-12, 0, 42);

    // Security Guard Booth
    this.buildGuardBooth(15, 0, 40);

    // Warehouse Exterior Facade Wall (entrance at Z = 26)
    this.addWall(-14, 0, 26, 20, 8, 0.8, this.rustedMat);
    this.addWall(14, 0, 26, 20, 8, 0.8, this.rustedMat);
    this.addWall(0, 4.5, 26, 8, 3.5, 0.8, this.rustedMat); // Arch over main door

    // Main entrance door
    this.createInteractiveDoor('door_main_entrance', 'Main Warehouse Entrance', 0, 0, 26, 3.2, 4.5, true, 'key_booth', 'Requires Guard Booth Keycard');
  }

  private buildDeliveryTruck(x: number, y: number, z: number): void {
    const truckGroup = new THREE.Group();
    truckGroup.position.set(x, y, z);

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3.5), this.rustedMat);
    cab.position.set(0, 1.8, 2.5);
    // Cargo container
    const container = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.8, 7), this.metalMat);
    container.position.set(0, 2.2, -2.5);
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const w1 = new THREE.Mesh(wheelGeo, wheelMat);
    w1.position.set(-1.6, 0.5, 2.5);
    const w2 = w1.clone(); w2.position.set(1.6, 0.5, 2.5);
    const w3 = w1.clone(); w3.position.set(-1.6, 0.5, -4);
    const w4 = w1.clone(); w4.position.set(1.6, 0.5, -4);

    truckGroup.add(cab, container, w1, w2, w3, w4);
    this.scene.add(truckGroup);

    // Truck collision box
    const box = new THREE.Box3();
    box.setFromObject(truckGroup);
    this.collisionBoxes.push(box);
  }

  private buildGuardBooth(x: number, y: number, z: number): void {
    const boothW = 4.5;
    const boothD = 4;
    const boothH = 3;

    // Walls
    this.addWall(x - boothW / 2, 0, z, 0.3, boothH, boothD, this.metalMat);
    this.addWall(x + boothW / 2, 0, z, 0.3, boothH, boothD, this.metalMat);
    this.addWall(x, 0, z - boothD / 2, boothW, boothH, 0.3, this.metalMat);
    // Front with window
    this.addWall(x + 1.2, 0, z + boothD / 2, 2.1, boothH, 0.3, this.metalMat);
    this.addWall(x - 1.2, 0, z + boothD / 2, 1.2, 1.0, 0.3, this.metalMat); // Desk wall
    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(boothW + 0.4, 0.2, boothD + 0.4), this.metalMat);
    roof.position.set(x, boothH, z);
    this.scene.add(roof);

    // Guard desk inside
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), this.darkTileMat);
    desk.position.set(x, 0.4, z);
    this.scene.add(desk);
    const deskBox = new THREE.Box3().setFromObject(desk);
    this.collisionBoxes.push(deskBox);

    // Small fluorescent light in booth
    const boothLight = new THREE.PointLight(0xfff5dd, 0.8, 6);
    boothLight.position.set(x, 2.6, z);
    this.scene.add(boothLight);
  }

  // --- 3. MAIN WAREHOUSE FLOOR ---
  private buildMainWarehouseFloor(): void {
    const floorW = 54;
    const floorD = 52;
    const floorH = 10;
    const centerY = 0;
    const centerZ = 0;

    // Floor & Ceiling
    this.addFloor(0, 0, centerZ, floorW, floorD, this.concreteMat);
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.4, floorD), this.metalMat);
    ceiling.position.set(0, floorH, centerZ);
    this.scene.add(ceiling);

    // Perimeter Walls of Main Floor
    // West wall with two 6-meter-wide open archways at Z = -11 and Z = 11 leading to West Logistics Wing
    this.addWall(-floorW / 2, 0, -20, 0.8, floorH, 12);
    this.addWall(-floorW / 2, 5.5, -11, 0.8, floorH - 5.5, 6); // Lintel arch north
    this.addWall(-floorW / 2, 0, 0, 0.8, floorH, 16);
    this.addWall(-floorW / 2, 5.5, 11, 0.8, floorH - 5.5, 6); // Lintel arch south
    this.addWall(-floorW / 2, 0, 20, 0.8, floorH, 12);

    // East wall (with opening to Shipping area at Z ~ 20)
    this.addWall(floorW / 2, 0, -8, 0.8, floorH, 36);
    this.addWall(floorW / 2, 0, 24, 0.8, floorH, 6);

    // North wall (separating Cold Storage & Archive Vault)
    // with doorways to Maintenance corridor, Cold Storage, and Vault
    this.addWall(-16, 0, -floorD / 2, 22, floorH, 0.8);
    this.addWall(20, 0, -floorD / 2, 14, floorH, 0.8);
    this.addWall(0, 5, -floorD / 2, 10, floorH - 5, 0.8); // lintel over vault door

    // Build the 4 Tall Storage Aisles (Racks A, B, C, D)
    this.buildStorageRack(-18, 0, 4, 3, 8, 14, 'A');
    this.buildStorageRack(-18, 0, -12, 3, 8, 14, 'A2');

    this.buildStorageRack(-6, 0, 4, 3, 8, 14, 'B');
    this.buildStorageRack(-6, 0, -12, 3, 8, 14, 'B2');

    this.buildStorageRack(6, 0, 4, 3, 8, 14, 'C');
    this.buildStorageRack(6, 0, -12, 3, 8, 14, 'C2');

    this.buildStorageRack(18, 0, 4, 3, 8, 14, 'D');
    this.buildStorageRack(18, 0, -12, 3, 8, 14, 'D2');
  }

  // --- 3B. WEST LOGISTICS & HIGH-BAY STORAGE WING ---
  private buildWestLogisticsWing(): void {
    const wingW = 30;
    const wingD = 52;
    const wingH = 10;
    const centerX = -42;
    const centerZ = 0;

    // Floor & Ceiling
    this.addFloor(centerX, 0, centerZ, wingW, wingD, this.concreteMat);
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(wingW, 0.4, wingD), this.metalMat);
    ceiling.position.set(centerX, wingH, centerZ);
    this.scene.add(ceiling);

    // Perimeter Outer Walls
    this.addWall(centerX - wingW / 2, 0, centerZ, 0.8, wingH, wingD); // West outer wall at X = -57
    this.addWall(centerX, 0, -wingD / 2, wingW, wingH, 0.8);          // North outer wall at Z = -26
    this.addWall(centerX, 0, wingD / 2, wingW, wingH, 0.8);           // South outer wall at Z = 26

    // Overhead high-bay fluorescent lights
    this.createCeilingLamp(centerX, 8, 12, 0xe8f0e8, 2.2, true);
    this.createCeilingLamp(centerX, 8, -12, 0xe8f0e8, 2.2, false);
    this.createEmergencyBeacon(centerX - 12, 4, 0, 0xff2222);

    // Storage Racks W1 (X = -36) and W2 (X = -48)
    this.buildStorageRack(-36, 0, 10, 3, 8, 14, 'W1');
    this.buildStorageRack(-36, 0, -10, 3, 8, 14, 'W1B');

    this.buildStorageRack(-48, 0, 10, 3, 8, 14, 'W2');
    this.buildStorageRack(-48, 0, -10, 3, 8, 14, 'W2B');

    // Overhead Elevated Catwalk Mezzanine (along X = -53, Z from -14 to 14)
    const catwalkW = 3.2;
    const catwalkD = 28;
    const catwalkH = 3.8;
    const catwalkMesh = new THREE.Mesh(new THREE.BoxGeometry(catwalkW, 0.25, catwalkD), this.metalMat);
    catwalkMesh.position.set(-53.5, catwalkH, 0);
    this.scene.add(catwalkMesh);

    // Catwalk access stair ramp
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 10), this.metalMat);
    rampMesh.position.set(-53.5, catwalkH / 2, 18);
    rampMesh.rotateX(Math.atan2(catwalkH, 10));
    this.scene.add(rampMesh);

    // Forklift charging station prop at (-42, 0, 24)
    const charger = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.8), this.hazardMat);
    charger.position.set(-42, 1.1, 24);
    this.scene.add(charger);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(charger));
  }

  private buildStorageRack(x: number, y: number, z: number, w: number, h: number, d: number, label: string): void {
    const rackGroup = new THREE.Group();
    rackGroup.position.set(x, y, z);

    // Uprights (Orange industrial steel)
    const uprightMat = new THREE.MeshStandardMaterial({ color: 0xcc5500, roughness: 0.6, metalness: 0.5 });
    const shelfGeo = new THREE.BoxGeometry(w, 0.15, d);
    const uprightGeo = new THREE.BoxGeometry(0.15, h, 0.15);

    // 4 vertical posts
    for (const px of [-w / 2, w / 2]) {
      for (const pz of [-d / 2, d / 2]) {
        const post = new THREE.Mesh(uprightGeo, uprightMat);
        post.position.set(px, h / 2, pz);
        rackGroup.add(post);
      }
    }

    // 3 Tiers of Shelves
    for (let tier = 1; tier <= 3; tier++) {
      const shelfY = tier * 2.2;
      const shelf = new THREE.Mesh(shelfGeo, this.metalMat);
      shelf.position.set(0, shelfY, 0);
      rackGroup.add(shelf);

      // Stacked cargo boxes & pallets on shelves
      for (let s = -d / 2 + 1.5; s < d / 2 - 1; s += 2.2) {
        if (Math.random() > 0.15) {
          const boxSize = 1.0 + Math.random() * 0.5;
          const box = new THREE.Mesh(new THREE.BoxGeometry(boxSize, boxSize, boxSize), this.cardboardMat);
          box.position.set((Math.random() - 0.5) * 0.4, shelfY + boxSize / 2 + 0.1, s);
          rackGroup.add(box);
        }
      }
    }

    // Bottom floor pallets and crates
    for (let s = -d / 2 + 1; s < d / 2 - 1; s += 2.5) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 2.0), this.cardboardMat);
      pallet.position.set(0, 0.1, s);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), this.cardboardMat);
      crate.position.set(0, 0.9, s);
      rackGroup.add(pallet, crate);
    }

    this.scene.add(rackGroup);

    // Solid collision box for entire rack
    const colBox = new THREE.Box3();
    colBox.setFromCenterAndSize(new THREE.Vector3(x, y + h / 2, z), new THREE.Vector3(w + 0.2, h, d + 0.2));
    this.collisionBoxes.push(colBox);
  }

  private buildConveyorBelt(x: number, y: number, z: number, w: number, h: number, d: number): void {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), this.rustedMat);
    frame.position.set(x, y + h, z);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const beltTop = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.05, d), rollerMat);
    beltTop.position.set(x, y + h + 0.18, z);

    // Legs
    for (let pz of [-d / 2 + 1, 0, d / 2 - 1]) {
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h), this.metalMat);
      leg1.position.set(x - w / 2 + 0.1, y + h / 2, z + pz);
      const leg2 = leg1.clone();
      leg2.position.set(x + w / 2 - 0.1, y + h / 2, z + pz);
      this.scene.add(leg1, leg2);
    }
    this.scene.add(frame, beltTop);

    const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + h / 2, z), new THREE.Vector3(w, h, d));
    this.collisionBoxes.push(box);
  }

  // --- 4. SHIPPING & RECEIVING AREA ---
  private buildShippingArea(): void {
    const startX = 27;
    const w = 18;
    const d = 26;
    const h = 7;

    // Floor
    this.addFloor(startX + w / 2, 0, 14, w, d, this.concreteMat);

    // East wall with loading dock bay shutter doors
    this.addWall(startX + w, 0, 14, 0.8, h, d, this.metalMat);
    // South wall
    this.addWall(startX + w / 2, 0, 27, w, h, 0.8, this.concreteMat);

    // Shutter Bay 4 (The final Escape shutter door)
    const bay4Frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 4.5), this.hazardMat);
    bay4Frame.position.set(startX + w - 0.4, 2.25, 20);
    this.scene.add(bay4Frame);

    // Shutter door (Locked until Chapter 8 Escape)
    this.createInteractiveDoor(
      'door_escape_shutter',
      'Loading Bay 4 Emergency Shutter',
      startX + w - 0.4,
      0,
      20,
      0.5,
      4.2,
      true,
      'code_override',
      'Requires Facility Emergency Lockdown Override'
    );

    // Abandoned Forklift Prop
    this.buildForklift(startX + 6, 0, 6);

    // Staging wooden pallets & crates
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), this.cardboardMat);
      crate.position.set(startX + 3 + i * 2.2, 0.7, 10);
      this.scene.add(crate);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(crate));
    }

    // Industrial loading dock conveyor belt
    this.buildConveyorBelt(startX + 13, 0, 8, 1.6, 0.8, 8);
  }

  private buildForklift(x: number, y: number, z: number): void {
    const forkGroup = new THREE.Group();
    forkGroup.position.set(x, y, z);

    // Chassis (Industrial yellow)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.5, metalness: 0.3 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 3.2), bodyMat);
    chassis.position.set(0, 0.8, 0);

    // Overhead protective cage
    const cage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), this.metalMat);
    cage.position.set(0, 2.1, -0.2);

    // Mast & Forks
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.3), this.metalMat);
    mast.position.set(0, 1.6, 1.7);
    const fork1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 1.6), this.metalMat);
    fork1.position.set(-0.4, 0.2, 2.4);
    const fork2 = fork1.clone();
    fork2.position.set(0.4, 0.2, 2.4);

    forkGroup.add(chassis, cage, mast, fork1, fork2);
    this.scene.add(forkGroup);

    this.collisionBoxes.push(new THREE.Box3().setFromObject(forkGroup));
  }

  // --- 5. ADMINISTRATIVE OFFICES & SECURITY ROOM ---
  private buildAdminOffices(): void {
    const startX = 22;
    const startZ = 28;
    const w = 24;
    const d = 20;
    const h = 4.5;

    // Floor (dark tiles)
    this.addFloor(startX + w / 2, 0, startZ + d / 2, w, d, this.darkTileMat);

    // Outer perimeter walls
    this.addWall(startX, 0, startZ + d / 2, 0.6, h, d);
    this.addWall(startX + w, 0, startZ + d / 2, 0.6, h, d);
    this.addWall(startX + w / 2, 0, startZ + d, w, h, 0.6);

    // Corridor dividing wall
    this.addWall(startX + w / 2, 0, startZ + 8, w, h, 0.6);

    // Security Room (at X ~ 34, Z ~ 42)
    // Interior dividing partition
    this.addWall(startX + 12, 0, startZ + 14, 0.6, h, 12);

    // CCTV Security Room Door
    this.createInteractiveDoor(
      'door_security_room',
      'Security Operations Center',
      startX + 12,
      0,
      startZ + 10,
      1.8,
      3.0,
      true,
      'keycard_maint',
      'Requires Maintenance Keycard'
    );

    // Admin Archive Room Door (Locked - Chapter 5)
    this.createInteractiveDoor(
      'door_office_archive',
      'Personnel Archives',
      startX + 18,
      0,
      startZ + 8,
      1.8,
      3.0,
      true,
      'key_archive',
      'Requires Archive Brass Key'
    );

    // Build Security Console with CCTV monitors inside Security Room
    this.buildCCTVConsole(startX + 6, 0, startZ + 16);

    // Desks, Filing Cabinets, Chairs
    const desk1 = this.addWall(startX + 16, 0, startZ + 14, 2.4, 0.8, 1.2, this.darkTileMat);
    const filing1 = this.addWall(startX + 21, 0, startZ + 16, 1.0, 2.0, 0.8, this.metalMat);
  }

  private buildCCTVConsole(x: number, y: number, z: number): void {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(x, y, z);

    // Desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 1.4), this.darkTileMat);
    desk.position.set(0, 0.45, 0);
    consoleGroup.add(desk);

    // 4 CCTV Monitors arrayed on desk
    for (let i = 0; i < 4; i++) {
      const monFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.2), this.metalMat);
      const mx = (i - 1.5) * 0.95;
      monFrame.position.set(mx, 1.25, -0.2);

      const screenTex = TextureGenerator.getMonitorScreenTexture((i + 1).toString(), '02:17:34', i === 1);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.52), screenMat);
      screen.position.set(mx, 1.25, -0.09);

      consoleGroup.add(monFrame, screen);
      this.cctvMonitors.push(screen);
    }

    this.scene.add(consoleGroup);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(consoleGroup));

    // Interactive CCTV Terminal Trigger
    this.interactiveObjects.push({
      id: 'terminal_cctv',
      name: 'Security CCTV Station',
      actionText: 'View Security Camera Feeds',
      type: 'cctv',
      position: [x, 1.0, z],
      radius: 2.5,
    });
  }

  // --- 6. MAINTENANCE CORRIDORS ---
  private buildMaintenanceCorridors(): void {
    const corridorMat = this.concreteMat;
    const h = 4.0;

    // West tunnel corridor leading from Main Floor (Z = -24) towards Basement stairs
    // Corridor North Wall
    this.addWall(-32, 0, -26, 16, h, 0.6, corridorMat);
    // Corridor South Wall
    this.addWall(-32, 0, -22, 16, h, 0.6, corridorMat);
    this.addFloor(-32, 0, -24, 16, 4, corridorMat);

    // North branch leading towards Cold Storage back door
    this.addWall(-38, 0, -32, 0.6, h, 16, corridorMat);
    this.addWall(-34, 0, -32, 0.6, h, 16, corridorMat);
    this.addFloor(-36, 0, -32, 4, 16, corridorMat);

    // Exposed Pipes along the ceiling
    for (let py of [3.2, 3.5]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 16), this.metalMat);
      pipe.rotateZ(Math.PI / 2);
      pipe.position.set(-32, py, -22.5);
      this.scene.add(pipe);
    }
  }

  // --- 7. BASEMENT GENERATOR ROOM (Y = -6) ---
  private buildBasementGeneratorRoom(): void {
    const baseY = -6;
    const roomW = 24;
    const roomD = 24;
    const roomH = 6;
    const centerX = -26;
    const centerZ = 0;

    // Stairwell ramp / steps down
    const stairMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 12), this.metalMat);
    stairMesh.position.set(-36, -3, -8);
    stairMesh.rotateX(Math.atan2(6, 12));
    this.scene.add(stairMesh);

    // Floor and Ceiling
    this.addFloor(centerX, baseY, centerZ, roomW, roomD, this.concreteMat);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.4, roomD), this.metalMat);
    ceil.position.set(centerX, baseY + roomH, centerZ);
    this.scene.add(ceil);

    // Walls
    this.addWall(centerX - roomW / 2, baseY, centerZ, 0.6, roomH, roomD);
    this.addWall(centerX + roomW / 2, baseY, centerZ, 0.6, roomH, roomD);
    this.addWall(centerX, baseY, centerZ - roomD / 2, roomW, roomH, 0.6);
    this.addWall(centerX, baseY, centerZ + roomD / 2, roomW, roomH, 0.6);

    // Industrial Backup Generator Core Turbine
    const genGroup = new THREE.Group();
    genGroup.position.set(centerX + 6, baseY, centerZ);

    const turbine = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 16), this.rustedMat);
    turbine.rotateZ(Math.PI / 2);
    turbine.position.set(0, 2.0, 0);

    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 4), this.metalMat);
    baseFrame.position.set(0, 0.3, 0);

    const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3), this.metalMat);
    exhaustPipe.position.set(0, 4.0, 0);

    genGroup.add(turbine, baseFrame, exhaustPipe);
    this.scene.add(genGroup);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(genGroup));

    // High Voltage Sign
    const signTex = TextureGenerator.getSignTexture('HIGH VOLTAGE', 'SECTOR 09 GENERATOR CORE');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(centerX + 6, baseY + 4.2, centerZ - 2.01);
    this.scene.add(sign);

    // Electrical Switchgear & Blown Fuse Receptacle Box
    const fuseBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.4), this.hazardMat);
    fuseBoxMesh.position.set(centerX - 6, baseY + 2.0, centerZ + roomD / 2 - 0.4);
    this.scene.add(fuseBoxMesh);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(fuseBoxMesh));

    // Interactive Generator Controls
    this.interactiveObjects.push({
      id: 'switch_fusebox',
      name: 'Electrical Fuse Panel',
      actionText: 'Insert Industrial 30A Fuse',
      type: 'switch',
      position: [centerX - 6, baseY + 1.8, centerZ + roomD / 2 - 1.0],
      radius: 2.2,
      requiresItem: 'fuse_industrial',
      lockedMessage: 'Empty socket. Requires Industrial 30A Fuse.',
      isUnlocked: false,
    });

    this.interactiveObjects.push({
      id: 'generator_lever',
      name: 'Emergency Generator Starter',
      actionText: 'Engage Main Power Turbine',
      type: 'generator',
      position: [centerX + 3, baseY + 1.8, centerZ - 1.5],
      radius: 2.5,
      requiresItem: 'fuse_installed',
      lockedMessage: 'Turbine offline. Power circuit broken at fuse box.',
      isUnlocked: false,
    });
  }

  // --- 8. COLD STORAGE SECTION ---
  private buildColdStorage(): void {
    const coldX = 8;
    const coldZ = -40;
    const w = 22;
    const d = 20;
    const h = 5;

    // Frosted cold floor
    const frostFloorMat = new THREE.MeshStandardMaterial({
      color: 0x9fb4c7,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.addFloor(coldX, 0, coldZ, w, d, frostFloorMat);

    // Walls
    this.addWall(coldX - w / 2, 0, coldZ, 0.8, h, d, this.metalMat);
    this.addWall(coldX + w / 2, 0, coldZ, 0.8, h, d, this.metalMat);
    this.addWall(coldX, 0, coldZ - d / 2, w, h, 0.8, this.metalMat);
    this.addWall(coldX, 0, coldZ + d / 2, w, h, 0.8, this.metalMat);

    // Heavy Insulated Cold Storage Door (Connecting to Main Warehouse Floor)
    this.createInteractiveDoor(
      'door_cold_storage',
      'Cold Storage Cryogenic Airlock',
      coldX,
      0,
      -30,
      2.4,
      3.6,
      true,
      'keycard_cold',
      'Requires Cold Storage Clearance Keycard'
    );

    // Service door connecting to Maintenance tunnel
    this.createInteractiveDoor(
      'door_cold_maint',
      'Cold Storage Service Vent',
      coldX - w / 2 + 0.4,
      0,
      coldZ,
      1.8,
      3.0,
      false,
      undefined,
      ''
    );

    // Creepy Discovery: Cryogenic Specimen Containment Pod
    this.buildSpecimenPod(coldX - 4, 0, coldZ - 4);

    // Cold Mist Particle System
    this.createColdMist(coldX, coldZ, w, d);
  }

  private buildSpecimenPod(x: number, y: number, z: number): void {
    const podGroup = new THREE.Group();
    podGroup.position.set(x, y, z);

    // Heavy steel cylinder frame
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.6), this.metalMat);
    base.position.set(0, 0.3, 0);

    const glassCylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.2, 16), this.glassMat);
    glassCylinder.position.set(0, 2.2, 0);

    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.5), this.metalMat);
    topCap.position.set(0, 3.9, 0);

    // Inside shadow/specimen silhouette
    const innerGeo = new THREE.BoxGeometry(0.5, 2.2, 0.5);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const innerShadow = new THREE.Mesh(innerGeo, innerMat);
    innerShadow.position.set(0, 2.2, 0);

    // Cyan bio-illumination
    const podLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
    podLight.position.set(0, 2.2, 0);

    podGroup.add(base, glassCylinder, topCap, innerShadow, podLight);
    this.scene.add(podGroup);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(podGroup));
  }

  private createColdMist(x: number, z: number, w: number, d: number): void {
    const particleCount = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * w;
      positions[i * 3 + 1] = 0.2 + Math.random() * 2.5;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * d;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.25,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });

    this.mistParticles = new THREE.Points(geo, mat);
    this.scene.add(this.mistParticles);
  }

  // --- 9. FINAL ARCHIVE VAULT ---
  private buildArchiveVault(): void {
    const vaultX = 0;
    const vaultZ = -60;
    const w = 18;
    const d = 18;
    const h = 5;

    // Floor and walls
    this.addFloor(vaultX, 0, vaultZ, w, d, this.concreteMat);
    this.addWall(vaultX - w / 2, 0, vaultZ, 0.8, h, d, this.metalMat);
    this.addWall(vaultX + w / 2, 0, vaultZ, 0.8, h, d, this.metalMat);
    this.addWall(vaultX, 0, vaultZ - d / 2, w, h, 0.8, this.metalMat);
    this.addWall(vaultX, 0, vaultZ + d / 2, w, h, 0.8, this.metalMat);

    // Vault Security Blast Door
    this.createInteractiveDoor(
      'door_vault_blast',
      'Sector 09 Containment Vault Door',
      vaultX,
      0,
      -51,
      3.0,
      4.0,
      true,
      'code_9412',
      'Keypad Locked. Requires 4-Digit Vault Decryption Code.'
    );

    // Central Vault Terminal Pedestal
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), this.darkTileMat);
    pedestal.position.set(vaultX, 0.6, vaultZ);
    this.scene.add(pedestal);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(pedestal));

    // Terminal Screen
    const screenGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const screenTex = TextureGenerator.getSignTexture('ARCHIVE CORE', 'PROJECT RESONANCE CLASSIFIED', '#dc2626');
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(vaultX, 1.5, vaultZ);
    screen.rotateY(Math.PI);
    this.scene.add(screen);

    // Interactive Vault Terminal
    this.interactiveObjects.push({
      id: 'terminal_vault_override',
      name: 'Lockdown Override Terminal',
      actionText: 'Execute Facility Lockdown Override',
      type: 'terminal',
      position: [vaultX, 1.2, vaultZ + 1.2],
      radius: 2.2,
    });
  }

  // --- 10. INTERACTIVE DOORS CREATION ---
  private createInteractiveDoor(
    id: string,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    isLocked: boolean,
    requiresItem?: string,
    lockedMessage: string = 'Locked'
  ): void {
    const pivot = new THREE.Group();
    pivot.position.set(x - w / 2, y, z);

    const doorGeo = new THREE.BoxGeometry(w, h, 0.2);
    doorGeo.translate(w / 2, h / 2, 0); // align hinge at pivot origin
    const doorMesh = new THREE.Mesh(doorGeo, this.metalMat);
    pivot.add(doorMesh);
    this.scene.add(pivot);

    // Door handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.1), this.hazardMat);
    handle.position.set(w * 0.85, h / 2, 0.15);
    pivot.add(handle);

    const doorBox = new THREE.Box3();
    doorBox.setFromObject(doorMesh);
    this.collisionBoxes.push(doorBox);

    const doorObj: LevelDoor = {
      id,
      name,
      pivot,
      doorMesh,
      isOpen: false,
      isLocked,
      requiresItem,
      lockedMessage,
      openRotation: Math.PI / 2,
      closedRotation: 0,
      currentRotation: 0,
      box: doorBox,
    };

    this.doors.set(id, doorObj);

    // Also register in interactive objects
    this.interactiveObjects.push({
      id,
      name,
      actionText: isLocked ? 'Unlock Door' : 'Open Door',
      type: 'door',
      position: [x, y + 1.5, z],
      radius: 3.0,
      requiresItem,
      lockedMessage,
      isUnlocked: !isLocked,
      isOpen: false,
    });
  }

  // --- 11. SPAWN COLLECTIBLES, KEYS & NOTES ---
  private spawnInteractiveItems(): void {
    // Note 1: Outside Guard Booth Desk
    this.spawnItemProp('note_booth', 'Guard Log - 02:00 Shift', 'note', [15, 0.9, 40], 0xd97706);

    // Keycard 1: Guard Booth Keycard (Inside Guard Booth)
    this.spawnItemProp('key_booth', 'Booth Keycard', 'keycard', [15.4, 0.9, 39.5], 0x2563eb);

    // Note 2: Main Entrance Foyer
    this.spawnItemProp('note_foyer', 'Facility Evacuation Notice', 'note', [0, 0.9, 18], 0xd97706);

    // Battery 1: Main Floor Aisle 1
    this.spawnItemProp('battery_aisle1', 'Heavy 9V Battery', 'battery', [-18, 0.8, -4], 0x10b981);

    // Keycard 2: Maintenance Keycard (Near Conveyor)
    this.spawnItemProp('keycard_maint', 'Maintenance Keycard', 'keycard', [0, 1.3, -4], 0x2563eb);

    // Audio Log 1: Tape Player in Office Reception
    this.spawnItemProp('audiolog_reception', 'Cassette Tape #1', 'audiolog', [26, 0.9, 36], 0x8b5cf6);

    // Brass Key: Archive Key in Security Office
    this.spawnItemProp('key_archive', 'Archive Brass Key', 'key', [34, 0.9, 43], 0xf59e0b);

    // Note 3: Incident Report 1994 (Admin Archive Room)
    this.spawnItemProp('note_archive', 'Incident Report 1994', 'note', [44, 0.9, 42], 0xd97706);

    // Battery 2: Security CCTV desk
    this.spawnItemProp('battery_security', 'Heavy 9V Battery', 'battery', [33, 0.9, 42], 0x10b981);

    // Industrial Fuse: In Maintenance Corridor Junction
    this.spawnItemProp('fuse_industrial', 'Industrial 30A Fuse', 'fuse', [-36, 0.8, -24], 0xef4444);

    // Battery 3: Basement Landing
    this.spawnItemProp('battery_basement', 'Heavy 9V Battery', 'battery', [-26, -5.2, 4], 0x10b981);

    // Keycard 3: Cold Storage Keycard (Basement generator console)
    this.spawnItemProp('keycard_cold', 'Cryo Access Keycard', 'keycard', [-20, -5.2, -2], 0x06b6d4);

    // Audio Log 2: Cold Storage Specimen Chamber
    this.spawnItemProp('audiolog_cold', 'Director Dr. Vance Log', 'audiolog', [4, 0.9, -42], 0x8b5cf6);

    // Note 4: Cold Storage Autopsy memo with Vault Code (9412)
    this.spawnItemProp('note_autopsy', 'Autopsy Memo (Code: 9412)', 'note', [-4, 0.9, -40], 0xd97706);
  }

  private spawnItemProp(id: string, name: string, type: InteractiveObject['type'], pos: [number, number, number], color: number): void {
    const geo = type === 'battery'
      ? new THREE.CylinderGeometry(0.08, 0.08, 0.25)
      : type === 'note' || type === 'audiolog'
      ? new THREE.BoxGeometry(0.35, 0.04, 0.25)
      : new THREE.BoxGeometry(0.15, 0.04, 0.25);

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.name = `prop_${id}`;
    this.scene.add(mesh);

    this.interactiveObjects.push({
      id,
      name,
      actionText: `Pick up ${name}`,
      type,
      position: pos,
      radius: 2.2,
      itemId: id,
    });
  }

  public updateAnimations(delta: number): void {
    // Update doors swing rotation
    for (const door of this.doors.values()) {
      const target = door.isOpen ? door.openRotation : door.closedRotation;
      if (Math.abs(door.currentRotation - target) > 0.01) {
        door.currentRotation = THREE.MathUtils.lerp(door.currentRotation, target, delta * 5.0);
        door.pivot.rotation.y = door.currentRotation;
        door.box.setFromObject(door.doorMesh);
      }
    }

    // Flicker fluorescent lights
    for (const light of this.flickeringLights) {
      if (Math.random() < 0.04) {
        light.intensity = Math.random() < 0.3 ? 0.05 : 1.2;
      }
    }

    // Drift cold mist particles
    if (this.mistParticles) {
      const positions = this.mistParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += delta * 0.15;
        if (positions[i] > 3.0) positions[i] = 0.2;
      }
      this.mistParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public removeInteractiveMesh(id: string): void {
    const mesh = this.scene.getObjectByName(`prop_${id}`);
    if (mesh) {
      this.scene.remove(mesh);
    }
    this.interactiveObjects = this.interactiveObjects.filter((o) => o.id !== id);
  }
}

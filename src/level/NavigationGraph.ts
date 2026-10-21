import * as THREE from 'three';
import { Waypoint } from '../types/game';

export class NavigationGraph {
  public waypoints: Map<string, Waypoint> = new Map();
  private doorStates: Map<string, boolean> = new Map(); // doorId -> isOpen

  constructor() {
    this.buildGraph();
  }

  public setDoorState(doorId: string, isOpen: boolean): void {
    this.doorStates.set(doorId, isOpen);
  }

  public isDoorOpen(doorId: string): boolean {
    return this.doorStates.get(doorId) ?? false;
  }

  private isEdgeTraversable(fromId: string, toId: string): boolean {
    const pair = `${fromId}->${toId}`;
    const reverse = `${toId}->${fromId}`;

    if (pair === 'entrance_door->main_entry' || reverse === 'entrance_door->main_entry') {
      return this.isDoorOpen('door_main_entrance');
    }
    if (pair === 'office_hall_mid->security_cctv_room' || reverse === 'office_hall_mid->security_cctv_room') {
      return this.isDoorOpen('door_security_room');
    }
    if (pair === 'office_archive_door->office_archive_room' || reverse === 'office_archive_door->office_archive_room') {
      return this.isDoorOpen('door_office_archive');
    }
    if (pair === 'cold_storage_ante->cold_storage_chamber' || reverse === 'cold_storage_ante->cold_storage_chamber') {
      return this.isDoorOpen('door_cold_storage');
    }
    if (pair === 'vault_security_door->vault_interior' || reverse === 'vault_security_door->vault_interior') {
      return this.isDoorOpen('door_vault_blast');
    }
    if (pair === 'shipping_dock_1->shipping_shutter_bay4' || reverse === 'shipping_dock_1->shipping_shutter_bay4') {
      return this.isDoorOpen('door_escape_shutter');
    }
    return true;
  }

  private addNode(id: string, x: number, y: number, z: number, area: string, neighbors: string[]): void {
    this.waypoints.set(id, { id, x, y, z, area, neighbors });
  }

  private buildGraph(): void {
    // 1. OUTSIDE YARD (Y ~ 0)
    this.addNode('yard_gate', 0, 0, 48, 'Outside Yard', ['yard_truck', 'yard_booth']);
    this.addNode('yard_truck', -10, 0, 40, 'Outside Yard', ['yard_gate', 'yard_center']);
    this.addNode('yard_booth', 12, 0, 40, 'Outside Yard', ['yard_gate', 'yard_center', 'booth_interior']);
    this.addNode('booth_interior', 15, 0, 38, 'Guard Booth', ['yard_booth']);
    this.addNode('yard_center', 0, 0, 36, 'Outside Yard', ['yard_truck', 'yard_booth', 'entrance_door']);
    this.addNode('entrance_door', 0, 0, 26, 'Warehouse Entrance', ['yard_center', 'main_entry']);

    // 2. MAIN WAREHOUSE FLOOR (Y ~ 0)
    // Entry foyer
    this.addNode('main_entry', 0, 0, 20, 'Main Floor - Foyer', ['entrance_door', 'aisle_center_south', 'shipping_cross']);

    // Shipping & Receiving route
    this.addNode('shipping_cross', 16, 0, 20, 'Shipping Dock Route', ['main_entry', 'shipping_dock_1', 'office_corridor_start']);
    this.addNode('shipping_dock_1', 28, 0, 20, 'Shipping Dock Area', ['shipping_cross', 'shipping_dock_forklift', 'shipping_shutter_bay4']);
    this.addNode('shipping_dock_forklift', 28, 0, 6, 'Shipping Dock - Staging', ['shipping_dock_1', 'aisle_east_middle']);
    this.addNode('shipping_shutter_bay4', 35, 0, 20, 'Loading Bay 4', ['shipping_dock_1']);

    // Warehouse Aisles
    // South Cross Aisle (Generous clearance at Z = 16)
    this.addNode('aisle_west_south', -12, 0, 16, 'Aisle West - South', ['aisle_center_south', 'aisle_1_south', 'aisle_2_south']);
    this.addNode('aisle_center_south', 0, 0, 16, 'Aisle Center - South', ['main_entry', 'aisle_west_south', 'aisle_east_south', 'aisle_2_south', 'aisle_3_south']);
    this.addNode('aisle_east_south', 12, 0, 16, 'Aisle East - South', ['aisle_center_south', 'aisle_4_south', 'aisle_3_south', 'shipping_cross']);

    // Aisle 1 (Far West - X = -23, 4m wide open lane)
    this.addNode('aisle_1_south', -23, 0, 16, 'Aisle 1 - South', ['aisle_west_south', 'aisle_1_mid']);
    this.addNode('aisle_1_mid', -23, 0, -4, 'Aisle 1 - Middle', ['aisle_1_south', 'aisle_1_north', 'cross_aisle_west']);
    this.addNode('aisle_1_north', -23, 0, -22.5, 'Aisle 1 - North', ['aisle_1_mid', 'aisle_west_north']);

    // Aisle 2 (Mid West - X = -12, 9m wide clear open space)
    this.addNode('aisle_2_south', -12, 0, 10, 'Aisle 2 - South', ['aisle_west_south', 'aisle_2_mid']);
    this.addNode('aisle_2_mid', -12, 0, -4, 'Aisle 2 - Middle', ['aisle_2_south', 'aisle_2_north', 'cross_aisle_west', 'cross_aisle_center_west']);
    this.addNode('aisle_2_north', -12, 0, -18, 'Aisle 2 - North', ['aisle_2_mid', 'aisle_north_midwest']);

    // Aisle 3 (Mid East - X = 12, 9m wide clear open space)
    this.addNode('aisle_3_south', 12, 0, 10, 'Aisle 3 - South', ['aisle_east_south', 'aisle_3_mid']);
    this.addNode('aisle_3_mid', 12, 0, -4, 'Aisle 3 - Middle', ['aisle_3_south', 'aisle_3_north', 'cross_aisle_center_east']);
    this.addNode('aisle_3_north', 12, 0, -18, 'Aisle 3 - North', ['aisle_3_mid', 'aisle_north_mideast']);

    // Aisle 4 (Far East - X = 23, 4m wide open lane)
    this.addNode('aisle_4_south', 23, 0, 10, 'Aisle 4 - South', ['aisle_east_south', 'aisle_4_mid']);
    this.addNode('aisle_4_mid', 23, 0, -4, 'Aisle 4 - Middle', ['aisle_4_south', 'aisle_4_north', 'aisle_east_middle']);
    this.addNode('aisle_4_north', 23, 0, -18, 'Aisle 4 - North', ['aisle_4_mid', 'aisle_east_north']);
    this.addNode('aisle_east_middle', 23, 0, 6, 'Aisle East - Mid', ['aisle_4_mid', 'shipping_dock_forklift']);

    // Middle Cross Aisles (Z = -4)
    this.addNode('cross_aisle_west', -18, 0, -4, 'Cross Aisle West', ['aisle_1_mid', 'aisle_2_mid']);
    this.addNode('cross_aisle_center_west', -3, 0, -4, 'Cross Aisle Center W', ['aisle_2_mid', 'aisle_north_midwest', 'aisle_center_south']);
    this.addNode('cross_aisle_center_east', 3, 0, -4, 'Cross Aisle Center E', ['aisle_3_mid', 'aisle_north_mideast', 'aisle_center_south']);

    // North Cross Aisle (Z = -22.5)
    this.addNode('aisle_west_north', -23, 0, -22.5, 'Aisle West - North', ['aisle_1_north', 'aisle_north_midwest', 'maint_corridor_entry']);
    this.addNode('aisle_north_midwest', -12, 0, -22.5, 'Aisle Center-W North', ['aisle_west_north', 'aisle_2_north', 'aisle_north_mideast', 'vault_security_door']);
    this.addNode('aisle_north_mideast', 12, 0, -22.5, 'Aisle Center-E North', ['aisle_north_midwest', 'aisle_3_north', 'aisle_east_north', 'cold_storage_ante']);
    this.addNode('aisle_east_north', 23, 0, -22.5, 'Aisle East - North', ['aisle_north_mideast', 'aisle_4_north']);

    // 3. ADMINISTRATIVE OFFICES (Y ~ 0)
    this.addNode('office_corridor_start', 22, 0, 28, 'Admin Hallway Start', ['shipping_cross', 'office_reception']);
    this.addNode('office_reception', 26, 0, 36, 'Admin Reception', ['office_corridor_start', 'office_hall_mid']);
    this.addNode('office_hall_mid', 34, 0, 36, 'Admin Hallway', ['office_reception', 'security_cctv_room', 'office_archive_door']);
    this.addNode('security_cctv_room', 34, 0, 44, 'Security CCTV Room', ['office_hall_mid']);
    this.addNode('office_archive_door', 42, 0, 36, 'Archive Hallway', ['office_hall_mid', 'office_archive_room']);
    this.addNode('office_archive_room', 44, 0, 42, 'Administrative Archive', ['office_archive_door']);

    // 4. MAINTENANCE CORRIDORS (Y ~ 0 to Y ~ -4)
    this.addNode('maint_corridor_entry', -28, 0, -24, 'Maintenance Corridor Entry', ['aisle_west_north', 'maint_junction']);
    this.addNode('maint_junction', -36, 0, -24, 'Maintenance Junction', ['maint_corridor_entry', 'maint_basement_stairs', 'maint_north_branch']);
    this.addNode('maint_north_branch', -36, 0, -36, 'Maintenance North Vent', ['maint_junction', 'cold_storage_maint_door']);

    // 5. BASEMENT GENERATOR ROOM (Y = -6)
    this.addNode('maint_basement_stairs', -36, -3, -14, 'Basement Stairwell', ['maint_junction', 'basement_landing']);
    this.addNode('basement_landing', -36, -6, -2, 'Basement Entry Landing', ['maint_basement_stairs', 'basement_generator_walkway']);
    this.addNode('basement_generator_walkway', -26, -6, -2, 'Basement Generator Walkway', ['basement_landing', 'basement_generator_core', 'basement_fuse_box']);
    this.addNode('basement_generator_core', -20, -6, -2, 'Main Generator Turbine', ['basement_generator_walkway']);
    this.addNode('basement_fuse_box', -26, -6, 8, 'Generator Electrical Switchgear', ['basement_generator_walkway']);

    // 6. COLD STORAGE SECTION (Y = 0)
    this.addNode('cold_storage_ante', 8, 0, -32, 'Cold Storage Airlock', ['aisle_north_mideast', 'cold_storage_chamber']);
    this.addNode('cold_storage_chamber', 8, 0, -42, 'Cold Storage Cryo Vault', ['cold_storage_ante', 'cold_storage_specimen', 'cold_storage_maint_door']);
    this.addNode('cold_storage_specimen', -4, 0, -42, 'Cryo Containment Bay', ['cold_storage_chamber']);
    this.addNode('cold_storage_maint_door', -24, 0, -40, 'Cold Storage Service Exit', ['cold_storage_chamber', 'maint_north_branch']);

    // 7. FINAL ARCHIVE VAULT (Y = 0)
    this.addNode('vault_security_door', 0, 0, -50, 'Vault Heavy Airlock', ['aisle_north_midwest', 'vault_interior']);
    this.addNode('vault_interior', 0, 0, -60, 'Sector 09 Archive Core', ['vault_security_door', 'vault_terminal']);
    this.addNode('vault_terminal', 0, 0, -66, 'Override Terminal', ['vault_interior']);
  }

  public getNearestWaypoint(pos: THREE.Vector3): Waypoint {
    let bestWp: Waypoint | null = null;
    let minDistSq = Infinity;

    for (const wp of this.waypoints.values()) {
      const dx = wp.x - pos.x;
      const dy = wp.y - pos.y;
      const dz = wp.z - pos.z;
      // prioritize matching floor height
      const distSq = dx * dx + (dy * dy) * 4 + dz * dz;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestWp = wp;
      }
    }
    return bestWp || this.waypoints.get('main_entry')!;
  }

  // A* pathfinding algorithm
  public findPath(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3[] {
    const startNode = this.getNearestWaypoint(startPos);
    const targetNode = this.getNearestWaypoint(targetPos);

    if (startNode.id === targetNode.id) {
      return [new THREE.Vector3(targetPos.x, targetNode.y, targetPos.z)];
    }

    const openSet = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    for (const id of this.waypoints.keys()) {
      gScore.set(id, Infinity);
      fScore.set(id, Infinity);
    }

    gScore.set(startNode.id, 0);
    const h = (a: Waypoint, b: Waypoint) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    fScore.set(startNode.id, h(startNode, targetNode));

    while (openSet.size > 0) {
      // Get lowest fScore in openSet
      let currentId = '';
      let lowestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
        }
      }

      if (currentId === targetNode.id) {
        // Reconstruct path
        const path: THREE.Vector3[] = [];
        let curr = currentId;
        while (curr) {
          const node = this.waypoints.get(curr)!;
          path.unshift(new THREE.Vector3(node.x, node.y, node.z));
          curr = cameFrom.get(curr)!;
        }
        // Append actual target position
        path.push(new THREE.Vector3(targetPos.x, targetNode.y, targetPos.z));
        return path;
      }

      openSet.delete(currentId);
      const currentWp = this.waypoints.get(currentId)!;

      for (const neighborId of currentWp.neighbors) {
        if (!this.isEdgeTraversable(currentId, neighborId)) continue;
        const neighbor = this.waypoints.get(neighborId);
        if (!neighbor) continue;

        const dist = h(currentWp, neighbor);
        const tentativeG = (gScore.get(currentId) ?? Infinity) + dist;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + h(neighbor, targetNode));
          openSet.add(neighborId);
        }
      }
    }

    // Fallback: direct line to target
    return [new THREE.Vector3(targetPos.x, targetNode.y, targetPos.z)];
  }

  public getRandomPatrolWaypoint(currentId?: string): Waypoint {
    const all = Array.from(this.waypoints.values());
    const valid = all.filter((w) => w.id !== currentId && !w.area.includes('Outside'));
    if (valid.length === 0) return all[0];
    return valid[Math.floor(Math.random() * valid.length)];
  }

  public getWaypointAwayFrom(currentPos: THREE.Vector3, avoidPos: THREE.Vector3): Waypoint {
    const all = Array.from(this.waypoints.values()).filter((w) => !w.area.includes('Outside'));
    let bestWp = all[0];
    let maxScore = -Infinity;
    for (const wp of all) {
      const distToAvoid = Math.hypot(wp.x - avoidPos.x, wp.z - avoidPos.z);
      const distToMonster = Math.hypot(wp.x - currentPos.x, wp.z - currentPos.z);
      const score = distToAvoid * 2.0 - distToMonster * 0.5;
      if (score > maxScore) {
        maxScore = score;
        bestWp = wp;
      }
    }
    return bestWp || all[0];
  }
}

import * as THREE from 'three';
import { Objective, InventoryItem, DocumentNote, AudioLog, InteractiveObject } from '../types/game';
import { LevelBuilder } from '../level/LevelBuilder';
import { MonsterAI } from '../ai/MonsterAI';
import { SoundSystem } from '../audio/SoundSystem';
import { PlayerController } from '../entities/PlayerController';
import { NavigationGraph } from '../level/NavigationGraph';

export class StoryManager {
  public currentChapter: number = 1;
  public objectives: Objective[] = [];
  public inventory: InventoryItem[] = [];
  public notes: Map<string, DocumentNote> = new Map();
  public audioLogs: Map<string, AudioLog> = new Map();

  // Active overlay states for UI
  public activeDocument: DocumentNote | null = null;
  public activeAudioLog: AudioLog | null = null;
  public activeCCTVFeed: number | null = null; // 0, 1, 2, 3 or null

  // Scripted flags
  public generatorStarted: boolean = false;
  public vaultOverrideActivated: boolean = false;
  public isEscaped: boolean = false;
  public notificationMessage: string = '';
  private notificationTimer: number = 0;

  private levelBuilder: LevelBuilder;
  private monsterAI: MonsterAI;
  private soundSystem: SoundSystem;
  private player: PlayerController;
  private navGraph: NavigationGraph;

  constructor(
    levelBuilder: LevelBuilder,
    monsterAI: MonsterAI,
    soundSystem: SoundSystem,
    player: PlayerController,
    navGraph: NavigationGraph
  ) {
    this.levelBuilder = levelBuilder;
    this.monsterAI = monsterAI;
    this.soundSystem = soundSystem;
    this.player = player;
    this.navGraph = navGraph;

    this.initLoreAndDocuments();
    this.initObjectives();
  }

  private initLoreAndDocuments(): void {
    // Document 1
    this.notes.set('note_booth', {
      id: 'note_booth',
      title: 'SECURITY LOG — SHIFT HANDOVER',
      author: 'Officer Ramirez (Guard Post 1)',
      date: 'OCTOBER 14, 02:00 AM',
      content: `Emergency protocol active. The Sector 09 alarm tripped again at 01:48. Maintenance supervisor ordered all exterior shutters down until the inspection crew arrives from regional headquarters.

Keycard for the main pedestrian entrance is on the desk. Do NOT go inside alone. The auditory interference from Sub-level 1 hasn't stopped since midnight.`,
      unread: true,
    });

    // Document 2
    this.notes.set('note_foyer', {
      id: 'note_foyer',
      title: 'FACILITY BULLETIN #402',
      author: 'Sector 09 Operations Management',
      date: 'CONFIDENTIAL',
      content: `NOTICE: Sub-level 1 is restricted to Class-4 personnel. All distribution personnel are advised that sounds of heavy mechanical movement or dragging impact from Aisle 2 are normal byproduct of cooling system vibration.

Do not attempt to inspect Aisle 2 after shift shutdown. Report any optical irregularities to Dr. Vance immediately.`,
      unread: true,
    });

    // Document 3
    this.notes.set('note_archive', {
      id: 'note_archive',
      title: 'INCIDENT LOG — SUBJECT RESONANCE 09',
      author: 'Dr. Arthur Vance, Lead Biometrician',
      date: 'SEPTEMBER 28, 1994',
      content: `The transformation is irreversible. Subject 09 has elongated beyond baseline physiological limits. Muscle atrophy on the right leg has produced an irregular limping gait, but sensory perception—specifically acoustic resonance—has heightened exponentially.

It tracks vibrations through concrete floors at up to 40 meters. We cannot terminate it without risking total containment rupture. It has been sealed in Cold Storage Unit 4 until the transfer team arrives.`,
      unread: true,
    });

    // Document 4
    this.notes.set('note_autopsy', {
      id: 'note_autopsy',
      title: 'COLD STORAGE ACCESS AUTHORIZATION',
      author: 'Containment Team Lead',
      date: 'SEALED FILE',
      content: `Subject 09 broke containment. Cold mist dispersion is slowing its metabolism, but door integrity is failing.

The final facility lockdown terminal in the Restricted Archive Vault can only be unlocked with decryption code: [ 9412 ].

If emergency power cuts out, it will be free to roam the main warehouse floor. God forgive us.`,
      unread: true,
    });

    // Audio Log 1
    this.audioLogs.set('audiolog_reception', {
      id: 'audiolog_reception',
      title: 'RECEPTION CASSETTE #01',
      speaker: 'Dispatcher Marcus (Audio Tape)',
      duration: '0:18',
      transcript: `[Heavy static and frantic breathing]
"Can anyone hear this? The power grid in Sector 09 just failed. Something is dragging its feet across the catwalks in Aisle 3. It's not human. It heard my radio... turn off your lights, don't run, don't—" [Loud metallic crash, tape cuts off]`,
      played: false,
    });

    // Audio Log 2
    this.audioLogs.set('audiolog_cold', {
      id: 'audiolog_cold',
      title: 'DIRECTOR VANCE PERSONAL LOG',
      speaker: 'Dr. Vance (Cryo Chamber)',
      duration: '0:22',
      transcript: `[Low hum of cryogenic compressor]
"Subject 09 responds to pure frequency. When the backup generator roars, it goes into a hyper-aggressive hunt mode. If you must start the basement turbine, stay hidden immediately. Use the shelving units as cover."`,
      played: false,
    });
  }

  private initObjectives(): void {
    this.objectives = [
      {
        id: 'obj_1',
        chapter: 1,
        chapterTitle: 'ENTRY',
        title: 'Investigate Sector 09',
        description: 'Search the exterior guard booth for the warehouse entrance keycard and gain entry.',
        completed: false,
      },
      {
        id: 'obj_2',
        chapter: 2,
        chapterTitle: 'THE FIRST SIGNAL',
        title: 'Locate Maintenance Access',
        description: 'Explore the main warehouse floor and find the Maintenance Keycard near the conveyor belt.',
        completed: false,
      },
      {
        id: 'obj_3',
        chapter: 3,
        chapterTitle: 'SECURITY OPERATIONS',
        title: 'Restore CCTV Monitors',
        description: 'Use the Maintenance Keycard to unlock the Security Room in the administrative offices and check the camera feeds.',
        completed: false,
      },
      {
        id: 'obj_4',
        chapter: 4,
        chapterTitle: 'THE GENERATOR',
        title: 'Restart Backup Power',
        description: 'Find a 30A fuse in the maintenance corridor, take the basement stairs, and engage the main turbine.',
        completed: false,
      },
      {
        id: 'obj_5',
        chapter: 5,
        chapterTitle: 'THE RECORDS',
        title: 'Retrieve Archive Evidence',
        description: 'Use the Archive Key to open the Personnel Archive and read Incident Report 1994.',
        completed: false,
      },
      {
        id: 'obj_6',
        chapter: 6,
        chapterTitle: 'COLD STORAGE',
        title: 'Infiltrate Cryogenic Unit',
        description: 'Enter Cold Storage using the Cryo Keycard and discover the Containment Vault override code.',
        completed: false,
      },
      {
        id: 'obj_7',
        chapter: 7,
        chapterTitle: 'SECTOR 09 VAULT',
        title: 'Breach Restricted Archive',
        description: 'Enter code 9412 to unlock the Containment Blast Door and activate the Facility Lockdown Override.',
        completed: false,
      },
      {
        id: 'obj_8',
        chapter: 8,
        chapterTitle: 'ESCAPE',
        title: 'Escape Sector 09',
        description: 'Emergency shutter Bay 4 has opened! Sprint through the shipping dock to the outside loading yard before the creature hunts you down!',
        completed: false,
      },
    ];
  }

  public getCurrentObjective(): Objective {
    const active = this.objectives.find((o) => !o.completed);
    return active || this.objectives[this.objectives.length - 1];
  }

  public showNotification(msg: string): void {
    this.notificationMessage = msg;
    this.notificationTimer = 4.0;
  }

  public update(delta: number): void {
    if (this.notificationTimer > 0) {
      this.notificationTimer -= delta;
      if (this.notificationTimer <= 0) {
        this.notificationMessage = '';
      }
    }

    // Check escape trigger in Chapter 8
    if (this.vaultOverrideActivated && !this.isEscaped) {
      // If player crosses outside the shipping dock shutter door (X > 40)
      if (this.player.position.x > 38 && this.player.position.z >= 14 && this.player.position.z <= 26) {
        this.isEscaped = true;
        this.showNotification('ESCAPED FROM SECTOR 09');
      }
    }
  }

  // --- INTERACTION DISPATCHER ---
  public handleInteraction(target: InteractiveObject): void {
    // 1. Pickups
    if (target.type === 'note' && target.noteId) {
      const note = this.notes.get(target.noteId);
      if (note) {
        note.unread = false;
        this.activeDocument = note;
        this.soundSystem.playPickup();
        this.levelBuilder.removeInteractiveMesh(target.id);
        this.showNotification(`Read Document: ${note.title}`);

        // Progression check
        if (target.noteId === 'note_archive' && this.currentChapter === 5) {
          this.completeChapter(5);
        }
      }
      return;
    }

    if (target.type === 'audiolog' && target.audioId) {
      const log = this.audioLogs.get(target.audioId);
      if (log) {
        log.played = true;
        this.activeAudioLog = log;
        this.soundSystem.playTapeAudio(log.transcript.length);
        this.levelBuilder.removeInteractiveMesh(target.id);
        this.showNotification(`Playing Tape: ${log.title}`);
      }
      return;
    }

    if (target.type === 'pickup' || target.itemId) {
      const itemId = target.itemId || target.id;
      this.inventory.push({
        id: itemId,
        name: target.name,
        description: `Collected item: ${target.name}`,
        icon: target.name.includes('Key') ? 'Key' : target.name.includes('Battery') ? 'Battery' : 'Wrench',
        type: itemId.includes('battery') ? 'battery' : itemId.includes('fuse') ? 'fuse' : 'key',
      });

      this.soundSystem.playPickup();
      this.levelBuilder.removeInteractiveMesh(target.id);
      this.showNotification(`Acquired: ${target.name}`);

      // If battery, automatically recharge player flashlight
      if (itemId.includes('battery')) {
        this.player.rechargeBattery(50);
        this.showNotification(`Flashlight Battery Recharged (+50%)`);
      }

      // Progression checks
      if (itemId === 'keycard_maint' && this.currentChapter === 2) {
        this.completeChapter(2);
        this.soundSystem.playDistantPipeCreak();
      }
      return;
    }

    // 2. Doors
    if (target.type === 'door') {
      const door = this.levelBuilder.doors.get(target.id);
      if (!door) return;

      if (door.isLocked) {
        // Check if player has required key
        const hasItem = door.requiresItem && this.inventory.some((i) => i.id === door.requiresItem);
        if (hasItem) {
          door.isLocked = false;
          door.isOpen = true;
          this.navGraph.setDoorState(door.id, true);
          this.soundSystem.playDoorSound(true, target.position);
          this.showNotification(`Unlocked: ${door.name}`);

          // Progression check
          if (door.id === 'door_main_entrance' && this.currentChapter === 1) {
            this.completeChapter(1);
          } else if (door.id === 'door_cold_storage' && this.currentChapter === 6) {
            this.completeChapter(6);
          }
        } else {
          this.showNotification(door.lockedMessage || 'The door is securely locked.');
        }
      } else {
        // Toggle door open/close
        door.isOpen = !door.isOpen;
        this.navGraph.setDoorState(door.id, door.isOpen);
        this.soundSystem.playDoorSound(door.isOpen, target.position);
      }
      return;
    }

    // 3. CCTV Station
    if (target.type === 'cctv') {
      this.activeCCTVFeed = 0;
      this.soundSystem.playPickup();
      if (this.currentChapter === 3) {
        this.completeChapter(3);
        // Distant monster sound
        this.soundSystem.playMonsterFootstep(new THREE.Vector3(-8, 0, -18), false);
      }
      return;
    }

    // 4. Electrical Fuse Box
    if (target.id === 'switch_fusebox') {
      const hasFuse = this.inventory.some((i) => i.id === 'fuse_industrial');
      if (hasFuse) {
        // Remove fuse from inventory and mark installed
        this.inventory = this.inventory.filter((i) => i.id !== 'fuse_industrial');
        this.inventory.push({
          id: 'fuse_installed',
          name: 'Fuse Installed',
          description: 'Industrial 30A fuse seated in panel',
          icon: 'Check',
          type: 'tool',
        });
        target.actionText = 'Fuse Installed (30A OK)';
        this.soundSystem.playPickup();
        this.showNotification('30A Fuse installed into electrical panel. Generator ready.');
      } else {
        this.showNotification('Empty socket. You need an Industrial 30A Fuse from the maintenance corridor.');
      }
      return;
    }

    // 5. Generator Turbine
    if (target.id === 'generator_lever') {
      const fuseInstalled = this.inventory.some((i) => i.id === 'fuse_installed');
      if (fuseInstalled) {
        if (!this.generatorStarted) {
          this.generatorStarted = true;
          this.soundSystem.playGeneratorStart(target.position);
          this.showNotification('MAIN POWER RESTORED! Facility machinery online.');

          // Wakes and triggers Monster AI into active patrol/investigate!
          this.monsterAI.wakeMonster();

          if (this.currentChapter === 4) {
            this.completeChapter(4);
          }
        } else {
          this.showNotification('Turbine running at full RPM.');
        }
      } else {
        this.showNotification('Circuit incomplete. Insert 30A fuse in the electrical panel first.');
      }
      return;
    }

    // 6. Final Vault Override Terminal
    if (target.id === 'terminal_vault_override') {
      if (!this.vaultOverrideActivated) {
        this.vaultOverrideActivated = true;
        this.soundSystem.playAlarmSiren();

        // Unlock Shutter Bay 4
        const shutterDoor = this.levelBuilder.doors.get('door_escape_shutter');
        if (shutterDoor) {
          shutterDoor.isLocked = false;
          shutterDoor.isOpen = true;
        }

        // Monster enters aggressive HUNT state!
        this.monsterAI.state = 'HUNT';
        this.soundSystem.playMonsterRoar(this.monsterAI.entity.position);

        this.showNotification('FACILITY LOCKDOWN OVERRIDE! EMERGENCY SHUTTER BAY 4 OPENED! RUN!');

        if (this.currentChapter === 7) {
          this.completeChapter(7);
        }
      } else {
        this.showNotification('Override active. Escape through Shutter Bay 4 now!');
      }
      return;
    }
  }

  private completeChapter(chapNum: number): void {
    const obj = this.objectives.find((o) => o.chapter === chapNum);
    if (obj) {
      obj.completed = true;
    }
    this.currentChapter = Math.min(8, chapNum + 1);
    const nextObj = this.getCurrentObjective();
    this.showNotification(`CHAPTER ${nextObj.chapter}: ${nextObj.title}`);
  }
}

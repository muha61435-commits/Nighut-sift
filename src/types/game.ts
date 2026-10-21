export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';

export type MonsterStateType =
  | 'DORMANT'
  | 'PATROL'
  | 'INVESTIGATE_SOUND'
  | 'SEARCH'
  | 'SUSPICIOUS'
  | 'HUNT'
  | 'LOST_TARGET'
  | 'RETURN_TO_PATROL';

export interface SoundEvent {
  id: string;
  category: 'footstep_crouch' | 'footstep_walk' | 'footstep_sprint' | 'footstep_metal' | 'door' | 'item_drop' | 'generator' | 'machinery' | 'alarm';
  position: [number, number, number];
  intensity: number; // 0 to 1
  radius: number; // meters
  timestamp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'key' | 'keycard' | 'battery' | 'fuse' | 'document' | 'audiolog' | 'tool';
  count?: number;
}

export interface DocumentNote {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  unread: boolean;
}

export interface AudioLog {
  id: string;
  title: string;
  speaker: string;
  duration: string;
  transcript: string;
  played: boolean;
}

export interface Objective {
  id: string;
  chapter: number;
  chapterTitle: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface InteractiveObject {
  id: string;
  name: string;
  actionText: string;
  type: 'door' | 'pickup' | 'key' | 'keycard' | 'battery' | 'fuse' | 'terminal' | 'switch' | 'note' | 'audiolog' | 'generator' | 'cctv' | 'vault';
  position: [number, number, number];
  radius: number;
  requiresItem?: string;
  lockedMessage?: string;
  isUnlocked?: boolean;
  isOpen?: boolean;
  itemId?: string;
  noteId?: string;
  audioId?: string;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  z: number;
  area: string;
  neighbors: string[];
}

export interface QualitySettings {
  shadows: boolean;
  fog: boolean;
  particles: boolean;
  sensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
}

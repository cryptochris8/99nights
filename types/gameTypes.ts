import type { Vector3Like, Player, Entity } from 'hytopia';

// Core game types
export interface GameState {
  isStarted: boolean;
  currentNight: number;
  currentPhase: DayPhase;
  campLevel: number;
}

export enum DayPhase {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
  DAWN = 'dawn',
}

export interface InventoryItem {
  id: string;
  name: string;
  stackSize: number;
  maxStack: number;
}

export interface PlayerData {
  playerId: string;
  inventory: InventoryItem[];
  runes: string[];
  level: number;
  xp: number;
  health: number;
  stamina: number;
}

export interface EnemyConfig {
  id: string;
  name: string;
  modelUri: string;
  health: number;
  speed: number;
  damage: number;
  minNight: number;
  xpReward: number;
  lootTable: string;
}

export interface WaveConfig {
  night: number;
  enemyTypes: string[];
  spawnRate: number;
  totalEnemies: number;
}

export interface RecipeConfig {
  id: string;
  name: string;
  inputs: { itemId: string; quantity: number }[];
  output: { itemId: string; quantity: number };
  craftTime: number;
}

export interface RuneConfig {
  id: string;
  name: string;
  type: 'active' | 'passive';
  cooldown: number;
  effect: string;
  damage?: number;
  duration?: number;
}

export interface ItemConfig {
  id: string;
  name: string;
  type: 'resource' | 'tool' | 'weapon' | 'consumable' | 'herb';
  maxStack: number;
  description?: string;
}

export interface ZoneConfig {
  id: string;
  name: string;
  center: Vector3Like;
  radius: number;
  spawnPoints: Vector3Like[];
}

// Manager events (custom events)
export enum GameEvent {
  NIGHT_START = 'game:night_start',
  NIGHT_END = 'game:night_end',
  PHASE_CHANGE = 'game:phase_change',
  WAVE_START = 'game:wave_start',
  ITEM_CRAFTED = 'game:item_crafted',
  ENEMY_KILLED = 'game:enemy_killed',
  PLAYER_DEATH = 'game:player_death',
  CAMP_UPGRADED = 'game:camp_upgraded',
}

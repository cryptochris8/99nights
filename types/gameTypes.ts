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
  itemId: string;
  quantity: number;
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
  placeable?: boolean;
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
export enum GameEvents {
  NIGHT_START = 'game:night_start',
  NIGHT_END = 'game:night_end',
  PHASE_CHANGE = 'game:phase_change',
  WAVE_START = 'game:wave_start',
  CRAFT_START = 'game:craft_start',
  CRAFT_COMPLETE = 'game:craft_complete',
  ENEMY_KILLED = 'game:enemy_killed',
  PLAYER_DEATH = 'game:player_death',
  PLAYER_SPAWN = 'game:player_spawn',
  PLAYER_LEVEL_UP = 'game:player_level_up',
  CAMP_UPGRADED = 'game:camp_upgraded',
}

import { World, Vector3Like } from 'hytopia';
import GameManager from './GameManager';
import BaseEnemyEntity from '../entities/enemies/BaseEnemyEntity';
import type { EnemyConfig } from '../../types/gameTypes';

/**
 * NightManager
 *
 * Manages enemy spawning during night phases.
 * Handles wave difficulty scaling, spawn rates, and cleanup.
 */
export default class NightManager {
  public static readonly instance = new NightManager();

  private world: World | undefined;
  private isNightActive: boolean = false;
  private spawnInterval: NodeJS.Timeout | undefined;
  private enemiesSpawned: number = 0;
  private activeEnemies: Set<BaseEnemyEntity> = new Set();
  private maxEnemiesThisNight: number = 10;
  private maxConcurrentEnemies: number = 15; // Performance limit

  private constructor() {
    console.log('[NightManager] Instance created');
  }

  /**
   * Initialize the night manager
   */
  public initialize(world: World) {
    this.world = world;
    console.log('[NightManager] Initialized');
  }

  /**
   * Start a night with enemy spawning
   */
  public startNight(nightNumber: number) {
    if (!this.world || this.isNightActive) return;

    this.isNightActive = true;
    this.enemiesSpawned = 0;
    this.activeEnemies.clear();

    console.log(`[NightManager] Night ${nightNumber} begins - spawning enemies`);

    // Check if this is a boss night
    const isBossNight = this.isBossNight(nightNumber);

    if (isBossNight) {
      // Boss night!
      import('./AudioManager').then(({ default: AudioManager }) => {
        AudioManager.instance.playBossMusic();
      });

      this.world.chatManager.sendBroadcastMessage('='.repeat(50), 'FFD700');
      this.world.chatManager.sendBroadcastMessage(`⚠️  BOSS NIGHT ${nightNumber} ⚠️`, 'FFD700');
      this.world.chatManager.sendBroadcastMessage('A powerful enemy approaches...', 'FFD700');
      this.world.chatManager.sendBroadcastMessage('='.repeat(50), 'FFD700');

      // Spawn boss immediately
      this.spawnBoss(nightNumber);
      this.maxEnemiesThisNight = 1; // Only the boss
    } else {
      // Normal night
      // Calculate difficulty based on night number
      this.maxEnemiesThisNight = this.calculateMaxEnemies(nightNumber);
      const spawnRate = this.calculateSpawnRate(nightNumber);

      this.world.chatManager.sendBroadcastMessage(
        `👹 Enemies approach! (Wave: ${this.maxEnemiesThisNight} enemies)`,
        'FF0000'
      );

      // Start spawning enemies
      this.startSpawning(nightNumber, spawnRate);
    }
  }

  /**
   * End the night and despawn remaining enemies
   */
  public endNight() {
    if (!this.world || !this.isNightActive) return;

    this.isNightActive = false;

    // Stop spawning
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = undefined;
    }

    // Despawn all active enemies
    const despawnCount = this.activeEnemies.size;
    for (const enemy of this.activeEnemies) {
      enemy.despawn();
    }
    this.activeEnemies.clear();

    console.log(`[NightManager] Night ended. Spawned ${this.enemiesSpawned} enemies, despawned ${despawnCount}`);

    if (despawnCount > 0) {
      this.world.chatManager.sendBroadcastMessage(
        `☀️ The remaining enemies flee from the light!`,
        '00FF00'
      );
    }
  }

  /**
   * Calculate max enemies for this night
   */
  private calculateMaxEnemies(nightNumber: number): number {
    // Base 10 + 2 per night, capped at 50
    return Math.min(50, 10 + nightNumber * 2);
  }

  /**
   * Calculate spawn rate (lower = faster)
   */
  private calculateSpawnRate(nightNumber: number): number {
    // Start at 5000ms, decrease by 100ms per night, minimum 1500ms
    return Math.max(1500, 5000 - nightNumber * 100);
  }

  /**
   * Start spawning enemies at intervals
   */
  private startSpawning(nightNumber: number, spawnRateMs: number) {
    this.spawnInterval = setInterval(() => {
      // Stop if we've spawned enough
      if (this.enemiesSpawned >= this.maxEnemiesThisNight) {
        if (this.spawnInterval) {
          clearInterval(this.spawnInterval);
          this.spawnInterval = undefined;
        }
        return;
      }

      // Check concurrent enemy limit (performance)
      if (this.activeEnemies.size >= this.maxConcurrentEnemies) {
        return; // Wait for some to die
      }

      // Spawn enemy
      this.spawnEnemy(nightNumber);
      this.enemiesSpawned++;
    }, spawnRateMs);
  }

  /**
   * Spawn a single enemy
   */
  private spawnEnemy(nightNumber: number) {
    if (!this.world) return;

    const gameManager = GameManager.instance;

    // Get available enemy types for this night
    const availableEnemies = Object.values(gameManager.enemiesConfig).filter(
      (config: EnemyConfig) => config.minNight <= nightNumber
    );

    if (availableEnemies.length === 0) {
      console.warn(`[NightManager] No enemies available for night ${nightNumber}`);
      return;
    }

    // Select random enemy type
    const enemyConfig = availableEnemies[
      Math.floor(Math.random() * availableEnemies.length)
    ];

    // Create enemy entity
    const enemy = new BaseEnemyEntity(enemyConfig);

    // Get random spawn position
    const spawnPos = this.getRandomSpawnPosition();

    // Spawn in world
    enemy.spawn(this.world, spawnPos);

    // Track active enemy
    this.activeEnemies.add(enemy);

    // Remove from tracking when despawned
    enemy.on('despawn' as any, () => {
      this.activeEnemies.delete(enemy);
    });

    console.log(`[NightManager] Spawned ${enemyConfig.name} at night ${nightNumber} (${this.enemiesSpawned + 1}/${this.maxEnemiesThisNight})`);
  }

  /**
   * Get random spawn position around the map origin
   */
  private getRandomSpawnPosition(): Vector3Like {
    // Spawn in a ring around origin (0, 0, 0)
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 20; // 30-50 blocks from center

    return {
      x: Math.cos(angle) * radius,
      y: 20, // Spawn high enough to fall to ground
      z: Math.sin(angle) * radius,
    };
  }

  /**
   * Get current active enemy count
   */
  public getActiveEnemyCount(): number {
    return this.activeEnemies.size;
  }

  /**
   * Get total enemies spawned this night
   */
  public getEnemiesSpawnedCount(): number {
    return this.enemiesSpawned;
  }

  /**
   * Check if night is active
   */
  public isActive(): boolean {
    return this.isNightActive;
  }

  /**
   * Check if this is a boss night
   */
  private isBossNight(nightNumber: number): boolean {
    const bossNights = [10, 25, 50, 75, 99];
    return bossNights.includes(nightNumber);
  }

  /**
   * Spawn a boss enemy for milestone nights
   */
  private spawnBoss(nightNumber: number) {
    if (!this.world) return;

    const gameManager = GameManager.instance;

    // Select boss based on night number
    let bossId: string;
    if (nightNumber >= 99) {
      bossId = 'ancient_guardian'; // Final boss
    } else if (nightNumber >= 75) {
      bossId = 'ancient_guardian';
    } else if (nightNumber >= 50) {
      bossId = 'hollow_stag';
    } else if (nightNumber >= 25) {
      bossId = 'hollow_stag';
    } else {
      bossId = 'hollow_stag'; // Night 10
    }

    const bossConfig = gameManager.enemiesConfig[bossId];
    if (!bossConfig) {
      console.error(`[NightManager] Boss not found: ${bossId}`);
      return;
    }

    // Create boss entity with isBoss flag
    const boss = new BaseEnemyEntity(bossConfig, true);

    // Spawn boss near spawn (closer than regular enemies)
    const angle = Math.random() * Math.PI * 2;
    const radius = 25; // Closer spawn for dramatic effect
    const spawnPos = {
      x: Math.cos(angle) * radius,
      y: 20,
      z: Math.sin(angle) * radius,
    };

    boss.spawn(this.world, spawnPos);

    // Track boss
    this.activeEnemies.add(boss);
    this.enemiesSpawned++;

    // Remove from tracking when defeated
    boss.on('despawn' as any, () => {
      this.activeEnemies.delete(boss);

      // Boss defeated! Celebration
      if (this.world) {
        this.world.chatManager.sendBroadcastMessage('='.repeat(50), '00FF00');
        this.world.chatManager.sendBroadcastMessage(`🎉 ${bossConfig.name} DEFEATED! 🎉`, '00FF00');
        this.world.chatManager.sendBroadcastMessage('='.repeat(50), '00FF00');

        // Return to normal night music
        import('./AudioManager').then(({ default: AudioManager }) => {
          AudioManager.instance.switchMusic('night');
        });
      }
    });

    console.log(`[NightManager] Spawned BOSS: ${bossConfig.name} for night ${nightNumber}`);
    this.world.chatManager.sendBroadcastMessage(
      `💀 ${bossConfig.name} has appeared! 💀`,
      'FF0000'
    );
  }
}

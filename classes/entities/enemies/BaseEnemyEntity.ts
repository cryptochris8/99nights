import { Entity, EntityEvent, World } from 'hytopia';
import type { EnemyConfig } from '../../../types/gameTypes';
import EnemyController from '../../controllers/EnemyController';
import GameManager from '../../managers/GameManager';
import AudioManager from '../../managers/AudioManager';
import GamePlayerEntity from '../GamePlayerEntity';

/**
 * BaseEnemyEntity
 *
 * Base class for all enemy entities in the game.
 * Handles health, damage, death, and loot dropping.
 */
export default class BaseEnemyEntity extends Entity {
  public config: EnemyConfig;
  public health: number;
  public maxHealth: number;
  public isDead: boolean = false;
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS = 1000; // 1 second between attacks

  constructor(config: EnemyConfig) {
    super({
      modelUri: config.modelUri,
      modelScale: (config as any).modelScale || 1.0,
      modelTintColor: (config as any).modelTint || undefined,
      modelLoopedAnimations: ['idle'],
      name: config.name,
      rigidBodyOptions: {
        enabledRotations: { x: false, y: true, z: false },
        enabledTranslations: { x: true, y: true, z: true },
      },
    });

    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;

    // Add tags for identification
    this.addTag('enemy');
    this.addTag(config.id);

    console.log(`[BaseEnemyEntity] Created ${config.name}`);
  }

  /**
   * Called when entity spawns
   */
  async onSpawn() {
    await super.onSpawn();

    // Attach AI controller
    const controller = new EnemyController(this);
    this.setEntityController(controller);

    // Listen for collisions with players
    this.on(EntityEvent.COLLISION_START, ({ otherEntity }) => {
      this.onCollisionWithPlayer(otherEntity);
    });

    console.log(`[BaseEnemyEntity] ${this.config.name} spawned at ${JSON.stringify(this.position)}`);
  }

  /**
   * Handle collision with player
   */
  private onCollisionWithPlayer(otherEntity: Entity) {
    if (this.isDead) return;

    // Check if it's a player entity
    const playerEntity = otherEntity as GamePlayerEntity;
    if (!playerEntity.player) return;

    // Check attack cooldown
    const now = Date.now();
    if (now - this.attackCooldown < this.ATTACK_COOLDOWN_MS) return;

    // Attack the player
    this.attackPlayer(playerEntity);
    this.attackCooldown = now;
  }

  /**
   * Attack a player
   */
  private attackPlayer(playerEntity: GamePlayerEntity) {
    if (this.isDead) return;

    playerEntity.takeDamage(this.config.damage);

    // Play attack sound at enemy position
    AudioManager.instance.playSFX('audio/sfx/damage/hit.mp3', 0.6, this.position);

    this.world.chatManager.sendPlayerMessage(
      playerEntity,
      `§c${this.config.name} attacks you for ${this.config.damage} damage!`
    );

    console.log(`[BaseEnemyEntity] ${this.config.name} attacked player for ${this.config.damage} damage`);
  }

  /**
   * Take damage from player or other source
   */
  public takeDamage(amount: number, attacker?: GamePlayerEntity) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);

    // Play hurt sound based on enemy type
    const hurtSounds = {
      'skeleton': 'audio/sfx/entity/skeleton/skeleton-hit.mp3',
      'zombie': 'audio/sfx/entity/zombie/zombie-hurt.mp3',
      'spider': 'audio/sfx/entity/spider/spider-screech-1.mp3',
      'default': 'audio/sfx/damage/hit-wood.mp3'
    };

    const soundKey = this.config.id.includes('skeleton') ? 'skeleton' :
                     this.config.id.includes('zombie') ? 'zombie' :
                     this.config.id.includes('wispling') ? 'spider' :
                     'default';

    AudioManager.instance.playSFX(hurtSounds[soundKey], 0.5, this.position);

    console.log(`[BaseEnemyEntity] ${this.config.name} took ${amount} damage (${this.health}/${this.maxHealth} HP)`);

    if (this.health <= 0) {
      this.die(attacker);
    }
  }

  /**
   * Handle enemy death
   */
  private die(killer?: GamePlayerEntity) {
    if (this.isDead) return;

    this.isDead = true;
    console.log(`[BaseEnemyEntity] ${this.config.name} died`);

    // Play death sound based on enemy type
    const deathSounds = {
      'skeleton': 'audio/sfx/entity/skeleton/skeleton-death.mp3',
      'zombie': 'audio/sfx/entity/zombie/zombie-death.mp3',
      'spider': 'audio/sfx/entity/spider/spider-death.mp3',
      'default': 'audio/sfx/damage/hit-woodbreak.mp3'
    };

    const soundKey = this.config.id.includes('skeleton') ? 'skeleton' :
                     this.config.id.includes('zombie') ? 'zombie' :
                     this.config.id.includes('wispling') ? 'spider' :
                     'default';

    AudioManager.instance.playSFX(deathSounds[soundKey], 0.7, this.position);

    // Award XP to killer
    if (killer) {
      killer.addXP(this.config.xpReward);
      this.world.chatManager.sendPlayerMessage(
        killer,
        `§a+${this.config.xpReward} XP for defeating ${this.config.name}!`
      );
    }

    // Drop loot
    this.dropLoot(killer);

    // Broadcast death message
    this.world.chatManager.sendBroadcastMessage(
      `§7${this.config.name} was defeated!`,
      '888888'
    );

    // Despawn after a short delay
    setTimeout(() => {
      this.despawn();
    }, 500);
  }

  /**
   * Drop loot based on loot table
   */
  private dropLoot(nearPlayer?: GamePlayerEntity) {
    const gameManager = GameManager.instance;

    // Load loot table config
    import('../../../config/loot_tables.json').then((lootTablesModule) => {
      const lootTables = lootTablesModule.default || lootTablesModule;
      const lootTable = lootTables[this.config.lootTable];

      if (!lootTable) {
        console.warn(`[BaseEnemyEntity] No loot table found: ${this.config.lootTable}`);
        return;
      }

      // Process each drop
      for (const drop of lootTable.drops) {
        // Roll for drop chance
        if (Math.random() > drop.chance) continue;

        // Calculate quantity
        const quantity = Math.floor(
          Math.random() * (drop.maxQuantity - drop.minQuantity + 1) + drop.minQuantity
        );

        // Give directly to nearby player (for MVP, we'll improve this in Phase 5)
        if (nearPlayer) {
          const added = nearPlayer.addItemToInventory(drop.itemId, quantity);
          if (added) {
            const itemConfig = gameManager.itemsConfig[drop.itemId];
            const itemName = itemConfig?.name || drop.itemId;

            this.world.chatManager.sendPlayerMessage(
              nearPlayer,
              `§e+${quantity}x ${itemName}`
            );
          }
        }
      }
    }).catch((error) => {
      console.error(`[BaseEnemyEntity] Failed to load loot tables:`, error);
    });
  }

  /**
   * Get health percentage (0-1)
   */
  public getHealthPercent(): number {
    return this.health / this.maxHealth;
  }
}

import { Entity, EntityEvent, World, RigidBodyType } from 'hytopia';
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
  public isBoss: boolean = false; // Track if this is a boss enemy
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS = 1000; // 1 second between attacks

  constructor(config: EnemyConfig, isBoss: boolean = false) {
    super({
      modelUri: config.modelUri,
      modelScale: (config as any).modelScale || 1.0,
      modelLoopedAnimations: ['idle'],
      name: config.name,
      tag: 'enemy', // Use tag option instead of addTag method
      rigidBodyOptions: {
        type: RigidBodyType.DYNAMIC,
        enabledRotations: { x: false, y: true, z: false },
      },
    });

    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.isBoss = isBoss;

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      // If this is a boss, send UI message to all players
      if (this.isBoss) {
        this.broadcastBossSpawn();
      }
      // Apply tint color if specified
      if ((config as any).modelTint) {
        this.setTintColor((config as any).modelTint);
      }

      // Attach AI controller
      const controller = new EnemyController(this);
      this.setController(controller);

      // Listen for collisions with players
      this.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity, started }) => {
        if (started) {
          this.onCollisionWithPlayer(otherEntity);
        }
      });

      console.log(`[BaseEnemyEntity] ${this.config.name} spawned at ${JSON.stringify(this.position)}`);
    });

    console.log(`[BaseEnemyEntity] Created ${config.name}`);
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
    if (this.isDead || !this.world) return;

    playerEntity.takeDamage(this.config.damage);

    // Play attack sound at enemy position
    AudioManager.instance.playSFX('audio/sfx/damage/hit.mp3', 0.6, this.position);

    this.world.chatManager.sendPlayerMessage(
      playerEntity.player,
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

    // Broadcast damage number to attacker and nearby players
    this.showDamageNumber(amount, attacker);

    // If this is a boss, broadcast health update to all players
    if (this.isBoss) {
      this.broadcastBossHealth();
    }

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
    if (this.isDead || !this.world) return;

    this.isDead = true;
    console.log(`[BaseEnemyEntity] ${this.config.name} died`);

    // If this is a boss, broadcast defeat message
    if (this.isBoss) {
      this.broadcastBossDefeated();

      // Boss victory rewards
      if (killer) {
        this.grantBossRewards(killer);
      }
    }

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

    // Award XP to killer (skip if boss, boss rewards handled separately)
    if (killer && !this.isBoss) {
      killer.addXP(this.config.xpReward);
      this.world.chatManager.sendPlayerMessage(
        killer.player,
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
      if (this.isSpawned) {
        this.despawn();
      }
    }, 500);
  }

  /**
   * Drop loot based on loot table
   */
  private dropLoot(nearPlayer?: GamePlayerEntity) {
    const gameManager = GameManager.instance;

    if (!this.world) return;

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
        if (nearPlayer && this.world) {
          const added = nearPlayer.addItemToInventory(drop.itemId, quantity);
          if (added) {
            const itemConfig = gameManager.itemsConfig[drop.itemId];
            const itemName = itemConfig?.name || drop.itemId;

            this.world.chatManager.sendPlayerMessage(
              nearPlayer.player,
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

  /**
   * Broadcast boss spawn to all players
   */
  private broadcastBossSpawn() {
    if (!this.world) return;

    const players = this.world.entityManager.getAllPlayerEntities();
    for (const playerEntity of players) {
      const player = (playerEntity as GamePlayerEntity).player;
      if (player?.ui) {
        player.ui.sendData({
          type: 'boss_spawn',
          name: this.config.name,
          health: this.health,
          maxHealth: this.maxHealth,
        });
      }
    }

    console.log(`[BaseEnemyEntity] Broadcast boss spawn: ${this.config.name}`);
  }

  /**
   * Broadcast boss health update to all players
   */
  private broadcastBossHealth() {
    if (!this.world) return;

    const players = this.world.entityManager.getAllPlayerEntities();
    for (const playerEntity of players) {
      const player = (playerEntity as GamePlayerEntity).player;
      if (player?.ui) {
        player.ui.sendData({
          type: 'boss_health',
          health: this.health,
          maxHealth: this.maxHealth,
        });
      }
    }
  }

  /**
   * Broadcast boss defeated to all players
   */
  private broadcastBossDefeated() {
    if (!this.world) return;

    const players = this.world.entityManager.getAllPlayerEntities();
    for (const playerEntity of players) {
      const player = (playerEntity as GamePlayerEntity).player;
      if (player?.ui) {
        player.ui.sendData({
          type: 'boss_defeated',
        });
      }
    }

    console.log(`[BaseEnemyEntity] Broadcast boss defeated: ${this.config.name}`);
  }

  /**
   * Grant special rewards for defeating a boss
   */
  private grantBossRewards(killer: GamePlayerEntity) {
    if (!this.world) return;

    // Calculate bonus XP (5x normal XP for bosses)
    const bonusXP = this.config.xpReward * 5;
    killer.addXP(bonusXP);

    // Send notification to killer
    this.world.chatManager.sendPlayerMessage(
      killer.player,
      `§6✨ BOSS DEFEATED! +${bonusXP} Bonus XP!`,
      'FFD700'
    );

    // Broadcast to all players
    this.world.chatManager.sendBroadcastMessage(
      `🎉 ${killer.player.username} defeated ${this.config.name}!`,
      '00FF00'
    );

    // TODO: Add special boss loot drops in the future
    // For now, bosses use the same loot table as regular enemies

    console.log(`[BaseEnemyEntity] Boss rewards granted to ${killer.player.username}`);
  }

  /**
   * Show damage number to players
   */
  private showDamageNumber(damage: number, attacker?: GamePlayerEntity) {
    if (!this.world) return;

    // Determine damage type
    const damageType = this.isBoss ? 'boss' : 'normal';

    // TODO: Implement critical hits (10% chance for 2x damage)
    const isCritical = false;

    // Send to attacker if exists
    if (attacker?.player?.ui) {
      attacker.player.ui.sendData({
        type: 'damage_3d',
        damage: damage,
        x: this.position.x,
        y: this.position.y + 1, // Above enemy center
        z: this.position.z,
        damageType: damageType,
        isCritical: isCritical,
      });
    }

    // Also send to nearby players (spectators)
    const nearbyPlayers = this.world.entityManager.getAllPlayerEntities()
      .filter(pe => {
        const player = (pe as GamePlayerEntity).player;
        if (!player || player === attacker?.player) return false;

        const dx = pe.position.x - this.position.x;
        const dz = pe.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < 30; // Show to players within 30 blocks
      });

    for (const playerEntity of nearbyPlayers) {
      const player = (playerEntity as GamePlayerEntity).player;
      if (player?.ui) {
        player.ui.sendData({
          type: 'damage_3d',
          damage: damage,
          x: this.position.x,
          y: this.position.y + 1,
          z: this.position.z,
          damageType: damageType,
          isCritical: isCritical,
        });
      }
    }
  }
}

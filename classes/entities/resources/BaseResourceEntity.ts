import { Entity, EntityOptions, EntityEvent, RigidBodyType, Collider, ColliderShape } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';

export type BaseResourceEntityOptions = EntityOptions & {
  resourceId: string;
  resourceName: string;
  minYield: number;
  maxYield: number;
  respawnTime?: number; // in milliseconds
  harvestDuration?: number; // in milliseconds
}

/**
 * BaseResourceEntity
 *
 * Base class for all resource nodes (trees, rocks, herbs, etc.)
 * Players can interact with these to gather resources.
 */
export default class BaseResourceEntity extends Entity {
  public readonly resourceId: string;
  public readonly resourceName: string;
  public readonly minYield: number;
  public readonly maxYield: number;
  public readonly respawnTime: number;
  public readonly harvestDuration: number;

  private isDepleted: boolean = false;
  private currentHarvester?: GamePlayerEntity;
  private harvestTimeout?: NodeJS.Timeout;

  constructor(options: BaseResourceEntityOptions) {
    super({
      ...options,
      tag: 'resource', // Set primary tag in constructor
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          { shape: ColliderShape.BALL, radius: 0.8 },
        ],
      },
    });

    this.resourceId = options.resourceId;
    this.resourceName = options.resourceName;
    this.minYield = options.minYield;
    this.maxYield = options.maxYield;
    this.respawnTime = options.respawnTime ?? 60000; // Default 1 minute
    this.harvestDuration = options.harvestDuration ?? 2000; // Default 2 seconds

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      // Note: INTERACT event may not exist in SDK 0.10.46
      // Interaction will need to be handled differently (e.g., proximity detection)
      console.log(`[BaseResourceEntity] ${this.resourceName} spawned`);
    });

    // Setup despawn event listener
    this.on(EntityEvent.DESPAWN, () => {
      this.cancelHarvest();
    });
  }

  /**
   * Handle player interaction (public method to be called from external systems)
   */
  public onInteract(player: GamePlayerEntity) {
    if (!this.world) return;

    // Check if already depleted
    if (this.isDepleted) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§7This ${this.resourceName} has been depleted. Wait for it to respawn.`
      );
      return;
    }

    // Check if someone is already harvesting
    if (this.currentHarvester && this.currentHarvester !== player) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§7Someone is already gathering from this ${this.resourceName}.`
      );
      return;
    }

    // Start harvesting
    this.startHarvesting(player);
  }

  /**
   * Start harvesting process
   */
  private startHarvesting(player: GamePlayerEntity) {
    if (!this.world) return;

    this.currentHarvester = player;

    // Send harvest start message
    this.world.chatManager.sendPlayerMessage(
      player.player,
      `§eGathering ${this.resourceName}...`
    );

    // Set timeout for harvest completion
    this.harvestTimeout = setTimeout(() => {
      this.completeHarvest(player);
    }, this.harvestDuration);
  }

  /**
   * Complete the harvest and give items to player
   */
  private completeHarvest(player: GamePlayerEntity) {
    if (!this.world) return;

    // Calculate yield
    const yield_ = Math.floor(
      Math.random() * (this.maxYield - this.minYield + 1) + this.minYield
    );

    // Give items to player
    const success = player.addItemToInventory(this.resourceId, yield_);

    if (success) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§a+${yield_} ${this.resourceName}!`
      );

      // Mark as depleted
      this.deplete();
    } else {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cInventory full! Could not gather ${this.resourceName}.`
      );
    }

    this.currentHarvester = undefined;
  }

  /**
   * Mark resource as depleted and schedule respawn
   */
  private deplete() {
    this.isDepleted = true;

    // Visual feedback - make model semi-transparent
    this.setTintColor({ r: 128, g: 128, b: 128 });

    // Schedule respawn
    setTimeout(() => {
      this.respawn();
    }, this.respawnTime);
  }

  /**
   * Respawn the resource
   */
  private respawn() {
    if (!this.world) return;

    this.isDepleted = false;

    // Restore visual
    this.setTintColor({ r: 255, g: 255, b: 255 });

    // Broadcast respawn message to nearby players
    const allPlayerEntities = this.world.entityManager.getAllPlayerEntities();
    const nearbyPlayers = allPlayerEntities.filter(
      (playerEntity) => this.distanceTo(playerEntity.position) < 20
    );

    for (const playerEntity of nearbyPlayers) {
      const gamePlayer = playerEntity as GamePlayerEntity;
      this.world.chatManager.sendPlayerMessage(
        gamePlayer.player,
        `§7A ${this.resourceName} has respawned nearby.`
      );
    }
  }

  /**
   * Calculate distance to a position
   */
  private distanceTo(pos: { x: number; y: number; z: number }): number {
    const dx = this.position.x - pos.x;
    const dy = this.position.y - pos.y;
    const dz = this.position.z - pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Cancel ongoing harvest (e.g., if player moves away)
   */
  public cancelHarvest() {
    if (!this.world) return;

    if (this.harvestTimeout) {
      clearTimeout(this.harvestTimeout);
      this.harvestTimeout = undefined;
    }

    if (this.currentHarvester) {
      this.world.chatManager.sendPlayerMessage(
        this.currentHarvester.player,
        `§7Harvest cancelled.`
      );
      this.currentHarvester = undefined;
    }
  }
}

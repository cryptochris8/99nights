import { Entity, EntityOptions, EntityEvent, RigidBodyType, Collider, ColliderShape } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';

export interface BaseResourceEntityOptions extends EntityOptions {
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
      rigidBodyOptions: {
        type: RigidBodyType.STATIC,
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
  }

  async onSpawn() {
    await super.onSpawn();

    // Add tags after spawning
    this.addTag('resource');
    this.addTag(`resource_${this.resourceId}`);

    // Listen for entity interactions
    this.on(EntityEvent.INTERACT, this.onInteract.bind(this));
  }

  /**
   * Handle player interaction
   */
  private onInteract(payload: any) {
    const { interactor } = payload;

    // Check if interactor is a player
    if (!(interactor instanceof GamePlayerEntity)) {
      return;
    }

    // Check if already depleted
    if (this.isDepleted) {
      this.world.chatManager.sendPlayerMessage(
        interactor,
        `§7This ${this.resourceName} has been depleted. Wait for it to respawn.`
      );
      return;
    }

    // Check if someone is already harvesting
    if (this.currentHarvester && this.currentHarvester !== interactor) {
      this.world.chatManager.sendPlayerMessage(
        interactor,
        `§7Someone is already gathering from this ${this.resourceName}.`
      );
      return;
    }

    // Start harvesting
    this.startHarvesting(interactor);
  }

  /**
   * Start harvesting process
   */
  private startHarvesting(player: GamePlayerEntity) {
    this.currentHarvester = player;

    // Send harvest start message
    this.world.chatManager.sendPlayerMessage(
      player,
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
    // Calculate yield
    const yield_ = Math.floor(
      Math.random() * (this.maxYield - this.minYield + 1) + this.minYield
    );

    // Give items to player
    const success = player.addItemToInventory(this.resourceId, yield_);

    if (success) {
      this.world.chatManager.sendPlayerMessage(
        player,
        `§a+${yield_} ${this.resourceName}!`
      );

      // Mark as depleted
      this.deplete();
    } else {
      this.world.chatManager.sendPlayerMessage(
        player,
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
    this.setModelTintColor({ r: 0.5, g: 0.5, b: 0.5, a: 0.5 });

    // Schedule respawn
    setTimeout(() => {
      this.respawn();
    }, this.respawnTime);
  }

  /**
   * Respawn the resource
   */
  private respawn() {
    this.isDepleted = false;

    // Restore visual
    this.setModelTintColor({ r: 1, g: 1, b: 1, a: 1 });

    // Broadcast respawn message to nearby players
    const nearbyPlayers = this.world.entityManager
      .getEntitiesByClass(GamePlayerEntity as any)
      .filter((player) => this.distanceTo(player.position) < 20);

    for (const player of nearbyPlayers) {
      this.world.chatManager.sendPlayerMessage(
        player as GamePlayerEntity,
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
    if (this.harvestTimeout) {
      clearTimeout(this.harvestTimeout);
      this.harvestTimeout = undefined;
    }

    if (this.currentHarvester) {
      this.world.chatManager.sendPlayerMessage(
        this.currentHarvester,
        `§7Harvest cancelled.`
      );
      this.currentHarvester = undefined;
    }
  }

  async onDespawn() {
    // Clean up any ongoing harvests
    this.cancelHarvest();

    await super.onDespawn();
  }
}

import { Entity, type World } from 'hytopia';
import type { GameEvents } from '../../types/gameTypes';
import type GamePlayerEntity from './GamePlayerEntity';

/**
 * ResourceNode configuration
 */
export interface ResourceNodeConfig {
  type: 'tree' | 'rock' | 'herb';
  modelUri: string;
  modelScale?: number;
  itemId: string;
  health: number;
  harvestTime: number;
  respawnTime: number;
  itemQuantity: { min: number; max: number };
}

/**
 * ResourceNode - Harvestable resource entity
 *
 * Players can click on these to gather resources (wood, stone, herbs)
 * Each node has health and depletes after being harvested multiple times
 * Nodes respawn after a cooldown period
 */
export default class ResourceNode extends Entity {
  public config: ResourceNodeConfig;
  public health: number;
  public maxHealth: number;
  public isDepleted: boolean = false;
  public isBeingHarvested: boolean = false;
  private respawnTimer?: NodeJS.Timeout;

  // Track which player is currently harvesting (prevents multi-harvest)
  private currentHarvester?: GamePlayerEntity;
  private harvestStartTime: number = 0;

  // Store spawn position for respawning
  public spawnPosition: { x: number; y: number; z: number };

  constructor(config: ResourceNodeConfig, spawnPosition: { x: number; y: number; z: number }) {
    super({
      name: `${config.type}_node`,
      modelUri: config.modelUri,
      modelScale: config.modelScale || 1,
      modelLoopedAnimations: [],
    });

    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.spawnPosition = spawnPosition;

    console.log(`[ResourceNode] Created ${config.type} node`);
  }

  /**
   * Called when player clicks on this node to harvest
   */
  public startHarvest(player: GamePlayerEntity): boolean {
    if (this.isDepleted) {
      this.world?.chatManager.sendPlayerMessage(
        player.player,
        '§7This resource is depleted. It will respawn soon.',
        'AAAAAA'
      );
      return false;
    }

    if (this.isBeingHarvested) {
      this.world?.chatManager.sendPlayerMessage(
        player.player,
        '§7Someone is already harvesting this resource.',
        'AAAAAA'
      );
      return false;
    }

    // Start harvesting
    this.isBeingHarvested = true;
    this.currentHarvester = player;
    this.harvestStartTime = Date.now();

    // Show harvesting message
    const itemName = this.getItemName();
    this.world?.chatManager.sendPlayerMessage(
      player.player,
      `§eHarvesting ${itemName}...`,
      'FFFF00'
    );

    // Complete harvest after delay
    setTimeout(() => {
      this.completeHarvest();
    }, this.config.harvestTime);

    return true;
  }

  /**
   * Cancel ongoing harvest
   */
  public cancelHarvest() {
    if (this.isBeingHarvested && this.currentHarvester) {
      this.world?.chatManager.sendPlayerMessage(
        this.currentHarvester.player,
        '§cHarvest cancelled!',
        'FF0000'
      );
    }

    this.isBeingHarvested = false;
    this.currentHarvester = undefined;
    this.harvestStartTime = 0;
  }

  /**
   * Complete the harvest and give resources to player
   */
  private completeHarvest() {
    if (!this.isBeingHarvested || !this.currentHarvester || this.isDepleted) {
      return;
    }

    const player = this.currentHarvester;

    // Calculate resource amount
    const min = this.config.itemQuantity.min;
    const max = this.config.itemQuantity.max;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;

    // Add resources to player inventory
    const success = player.addItemToInventory(this.config.itemId, amount);

    if (success) {
      const itemName = this.getItemName();
      this.world?.chatManager.sendPlayerMessage(
        player.player,
        `§a+${amount} ${itemName}`,
        '00FF00'
      );

      // Reduce node health
      this.health--;

      // Emit harvest event (eventRouter not available in current SDK version)
      // this.world?.eventRouter?.emit('game:resource_harvested' as any, {
      //   node: this,
      //   player,
      //   itemId: this.config.itemId,
      //   amount,
      // });

      // Check if node is depleted
      if (this.health <= 0) {
        this.deplete();
      }
    } else {
      this.world?.chatManager.sendPlayerMessage(
        player.player,
        '§cInventory full!',
        'FF0000'
      );
    }

    // Reset harvesting state
    this.isBeingHarvested = false;
    this.currentHarvester = undefined;
    this.harvestStartTime = 0;
  }

  /**
   * Deplete the node (make it invisible and start respawn timer)
   */
  private deplete() {
    this.isDepleted = true;
    this.isBeingHarvested = false;
    this.currentHarvester = undefined;

    // Emit depleted event (eventRouter not available in current SDK version)
    // this.world?.eventRouter?.emit('game:resource_depleted' as any, {
    //   node: this,
    //   type: this.config.type,
    // });

    // Hide the model (make it invisible)
    this.setOpacity(0);

    // Start respawn timer
    this.respawnTimer = setTimeout(() => {
      this.respawn();
    }, this.config.respawnTime);

    console.log(`[ResourceNode] ${this.config.type} depleted, respawning in ${this.config.respawnTime / 1000}s`);
  }

  /**
   * Respawn the node
   */
  private respawn() {
    this.health = this.maxHealth;
    this.isDepleted = false;
    this.setOpacity(1);

    console.log(`[ResourceNode] ${this.config.type} respawned at (${this.position.x}, ${this.position.y}, ${this.position.z})`);
  }

  /**
   * Get human-readable item name
   */
  private getItemName(): string {
    const names: Record<string, string> = {
      wood: 'Wood',
      stone: 'Stone',
      herb_glowcap: 'Glowcap Mushroom',
      rune_dust: 'Rune Dust',
    };
    return names[this.config.itemId] || this.config.itemId;
  }

  /**
   * Cleanup on despawn
   */
  override async despawn() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
    }
    await super.despawn();
  }
}

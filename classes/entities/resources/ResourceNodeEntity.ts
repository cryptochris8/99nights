import { Entity, EntityEvent } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';
import AudioManager from '../../managers/AudioManager';

/**
 * ResourceNodeEntity
 *
 * Represents a gatherable resource in the world (tree, rock, herb)
 * Players can interact with it to gather resources
 */

export interface ResourceNodeConfig {
  type: 'tree' | 'rock' | 'herb';
  modelUri: string;
  modelScale?: number;
  itemId: string;
  itemName: string;
  minYield: number;
  maxYield: number;
  gatherTime: number; // milliseconds
  respawnTime?: number; // milliseconds, undefined = doesn't respawn
}

export default class ResourceNodeEntity extends Entity {
  private config: ResourceNodeConfig;
  private isBeingGathered: boolean = false;
  private isDepleted: boolean = false;
  private respawnTimeout?: NodeJS.Timeout;

  constructor(config: ResourceNodeConfig) {
    super({
      modelUri: config.modelUri,
      modelScale: config.modelScale || 1.0,
      name: config.itemName,
      rigidBodyOptions: {
        enabledRotations: { x: false, y: false, z: false },
        enabledTranslations: { x: false, y: false, z: false },
      },
    });

    this.config = config;
  }

  async onSpawn() {
    await super.onSpawn();

    // Add tags for identification (do this after spawn)
    this.addTag('resource');
    this.addTag(`resource_${this.config.type}`);
    this.addTag(this.config.itemId);

    // Listen for player interactions
    this.on(EntityEvent.INTERACT, ({ player }) => {
      this.onPlayerInteract(player);
    });

    console.log(`[ResourceNode] ${this.config.itemName} spawned at ${JSON.stringify(this.position)}`);
  }

  /**
   * Handle player interaction
   */
  private async onPlayerInteract(player: any) {
    if (this.isDepleted) {
      this.world.chatManager.sendPlayerMessage(
        player,
        `This ${this.config.itemName} has been depleted`,
        'FFAA00'
      );
      return;
    }

    if (this.isBeingGathered) {
      this.world.chatManager.sendPlayerMessage(
        player,
        `Someone is already gathering this ${this.config.itemName}`,
        'FFAA00'
      );
      return;
    }

    // Start gathering
    await this.startGathering(player);
  }

  /**
   * Start the gathering process
   */
  private async startGathering(player: any) {
    this.isBeingGathered = true;

    const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      this.isBeingGathered = false;
      return;
    }

    // Play gathering sound based on resource type
    const gatherSounds: Record<string, string> = {
      tree: 'audio/sfx/dig/dig-wood.mp3',
      rock: 'audio/sfx/dig/dig-stone.mp3',
      herb: 'audio/sfx/dig/dig-grass.mp3',
    };

    AudioManager.instance.playSFX(gatherSounds[this.config.type], 0.6, this.position);

    // Show gathering message
    this.world.chatManager.sendPlayerMessage(
      player,
      `Gathering ${this.config.itemName}...`,
      'FFFF00'
    );

    // Wait for gather time
    await new Promise(resolve => setTimeout(resolve, this.config.gatherTime));

    // Calculate yield
    const yield_amount = Math.floor(
      Math.random() * (this.config.maxYield - this.config.minYield + 1) + this.config.minYield
    );

    // Give items to player
    const added = playerEntity.addItemToInventory(this.config.itemId, yield_amount);

    if (added) {
      this.world.chatManager.sendPlayerMessage(
        player,
        `✅ Gathered ${yield_amount}x ${this.config.itemName}!`,
        '00FF00'
      );

      // Play success sound
      AudioManager.instance.playSFX('audio/sfx/ui/notification-1.mp3', 0.5);

      // Deplete the resource
      this.deplete();
    } else {
      this.world.chatManager.sendPlayerMessage(
        player,
        `❌ Inventory full!`,
        'FF0000'
      );
    }

    this.isBeingGathered = false;
  }

  /**
   * Deplete this resource node
   */
  private deplete() {
    this.isDepleted = true;

    // Visual feedback - make it semi-transparent or hide it
    this.setModelTintColor({ r: 0.5, g: 0.5, b: 0.5, a: 0.3 });

    // Schedule respawn if configured
    if (this.config.respawnTime) {
      this.respawnTimeout = setTimeout(() => {
        this.respawn();
      }, this.config.respawnTime);

      console.log(`[ResourceNode] ${this.config.itemName} depleted, will respawn in ${this.config.respawnTime}ms`);
    } else {
      // Permanent depletion - despawn after a delay
      setTimeout(() => {
        this.despawn();
      }, 5000);

      console.log(`[ResourceNode] ${this.config.itemName} permanently depleted`);
    }
  }

  /**
   * Respawn this resource node
   */
  private respawn() {
    this.isDepleted = false;
    this.isBeingGathered = false;

    // Restore visual
    this.setModelTintColor({ r: 1, g: 1, b: 1, a: 1 });

    // Play respawn sound
    AudioManager.instance.playSFX('audio/sfx/ui/notification-1.mp3', 0.3, this.position);

    console.log(`[ResourceNode] ${this.config.itemName} respawned`);
  }

  /**
   * Cleanup on despawn
   */
  async onDespawn() {
    if (this.respawnTimeout) {
      clearTimeout(this.respawnTimeout);
    }

    await super.onDespawn();
  }
}

import { Entity, EntityEvent, RigidBodyType } from 'hytopia';
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
      tag: 'resource', // Set primary tag in constructor
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
      },
    });

    this.config = config;

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      // Note: SDK 0.11.x doesn't have EntityEvent.INTERACT
      // Interaction must be implemented via raycasting in player controller
      // and calling the interact() method manually

      console.log(`[ResourceNode] ${this.config.itemName} spawned at ${JSON.stringify(this.position)}`);
    });

    // Setup despawn event listener
    this.on(EntityEvent.DESPAWN, () => {
      if (this.respawnTimeout) {
        clearTimeout(this.respawnTimeout);
      }
    });
  }

  /**
   * Handle player interaction
   * This method should be called from player's interaction code (raycast + interact())
   */
  public async interact(player: any) {
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

    // Send gathering start UI message
    player.ui.sendData({
      type: 'gathering_start',
      resourceName: this.config.itemName,
    });

    // Wait for gather time with progress updates
    const startTime = Date.now();
    const updateInterval = 100; // Update every 100ms
    const gatherPromise = new Promise<void>(resolve => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / this.config.gatherTime) * 100);

        // Send progress update
        player.ui.sendData({
          type: 'gathering_progress',
          resourceName: this.config.itemName,
          progress: progress,
        });

        if (elapsed >= this.config.gatherTime) {
          clearInterval(interval);
          resolve();
        }
      }, updateInterval);
    });

    await gatherPromise;

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

      // Send gathering complete UI message
      player.ui.sendData({
        type: 'gathering_complete',
      });

      // Deplete the resource
      this.deplete();
    } else {
      // Hide gathering progress on failure
      player.ui.sendData({
        type: 'gathering_complete',
      });

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

    // Visual feedback - make it semi-transparent
    this.setTintColor({ r: 128, g: 128, b: 128 });

    // Schedule respawn if configured
    if (this.config.respawnTime) {
      this.respawnTimeout = setTimeout(() => {
        this.respawn();
      }, this.config.respawnTime);

      console.log(`[ResourceNode] ${this.config.itemName} depleted, will respawn in ${this.config.respawnTime}ms`);
    } else {
      // Permanent depletion - despawn after a delay
      setTimeout(() => {
        if (this.isSpawned) {
          this.despawn();
        }
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
    this.setTintColor({ r: 255, g: 255, b: 255 });

    // Play respawn sound
    AudioManager.instance.playSFX('audio/sfx/ui/notification-1.mp3', 0.3, this.position);

    console.log(`[ResourceNode] ${this.config.itemName} respawned`);
  }
}

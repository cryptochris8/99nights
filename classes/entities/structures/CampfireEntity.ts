import { EntityEvent, Light } from 'hytopia';
import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * CampfireEntity
 *
 * A campfire that provides warmth and light.
 */
export default class CampfireEntity extends BaseStructureEntity {
  private lightId?: number;
  private healingInterval?: NodeJS.Timeout;
  private readonly HEAL_RADIUS = 8; // blocks
  private readonly HEAL_AMOUNT = 2; // HP per tick
  private readonly HEAL_TICK_MS = 3000; // Heal every 3 seconds

  constructor(options?: Partial<BaseStructureEntityOptions>) {
    super({
      structureId: 'campfire',
      structureName: 'Campfire',
      modelUri: 'environment/Essentials/campfire.gltf',
      modelScale: 1.0,
      modelLoopedAnimations: ['idle'],
      ...options,
    });

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      if (!this.world) return;

      // Add warm orange light for campfire
      const light = new Light({
        position: {
          x: this.position.x,
          y: this.position.y + 0.5,
          z: this.position.z,
        },
        color: { r: 255, g: 150, b: 50 }, // Warm orange
        intensity: 2.0,
        distance: 15,
      });

      light.spawn(this.world);
      this.lightId = light.id;

      // Start healing effect
      this.startHealingEffect();

      console.log(`[CampfireEntity] Spawned with light and healing aura at ${JSON.stringify(this.position)}`);
    });

    // Setup despawn event listener
    this.on(EntityEvent.DESPAWN, () => {
      // Clean up healing interval
      if (this.healingInterval) {
        clearInterval(this.healingInterval);
      }

      // Remove light when despawned
      if (this.lightId !== undefined && this.world) {
        const light = this.world.lightManager.getAllLights().find(l => l.id === this.lightId);
        if (light) {
          light.despawn();
        }
      }
    });
  }

  /**
   * Start healing nearby players over time
   */
  private startHealingEffect() {
    this.healingInterval = setInterval(() => {
      if (!this.world) return;

      const playerEntities = this.world.entityManager.getAllPlayerEntities();

      for (const playerEntity of playerEntities) {
        const dx = playerEntity.position.x - this.position.x;
        const dy = playerEntity.position.y - this.position.y;
        const dz = playerEntity.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance <= this.HEAL_RADIUS) {
          const gamePlayer = playerEntity as any;

          // Only heal if not at full health
          if (gamePlayer.health && gamePlayer.maxHealth && gamePlayer.health < gamePlayer.maxHealth) {
            gamePlayer.heal(this.HEAL_AMOUNT);

            // Send healing message to player
            if (gamePlayer.player && this.world.chatManager) {
              this.world.chatManager.sendPlayerMessage(
                gamePlayer.player,
                `§a+${this.HEAL_AMOUNT} HP from campfire warmth`,
              );
            }
          }
        }
      }
    }, this.HEAL_TICK_MS);
  }

  public activate() {
    // Activated via passive healing aura
  }

  public getHealRadius(): number {
    return this.HEAL_RADIUS;
  }

  public getHealAmount(): number {
    return this.HEAL_AMOUNT;
  }
}

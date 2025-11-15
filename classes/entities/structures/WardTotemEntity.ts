import { EntityEvent, Light } from 'hytopia';
import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * WardTotemEntity
 *
 * A protective totem that weakens nearby enemies.
 */
export default class WardTotemEntity extends BaseStructureEntity {
  private tier: number;
  private lightId?: number;
  private effectInterval?: NodeJS.Timeout;

  constructor(options?: Partial<BaseStructureEntityOptions> & { tier?: number }) {
    const tier = options?.tier || 1;

    super({
      structureId: `ward_totem_t${tier}`,
      structureName: `Ward Totem (Tier ${tier})`,
      modelUri: 'environment/Dungeon/stone-altar-1.gltf',
      modelScale: 0.8 + (tier * 0.2),
      modelLoopedAnimations: ['idle'],
      ...options,
    });

    this.tier = tier;

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      if (!this.world) return;

      // Apply purple magical glow tint
      this.setTintColor({ r: 178, g: 128, b: 255 });

      // Add mystical purple light
      const lightColors = [
        { r: 150, g: 50, b: 200 },  // Tier 1: Purple
        { r: 100, g: 100, b: 255 }, // Tier 2: Blue-purple
        { r: 200, g: 50, b: 255 },  // Tier 3: Bright purple
      ];

      const light = new Light({
        position: {
          x: this.position.x,
          y: this.position.y + 1.5,
          z: this.position.z,
        },
        color: lightColors[this.tier - 1] || lightColors[0],
        intensity: 1.0 + (this.tier * 0.5),
        distance: 8 + (this.tier * 4),
      });

      light.spawn(this.world);
      this.lightId = light.id;

      // Start ward effect
      this.startWardEffect();

      console.log(`[WardTotemEntity] Tier ${this.tier} spawned with ward effect`);
    });

    // Setup despawn event listener
    this.on(EntityEvent.DESPAWN, () => {
      // Clean up effect interval
      if (this.effectInterval) {
        clearInterval(this.effectInterval);
      }

      // Remove light
      if (this.lightId !== undefined && this.world) {
        const light = this.world.lightManager.getAllLights().find(l => l.id === this.lightId);
        if (light) {
          light.despawn();
        }
      }
    });
  }

  /**
   * Apply ward debuff to nearby enemies
   */
  private startWardEffect() {
    const radius = 10 + (this.tier * 5); // 15, 20, 25 blocks
    const damageReduction = 0.1 + (this.tier * 0.1); // 20%, 30%, 40%

    this.effectInterval = setInterval(() => {
      if (!this.world) return;

      const enemies = this.world.entityManager.getEntitiesByTag('enemy');

      for (const enemy of enemies) {
        const dx = enemy.position.x - this.position.x;
        const dy = enemy.position.y - this.position.y;
        const dz = enemy.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance <= radius) {
          // Apply ward debuff
          const enemyEntity = enemy as any;
          if (enemyEntity.config && !enemyEntity.wardDebuffApplied) {
            enemyEntity.originalDamage = enemyEntity.config.damage;
            enemyEntity.config.damage = Math.floor(enemyEntity.config.damage * (1 - damageReduction));
            enemyEntity.wardDebuffApplied = true;
            enemy.setTintColor({ r: 204, g: 178, b: 255 });
          }
        } else {
          // Remove debuff if outside radius
          const enemyEntity = enemy as any;
          if (enemyEntity.wardDebuffApplied) {
            enemyEntity.config.damage = enemyEntity.originalDamage || enemyEntity.config.damage;
            enemyEntity.wardDebuffApplied = false;
            enemy.setTintColor(enemyEntity.config.modelTint || { r: 255, g: 255, b: 255 });
          }
        }
      }
    }, 1000);
  }

  public activate() {
    // Activated via passive aura effect
  }

  public getTier(): number {
    return this.tier;
  }

  public getRadius(): number {
    return 10 + (this.tier * 5);
  }

  public getDamageReduction(): number {
    return (0.1 + (this.tier * 0.1)) * 100;
  }
}

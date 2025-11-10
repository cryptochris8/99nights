import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * WardTotemEntity
 *
 * A protective totem that weakens nearby enemies.
 */
export default class WardTotemEntity extends BaseStructureEntity {
  private tier: number;

  constructor(options?: Partial<BaseStructureEntityOptions> & { tier?: number }) {
    const tier = options?.tier || 1;

    super({
      structureId: `ward_totem_t${tier}`,
      structureName: `Ward Totem (Tier ${tier})`,
      name: `Ward Totem T${tier}`,
      modelUri: 'models/environment/totem.gltf',
      modelScale: 0.7 + (tier * 0.1),
      modelLoopedAnimations: ['idle'],
      modelTintColor: { r: 0.5, g: 0.8, b: 1.0, a: 1.0 }, // Blue magical glow
      ...options,
    });

    this.tier = tier;
  }

  async onSpawn() {
    await super.onSpawn();

    // TODO Phase 5: Add ward aura effect
    // TODO Phase 5: Weaken enemies in radius
    // TODO Phase 5: Add particle effects (magical glow)
  }

  public activate() {
    // Future: Debuff enemies in range, provide protection
  }

  public getTier(): number {
    return this.tier;
  }
}

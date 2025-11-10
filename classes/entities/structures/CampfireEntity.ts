import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * CampfireEntity
 *
 * A campfire that provides warmth and light.
 */
export default class CampfireEntity extends BaseStructureEntity {
  constructor(options?: Partial<BaseStructureEntityOptions>) {
    super({
      structureId: 'campfire',
      structureName: 'Campfire',
      name: 'Campfire',
      modelUri: 'models/environment/campfire.gltf',
      modelScale: 0.8,
      modelLoopedAnimations: ['idle'],
      ...options,
    });
  }

  async onSpawn() {
    await super.onSpawn();

    // TODO Phase 5: Add particle effects (smoke, fire)
    // TODO Phase 5: Add healing aura for nearby players
  }

  public activate() {
    // Future: Buff nearby players, cook food, etc.
  }
}

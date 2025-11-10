import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * TorchEntity
 *
 * A torch that provides light in the darkness.
 */
export default class TorchEntity extends BaseStructureEntity {
  constructor(options?: Partial<BaseStructureEntityOptions>) {
    super({
      structureId: 'torch',
      structureName: 'Torch',
      name: 'Torch',
      modelUri: 'models/environment/torch.gltf',
      modelScale: 0.6,
      modelLoopedAnimations: ['idle'],
      ...options,
    });
  }

  async onSpawn() {
    await super.onSpawn();

    // TODO Phase 5: Add light source
    // TODO Phase 5: Add particle effects (flame, smoke)
  }

  public activate() {
    // Future: Emit light, repel weak enemies, etc.
  }
}

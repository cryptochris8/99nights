import { EntityEvent, Light } from 'hytopia';
import BaseStructureEntity, { BaseStructureEntityOptions } from './BaseStructureEntity';

/**
 * TorchEntity
 *
 * A torch that provides light in the darkness.
 */
export default class TorchEntity extends BaseStructureEntity {
  private lightId?: number;

  constructor(options?: Partial<BaseStructureEntityOptions>) {
    super({
      structureId: 'torch',
      structureName: 'Torch',
      modelUri: 'environment/Dungeon/dungeon-torch-1.gltf',
      modelScale: 0.8,
      modelLoopedAnimations: ['idle'],
      ...options,
    });

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      if (!this.world) return;

      // Add warm yellow light for torch
      const light = new Light({
        position: {
          x: this.position.x,
          y: this.position.y + 1.0,
          z: this.position.z,
        },
        color: { r: 255, g: 200, b: 100 }, // Warm yellow
        intensity: 1.5,
        distance: 10,
      });

      light.spawn(this.world);
      this.lightId = light.id;
      console.log(`[TorchEntity] Spawned with light at ${JSON.stringify(this.position)}`);
    });

    // Setup despawn event listener
    this.on(EntityEvent.DESPAWN, () => {
      // Remove light when despawned
      if (this.lightId !== undefined && this.world) {
        const light = this.world.lightManager.getAllLights().find(l => l.id === this.lightId);
        if (light) {
          light.despawn();
        }
      }
    });
  }

  public activate() {
    // Future: Emit light, repel weak enemies, etc.
  }
}

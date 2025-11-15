import BaseResourceEntity, { BaseResourceEntityOptions } from './BaseResourceEntity';

/**
 * HerbEntity
 *
 * A glowing mushroom herb that players can gather.
 */
import { EntityEvent } from 'hytopia';

export default class HerbEntity extends BaseResourceEntity {
  constructor(options?: Partial<BaseResourceEntityOptions>) {
    super({
      name: 'Glowcap Mushroom',
      modelUri: 'models/environment/mushroom_1.gltf', // Using Hytopia default assets
      modelScale: 0.8,
      resourceId: 'herb_glowcap',
      resourceName: 'Glowcap Mushroom',
      minYield: 1,
      maxYield: 3,
      respawnTime: 60000, // 1 minute
      harvestDuration: 1500, // 1.5 seconds to gather
      ...options,
    });

    // Apply tint color after spawn (modelTintColor not in constructor options)
    this.on(EntityEvent.SPAWN, () => {
      this.setTintColor({ r: 153, g: 255, b: 204 }); // Glowing teal color (RGB 0-255)
    });
  }
}

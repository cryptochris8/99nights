import BaseResourceEntity, { BaseResourceEntityOptions } from './BaseResourceEntity';

/**
 * HerbEntity
 *
 * A glowing mushroom herb that players can gather.
 */
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
      modelTintColor: { r: 0.6, g: 1.0, b: 0.8, a: 1.0 }, // Glowing teal color
      ...options,
    });
  }
}

import BaseResourceEntity, { BaseResourceEntityOptions } from './BaseResourceEntity';

/**
 * RockEntity
 *
 * A rock resource node that players can mine for stone.
 */
export default class RockEntity extends BaseResourceEntity {
  constructor(options?: Partial<BaseResourceEntityOptions>) {
    super({
      name: 'Rock',
      modelUri: 'models/environment/rock_2.gltf', // Using Hytopia default assets
      modelScale: 1.2,
      resourceId: 'stone',
      resourceName: 'Stone',
      minYield: 2,
      maxYield: 5,
      respawnTime: 75000, // 1.25 minutes
      harvestDuration: 2500, // 2.5 seconds to mine
      ...options,
    });
  }
}

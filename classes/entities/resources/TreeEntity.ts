import BaseResourceEntity, { BaseResourceEntityOptions } from './BaseResourceEntity';

/**
 * TreeEntity
 *
 * A tree resource node that players can harvest for wood.
 */
export default class TreeEntity extends BaseResourceEntity {
  constructor(options?: Partial<BaseResourceEntityOptions>) {
    super({
      name: 'Tree',
      modelUri: 'models/environment/tree_1.gltf', // Using Hytopia default assets
      modelScale: 1.5,
      resourceId: 'wood',
      resourceName: 'Wood',
      minYield: 3,
      maxYield: 7,
      respawnTime: 90000, // 1.5 minutes
      harvestDuration: 3000, // 3 seconds to chop
      ...options,
    });
  }
}

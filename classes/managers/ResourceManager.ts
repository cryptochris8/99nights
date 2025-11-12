import { World } from 'hytopia';
import ResourceNodeEntity, { ResourceNodeConfig } from '../entities/resources/ResourceNodeEntity';

/**
 * ResourceManager
 *
 * Manages spawning and tracking of resource nodes (trees, rocks, herbs).
 * Uses singleton pattern for global access.
 */
export default class ResourceManager {
  private static _instance: ResourceManager;
  private world?: World;
  private resourceEntities: Set<ResourceNodeEntity> = new Set();

  private constructor() {}

  public static get instance(): ResourceManager {
    if (!ResourceManager._instance) {
      ResourceManager._instance = new ResourceManager();
    }
    return ResourceManager._instance;
  }

  /**
   * Initialize the resource manager with the world
   */
  public initialize(world: World) {
    this.world = world;
    console.log('[ResourceManager] Initialized');
  }

  /**
   * Spawn resource nodes around the spawn area
   */
  public spawnInitialResources() {
    if (!this.world) {
      console.error('[ResourceManager] Cannot spawn resources: world not initialized');
      return;
    }

    console.log('[ResourceManager] Spawning initial resources...');

    // Spawn trees in a scattered pattern
    this.spawnTrees(15); // 15 trees

    // Spawn rocks
    this.spawnRocks(10); // 10 rocks

    // Spawn herbs (glowcap mushrooms)
    this.spawnHerbs(12); // 12 herbs

    console.log(`[ResourceManager] Spawned ${this.resourceEntities.size} total resources`);
  }

  /**
   * Spawn trees around the map
   */
  private spawnTrees(count: number) {
    if (!this.world) return;

    const treeModels = [
      'models/environment/Pine%20Forest/pine-tree-medium.gltf',
      'models/environment/Pine%20Forest/pine-tree-small.gltf',
      'models/environment/Plains/oak-tree-medium.gltf',
      'models/environment/Plains/oak-tree-small.gltf',
    ];

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 20-60 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const config: ResourceNodeConfig = {
        type: 'tree',
        modelUri: treeModels[Math.floor(Math.random() * treeModels.length)],
        modelScale: 0.8 + Math.random() * 0.4, // Random scale 0.8-1.2
        itemId: 'wood',
        itemName: 'Tree',
        minYield: 3,
        maxYield: 6,
        gatherTime: 2000, // 2 seconds
        respawnTime: 120000, // 2 minutes
      };

      const tree = new ResourceNodeEntity(config);
      tree.spawn(this.world, { x, y, z });
      this.resourceEntities.add(tree);
    }

    console.log(`[ResourceManager] Spawned ${count} trees`);
  }

  /**
   * Spawn rocks around the map
   */
  private spawnRocks(count: number) {
    if (!this.world) return;

    const rockModels = [
      'models/environment/Desert/rock-1.gltf',
      'models/environment/Desert/rock-2.gltf',
      'models/environment/Desert/rock-3.gltf',
    ];

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 15-50 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const config: ResourceNodeConfig = {
        type: 'rock',
        modelUri: rockModels[Math.floor(Math.random() * rockModels.length)],
        modelScale: 0.6 + Math.random() * 0.3, // Random scale 0.6-0.9
        itemId: 'stone',
        itemName: 'Rock',
        minYield: 2,
        maxYield: 5,
        gatherTime: 2500, // 2.5 seconds
        respawnTime: 180000, // 3 minutes
      };

      const rock = new ResourceNodeEntity(config);
      rock.spawn(this.world, { x, y, z });
      this.resourceEntities.add(rock);
    }

    console.log(`[ResourceManager] Spawned ${count} rocks`);
  }

  /**
   * Spawn herbs around the map
   */
  private spawnHerbs(count: number) {
    if (!this.world) return;

    const herbModels = [
      'models/environment/Plains/mushroom-purple-multiple.gltf',
      'models/environment/Plains/mushroom-purple-single.gltf',
      'models/environment/Pine%20Forest/redcap-mushroom-group.gltf',
    ];

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 10-40 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const config: ResourceNodeConfig = {
        type: 'herb',
        modelUri: herbModels[Math.floor(Math.random() * herbModels.length)],
        modelScale: 0.5 + Math.random() * 0.3, // Random scale 0.5-0.8
        itemId: 'herb_glowcap',
        itemName: 'Glowcap Mushroom',
        minYield: 1,
        maxYield: 3,
        gatherTime: 1500, // 1.5 seconds
        respawnTime: 90000, // 1.5 minutes
      };

      const herb = new ResourceNodeEntity(config);
      herb.spawn(this.world, { x, y, z });
      this.resourceEntities.add(herb);
    }

    console.log(`[ResourceManager] Spawned ${count} herbs`);
  }

  /**
   * Spawn a specific resource at a location
   */
  public spawnResourceAt(
    type: 'tree' | 'rock' | 'herb',
    position: { x: number; y: number; z: number }
  ) {
    if (!this.world) {
      console.error('[ResourceManager] Cannot spawn resource: world not initialized');
      return;
    }

    let config: ResourceNodeConfig;

    switch (type) {
      case 'tree':
        config = {
          type: 'tree',
          modelUri: 'models/environment/Plains/oak-tree-medium.gltf',
          itemId: 'wood',
          itemName: 'Tree',
          minYield: 3,
          maxYield: 6,
          gatherTime: 2000,
          respawnTime: 120000,
        };
        break;
      case 'rock':
        config = {
          type: 'rock',
          modelUri: 'models/environment/Desert/rock-2.gltf',
          itemId: 'stone',
          itemName: 'Rock',
          minYield: 2,
          maxYield: 5,
          gatherTime: 2500,
          respawnTime: 180000,
        };
        break;
      case 'herb':
        config = {
          type: 'herb',
          modelUri: 'models/environment/Plains/mushroom-purple-multiple.gltf',
          itemId: 'herb_glowcap',
          itemName: 'Glowcap Mushroom',
          minYield: 1,
          maxYield: 3,
          gatherTime: 1500,
          respawnTime: 90000,
        };
        break;
      default:
        console.error(`[ResourceManager] Unknown resource type: ${type}`);
        return;
    }

    const resource = new ResourceNodeEntity(config);
    resource.spawn(this.world, position);
    this.resourceEntities.add(resource);

    console.log(`[ResourceManager] Spawned ${type} at (${position.x}, ${position.y}, ${position.z})`);
  }

  /**
   * Get count of active resources by type
   */
  public getResourceCount(type?: 'tree' | 'rock' | 'herb'): number {
    if (!type) {
      return this.resourceEntities.size;
    }

    let count = 0;
    for (const resource of this.resourceEntities) {
      if (resource.hasTag(`resource_${type}`)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all resources (for cleanup)
   */
  public clearAllResources() {
    for (const resource of this.resourceEntities) {
      if (resource.isSpawned) {
        resource.despawn();
      }
    }

    this.resourceEntities.clear();
    console.log('[ResourceManager] Cleared all resources');
  }
}

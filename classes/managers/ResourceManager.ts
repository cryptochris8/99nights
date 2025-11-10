import { World } from 'hytopia';
import TreeEntity from '../entities/resources/TreeEntity';
import RockEntity from '../entities/resources/RockEntity';
import HerbEntity from '../entities/resources/HerbEntity';

/**
 * ResourceManager
 *
 * Manages spawning and tracking of resource nodes (trees, rocks, herbs).
 * Uses singleton pattern for global access.
 */
export default class ResourceManager {
  private static _instance: ResourceManager;
  private world?: World;
  private resourceEntities: Set<TreeEntity | RockEntity | HerbEntity> = new Set();

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

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 20-60 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const tree = new TreeEntity();
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

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 15-50 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const rock = new RockEntity();
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

    for (let i = 0; i < count; i++) {
      // Random position in a ring around spawn (radius 10-40 blocks)
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10; // Adjust based on your map height

      const herb = new HerbEntity();
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

    let resource: TreeEntity | RockEntity | HerbEntity;

    switch (type) {
      case 'tree':
        resource = new TreeEntity();
        break;
      case 'rock':
        resource = new RockEntity();
        break;
      case 'herb':
        resource = new HerbEntity();
        break;
      default:
        console.error(`[ResourceManager] Unknown resource type: ${type}`);
        return;
    }

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
      if (type === 'tree' && resource instanceof TreeEntity) count++;
      if (type === 'rock' && resource instanceof RockEntity) count++;
      if (type === 'herb' && resource instanceof HerbEntity) count++;
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

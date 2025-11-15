import { Entity, EntityOptions, EntityEvent, RigidBodyType, Collider, ColliderShape } from 'hytopia';

export type BaseStructureEntityOptions = EntityOptions & {
  structureId: string;
  structureName: string;
  placedBy?: string; // Player ID who placed it
}

/**
 * BaseStructureEntity
 *
 * Base class for all placeable structures (campfires, torches, totems, etc.)
 */
export default class BaseStructureEntity extends Entity {
  public readonly structureId: string;
  public readonly structureName: string;
  public readonly placedBy?: string;

  constructor(options: BaseStructureEntityOptions) {
    super({
      ...options,
      tag: 'structure', // Set primary tag in constructor
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          { shape: ColliderShape.BLOCK, halfExtents: { x: 0.5, y: 1.0, z: 0.5 } },
        ],
      },
    });

    this.structureId = options.structureId;
    this.structureName = options.structureName;
    this.placedBy = options.placedBy;

    // Setup spawn event listener
    this.on(EntityEvent.SPAWN, () => {
      console.log(`[BaseStructureEntity] ${this.structureName} placed at ${JSON.stringify(this.position)}`);
    });
  }

  /**
   * Override in subclasses for specific behavior
   */
  public activate() {
    // Override in subclasses (e.g., light torches, buff from totems)
  }
}

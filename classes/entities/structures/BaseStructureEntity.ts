import { Entity, EntityOptions, RigidBodyType, Collider, ColliderShape } from 'hytopia';

export interface BaseStructureEntityOptions extends EntityOptions {
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
      rigidBodyOptions: {
        type: RigidBodyType.STATIC,
        colliders: [
          Collider.box(0.5, 1.0, 0.5),
        ],
      },
    });

    this.structureId = options.structureId;
    this.structureName = options.structureName;
    this.placedBy = options.placedBy;

    // Add tags for identification
    this.addTag('structure');
    this.addTag(`structure_${this.structureId}`);
  }

  async onSpawn() {
    await super.onSpawn();
    console.log(`[BaseStructureEntity] ${this.structureName} placed at ${JSON.stringify(this.position)}`);
  }

  /**
   * Override in subclasses for specific behavior
   */
  public activate() {
    // Override in subclasses (e.g., light torches, buff from totems)
  }
}

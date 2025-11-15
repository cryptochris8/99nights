import { BaseEntityController, Entity, Vector3Like, Quaternion } from 'hytopia';
import type BaseEnemyEntity from '../entities/enemies/BaseEnemyEntity';
import type GamePlayerEntity from '../entities/GamePlayerEntity';

/**
 * EnemyController
 *
 * AI controller for enemy entities.
 * Handles chase behavior, attacking, and movement toward players.
 */
export default class EnemyController extends BaseEntityController {
  // BaseEntityController provides this.entity, but TypeScript needs it declared
  public entity!: Entity;

  private enemy: BaseEnemyEntity;
  private targetPlayer: GamePlayerEntity | undefined;
  private updateInterval: NodeJS.Timeout | undefined;
  private readonly UPDATE_RATE_MS = 500; // Update AI every 0.5 seconds
  private readonly DETECTION_RANGE = 50; // Blocks
  private readonly ATTACK_RANGE = 2; // Blocks

  constructor(enemy: BaseEnemyEntity) {
    super();
    this.enemy = enemy;
  }

  /**
   * Called when controller is attached to entity
   */
  attach(entity: Entity) {
    super.attach(entity);

    // Start AI loop
    this.updateInterval = setInterval(() => {
      this.updateAI();
    }, this.UPDATE_RATE_MS);

    console.log(`[EnemyController] Attached to ${this.enemy.config.name}`);
  }

  /**
   * Called when controller is detached from entity
   */
  detach(entity: Entity) {
    super.detach(entity);

    // Stop AI loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Main AI update loop
   */
  private updateAI() {
    if (!this.entity || !this.entity.world || this.enemy.isDead) return;

    // Find nearest player
    this.targetPlayer = this.findNearestPlayer();

    if (this.targetPlayer) {
      const distance = this.distanceTo(this.targetPlayer.position);

      // Move toward player if not in attack range
      if (distance > this.ATTACK_RANGE) {
        this.moveTowardPlayer();
      }
    }
  }

  /**
   * Find the nearest player within detection range
   */
  private findNearestPlayer(): GamePlayerEntity | undefined {
    if (!this.entity || !this.entity.world) return undefined;

    const players = this.entity.world.entityManager.getAllPlayerEntities();
    if (players.length === 0) return undefined;

    let nearest: GamePlayerEntity | undefined;
    let nearestDist = Infinity;

    for (const player of players) {
      const gamePlayer = player as GamePlayerEntity;
      const dist = this.distanceTo(gamePlayer.position);

      // Only consider players within detection range
      if (dist <= this.DETECTION_RANGE && dist < nearestDist) {
        nearestDist = dist;
        nearest = gamePlayer;
      }
    }

    return nearest;
  }

  /**
   * Move toward the target player
   */
  private moveTowardPlayer() {
    if (!this.targetPlayer || !this.entity) return;

    const targetPos = this.targetPlayer.position;
    const currentPos = this.entity.position;

    // Calculate direction vector
    const dx = targetPos.x - currentPos.x;
    const dz = targetPos.z - currentPos.z;

    // Calculate distance (2D, ignore Y)
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance === 0) return;

    // Normalize direction
    const dirX = dx / distance;
    const dirZ = dz / distance;

    // Calculate velocity based on speed
    const speed = this.enemy.config.speed;
    const velocity: Vector3Like = {
      x: dirX * speed,
      y: this.entity.linearVelocity.y, // Preserve vertical velocity (gravity)
      z: dirZ * speed,
    };

    // Apply velocity
    this.entity.setLinearVelocity(velocity);

    // Rotate to face target
    const angle = Math.atan2(dirZ, dirX);
    const yawDegrees = (angle - Math.PI / 2) * (180 / Math.PI); // Convert to degrees and adjust for model orientation
    this.entity.setRotation(Quaternion.fromEuler(0, yawDegrees, 0));
  }

  /**
   * Calculate distance to a position
   */
  private distanceTo(pos: Vector3Like): number {
    if (!this.entity) return Infinity;

    const dx = this.entity.position.x - pos.x;
    const dy = this.entity.position.y - pos.y;
    const dz = this.entity.position.z - pos.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

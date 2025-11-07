import { World } from 'hytopia';
import { InventoryItem } from '../../types/gameTypes';
import GamePlayerEntity from '../entities/GamePlayerEntity';
import GameManager from './GameManager';

/**
 * InventoryManager
 *
 * Singleton managing inventory operations and UI helpers.
 * Provides utility functions for inventory management across all players.
 */
export default class InventoryManager {
  private static _instance: InventoryManager;
  private world!: World;
  private initialized: boolean = false;

  private constructor() {}

  public static get instance(): InventoryManager {
    if (!InventoryManager._instance) {
      InventoryManager._instance = new InventoryManager();
    }
    return InventoryManager._instance;
  }

  /**
   * Initialize the inventory manager
   */
  public initialize(world: World) {
    if (this.initialized) {
      console.warn('[InventoryManager] Already initialized');
      return;
    }

    this.world = world;
    this.initialized = true;

    console.log('[InventoryManager] Initialized');
  }

  /**
   * Get formatted inventory string for display
   */
  public getInventoryString(player: GamePlayerEntity): string {
    if (player.inventory.length === 0) {
      return '§7Your inventory is empty.';
    }

    const gameManager = GameManager.instance;
    const lines: string[] = ['§e━━━ Inventory ━━━'];

    // Group by item ID and sum quantities
    const itemGroups = new Map<string, number>();
    for (const slot of player.inventory) {
      const current = itemGroups.get(slot.itemId) || 0;
      itemGroups.set(slot.itemId, current + slot.quantity);
    }

    // Format each item
    for (const [itemId, quantity] of itemGroups.entries()) {
      const itemConfig = gameManager.itemsConfig[itemId];
      const name = itemConfig?.name || itemId;
      const typeColor = this.getTypeColor(itemConfig?.type || 'resource');

      lines.push(`${typeColor}${name} §7x${quantity}`);
    }

    lines.push(`§7Slots: §f${player.inventory.length}§7/§f24`);

    return lines.join('\n');
  }

  /**
   * Get color code for item type
   */
  private getTypeColor(type: string): string {
    switch (type) {
      case 'resource':
        return '§a';
      case 'tool':
        return '§b';
      case 'weapon':
        return '§c';
      case 'rune':
        return '§d';
      case 'consumable':
        return '§e';
      default:
        return '§f';
    }
  }

  /**
   * Transfer items between players
   */
  public transferItems(
    fromPlayer: GamePlayerEntity,
    toPlayer: GamePlayerEntity,
    itemId: string,
    quantity: number,
  ): boolean {
    // Check if from player has items
    if (!fromPlayer.hasItems(itemId, quantity)) {
      this.world.chatManager.sendPlayerMessage(
        fromPlayer,
        `§cYou don't have enough ${itemId}.`,
      );
      return false;
    }

    // Check if to player has space
    const gameManager = GameManager.instance;
    const itemConfig = gameManager.itemsConfig[itemId];
    if (!itemConfig) {
      console.error(`[InventoryManager] Unknown item: ${itemId}`);
      return false;
    }

    // Try to add to target player
    const added = toPlayer.addItemToInventory(itemId, quantity);
    if (!added) {
      this.world.chatManager.sendPlayerMessage(
        fromPlayer,
        `§c${toPlayer.name}'s inventory is full!`,
      );
      return false;
    }

    // Remove from source player
    fromPlayer.removeItemFromInventory(itemId, quantity);

    // Send messages
    const itemName = itemConfig.name;
    this.world.chatManager.sendPlayerMessage(
      fromPlayer,
      `§aGave ${quantity}x ${itemName} to ${toPlayer.name}.`,
    );
    this.world.chatManager.sendPlayerMessage(
      toPlayer,
      `§aReceived ${quantity}x ${itemName} from ${fromPlayer.name}.`,
    );

    return true;
  }

  /**
   * Drop items from player inventory
   */
  public dropItems(
    player: GamePlayerEntity,
    itemId: string,
    quantity: number,
  ): boolean {
    if (!player.hasItems(itemId, quantity)) {
      this.world.chatManager.sendPlayerMessage(
        player,
        `§cYou don't have enough ${itemId}.`,
      );
      return false;
    }

    // Remove from inventory
    player.removeItemFromInventory(itemId, quantity);

    const gameManager = GameManager.instance;
    const itemConfig = gameManager.itemsConfig[itemId];
    const itemName = itemConfig?.name || itemId;

    this.world.chatManager.sendPlayerMessage(
      player,
      `§7Dropped ${quantity}x ${itemName}.`,
    );

    // TODO: Spawn item entity in world at player position
    // Will implement in Phase 4 with entity spawning system

    return true;
  }

  /**
   * Sort player inventory by item type and name
   */
  public sortInventory(player: GamePlayerEntity) {
    const gameManager = GameManager.instance;

    // Sort by type priority, then by item ID
    const typePriority: { [key: string]: number } = {
      weapon: 0,
      tool: 1,
      rune: 2,
      consumable: 3,
      resource: 4,
    };

    player.inventory.sort((a, b) => {
      const aConfig = gameManager.itemsConfig[a.itemId];
      const bConfig = gameManager.itemsConfig[b.itemId];

      const aType = aConfig?.type || 'resource';
      const bType = bConfig?.type || 'resource';

      const aPriority = typePriority[aType] ?? 999;
      const bPriority = typePriority[bType] ?? 999;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.itemId.localeCompare(b.itemId);
    });

    this.world.chatManager.sendPlayerMessage(player, `§aInventory sorted.`);
  }

  /**
   * Stack similar items in inventory
   */
  public stackInventory(player: GamePlayerEntity) {
    const gameManager = GameManager.instance;
    const consolidated = new Map<string, number>();

    // Sum all quantities
    for (const slot of player.inventory) {
      const current = consolidated.get(slot.itemId) || 0;
      consolidated.set(slot.itemId, current + slot.quantity);
    }

    // Clear inventory
    player.inventory = [];

    // Re-add with proper stacking
    for (const [itemId, quantity] of consolidated.entries()) {
      player.addItemToInventory(itemId, quantity);
    }

    this.world.chatManager.sendPlayerMessage(player, `§aInventory stacked.`);
  }

  /**
   * Get total inventory weight (for future weight system)
   */
  public getInventoryWeight(player: GamePlayerEntity): number {
    const gameManager = GameManager.instance;
    let totalWeight = 0;

    for (const slot of player.inventory) {
      const itemConfig = gameManager.itemsConfig[slot.itemId];
      const weight = (itemConfig as any)?.weight || 1;
      totalWeight += weight * slot.quantity;
    }

    return totalWeight;
  }

  /**
   * Check if player can afford recipe inputs
   */
  public hasRecipeInputs(player: GamePlayerEntity, recipeId: string): boolean {
    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    if (!recipe) {
      return false;
    }

    for (const input of recipe.inputs) {
      if (!player.hasItems(input.itemId, input.quantity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get missing items for a recipe
   */
  public getMissingRecipeInputs(
    player: GamePlayerEntity,
    recipeId: string,
  ): string[] {
    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    if (!recipe) {
      return ['Unknown recipe'];
    }

    const missing: string[] = [];

    for (const input of recipe.inputs) {
      const has = player.getItemCount(input.itemId);
      const needs = input.quantity;

      if (has < needs) {
        const itemConfig = gameManager.itemsConfig[input.itemId];
        const itemName = itemConfig?.name || input.itemId;
        missing.push(`${itemName} (${has}/${needs})`);
      }
    }

    return missing;
  }

  /**
   * Clear player inventory (admin/debug command)
   */
  public clearInventory(player: GamePlayerEntity) {
    player.inventory = [];
    this.world.chatManager.sendPlayerMessage(
      player,
      `§cInventory cleared.`,
    );
  }
}

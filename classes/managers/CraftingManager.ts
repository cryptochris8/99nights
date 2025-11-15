import { World } from 'hytopia';
import { GameEvents } from '../../types/gameTypes';
import GamePlayerEntity from '../entities/GamePlayerEntity';
import GameManager from './GameManager';
import InventoryManager from './InventoryManager';

/**
 * Active crafting job
 */
interface CraftingJob {
  playerId: string;
  recipeId: string;
  startTime: number;
  duration: number;
  timeoutId: NodeJS.Timeout;
}

/**
 * CraftingManager
 *
 * Singleton managing crafting operations with timers.
 * Validates recipes, consumes inputs, and produces outputs after delay.
 */
export default class CraftingManager {
  private static _instance: CraftingManager;
  private world!: World;
  private initialized: boolean = false;

  // Active crafting jobs
  private activeCrafts: Map<string, CraftingJob> = new Map();

  private constructor() {}

  public static get instance(): CraftingManager {
    if (!CraftingManager._instance) {
      CraftingManager._instance = new CraftingManager();
    }
    return CraftingManager._instance;
  }

  /**
   * Initialize the crafting manager
   */
  public initialize(world: World) {
    if (this.initialized) {
      console.warn('[CraftingManager] Already initialized');
      return;
    }

    this.world = world;
    this.initialized = true;

    console.log('[CraftingManager] Initialized');
  }

  /**
   * Attempt to craft an item
   */
  public tryCraft(player: GamePlayerEntity, recipeId: string): boolean {
    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    // Validate recipe exists
    if (!recipe) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cUnknown recipe: ${recipeId}`,
      );
      return false;
    }

    // Check if player is already crafting
    if (this.activeCrafts.has(String(player.id))) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cYou are already crafting something!`,
      );
      return false;
    }

    // Validate player has inputs
    const inventoryManager = InventoryManager.instance;
    if (!inventoryManager.hasRecipeInputs(player, recipeId)) {
      const missing = inventoryManager.getMissingRecipeInputs(player, recipeId);
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cMissing items: ${missing.join(', ')}`,
      );
      return false;
    }

    // Get output item name
    const outputConfig = gameManager.itemsConfig[recipe.output.itemId];
    const outputName = outputConfig?.name || recipe.output.itemId;

    // Consume inputs
    for (const input of recipe.inputs) {
      player.removeItemFromInventory(input.itemId, input.quantity);
    }

    // Start crafting timer
    const craftTime = recipe.craftTime || 2000;
    const startTime = Date.now();

    this.world.chatManager.sendPlayerMessage(
      player.player,
      `§eCrafting ${recipe.output.quantity}x ${outputName}... (${craftTime / 1000}s)`,
    );

    // Schedule completion
    const timeoutId = setTimeout(() => {
      this.completeCraft(player, recipeId);
    }, craftTime);

    // Store active craft
    this.activeCrafts.set(String(player.id), {
      playerId: String(player.id),
      recipeId,
      startTime,
      duration: craftTime,
      timeoutId,
    });

    // Emit crafting started event (eventRouter not available in SDK 0.11.x)
    // this.world.eventRouter.emit(GameEvents.CRAFT_START, {
    //   player,
    //   recipeId,
    // });

    return true;
  }

  /**
   * Complete a crafting job
   */
  private completeCraft(player: GamePlayerEntity, recipeId: string) {
    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    if (!recipe) {
      console.error(`[CraftingManager] Recipe not found: ${recipeId}`);
      return;
    }

    // Remove from active crafts
    this.activeCrafts.delete(String(player.id));

    // Add output to inventory
    const added = player.addItemToInventory(
      recipe.output.itemId,
      recipe.output.quantity,
    );

    if (!added) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cInventory full! Crafted items were lost.`,
      );
      return;
    }

    // Get output item name
    const outputConfig = gameManager.itemsConfig[recipe.output.itemId];
    const outputName = outputConfig?.name || recipe.output.itemId;

    this.world.chatManager.sendPlayerMessage(
      player.player,
      `§a✓ Crafted ${recipe.output.quantity}x ${outputName}!`,
    );

    // Grant XP
    player.addXP(10);

    // Emit crafting completed event (eventRouter not available in SDK 0.11.x)
    // this.world.eventRouter.emit(GameEvents.CRAFT_COMPLETE, {
    //   player,
    //   recipeId,
    //   itemId: recipe.output.itemId,
    //   quantity: recipe.output.quantity,
    // });
  }

  /**
   * Cancel active crafting job
   */
  public cancelCraft(player: GamePlayerEntity): boolean {
    const craft = this.activeCrafts.get(String(player.id));

    if (!craft) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cYou are not crafting anything.`,
      );
      return false;
    }

    // Clear timeout
    clearTimeout(craft.timeoutId);

    // Remove from active crafts
    this.activeCrafts.delete(String(player.id));

    // Note: We don't refund materials (materials were already consumed)
    this.world.chatManager.sendPlayerMessage(
      player.player,
      `§7Crafting cancelled. Materials were not refunded.`,
    );

    return true;
  }

  /**
   * Get crafting progress for player
   */
  public getCraftProgress(player: GamePlayerEntity): string | null {
    const craft = this.activeCrafts.get(String(player.id));

    if (!craft) {
      return null;
    }

    const elapsed = Date.now() - craft.startTime;
    const progress = Math.min(100, (elapsed / craft.duration) * 100);
    const remaining = Math.max(0, craft.duration - elapsed);

    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[craft.recipeId];
    const outputConfig = gameManager.itemsConfig[recipe?.output.itemId || ''];
    const outputName = outputConfig?.name || craft.recipeId;

    return `§eCrafting ${outputName}: §f${progress.toFixed(0)}% §7(${(remaining / 1000).toFixed(1)}s remaining)`;
  }

  /**
   * Get all available recipes as formatted string
   */
  public getAvailableRecipesString(player: GamePlayerEntity): string {
    const gameManager = GameManager.instance;
    const inventoryManager = InventoryManager.instance;
    const lines: string[] = ['§e━━━ Available Recipes ━━━'];

    const recipes = Object.values(gameManager.recipesConfig);

    if (recipes.length === 0) {
      return '§7No recipes available.';
    }

    for (const recipe of recipes) {
      const outputConfig = gameManager.itemsConfig[recipe.output.itemId];
      const outputName = outputConfig?.name || recipe.output.itemId;

      // Check if player can craft
      const canCraft = inventoryManager.hasRecipeInputs(player, recipe.id);
      const statusColor = canCraft ? '§a' : '§7';

      // Format inputs
      const inputs = recipe.inputs
        .map((input) => {
          const itemConfig = gameManager.itemsConfig[input.itemId];
          const itemName = itemConfig?.name || input.itemId;
          const has = player.getItemCount(input.itemId);
          const needs = input.quantity;
          const hasColor = has >= needs ? '§a' : '§c';
          return `${itemName} ${hasColor}(${has}/${needs})`;
        })
        .join('§7, ');

      const craftTime = recipe.craftTime ? `${recipe.craftTime / 1000}s` : '2s';

      lines.push(
        `${statusColor}[${recipe.id}] §f${outputName} §7x${recipe.output.quantity}`,
      );
      lines.push(`  §7Requires: ${inputs}`);
      lines.push(`  §7Time: ${craftTime}`);
    }

    lines.push('');
    lines.push('§7Use §f/craft <recipe_id>§7 to craft');

    return lines.join('\n');
  }

  /**
   * Get single recipe info
   */
  public getRecipeInfo(recipeId: string): string {
    const gameManager = GameManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    if (!recipe) {
      return `§cUnknown recipe: ${recipeId}`;
    }

    const outputConfig = gameManager.itemsConfig[recipe.output.itemId];
    const outputName = outputConfig?.name || recipe.output.itemId;

    const lines: string[] = [
      `§e━━━ Recipe: ${recipeId} ━━━`,
      `§fOutput: §a${outputName} §7x${recipe.output.quantity}`,
      '',
      `§fInputs:`,
    ];

    for (const input of recipe.inputs) {
      const itemConfig = gameManager.itemsConfig[input.itemId];
      const itemName = itemConfig?.name || input.itemId;
      lines.push(`  §7- ${itemName} x${input.quantity}`);
    }

    const craftTime = recipe.craftTime || 2000;
    lines.push('');
    lines.push(`§fCraft Time: §7${craftTime / 1000}s`);

    if (recipe.placeable) {
      lines.push(`§fType: §6Structure (placeable)`);
    }

    return lines.join('\n');
  }

  /**
   * Instant craft (admin/debug)
   */
  public instantCraft(player: GamePlayerEntity, recipeId: string): boolean {
    const gameManager = GameManager.instance;
    const inventoryManager = InventoryManager.instance;
    const recipe = gameManager.recipesConfig[recipeId];

    if (!recipe) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cUnknown recipe: ${recipeId}`,
      );
      return false;
    }

    // Check inputs
    if (!inventoryManager.hasRecipeInputs(player, recipeId)) {
      const missing = inventoryManager.getMissingRecipeInputs(player, recipeId);
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cMissing items: ${missing.join(', ')}`,
      );
      return false;
    }

    // Consume inputs
    for (const input of recipe.inputs) {
      player.removeItemFromInventory(input.itemId, input.quantity);
    }

    // Add output immediately
    const added = player.addItemToInventory(
      recipe.output.itemId,
      recipe.output.quantity,
    );

    if (!added) {
      this.world.chatManager.sendPlayerMessage(
        player.player,
        `§cInventory full!`,
      );
      return false;
    }

    const outputConfig = gameManager.itemsConfig[recipe.output.itemId];
    const outputName = outputConfig?.name || recipe.output.itemId;

    this.world.chatManager.sendPlayerMessage(
      player.player,
      `§a✓ Instantly crafted ${recipe.output.quantity}x ${outputName}!`,
    );

    return true;
  }

  /**
   * Cleanup on shutdown
   */
  public cleanup() {
    // Clear all active crafting timers
    for (const craft of this.activeCrafts.values()) {
      clearTimeout(craft.timeoutId);
    }
    this.activeCrafts.clear();

    console.log('[CraftingManager] Cleanup complete');
  }
}

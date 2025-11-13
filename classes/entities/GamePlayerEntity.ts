import { DefaultPlayerEntity, DefaultPlayerEntityOptions, DefaultPlayerEntityController, BaseEntityControllerEvent, EntityEvent, PlayerUIEvent } from 'hytopia';
import { InventoryItem, PlayerData, GameEvents } from '../../types/gameTypes';
import GameManager from '../managers/GameManager';
import AudioManager from '../managers/AudioManager';

/**
 * GamePlayerEntity
 *
 * Custom player entity extending Hytopia's DefaultPlayerEntity.
 * Adds inventory, health, stamina, runes, and level progression.
 */
export default class GamePlayerEntity extends DefaultPlayerEntity {
  // Player stats
  public health: number = 100;
  public maxHealth: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public level: number = 1;
  public xp: number = 0;

  // Inventory (24 slots)
  public inventory: InventoryItem[] = [];
  private readonly MAX_INVENTORY_SLOTS = 24;

  // Rune slots (3)
  public runes: string[] = [];
  private readonly MAX_RUNE_SLOTS = 3;

  // Regeneration timers
  private healthRegenInterval?: NodeJS.Timeout;
  private staminaRegenInterval?: NodeJS.Timeout;

  // Convenience getter for player controller
  public get playerController(): DefaultPlayerEntityController {
    return this.controller as DefaultPlayerEntityController;
  }

  constructor(options: DefaultPlayerEntityOptions) {
    super(options);
    // DefaultPlayerEntity automatically sets up DefaultPlayerEntityController

    // Setup spawn event
    this.on(EntityEvent.SPAWN, async () => {
      await this.onSpawnHandler();
    });

    // Setup despawn event
    this.on(EntityEvent.DESPAWN, async () => {
      await this.onDespawnHandler();
    });

    // Setup UI event listener (client → server communication)
    this.player.ui.on(PlayerUIEvent.DATA, (payload) => {
      const data = payload.data;

      console.log(`[GamePlayerEntity] UI event received:`, data.type, data.data);

      switch (data.type) {
        case 'open_inventory':
          this.sendInventoryToUI();
          break;
        case 'open_crafting':
          this.sendCraftingToUI();
          break;
        case 'craft':
          // Handle craft request from UI
          if (data.data && data.data.recipeId) {
            import('../managers/CraftingManager').then(({ default: CraftingManager }) => {
              CraftingManager.instance.tryCraft(this, data.data.recipeId);
            });
          }
          break;
      }
    });
  }

  /**
   * Handler when player entity spawns
   */
  private async onSpawnHandler() {
    if (!this.world) return;

    // Load player data from persistence
    await this.loadPlayerData();

    // Start regeneration
    this.startHealthRegen();
    this.startStaminaRegen();

    // Setup click-to-attack combat
    this.setupClickToAttack();

    // Send initial UI update
    this.updateUI();
    this.sendGameInfoToUI();

    // Welcome message
    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§eWelcome to 99 Nights in the Forest!`,
    );
    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§7Type §f/help§7 for available commands.`,
    );

    console.log(`[GamePlayerEntity] Player ${this.player.username} spawned`);
  }

  /**
   * Handler when player entity despawns
   */
  private async onDespawnHandler() {
    // Stop regeneration
    if (this.healthRegenInterval) clearInterval(this.healthRegenInterval);
    if (this.staminaRegenInterval) clearInterval(this.staminaRegenInterval);

    // Save player data
    await this.savePlayerData();

    console.log(`[GamePlayerEntity] Player ${this.player.username} despawned`);
  }

  /**
   * Load player data from persistence
   */
  private async loadPlayerData() {
    const savedData = await this.player.getPersistedData() as unknown as PlayerData | undefined;

    if (savedData && savedData.playerId) {
      this.health = savedData.health;
      this.stamina = savedData.stamina;
      this.level = savedData.level;
      this.xp = savedData.xp;
      this.inventory = savedData.inventory;
      this.runes = savedData.runes;
      console.log(`[GamePlayerEntity] Loaded data for player ${this.player.username}`);
    } else {
      // New player - initialize with starting items
      this.initializeNewPlayer();
    }
  }

  /**
   * Save player data to persistence
   */
  public async savePlayerData() {
    const playerData: PlayerData = {
      playerId: this.player.id,
      inventory: this.inventory,
      runes: this.runes,
      level: this.level,
      xp: this.xp,
      health: this.health,
      stamina: this.stamina,
    };

    await this.player.setPersistedData(playerData as any);
    console.log(`[GamePlayerEntity] Saved data for player ${this.player.username}`);
  }

  /**
   * Initialize new player with starting items
   */
  private initializeNewPlayer() {
    // Give starter items
    this.addItemToInventory('wood', 10);
    this.addItemToInventory('stone', 5);

    console.log(`[GamePlayerEntity] Initialized new player ${this.id}`);
  }

  /**
   * Start health regeneration (1 HP per 5 seconds)
   */
  private startHealthRegen() {
    this.healthRegenInterval = setInterval(() => {
      if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.updateUI();
      }
    }, 5000);
  }

  /**
   * Start stamina regeneration (5 stamina per second)
   */
  private startStaminaRegen() {
    this.staminaRegenInterval = setInterval(() => {
      if (this.stamina < this.maxStamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + 5);
        this.updateUI();
      }
    }, 1000);
  }

  /**
   * Add item to inventory with stacking
   */
  public addItemToInventory(itemId: string, quantity: number): boolean {
    const gameManager = GameManager.instance;
    const itemConfig = gameManager.itemsConfig[itemId];

    if (!itemConfig) {
      console.error(`[GamePlayerEntity] Unknown item: ${itemId}`);
      return false;
    }

    const maxStack = itemConfig.maxStack || 1;
    let remaining = quantity;

    // First, try to stack with existing items
    for (const slot of this.inventory) {
      if (slot.itemId === itemId && slot.quantity < maxStack) {
        const canAdd = Math.min(remaining, maxStack - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;

        if (remaining === 0) {
          this.updateUI();
          return true;
        }
      }
    }

    // Then create new slots for remaining items
    while (remaining > 0 && this.inventory.length < this.MAX_INVENTORY_SLOTS) {
      const stackSize = Math.min(remaining, maxStack);
      this.inventory.push({
        itemId,
        quantity: stackSize,
      });
      remaining -= stackSize;
    }

    // Update UI
    this.updateUI();

    // Return true if all items were added
    return remaining === 0;
  }

  /**
   * Remove item from inventory
   */
  public removeItemFromInventory(itemId: string, quantity: number): boolean {
    let remaining = quantity;

    // Remove from slots in order
    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const slot = this.inventory[i];
      if (slot.itemId === itemId) {
        const canRemove = Math.min(remaining, slot.quantity);
        slot.quantity -= canRemove;
        remaining -= canRemove;

        // Remove empty slots
        if (slot.quantity === 0) {
          this.inventory.splice(i, 1);
        }

        if (remaining === 0) {
          this.updateUI();
          return true;
        }
      }
    }

    // Update UI
    this.updateUI();

    // Return true only if all items were removed
    return remaining === 0;
  }

  /**
   * Get item count in inventory
   */
  public getItemCount(itemId: string): number {
    return this.inventory
      .filter((slot) => slot.itemId === itemId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
  }

  /**
   * Check if inventory has items
   */
  public hasItems(itemId: string, quantity: number): boolean {
    return this.getItemCount(itemId) >= quantity;
  }

  /**
   * Add XP and handle leveling
   */
  public addXP(amount: number) {
    this.xp += amount;
    const xpForNextLevel = this.level * 100;

    this.updateUI();

    if (this.xp >= xpForNextLevel) {
      this.levelUp();
    }
  }

  /**
   * Level up player
   */
  private levelUp() {
    this.level++;
    this.xp = 0;
    this.maxHealth += 10;
    this.maxStamina += 10;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;

    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§6✨ Level Up! You are now level ${this.level}!`,
    );

    // Update UI with new stats
    this.updateUI();

    // Emit level up event (Note: world.eventRouter doesn't exist in SDK 0.11.x)
    // Custom event system would need to be implemented
    // this.world.eventRouter.emit(GameEvents.PLAYER_LEVEL_UP, {
    //   player: this,
    //   level: this.level,
    // });
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.updateUI();

    if (this.health === 0) {
      this.die();
    }
  }

  /**
   * Heal player
   */
  public heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateUI();
  }

  /**
   * Use a consumable item from inventory
   */
  public useItem(itemId: string): boolean {
    if (!this.world) return false;

    const gameManager = GameManager.instance;
    const itemConfig = gameManager.itemsConfig[itemId];

    if (!itemConfig) {
      this.world.chatManager.sendPlayerMessage(this.player, `§cUnknown item: ${itemId}`);
      return false;
    }

    // Check if player has the item
    if (!this.hasItems(itemId, 1)) {
      this.world.chatManager.sendPlayerMessage(this.player, `§cYou don't have any ${itemConfig.name}!`);
      return false;
    }

    // Check if item is consumable
    if (itemConfig.type !== 'consumable') {
      this.world.chatManager.sendPlayerMessage(this.player, `§c${itemConfig.name} is not consumable!`);
      return false;
    }

    // Apply item effects based on itemId
    switch (itemId) {
      case 'healing_potion':
        this.heal(30); // Restore 30 HP
        this.world.chatManager.sendPlayerMessage(this.player, `§a+30 HP! Used ${itemConfig.name}`);
        AudioManager.instance.playSFX('audio/sfx/ui/notification-1.mp3', 0.5);
        break;

      // Add more consumable effects here as needed
      default:
        this.world.chatManager.sendPlayerMessage(this.player, `§c${itemConfig.name} has no effect!`);
        return false;
    }

    // Remove item from inventory
    this.removeItemFromInventory(itemId, 1);

    console.log(`[GamePlayerEntity] Player ${this.player.username} used ${itemId}`);
    return true;
  }

  /**
   * Use stamina
   */
  public useStamina(amount: number): boolean {
    if (this.stamina >= amount) {
      this.stamina -= amount;
      this.updateUI();
      return true;
    }
    return false;
  }

  /**
   * Handle player death
   */
  private die() {
    console.log(`[GamePlayerEntity] Player ${this.player.username} died`);

    // Death announcement
    this.world.chatManager.sendBroadcastMessage(
      `💀 ${this.player.username} has died!`,
      'FF0000'
    );

    // Show death screen UI
    this.showDeathScreen(5);

    // Play death sound
    AudioManager.instance.playSFX('audio/sfx/entity/zombie/zombie-death.mp3', 0.7, this.position);

    // Respawn after delay
    setTimeout(() => {
      if (this.world) {
        // Restore health
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;

        // Teleport to spawn
        this.setPosition({ x: 0, y: 10, z: 0 });

        // Update UI
        this.updateUI();

        // Send respawn notification
        this.sendNotification('Respawned', 'You have respawned at the Safe Clearing!', 'success');

        console.log(`[GamePlayerEntity] Player ${this.player.username} respawned`);
      }
    }, 5000); // 5 second respawn delay

    // Optional: Drop some items on death (penalty)
    // For now, players keep their inventory on death
  }

  /**
   * Equip rune
   */
  public equipRune(runeId: string): boolean {
    if (this.runes.length >= this.MAX_RUNE_SLOTS) {
      this.world.chatManager.sendPlayerMessage(
        this.player,
        `§cRune slots full! Unequip a rune first.`,
      );
      return false;
    }

    if (this.runes.includes(runeId)) {
      this.world.chatManager.sendPlayerMessage(
        this.player,
        `§cRune already equipped!`,
      );
      return false;
    }

    this.runes.push(runeId);
    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§aEquipped rune: ${runeId}`,
    );
    return true;
  }

  /**
   * Unequip rune
   */
  public unequipRune(runeId: string): boolean {
    const index = this.runes.indexOf(runeId);
    if (index === -1) {
      this.world.chatManager.sendPlayerMessage(
        this.player,
        `§cRune not equipped!`,
      );
      return false;
    }

    this.runes.splice(index, 1);
    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§7Unequipped rune: ${runeId}`,
    );
    return true;
  }

  /**
   * Get player stats as formatted string
   */
  public getStatsString(): string {
    return [
      `§e━━━ Player Stats ━━━`,
      `§fLevel: §a${this.level} §7(${this.xp}/100 XP)`,
      `§fHealth: §c${this.health}§7/§c${this.maxHealth}`,
      `§fStamina: §b${this.stamina}§7/§b${this.maxStamina}`,
      `§fInventory: §7${this.inventory.length}/${this.MAX_INVENTORY_SLOTS} slots`,
      `§fRunes: §7${this.runes.length}/${this.MAX_RUNE_SLOTS} equipped`,
    ].join('\n');
  }

  /**
   * Setup click-to-attack combat system and structure placement
   */
  private setupClickToAttack() {
    if (!this.controller) return;

    // Listen for player input each tick
    this.controller.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, ({ input }) => {
      // Left mouse click - attack
      if (input.ml) {
        input.ml = false;
        this.performClickAttack();
      }

      // Right mouse click - interact with resource OR place structure
      if (input.mr) {
        input.mr = false;
        this.handleRightClick();
      }
    });
  }

  /**
   * Perform a click-based attack using raycast
   */
  private performClickAttack() {
    if (!this.world) return;

    // Get camera position and facing direction
    const origin = {
      x: this.position.x,
      y: this.position.y + 1.6, // Approximate eye height
      z: this.position.z,
    };
    const direction = this.player.camera.facingDirection;
    const range = 8; // Attack range in blocks

    // Perform raycast to find what the player is looking at
    const hit = this.world.simulation.raycast(origin, direction, range, {
      filterExcludeRigidBody: this.rawRigidBody,
    });

    if (!hit || !hit.hitEntity) {
      // Missed - no entity hit
      this.world.chatManager.sendPlayerMessage(this.player, '§7*swing*');
      return;
    }

    // Check if hit entity is an enemy
    const target = hit.hitEntity as any;
    if (typeof target.takeDamage !== 'function' || !target.tag || target.tag !== 'enemy') {
      // Hit something, but not an enemy
      return;
    }

    // Calculate damage (base 10 + level * 2)
    const damage = 10 + this.level * 2;

    // Attack the enemy
    target.takeDamage(damage, this);

    // Visual/audio feedback
    this.world.chatManager.sendPlayerMessage(
      this.player,
      `§c⚔ Hit ${target.name} for ${damage} damage!`
    );

    // Optional: Apply small knockback
    if (target.rawRigidBody && direction) {
      const impulse = {
        x: direction.x * 3,
        y: 1,
        z: direction.z * 3,
      };
      target.applyImpulse(impulse);
    }
  }

  /**
   * Attack nearby enemies (legacy method for /attack command)
   */
  public attackNearbyEnemies(range: number = 3): number {
    if (!this.world) return 0;

    // Find nearby enemies
    const enemies = this.world.entityManager.getEntitiesByTag('enemy');
    let hitCount = 0;

    for (const entity of enemies) {
      const distance = this.distanceTo(entity.position);

      if (distance <= range) {
        // Calculate damage (base 10 + level * 2)
        const damage = 10 + this.level * 2;

        // Deal damage to enemy
        const enemy = entity as any; // BaseEnemyEntity
        if (enemy.takeDamage && !enemy.isDead) {
          enemy.takeDamage(damage, this);
          hitCount++;
        }
      }
    }

    return hitCount;
  }

  /**
   * Calculate distance to a position
   */
  private distanceTo(pos: { x: number; y: number; z: number }): number {
    const dx = this.position.x - pos.x;
    const dy = this.position.y - pos.y;
    const dz = this.position.z - pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Handle right-click: gather resources or place structures
   */
  private handleRightClick() {
    if (!this.world) return;

    // Get camera position and facing direction
    const origin = {
      x: this.position.x,
      y: this.position.y + 1.6, // Approximate eye height
      z: this.position.z,
    };
    const direction = this.player.camera.facingDirection;
    const range = 6; // Interaction range

    // Perform raycast to find what the player is looking at
    const hit = this.world.simulation.raycast(origin, direction, range, {
      filterExcludeRigidBody: this.rawRigidBody,
    });

    // Check if we hit a resource node
    if (hit && hit.hitEntity) {
      const target = hit.hitEntity as any;

      // Check if it's a resource node (has tag 'resource' and interact method)
      if (target.tag === 'resource' && typeof target.interact === 'function') {
        // Interact with the resource (gather it)
        target.interact(this.player);
        return;
      }
    }

    // Not a resource, try to place a structure instead
    this.attemptStructurePlacement();
  }

  /**
   * Attempt to place a structure at the player's target location
   */
  private attemptStructurePlacement() {
    if (!this.world) return;

    // Get camera position and facing direction
    const origin = {
      x: this.position.x,
      y: this.position.y + 1.6, // Approximate eye height
      z: this.position.z,
    };
    const direction = this.player.camera.facingDirection;
    const range = 6; // Placement range

    // Perform raycast to find placement location
    const hit = this.world.simulation.raycast(origin, direction, range, {
      filterExcludeRigidBody: this.rawRigidBody,
    });

    if (!hit || !hit.hitBlock) {
      this.world.chatManager.sendPlayerMessage(this.player, '§7No valid placement location.');
      return;
    }

    // Get the placement coordinate (on top of the hit block)
    const placementCoordinate = hit.hitBlock.getNeighborGlobalCoordinateFromHitPoint(hit.hitPoint);
    // Convert coordinate to world position
    const placementPosition = {
      x: placementCoordinate.x,
      y: placementCoordinate.y,
      z: placementCoordinate.z,
    };

    // Check inventory for placeable items
    const placeableItems = ['campfire', 'torch', 'ward_totem_t1'];
    let itemToPlace: string | null = null;

    for (const itemId of placeableItems) {
      if (this.hasItems(itemId, 1)) {
        itemToPlace = itemId;
        break;
      }
    }

    if (!itemToPlace) {
      this.world.chatManager.sendPlayerMessage(
        this.player,
        '§cNo placeable structures in inventory. Craft a campfire, torch, or ward totem!'
      );
      return;
    }

    // Import structure entities dynamically
    this.placeStructure(itemToPlace, placementPosition);
  }

  /**
   * Place a structure entity in the world
   */
  private async placeStructure(itemId: string, position: { x: number; y: number; z: number }) {
    if (!this.world) return;

    // Remove item from inventory
    if (!this.removeItemFromInventory(itemId, 1)) {
      this.world.chatManager.sendPlayerMessage(this.player, '§cFailed to remove item from inventory.');
      return;
    }

    // Dynamically import and create the appropriate structure
    let structure: any;

    try {
      if (itemId === 'campfire') {
        const { default: CampfireEntity } = await import('./structures/CampfireEntity');
        structure = new CampfireEntity({ placedBy: String(this.id) });
      } else if (itemId === 'torch') {
        const { default: TorchEntity } = await import('./structures/TorchEntity');
        structure = new TorchEntity({ placedBy: String(this.id) });
      } else if (itemId === 'ward_totem_t1') {
        const { default: WardTotemEntity } = await import('./structures/WardTotemEntity');
        structure = new WardTotemEntity({ placedBy: String(this.id), tier: 1 });
      } else {
        this.world.chatManager.sendPlayerMessage(this.player, `§cUnknown structure: ${itemId}`);
        // Refund the item
        this.addItemToInventory(itemId, 1);
        return;
      }

      // Spawn the structure
      structure.spawn(this.world, position);

      this.world.chatManager.sendPlayerMessage(
        this.player,
        `§aPlaced ${structure.structureName}!`
      );

      console.log(`[GamePlayerEntity] Player ${this.id} placed ${itemId} at ${JSON.stringify(position)}`);
    } catch (error) {
      console.error(`[GamePlayerEntity] Failed to place structure ${itemId}:`, error);
      this.world.chatManager.sendPlayerMessage(this.player, `§cFailed to place structure.`);
      // Refund the item
      this.addItemToInventory(itemId, 1);
    }
  }

  /**
   * Send UI updates to the player's screen
   */
  public updateUI() {
    if (!this.player?.ui) return;

    const xpForNextLevel = this.level * 100;

    this.player.ui.sendData({
      type: 'player_stats',
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      level: this.level,
      xp: this.xp,
      xpForNext: xpForNextLevel,
      inventorySlots: this.inventory.length,
    });

    // Also update hotbar
    this.updateHotbar();
  }

  /**
   * Send hotbar data to UI (first 8 inventory slots)
   */
  public updateHotbar() {
    if (!this.player?.ui) return;

    const gameManager = GameManager.instance;
    const hotbarItems = [];

    for (let i = 0; i < 8; i++) {
      const slot = this.inventory[i];
      if (slot && slot.itemId) {
        const itemConfig = gameManager.itemsConfig[slot.itemId];
        hotbarItems.push({
          id: slot.itemId,
          name: itemConfig?.name || slot.itemId,
          quantity: slot.quantity,
        });
      } else {
        hotbarItems.push(null);
      }
    }

    this.player.ui.sendData({
      type: 'hotbar',
      items: hotbarItems,
    });
  }

  /**
   * Send full inventory data to UI
   */
  public sendInventoryToUI() {
    if (!this.player?.ui) return;

    console.log(`[GamePlayerEntity] Sending inventory to UI for ${this.player.username}`);

    const gameManager = GameManager.instance;
    const inventoryData = this.inventory.map(slot => {
      const itemConfig = gameManager.itemsConfig[slot.itemId];
      return {
        id: slot.itemId,
        name: itemConfig?.name || slot.itemId,
        description: itemConfig?.description || '',
        type: itemConfig?.type || 'unknown',
        quantity: slot.quantity,
      };
    });

    console.log(`[GamePlayerEntity] Inventory data:`, inventoryData.length, 'items');

    this.player.ui.sendData({
      type: 'inventory',
      items: inventoryData,
    });

    // Also show the inventory panel
    console.log('[GamePlayerEntity] Sending show_inventory command');
    this.player.ui.sendData({
      type: 'show_inventory',
    });
  }

  /**
   * Send notification to player
   */
  public sendNotification(title: string, message: string, notifType: string = 'info', duration: number = 5000) {
    if (!this.player?.ui) return;

    this.player.ui.sendData({
      type: 'notification',
      title,
      message,
      notifType,
      duration,
    });
  }

  /**
   * Show death screen
   */
  public showDeathScreen(respawnTime: number = 5) {
    if (!this.player?.ui) return;

    this.player.ui.sendData({
      type: 'death',
      respawnTime,
    });
  }

  /**
   * Send game info (night, phase) to UI
   */
  public sendGameInfoToUI() {
    if (!this.player?.ui) return;

    const gameManager = GameManager.instance;
    this.player.ui.sendData({
      type: 'game_info',
      night: gameManager.gameState.currentNight,
      phase: gameManager.gameState.currentPhase,
      inventorySlots: this.inventory.length,
    });
  }

  /**
   * Send crafting recipes to UI
   */
  public sendCraftingToUI() {
    if (!this.player?.ui) return;

    const gameManager = GameManager.instance;
    const craftingManager = import('../managers/CraftingManager').then(({ default: CraftingManager }) => {
      // Get all recipes and check which ones can be crafted
      const recipes = Object.entries(gameManager.recipesConfig).map(([recipeId, recipeConfig]: [string, any]) => {
        const requirements = Object.entries(recipeConfig.requires || {}).map(([itemId, quantity]: [string, any]) => {
          const itemConfig = gameManager.itemsConfig[itemId];
          const hasQuantity = this.getItemCount(itemId);
          return {
            id: itemId,
            name: itemConfig?.name || itemId,
            needed: quantity,
            current: hasQuantity,
            has: hasQuantity >= quantity,
          };
        });

        const canCraft = requirements.every(req => req.has);

        return {
          result: recipeId,
          name: gameManager.itemsConfig[recipeId]?.name || recipeId,
          requirements,
          canCraft,
        };
      });

      this.player.ui.sendData({
        type: 'recipes',
        recipes,
      });

      // Also show the crafting panel
      this.player.ui.sendData({
        type: 'show_crafting',
      });
    });
  }
}

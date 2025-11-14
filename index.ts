/**
 * 99 Nights in the Forest
 *
 * A mythic-cozy survival adventure where players must survive 99 nights
 * to break the curse and restore the Ancient Grove.
 *
 * Built with Hytopia SDK v0.10.46
 * Phase 3: Player Systems
 */

import {
  startServer,
  PlayerEvent,
  ModelRegistry,
} from 'hytopia';

import worldMap from './assets/maps/map.json';
import GameManager from './classes/managers/GameManager';
import TimeManager from './classes/managers/TimeManager';
import AudioManager from './classes/managers/AudioManager';
import InventoryManager from './classes/managers/InventoryManager';
import CraftingManager from './classes/managers/CraftingManager';
import GamePlayerEntity from './classes/entities/GamePlayerEntity';
import NightManager from './classes/managers/NightManager';
import ResourceManager from './classes/managers/ResourceManager';

// Model optimization is enabled by default for better performance
// The SDK automatically optimizes models from @hytopia.com/assets
// Re-enabled after updating to SDK 0.11.9 and fixing model paths
ModelRegistry.instance.optimize = true;

/**
 * Main server entry point
 * Initializes the game world, managers, and event handlers
 */
startServer(async (world) => {
  console.log('='.repeat(60));
  console.log('🌲 99 Nights in the Forest - Server Starting');
  console.log('='.repeat(60));

  // Load the custom 817k+ block forest map
  console.log('[Server] Loading custom map...');
  world.loadMap(worldMap);
  console.log('[Server] Map loaded successfully');

  // Initialize managers
  console.log('[Server] Initializing GameManager...');
  await GameManager.instance.initialize(world);

  console.log('[Server] Initializing TimeManager...');
  TimeManager.instance.initialize(world);

  console.log('[Server] Initializing AudioManager...');
  AudioManager.instance.initialize(world);
  AudioManager.instance.start(); // Start background music

  console.log('[Server] Initializing InventoryManager...');
  InventoryManager.instance.initialize(world);

  console.log('[Server] Initializing CraftingManager...');
  CraftingManager.instance.initialize(world);

  console.log('[Server] Initializing NightManager...');
  NightManager.instance.initialize(world);

  console.log('[Server] Initializing ResourceManager...');
  ResourceManager.instance.initialize(world);
  // Resource spawning enabled with fixed model paths
  ResourceManager.instance.spawnInitialResources();

  /**
   * Player Join Handler
   */
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    console.log(`[Server] Player joined: ${player.username} (ID: ${player.id})`);

    // Create custom game player entity
    // Using default player model (no modelUri specified)
    const playerEntity = new GamePlayerEntity({
      player,
      name: player.username,
      // modelUri removed - using default player model to avoid optimization issues
      modelScale: 0.5, // Hytopia standard (~1.5 blocks tall)
    });

    // Spawn at the Safe Clearing (0, 10, 0)
    playerEntity.spawn(world, { x: 0, y: 10, z: 0 });

    // Setup third-person camera (default mode)
    // Camera offset positions the view at upper body/head level
    player.camera.setOffset({ x: 0, y: 0.8, z: 0 });

    // Load game UI (path is relative to assets/ directory)
    player.ui.load('ui/index.html');
  });

  /**
   * Player Leave Handler
   */
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    console.log(`[Server] Player left: ${player.username} (ID: ${player.id})`);

    // Clean up all player entities
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
      entity.despawn();
    });
  });

  /**
   * Chat Commands
   */

  // Start the game
  world.chatManager.registerCommand('/start', (player) => {
    const isGameStarted = GameManager.instance.gameState.isStarted;
    const isTimeRunning = TimeManager.instance.isRunning();

    // If both are already running, nothing to do
    if (isGameStarted && isTimeRunning) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Game already started and running!', 'FF0000');
      return;
    }

    // If game state says started but time isn't running (server restart case)
    if (isGameStarted && !isTimeRunning) {
      console.log(`[Server] Resuming time cycle after restart`);
      world.chatManager.sendPlayerMessage(player, '⏰ Resuming time cycle...', '00FF00');
      TimeManager.instance.start();
      return;
    }

    // Fresh start - initialize both
    console.log(`[Server] Game started by ${player.username}`);
    GameManager.instance.startGame();

    // Start the day/night cycle
    TimeManager.instance.start();
  });

  // Show game status
  world.chatManager.registerCommand('/status', (player) => {
    const state = GameManager.instance.gameState;
    const timeRemaining = TimeManager.instance.getTimeRemainingInPhase();
    const cycleProgress = Math.floor(TimeManager.instance.getCycleProgress() * 100);

    world.chatManager.sendPlayerMessage(player, '📊 Game Status:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, `   Started: ${state.isStarted ? 'Yes' : 'No'}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${state.currentNight}/99`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Phase: ${state.currentPhase}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Time in phase: ${timeRemaining}s remaining`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Cycle progress: ${cycleProgress}%`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Camp Level: ${state.campLevel}`, 'FFFFFF');
  });

  // Reset game (dev/testing)
  world.chatManager.registerCommand('/reset', async (player) => {
    console.log(`[Server] Game reset by ${player.username}`);
    TimeManager.instance.stop();
    GameManager.instance.resetGame();
    await GameManager.instance.saveGameState(); // Save the reset state
    AudioManager.instance.switchMusic('day');
    world.chatManager.sendBroadcastMessage('🔄 Game has been reset! Use /start to begin.', 'FFAA00');
  });

  // Help command
  world.chatManager.registerCommand('/help', (player) => {
    world.chatManager.sendPlayerMessage(player, '📖 Available Commands:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '   /start - Start the game', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /status - Show game status', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /stats - Show player stats', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /inventory (/inv) - Show inventory', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /recipes - List all recipes', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /craft <recipe_id> - Craft an item', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /use <item_id> - Use a consumable item', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /attack - Attack nearby enemies', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /gather <item> <amount> - Gather resource (dev)', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /reset - Reset the game', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /time - Show time info', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /skipphase - Skip to next phase (dev)', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /debug - Toggle debug info', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /testdata - Test JSON data loading', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /rocket - Launch into the air (fun!)', 'FFFFFF');
  });

  // Test data loading command
  world.chatManager.registerCommand('/testdata', async (player) => {
    world.chatManager.sendPlayerMessage(player, '🧪 Testing Data Loading...', 'FF00FF');

    try {
      // Test items
      const items = await import('./config/items.json');
      const itemCount = Object.keys(items.default || items).length;
      world.chatManager.sendPlayerMessage(player, `   ✅ Items: ${itemCount} loaded`, '00FF00');

      // Test recipes
      const recipes = await import('./config/recipes.json');
      const recipeCount = Object.keys(recipes.default || recipes).length;
      world.chatManager.sendPlayerMessage(player, `   ✅ Recipes: ${recipeCount} loaded`, '00FF00');

      // Test enemies
      const enemies = await import('./config/enemies.json');
      const enemyCount = Object.keys(enemies.default || enemies).length;
      world.chatManager.sendPlayerMessage(player, `   ✅ Enemies: ${enemyCount} loaded`, '00FF00');

      // Test zones
      const zones = await import('./config/zones.json');
      const zoneCount = Object.keys(zones.default || zones).length;
      world.chatManager.sendPlayerMessage(player, `   ✅ Zones: ${zoneCount} loaded`, '00FF00');

      world.chatManager.sendPlayerMessage(player, '✅ All data loaded successfully!', '00FF00');
    } catch (error) {
      world.chatManager.sendPlayerMessage(player, `   ❌ Error loading data: ${error}`, 'FF0000');
      console.error('[TestData] Error:', error);
    }
  });

  // Time info command
  world.chatManager.registerCommand('/time', (player) => {
    const currentPhase = TimeManager.instance.getCurrentPhase();
    const timeRemaining = TimeManager.instance.getTimeRemainingInPhase();
    const cycleProgress = Math.floor(TimeManager.instance.getCycleProgress() * 100);
    const nightNumber = GameManager.instance.gameState.currentNight;
    const musicState = AudioManager.instance.getCurrentState();
    const isRunning = (TimeManager.instance as any).isRunning; // Check if cycle is running

    world.chatManager.sendPlayerMessage(player, '⏰ Time Info:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, `   Current Phase: ${currentPhase}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Time Remaining: ${timeRemaining}s`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Cycle Progress: ${cycleProgress}%`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${nightNumber}/99`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Music: ${musicState}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Cycle Active: ${isRunning ? 'YES ✓' : 'NO ✗ (use /start)'}`, isRunning ? '00FF00' : 'FF0000');
  });

  // Skip phase command (dev/testing)
  world.chatManager.registerCommand('/skipphase', (player) => {
    if (!GameManager.instance.gameState.isStarted) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Game not started! Use /start first', 'FF0000');
      return;
    }

    const oldPhase = TimeManager.instance.getCurrentPhase();
    console.log(`[/skipphase] Before skip: ${oldPhase}`);

    TimeManager.instance.skipToNextPhase();

    const newPhase = TimeManager.instance.getCurrentPhase();
    console.log(`[/skipphase] After skip: ${newPhase}`);

    // Check if phase actually changed
    if (oldPhase === newPhase) {
      console.log(`[/skipphase] Phase did not change!`);
      world.chatManager.sendPlayerMessage(player, '⚠️  Time cycle not running! Use /start to begin', 'FF0000');
      return;
    }

    // Update music for new phase
    AudioManager.instance.updateMusicForPhase(newPhase);

    console.log(`[/skipphase] Sending skip message to player`);
    world.chatManager.sendPlayerMessage(player, `⏩ Skipped: ${oldPhase} → ${newPhase}`, 'FFFF00');

    // Also send broadcast so everyone sees it
    world.chatManager.sendBroadcastMessage(`⏩ ${player.username} skipped: ${oldPhase} → ${newPhase}`, 'FFFF00');
  });

  // Skip to night (testing command)
  world.chatManager.registerCommand('/skipnight', (player, args) => {
    const nightNumber = parseInt(args[0]);

    if (isNaN(nightNumber) || nightNumber < 1 || nightNumber > 99) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Usage: /skipnight <1-99>', 'FF0000');
      world.chatManager.sendPlayerMessage(player, '   Example: /skipnight 10 (test boss fight)', 'FFAA00');
      return;
    }

    GameManager.instance.gameState.currentNight = nightNumber;
    GameManager.instance.saveGameState();

    world.chatManager.sendBroadcastMessage(`⏩ ${player.username} skipped to Night ${nightNumber}!`, 'FFFF00');

    // If it's a boss night, notify
    const bossNights = [10, 25, 50, 75, 99];
    if (bossNights.includes(nightNumber)) {
      world.chatManager.sendBroadcastMessage(`🏆 Boss night! Skip to Evening to trigger boss spawn.`, 'FFD700');
    }
  });

  // Debug command
  world.chatManager.registerCommand('/debug', (player) => {
    const state = GameManager.instance.gameState;
    const playerCount = world.entityManager.getAllPlayerEntities().length;
    const entityCount = world.entityManager.getAllEntities().length;
    const currentPhase = TimeManager.instance.getCurrentPhase();

    world.chatManager.sendPlayerMessage(player, '🐛 Debug Info:', 'FF00FF');
    world.chatManager.sendPlayerMessage(player, `   Players: ${playerCount}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Total Entities: ${entityCount}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${state.currentNight}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Phase: ${currentPhase}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Camp Level: ${state.campLevel}`, 'FFFFFF');
  });

  // Rocket command (easter egg)
  world.chatManager.registerCommand('/rocket', (player) => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
      entity.applyImpulse({ x: 0, y: 20, z: 0 });
    });
    world.chatManager.sendPlayerMessage(player, '🚀 Wheeeee!', 'FF0000');
  });

  /**
   * Player-specific Commands (Phase 3)
   */

  // Show player stats
  world.chatManager.registerCommand('/stats', (player) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    const stats = playerEntity.getStatsString();
    world.chatManager.sendPlayerMessage(player, stats, 'FFFFFF');
  });

  // Show inventory (opens UI panel)
  world.chatManager.registerCommand('/inventory', (player) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    // Send inventory data to UI
    playerEntity.sendInventoryToUI();
  });

  // Alias for /inventory
  world.chatManager.registerCommand('/inv', (player) => {
    console.log(`[CMD] /inv executed by ${player.username}`);
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    // Send inventory data to UI
    playerEntity.sendInventoryToUI();
  });

  // List all recipes
  world.chatManager.registerCommand('/recipes', (player) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    const recipesString = CraftingManager.instance.getAvailableRecipesString(playerEntity);
    world.chatManager.sendPlayerMessage(player, recipesString, 'FFFFFF');
  });

  // Craft an item
  world.chatManager.registerCommand('/craft', (player, args) => {
    console.log(`[CMD] /craft executed by ${player.username}`, args);
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    if (args.length === 0) {
      console.log('[CMD] Opening crafting UI panel');
      // Open crafting UI panel
      playerEntity.sendCraftingToUI();
      return;
    }

    const recipeId = args[0];
    const success = CraftingManager.instance.tryCraft(playerEntity, recipeId);

    if (!success) {
      // Error messages are handled by CraftingManager
      return;
    }
  });

  // Gather resource (dev/testing command)
  world.chatManager.registerCommand('/gather', (player, args) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    if (args.length < 2) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Usage: /gather <item_id> <amount>', 'FF0000');
      world.chatManager.sendPlayerMessage(player, '💡 Example: /gather wood 10', 'FFAA00');
      return;
    }

    const itemId = args[0];
    const amount = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Amount must be a positive number', 'FF0000');
      return;
    }

    // Check if item exists
    const itemConfig = GameManager.instance.itemsConfig[itemId];
    if (!itemConfig) {
      world.chatManager.sendPlayerMessage(player, `❌ Unknown item: ${itemId}`, 'FF0000');
      return;
    }

    // Add to inventory
    const added = playerEntity.addItemToInventory(itemId, amount);

    if (added) {
      world.chatManager.sendPlayerMessage(
        player,
        `✅ Gathered ${amount}x ${itemConfig.name}`,
        '00FF00'
      );
    } else {
      world.chatManager.sendPlayerMessage(
        player,
        '❌ Inventory full!',
        'FF0000'
      );
    }
  });

  // Attack command (simple punch)
  world.chatManager.registerCommand('/attack', (player) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    // Play sword swing sound
    AudioManager.instance.playSFX('audio/sfx/player/player-swing-woosh.mp3', 0.5, playerEntity.position);

    const hitCount = playerEntity.attackNearbyEnemies(3);

    if (hitCount > 0) {
      const damage = 10 + playerEntity.level * 2;
      // Play hit sound on successful attack
      AudioManager.instance.playSFX('audio/sfx/damage/hit-metal-1.mp3', 0.6, playerEntity.position);

      world.chatManager.sendPlayerMessage(
        player,
        `⚔️ You attack! Hit ${hitCount} enemy(ies) for ${damage} damage each`,
        'FF0000'
      );
    } else {
      world.chatManager.sendPlayerMessage(
        player,
        '💨 Your attack misses! No enemies nearby',
        'FFAA00'
      );
    }
  });

  // Use item command
  world.chatManager.registerCommand('/use', (player, args) => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
    if (!playerEntity) {
      world.chatManager.sendPlayerMessage(player, '❌ Player entity not found', 'FF0000');
      return;
    }

    if (args.length === 0) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Usage: /use <item_id>', 'FF0000');
      world.chatManager.sendPlayerMessage(player, '💡 Example: /use healing_potion', 'FFAA00');
      return;
    }

    const itemId = args[0];
    playerEntity.useItem(itemId);
  });

  console.log('='.repeat(60));
  console.log('✅ Server initialized successfully');
  console.log('🌲 99 Nights in the Forest is ready!');
  console.log('='.repeat(60));
});

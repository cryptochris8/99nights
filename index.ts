/**
 * 99 Nights in the Forest
 *
 * A mythic-cozy survival adventure where players must survive 99 nights
 * to break the curse and restore the Ancient Grove.
 *
 * Built with Hytopia SDK v0.10.46
 * Phase 2: Day/Night & World Systems
 */

import {
  startServer,
  DefaultPlayerEntity,
  PlayerEvent,
} from 'hytopia';

import worldMap from './assets/maps/map.json';
import GameManager from './classes/managers/GameManager';
import TimeManager from './classes/managers/TimeManager';
import AudioManager from './classes/managers/AudioManager';

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

  /**
   * Player Join Handler
   */
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    console.log(`[Server] Player joined: ${player.username} (ID: ${player.id})`);

    // Create player entity
    const playerEntity = new DefaultPlayerEntity({
      player,
      name: player.username,
    });

    // Spawn at the Safe Clearing (0, 10, 0)
    playerEntity.spawn(world, { x: 0, y: 10, z: 0 });

    // Load game UI
    player.ui.load('ui/index.html');

    // Welcome messages
    world.chatManager.sendPlayerMessage(player, '='.repeat(50), 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '🌲 Welcome to 99 Nights in the Forest! 🌲', '00FF00');
    world.chatManager.sendPlayerMessage(player, '='.repeat(50), 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '');
    world.chatManager.sendPlayerMessage(player, '📖 The Ancient Grove is cursed...', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '🌙 Survive 99 nights to break the seal', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '⚔️  Fight corrupted creatures of the night', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '🛠️  Gather resources and craft defenses', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '');
    world.chatManager.sendPlayerMessage(player, '💡 Controls:', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   WASD - Move', 'CCCCCC');
    world.chatManager.sendPlayerMessage(player, '   Space - Jump', 'CCCCCC');
    world.chatManager.sendPlayerMessage(player, '   Shift - Sprint', 'CCCCCC');
    world.chatManager.sendPlayerMessage(player, '   \\ - Debug view', 'CCCCCC');
    world.chatManager.sendPlayerMessage(player, '');
    world.chatManager.sendPlayerMessage(player, '🎮 Type /help for commands', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '='.repeat(50), 'FFFFFF');

    // Show current game state
    const state = GameManager.instance.gameState;
    if (state.isStarted) {
      world.chatManager.sendPlayerMessage(
        player,
        `⏰ Game in progress - Night ${state.currentNight} (${state.currentPhase})`,
        'FFAA00'
      );
    } else {
      world.chatManager.sendPlayerMessage(
        player,
        '⏸️  Game not started - Type /start to begin your journey',
        'FFAA00'
      );
    }
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
    if (GameManager.instance.gameState.isStarted) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Game already started!', 'FF0000');
      return;
    }

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
  world.chatManager.registerCommand('/reset', (player) => {
    console.log(`[Server] Game reset by ${player.username}`);
    TimeManager.instance.stop();
    GameManager.instance.resetGame();
    AudioManager.instance.switchMusic('day');
    world.chatManager.sendBroadcastMessage('🔄 Game has been reset', 'FFAA00');
  });

  // Help command
  world.chatManager.registerCommand('/help', (player) => {
    world.chatManager.sendPlayerMessage(player, '📖 Available Commands:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '   /start - Start the game', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /status - Show game status', 'FFFFFF');
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

    world.chatManager.sendPlayerMessage(player, '⏰ Time Info:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, `   Current Phase: ${currentPhase}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Time Remaining: ${timeRemaining}s`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Cycle Progress: ${cycleProgress}%`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${nightNumber}/99`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Music: ${musicState}`, 'FFFFFF');
  });

  // Skip phase command (dev/testing)
  world.chatManager.registerCommand('/skipphase', (player) => {
    if (!GameManager.instance.gameState.isStarted) {
      world.chatManager.sendPlayerMessage(player, '⚠️  Game not started! Use /start first', 'FF0000');
      return;
    }

    const oldPhase = TimeManager.instance.getCurrentPhase();
    TimeManager.instance.skipToNextPhase();
    const newPhase = TimeManager.instance.getCurrentPhase();

    // Update music for new phase
    AudioManager.instance.updateMusicForPhase(newPhase);

    world.chatManager.sendPlayerMessage(player, `⏩ Skipped: ${oldPhase} → ${newPhase}`, 'FFFF00');
  });

  // Debug command
  world.chatManager.registerCommand('/debug', (player) => {
    const state = GameManager.instance.gameState;
    const playerCount = world.entityManager.getAllPlayerEntities().length;
    const entityCount = world.entityManager.getEntities().length;
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

  console.log('='.repeat(60));
  console.log('✅ Server initialized successfully');
  console.log('🌲 99 Nights in the Forest is ready!');
  console.log('='.repeat(60));
});

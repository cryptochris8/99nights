/**
 * 99 Nights in the Forest
 *
 * A mythic-cozy survival adventure where players must survive 99 nights
 * to break the curse and restore the Ancient Grove.
 *
 * Built with Hytopia SDK v0.10.46
 * Phase 1: Core Foundation
 */

import {
  startServer,
  Audio,
  DefaultPlayerEntity,
  PlayerEvent,
} from 'hytopia';

import worldMap from './assets/maps/map.json';
import GameManager from './classes/managers/GameManager';

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

  // Initialize GameManager (Phase 1)
  console.log('[Server] Initializing GameManager...');
  await GameManager.instance.initialize(world);

  // Set up initial lighting (morning/day time)
  console.log('[Server] Configuring lighting...');
  world.setAmbientLightIntensity(0.7);
  world.setAmbientLightColor({ r: 255, g: 245, b: 220 }); // Warm daylight
  world.setDirectionalLightIntensity(0.8);
  world.setDirectionalLightPosition({ x: 100, y: 200, z: 100 }); // Sun position

  // Play ambient forest music
  console.log('[Server] Starting ambient music...');
  const forestMusic = new Audio({
    uri: 'audio/music/hytopia-main-theme.mp3',
    loop: true,
    volume: 0.3,
  });
  forestMusic.play(world);

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
  });

  // Show game status
  world.chatManager.registerCommand('/status', (player) => {
    const state = GameManager.instance.gameState;
    world.chatManager.sendPlayerMessage(player, '📊 Game Status:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, `   Started: ${state.isStarted ? 'Yes' : 'No'}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${state.currentNight}/99`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Phase: ${state.currentPhase}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Camp Level: ${state.campLevel}`, 'FFFFFF');
  });

  // Reset game (dev/testing)
  world.chatManager.registerCommand('/reset', (player) => {
    console.log(`[Server] Game reset by ${player.username}`);
    GameManager.instance.resetGame();
    world.chatManager.sendBroadcastMessage('🔄 Game has been reset', 'FFAA00');
  });

  // Help command
  world.chatManager.registerCommand('/help', (player) => {
    world.chatManager.sendPlayerMessage(player, '📖 Available Commands:', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '   /start - Start the game', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /status - Show game status', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /reset - Reset the game', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /debug - Toggle debug info', 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, '   /rocket - Launch into the air (fun!)', 'FFFFFF');
  });

  // Debug command
  world.chatManager.registerCommand('/debug', (player) => {
    const state = GameManager.instance.gameState;
    const playerCount = world.entityManager.getAllPlayerEntities().length;
    const entityCount = world.entityManager.getEntities().length;

    world.chatManager.sendPlayerMessage(player, '🐛 Debug Info:', 'FF00FF');
    world.chatManager.sendPlayerMessage(player, `   Players: ${playerCount}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Total Entities: ${entityCount}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Night: ${state.currentNight}`, 'FFFFFF');
    world.chatManager.sendPlayerMessage(player, `   Phase: ${state.currentPhase}`, 'FFFFFF');
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

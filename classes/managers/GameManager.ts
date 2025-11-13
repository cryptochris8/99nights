import { World, GameServer, PersistenceManager } from 'hytopia';
import type { GameState, DayPhase, ItemConfig, RecipeConfig, EnemyConfig, ZoneConfig } from '../../types/gameTypes';

/**
 * GameManager - Singleton managing global game state
 *
 * Responsibilities:
 * - Track game state (night number, phase, camp level)
 * - Start/stop game sessions
 * - Persist global game data
 * - Coordinate between other managers
 */
export default class GameManager {
  public static readonly instance = new GameManager();

  public world: World | undefined;
  public gameState: GameState = {
    isStarted: false,
    currentNight: 1,
    currentPhase: 'morning' as DayPhase,
    campLevel: 1,
  };

  // Game configuration data
  public itemsConfig: Record<string, ItemConfig> = {};
  public recipesConfig: Record<string, RecipeConfig> = {};
  public enemiesConfig: Record<string, EnemyConfig> = {};
  public zonesConfig: Record<string, ZoneConfig> = {};
  public persistenceManager: PersistenceManager;

  // Game statistics for victory screen
  public gameStats = {
    enemiesDefeated: 0,
    resourcesGathered: 0,
    timePlayed: 0,
    startTime: 0,
  };

  private constructor() {
    console.log('[GameManager] Instance created');
  }

  /**
   * Initialize the game manager with the world instance
   */
  public async initialize(world: World) {
    this.world = world;
    this.persistenceManager = PersistenceManager.instance;
    console.log('[GameManager] Initializing...');

    // Load game configuration files
    try {
      console.log('[GameManager] Loading config files...');

      const itemsData = await import('../../config/items.json');
      this.itemsConfig = (itemsData.default || itemsData) as Record<string, ItemConfig>;
      console.log(`[GameManager] Loaded ${Object.keys(this.itemsConfig).length} items`);

      const recipesData = await import('../../config/recipes.json');
      this.recipesConfig = recipesData.default || recipesData;
      console.log(`[GameManager] Loaded ${Object.keys(this.recipesConfig).length} recipes`);

      const enemiesData = await import('../../config/enemies.json');
      this.enemiesConfig = enemiesData.default || enemiesData;
      console.log(`[GameManager] Loaded ${Object.keys(this.enemiesConfig).length} enemies`);

      const zonesData = await import('../../config/zones.json');
      this.zonesConfig = zonesData.default || zonesData;
      console.log(`[GameManager] Loaded ${Object.keys(this.zonesConfig).length} zones`);
    } catch (error) {
      console.error('[GameManager] Failed to load config files:', error);
      throw new Error('GameManager: Critical error loading config files');
    }

    // Load persisted game state
    try {
      const savedState = await this.persistenceManager.getGlobalData('gameState');
      if (savedState) {
        this.gameState = savedState as unknown as GameState;
        console.log('[GameManager] Loaded saved game state:', this.gameState);
      } else {
        console.log('[GameManager] No saved state found, using defaults');
      }
    } catch (error) {
      console.log('[GameManager] Could not load saved state (expected in dev):', error);
    }

    console.log('[GameManager] Initialized successfully');
  }

  /**
   * Save current game state to persistence
   */
  public async saveGameState() {
    if (!this.world) {
      console.warn('[GameManager] Cannot save: world not initialized');
      return;
    }

    try {
      await this.persistenceManager.setGlobalData('gameState', this.gameState as any);
      console.log('[GameManager] Game state saved:', this.gameState);
    } catch (error) {
      console.error('[GameManager] Failed to save game state:', error);
    }
  }

  /**
   * Start the game
   */
  public startGame() {
    if (!this.world) {
      console.warn('[GameManager] Cannot start game: world not initialized');
      return;
    }

    if (this.gameState.isStarted) {
      console.warn('[GameManager] Game already started');
      return;
    }

    this.gameState.isStarted = true;
    this.gameState.currentNight = 1;
    this.gameState.currentPhase = 'morning' as DayPhase;

    // Initialize game statistics
    this.gameStats.startTime = Date.now();
    this.gameStats.enemiesDefeated = 0;
    this.gameStats.resourcesGathered = 0;

    console.log('[GameManager] Game started!');
    this.world.chatManager.sendBroadcastMessage('🌲 99 Nights in the Forest has begun!', '00FF00');
    this.world.chatManager.sendBroadcastMessage('🌙 Survive 99 nights to break the curse...', '00FF00');

    this.saveGameState();
  }

  /**
   * End the game
   */
  public endGame() {
    if (!this.world) {
      console.warn('[GameManager] Cannot end game: world not initialized');
      return;
    }

    const finalNight = this.gameState.currentNight;
    this.gameState.isStarted = false;

    console.log(`[GameManager] Game ended at night ${finalNight}`);
    this.world.chatManager.sendBroadcastMessage(`💀 Game Over! You survived ${finalNight} nights.`, 'FF0000');

    this.saveGameState();
  }

  /**
   * Advance to the next night
   */
  public advanceNight() {
    this.gameState.currentNight++;
    console.log(`[GameManager] Advanced to night ${this.gameState.currentNight}`);

    if (this.gameState.currentNight > 99) {
      this.victoryGame();
    } else {
      this.saveGameState();
    }
  }

  /**
   * Handle game victory (survived all 99 nights)
   */
  private victoryGame() {
    if (!this.world) return;

    console.log('[GameManager] VICTORY! 99 nights survived!');

    // Calculate time played
    this.gameStats.timePlayed = Date.now() - this.gameStats.startTime;

    // Play victory music
    import('./AudioManager').then(({ default: AudioManager }) => {
      AudioManager.instance.playVictoryMusic();
    });

    // Epic victory ceremony
    this.world.chatManager.sendBroadcastMessage('='.repeat(60), 'FFD700');
    this.world.chatManager.sendBroadcastMessage('', 'FFFFFF');
    this.world.chatManager.sendBroadcastMessage('🎉✨ VICTORY! ✨🎉', 'FFD700');
    this.world.chatManager.sendBroadcastMessage('', 'FFFFFF');
    this.world.chatManager.sendBroadcastMessage('You have survived all 99 nights!', 'FFFFFF');
    this.world.chatManager.sendBroadcastMessage('The curse is broken!', '00FF00');
    this.world.chatManager.sendBroadcastMessage('The Ancient Grove has been restored!', '00FF00');
    this.world.chatManager.sendBroadcastMessage('', 'FFFFFF');
    this.world.chatManager.sendBroadcastMessage('🌲 Peace returns to the forest... 🌲', '00FF00');
    this.world.chatManager.sendBroadcastMessage('', 'FFFFFF');
    this.world.chatManager.sendBroadcastMessage('='.repeat(60), 'FFD700');

    // Award all players with XP bonus
    const allPlayers = this.world.entityManager.getAllPlayerEntities();
    for (const playerEntity of allPlayers) {
      const gamePlayer = playerEntity as any;
      if (gamePlayer.addXP) {
        gamePlayer.addXP(1000); // Huge XP reward
        if (gamePlayer.player) {
          this.world.chatManager.sendPlayerMessage(
            gamePlayer.player,
            '🌟 +1000 XP for completing the game!',
            'FFD700'
          );
        }
      }
    }

    this.gameState.isStarted = false;
    this.saveGameState();

    // Stop time cycle
    import('./TimeManager').then(({ default: TimeManager }) => {
      TimeManager.instance.stop();
    });
  }

  /**
   * Update the current day phase
   */
  public setPhase(phase: DayPhase) {
    const oldPhase = this.gameState.currentPhase;
    this.gameState.currentPhase = phase;

    if (oldPhase !== phase) {
      console.log(`[GameManager] Phase changed: ${oldPhase} -> ${phase}`);
    }
  }

  /**
   * Increment enemies defeated stat
   */
  public incrementEnemiesDefeated() {
    this.gameStats.enemiesDefeated++;
  }

  /**
   * Increment resources gathered stat
   */
  public incrementResourcesGathered() {
    this.gameStats.resourcesGathered++;
  }

  /**
   * Get current play time in milliseconds
   */
  public getPlayTime(): number {
    if (this.gameStats.startTime === 0) return 0;
    return Date.now() - this.gameStats.startTime;
  }

  /**
   * Upgrade camp level
   */
  public upgradeCamp() {
    this.gameState.campLevel++;
    console.log(`[GameManager] Camp upgraded to level ${this.gameState.campLevel}`);

    if (this.world) {
      this.world.chatManager.sendBroadcastMessage(
        `⛺ Camp upgraded to Level ${this.gameState.campLevel}!`,
        'FFFF00'
      );
    }

    this.saveGameState();
  }

  /**
   * Reset game to initial state (dev/testing)
   */
  public resetGame() {
    this.gameState = {
      isStarted: false,
      currentNight: 1,
      currentPhase: 'morning' as DayPhase,
      campLevel: 1,
    };

    console.log('[GameManager] Game reset to initial state');
    this.saveGameState();
  }
}

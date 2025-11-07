import { World, GameServer, PersistenceManager } from 'hytopia';
import type { GameState, DayPhase } from '../../types/gameTypes';

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

  private constructor() {
    console.log('[GameManager] Instance created');
  }

  /**
   * Initialize the game manager with the world instance
   */
  public async initialize(world: World) {
    this.world = world;
    console.log('[GameManager] Initializing...');

    // Load persisted game state
    try {
      const savedState = await PersistenceManager.instance.getGlobalData('gameState');
      if (savedState) {
        this.gameState = savedState as GameState;
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
      await PersistenceManager.instance.setGlobalData('gameState', this.gameState);
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
    this.world.chatManager.sendBroadcastMessage('🎉 VICTORY! You have broken the curse!', 'FFD700');
    this.world.chatManager.sendBroadcastMessage('🌟 The Ancient Grove is restored!', 'FFD700');

    this.gameState.isStarted = false;
    this.saveGameState();
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

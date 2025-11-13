import { World, PlayerManager } from 'hytopia';
import { DayPhase } from '../../types/gameTypes';
import GameManager from './GameManager';
import AudioManager from './AudioManager';
import NightManager from './NightManager';

/**
 * TimeManager - Manages the 14-minute day/night cycle
 *
 * Cycle breakdown:
 * - Morning: 4 minutes (gathering, crafting, NPC interactions)
 * - Afternoon: 3 minutes (exploration, finding runes)
 * - Evening: 1 minute (warning, prepare defenses)
 * - Night: 5 minutes (enemy waves, defend camp)
 * - Dawn: 1 minute (rewards, healing, progression)
 *
 * Total: 14 minutes per full cycle
 */

const CYCLE_DURATION_MS = 14 * 60 * 1000; // 14 minutes

const PHASE_DURATIONS_MS = {
  [DayPhase.MORNING]: 4 * 60 * 1000,   // 4 minutes
  [DayPhase.AFTERNOON]: 3 * 60 * 1000, // 3 minutes
  [DayPhase.EVENING]: 1 * 60 * 1000,   // 1 minute
  [DayPhase.NIGHT]: 5 * 60 * 1000,     // 5 minutes
  [DayPhase.DAWN]: 1 * 60 * 1000,      // 1 minute
};

// Lighting configurations for each phase
const LIGHTING_CONFIGS = {
  [DayPhase.MORNING]: {
    ambient: { intensity: 0.7, color: { r: 255, g: 245, b: 220 } }, // Warm daylight
    directional: { intensity: 0.8, position: { x: 100, y: 200, z: 100 } },
  },
  [DayPhase.AFTERNOON]: {
    ambient: { intensity: 0.9, color: { r: 255, g: 255, b: 240 } }, // Bright white
    directional: { intensity: 1.0, position: { x: 0, y: 200, z: 100 } },
  },
  [DayPhase.EVENING]: {
    ambient: { intensity: 0.5, color: { r: 255, g: 180, b: 120 } }, // Orange sunset
    directional: { intensity: 0.6, position: { x: -50, y: 150, z: 100 } },
  },
  [DayPhase.NIGHT]: {
    ambient: { intensity: 0.2, color: { r: 100, g: 120, b: 180 } }, // Cool blue night
    directional: { intensity: 0.3, position: { x: -100, y: 100, z: 100 } },
  },
  [DayPhase.DAWN]: {
    ambient: { intensity: 0.4, color: { r: 255, g: 200, b: 180 } }, // Pink/orange dawn
    directional: { intensity: 0.5, position: { x: 50, y: 180, z: 100 } },
  },
};

export default class TimeManager {
  public static readonly instance = new TimeManager();

  private world: World | undefined;
  private currentPhase: DayPhase = DayPhase.MORNING;
  private elapsedMs: number = 0;
  private lastTickTime: number = Date.now();
  private tickInterval: NodeJS.Timeout | undefined;
  private _isRunning: boolean = false;

  private constructor() {
    console.log('[TimeManager] Instance created');
  }

  /**
   * Check if the time cycle is currently running
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Initialize the time manager with the world instance
   */
  public initialize(world: World) {
    this.world = world;
    console.log('[TimeManager] Initialized');
  }

  /**
   * Start the day/night cycle
   */
  public start() {
    if (this._isRunning) {
      console.warn('[TimeManager] Already running');
      return;
    }

    if (!this.world) {
      console.error('[TimeManager] Cannot start: world not initialized');
      return;
    }

    this._isRunning = true;
    this.elapsedMs = 0;
    this.currentPhase = DayPhase.MORNING;
    this.lastTickTime = Date.now();

    console.log('[TimeManager] Starting day/night cycle');
    this.world.chatManager.sendBroadcastMessage('☀️ The day begins...', 'FFFF00');

    // Update lighting immediately
    this.updateLighting();

    // Start tick loop (update every second)
    this.tickInterval = setInterval(() => this.tick(), 1000);
  }

  /**
   * Stop the day/night cycle
   */
  public stop() {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    console.log('[TimeManager] Stopped');
  }

  /**
   * Main tick function - called every second
   */
  private tick() {
    if (!this.world || !this._isRunning) return;

    const now = Date.now();
    const delta = now - this.lastTickTime;
    this.lastTickTime = now;

    this.elapsedMs += delta;

    // Check for phase changes
    const newPhase = this.calculatePhase();
    if (newPhase !== this.currentPhase) {
      this.onPhaseChange(newPhase);
    }

    // Smooth lighting updates
    this.updateLighting();
  }

  /**
   * Calculate current phase based on elapsed time
   */
  private calculatePhase(): DayPhase {
    let accumulated = 0;
    const phases = Object.keys(PHASE_DURATIONS_MS) as DayPhase[];

    for (const phase of phases) {
      accumulated += PHASE_DURATIONS_MS[phase];
      if (this.elapsedMs < accumulated) {
        return phase;
      }
    }

    // Cycle complete, reset to morning and advance night
    this.elapsedMs = 0;
    this.onCycleComplete();
    return DayPhase.MORNING;
  }

  /**
   * Handle phase change
   */
  private onPhaseChange(newPhase: DayPhase) {
    const oldPhase = this.currentPhase;
    this.currentPhase = newPhase;

    console.log(`[TimeManager] Phase change: ${oldPhase} -> ${newPhase}`);

    // Update GameManager
    GameManager.instance.setPhase(newPhase);

    // Update music for new phase
    AudioManager.instance.updateMusicForPhase(newPhase);

    // Announce phase change to players
    this.announcePhaseChange(newPhase);

    // Send UI updates to all players
    this.broadcastGameInfo();

    // Send phase banner to all players
    this.broadcastPhaseBanner(newPhase);

    // Handle special phase transitions
    if (newPhase === DayPhase.NIGHT) {
      this.onNightBegin();
    } else if (newPhase === DayPhase.DAWN) {
      this.onNightEnd();
    } else if (newPhase === DayPhase.EVENING) {
      this.onEveningWarning();
    }
  }

  /**
   * Announce phase change to players
   */
  private announcePhaseChange(phase: DayPhase) {
    if (!this.world) return;

    const messages = {
      [DayPhase.MORNING]: { text: '☀️ Morning has arrived. Gather resources and prepare.', color: 'FFFF00' },
      [DayPhase.AFTERNOON]: { text: '🌤️ Afternoon. Time to explore and discover.', color: 'FFD700' },
      [DayPhase.EVENING]: { text: '🌅 Evening approaches. Night is coming soon!', color: 'FF8800' },
      [DayPhase.NIGHT]: { text: '🌙 NIGHT FALLS! The shadows awaken...', color: 'FF0000' },
      [DayPhase.DAWN]: { text: '🌄 Dawn breaks. You survived the night!', color: '00FF00' },
    };

    const msg = messages[phase];
    this.world.chatManager.sendBroadcastMessage(msg.text, msg.color);
  }

  /**
   * Handle evening warning (1 minute before night)
   */
  private onEveningWarning() {
    if (!this.world) return;

    console.log('[TimeManager] Evening warning - Night approaches');
    this.world.chatManager.sendBroadcastMessage('⚠️  Night is approaching! Prepare your defenses!', 'FF0000');
  }

  /**
   * Handle night beginning
   */
  private onNightBegin() {
    if (!this.world) return;

    const nightNumber = GameManager.instance.gameState.currentNight;
    console.log(`[TimeManager] Night ${nightNumber} begins`);

    // Night-specific announcements
    this.world.chatManager.sendBroadcastMessage('='.repeat(50), 'FF0000');
    this.world.chatManager.sendBroadcastMessage(`🌙 NIGHT ${nightNumber} BEGINS`, 'FF0000');
    this.world.chatManager.sendBroadcastMessage('='.repeat(50), 'FF0000');

    // Start enemy spawning
    NightManager.instance.startNight(nightNumber);
  }

  /**
   * Handle night ending (dawn)
   */
  private onNightEnd() {
    if (!this.world) return;

    const nightNumber = GameManager.instance.gameState.currentNight;
    console.log(`[TimeManager] Night ${nightNumber} ended`);

    this.world.chatManager.sendBroadcastMessage('🌄 You survived the night!', '00FF00');
    this.world.chatManager.sendBroadcastMessage(`✨ Night ${nightNumber} complete`, '00FF00');

    // Stop enemy spawning
    NightManager.instance.endNight();

    // TODO Phase 5: Reward players with XP
  }

  /**
   * Handle full cycle completion (14 minutes)
   */
  private onCycleComplete() {
    console.log('[TimeManager] Cycle complete - advancing to next night');

    const previousNight = GameManager.instance.gameState.currentNight;

    // Advance to next night
    GameManager.instance.advanceNight();

    const nextNight = GameManager.instance.gameState.currentNight;
    console.log(`[TimeManager] Starting night ${nextNight}`);

    // Check for victory (completed Night 99)
    if (previousNight === 99 && nextNight === 100) {
      this.onVictory();
    }
  }

  /**
   * Handle victory condition (completed all 99 nights)
   */
  private onVictory() {
    if (!this.world) return;

    console.log('[TimeManager] VICTORY! Player completed all 99 nights!');

    // Stop the time cycle
    this.stop();

    // Get game statistics from GameManager
    const gameManager = GameManager.instance;
    const stats = {
      nightsSurvived: 99,
      enemiesDefeated: gameManager.gameStats.enemiesDefeated,
      resourcesGathered: gameManager.gameStats.resourcesGathered,
      bossesDefeated: 5, // Fixed: 5 boss nights (10, 25, 50, 75, 99)
      finalLevel: 1, // Will be populated from player data
      timePlayed: gameManager.getPlayTime(),
    };

    // Broadcast victory to all players
    const players = this.world.entityManager.getAllPlayerEntities();
    for (const playerEntity of players) {
      const player = (playerEntity as any).player;
      if (player?.ui) {
        // Update final level from player entity
        const playerStats = { ...stats, finalLevel: (playerEntity as any).level || 1 };

        player.ui.sendData({
          type: 'victory',
          stats: playerStats,
        });
      }
    }

    // Broadcast chat message
    this.world.chatManager.sendBroadcastMessage('='.repeat(60), 'FFD700');
    this.world.chatManager.sendBroadcastMessage('🎉🎉🎉 VICTORY ACHIEVED! 🎉🎉🎉', 'FFD700');
    this.world.chatManager.sendBroadcastMessage('You survived all 99 nights in the forest!', 'FFD700');
    this.world.chatManager.sendBroadcastMessage('='.repeat(60), 'FFD700');

    // Play victory music
    import('./AudioManager').then(({ default: AudioManager }) => {
      // TODO: Add victory music track
      AudioManager.instance.switchMusic('day'); // Use day music for now
    });
  }

  /**
   * Update world lighting based on current phase
   * Hytopia automatically interpolates these changes smoothly
   */
  private updateLighting() {
    if (!this.world) return;

    const config = LIGHTING_CONFIGS[this.currentPhase];

    // Set ambient light
    this.world.setAmbientLightIntensity(config.ambient.intensity);
    this.world.setAmbientLightColor(config.ambient.color);

    // Set directional light (sun/moon)
    this.world.setDirectionalLightIntensity(config.directional.intensity);
    this.world.setDirectionalLightPosition(config.directional.position);
  }

  /**
   * Get current phase
   */
  public getCurrentPhase(): DayPhase {
    return this.currentPhase;
  }

  /**
   * Get time remaining in current phase (in seconds)
   */
  public getTimeRemainingInPhase(): number {
    let accumulated = 0;
    const phases = Object.keys(PHASE_DURATIONS_MS) as DayPhase[];

    for (const phase of phases) {
      accumulated += PHASE_DURATIONS_MS[phase];
      if (phase === this.currentPhase) {
        const remaining = accumulated - this.elapsedMs;
        return Math.max(0, Math.floor(remaining / 1000));
      }
    }

    return 0;
  }

  /**
   * Get progress through current cycle (0-1)
   */
  public getCycleProgress(): number {
    return Math.min(1, this.elapsedMs / CYCLE_DURATION_MS);
  }

  /**
   * Skip to next phase (dev/testing)
   */
  public skipToNextPhase() {
    if (!this.isRunning) return;

    const phases = [DayPhase.MORNING, DayPhase.AFTERNOON, DayPhase.EVENING, DayPhase.NIGHT, DayPhase.DAWN];
    const currentIndex = phases.indexOf(this.currentPhase);
    const nextPhase = phases[(currentIndex + 1) % phases.length];

    console.log(`[TimeManager] Skipping to ${nextPhase}`);
    this.elapsedMs = 0;

    for (let i = 0; i <= currentIndex; i++) {
      this.elapsedMs += PHASE_DURATIONS_MS[phases[i]];
    }

    this.onPhaseChange(nextPhase);
  }

  /**
   * Broadcast game info to all players' UIs
   */
  private broadcastGameInfo() {
    if (!this.world) return;

    const nightNumber = GameManager.instance.gameState.currentNight;
    const players = PlayerManager.instance.getConnectedPlayersByWorld(this.world);

    for (const player of players) {
      player.ui.sendData({
        type: 'game_info',
        night: nightNumber,
        phase: this.currentPhase,
      });
    }
  }

  /**
   * Send phase banner to all players
   */
  private broadcastPhaseBanner(phase: DayPhase) {
    if (!this.world) return;

    const phaseBanners: Record<DayPhase, { title: string; subtitle: string }> = {
      [DayPhase.MORNING]: { title: '☀️ MORNING', subtitle: 'Gather resources and prepare' },
      [DayPhase.AFTERNOON]: { title: '🌤️ AFTERNOON', subtitle: 'Time to explore and expand' },
      [DayPhase.EVENING]: { title: '🌅 EVENING', subtitle: 'Night is approaching...' },
      [DayPhase.NIGHT]: { title: '🌙 NIGHT FALLS', subtitle: 'Defend yourself!' },
      [DayPhase.DAWN]: { title: '🌄 DAWN', subtitle: 'You survived the night!' },
    };

    const banner = phaseBanners[phase];
    const players = PlayerManager.instance.getConnectedPlayersByWorld(this.world);

    for (const player of players) {
      player.ui.sendData({
        type: 'phase_change',
        title: banner.title,
        subtitle: banner.subtitle,
      });
    }
  }
}

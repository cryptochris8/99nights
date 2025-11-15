import { Audio, World, Vector3Like } from 'hytopia';
import { DayPhase } from '../../types/gameTypes';

/**
 * AudioManager - Manages background music and ambient sounds
 *
 * Music States:
 * - Day (Morning/Afternoon): Peaceful forest ambience
 * - Evening: Tension building
 * - Night: Dark, foreboding atmosphere
 * - Boss: Epic combat music
 * - Victory: Triumphant theme
 */

type MusicState = 'day' | 'evening' | 'night' | 'boss' | 'victory';

const MUSIC_TRACKS: Record<MusicState, { uri: string; volume: number }> = {
  day: {
    uri: 'audio/music/hytopia-main-theme.mp3',
    volume: 0.3,
  },
  evening: {
    uri: 'audio/music/hytopia-main-theme.mp3', // Same as day for now
    volume: 0.25,
  },
  night: {
    uri: 'audio/music/night-theme-looping.mp3',
    volume: 0.4,
  },
  boss: {
    uri: 'audio/music/creepy-night-theme-looping.mp3',
    volume: 0.5,
  },
  victory: {
    uri: 'audio/music/hytopia-main-theme.mp3',
    volume: 0.4,
  },
};

export default class AudioManager {
  public static readonly instance = new AudioManager();

  private world: World | undefined;
  private currentMusic: Audio | undefined;
  private currentState: MusicState = 'day';
  private musicByState: Map<MusicState, Audio> = new Map();

  private constructor() {
    console.log('[AudioManager] Instance created');
  }

  /**
   * Initialize the audio manager with the world instance
   */
  public initialize(world: World) {
    this.world = world;
    console.log('[AudioManager] Initializing...');

    // Preload all music tracks
    this.preloadMusic();

    console.log('[AudioManager] Initialized successfully');
  }

  /**
   * Preload all music tracks into memory
   */
  private preloadMusic() {
    if (!this.world) return;

    Object.entries(MUSIC_TRACKS).forEach(([state, config]) => {
      const audio = new Audio({
        uri: config.uri,
        loop: true,
        volume: config.volume,
      });

      this.musicByState.set(state as MusicState, audio);
    });

    console.log(`[AudioManager] Preloaded ${this.musicByState.size} music tracks`);
  }

  /**
   * Start playing background music
   */
  public start() {
    if (!this.world) {
      console.error('[AudioManager] Cannot start: world not initialized');
      return;
    }

    console.log('[AudioManager] Starting background music');
    this.switchMusic('day');
  }

  /**
   * Stop all music
   */
  public stop() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic = undefined;
    }

    console.log('[AudioManager] Music stopped');
  }

  /**
   * Switch to a different music state
   */
  public switchMusic(state: MusicState) {
    if (!this.world) return;

    // Don't switch if already playing this state
    if (this.currentState === state && this.currentMusic) {
      return;
    }

    console.log(`[AudioManager] Switching music: ${this.currentState} -> ${state}`);

    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.pause();
    }

    // Start new music
    const newMusic = this.musicByState.get(state);
    if (newMusic) {
      newMusic.play(this.world);
      this.currentMusic = newMusic;
      this.currentState = state;
    } else {
      console.warn(`[AudioManager] No music found for state: ${state}`);
    }
  }

  /**
   * Update music based on day phase
   */
  public updateMusicForPhase(phase: DayPhase) {
    const stateMap: Record<DayPhase, MusicState> = {
      [DayPhase.MORNING]: 'day',
      [DayPhase.AFTERNOON]: 'day',
      [DayPhase.EVENING]: 'evening',
      [DayPhase.NIGHT]: 'night',
      [DayPhase.DAWN]: 'day',
    };

    const newState = stateMap[phase];
    this.switchMusic(newState);
  }

  /**
   * Play boss music
   */
  public playBossMusic() {
    this.switchMusic('boss');
  }

  /**
   * Play victory music
   */
  public playVictoryMusic() {
    this.switchMusic('victory');
  }

  /**
   * Play a one-shot sound effect
   */
  public playSFX(sfxUri: string, volume: number = 1.0, position?: Vector3Like) {
    if (!this.world) return;

    const sfx = new Audio({
      uri: sfxUri,
      loop: false,
      volume: volume,
      ...(position && {
        position: position,
        referenceDistance: 20,
      }),
    });

    sfx.play(this.world);
  }

  /**
   * Play ambient sound at a location
   */
  public playAmbientSound(soundUri: string, position: Vector3Like, volume: number = 0.5, referenceDistance: number = 20) {
    if (!this.world) return;

    const ambient = new Audio({
      uri: soundUri,
      loop: true,
      volume: volume,
      position: position,
      referenceDistance: referenceDistance,
    });

    ambient.play(this.world);
    return ambient;
  }

  /**
   * Get current music state
   */
  public getCurrentState(): MusicState {
    return this.currentState;
  }
}

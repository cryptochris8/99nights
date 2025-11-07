### ✅ One-Shot Scaffold Prompt (copy everything below)

```
You are an expert Hytopia game engineer and tools builder. 
Create a new TypeScript Hytopia project scaffold for the game “99 Nights in the Forest” with a clean, data-driven architecture.

# CONSTRAINTS
- Prefer modular, system-oriented code. 
- Keep engine calls behind clearly-marked “// TODO: HytopiaAPI” stubs so I can wire the real SDK later.
- All paths are relative to /game.
- Use ESM TypeScript.
- Provide small, valid starter JSON content (not huge).
- Include a minimal README with run notes.
- Add a simple “tick loop” demo illustrating day/night transitions and spawning calls (stubbed).
- Include a few quick tests that simulate one night.

# FILE TREE
Create exactly this tree (and populate all files):

/game
  README.md
  tsconfig.json
  package.json
  /scripts
    /core
      EventBus.ts
      RNG.ts
      SaveStore.ts
      MathUtil.ts
    /time
      TimeManager.ts
      WeatherController.ts
    /world
      ZoneRegistry.ts
      SpawnManager.ts
      LootSystem.ts
      Interactables.ts
      ShrineFastTravel.ts
    /ai
      AIState.ts
      EnemyController.ts
      ThreatDirector.ts
      BehaviorTrees.ts
    /combat
      DamageSystem.ts
      StatusEffects.ts
      Hitbox.ts
      ThreatTags.ts
    /runes
      RuneSystem.ts
      Abilities.ts
      AbilityDefs.ts
    /craft
      Inventory.ts
      Items.ts
      Recipes.ts
      CraftingSystem.ts
      BuildSystem.ts
      CampUpgrades.ts
    /nights
      NightDirector.ts
      WaveScheduler.ts
      RitualNight.ts
    /audio
      AudioBus.ts
      MusicDirector.ts
      SFXEvents.ts
    /ui
      HUD.ts
      CraftingUI.ts
      RuneWheelUI.ts
      BuildUI.ts
      NightBanner.ts
      DialogueUI.ts
    /meta
      Cosmetics.ts
      MarketplaceHooks.ts
      Achievements.ts
    /demo
      main.ts
  /data
    items.json
    recipes.json
    enemies.json
    waves.json
    runes.json
    loot_tables.json
    zones.json
    npcs.json
    camp_upgrades.json
  /prefabs
    /player
      Player.prefab
    /enemies
      Wispling.prefab
      FeralSprout.prefab
      ShadowWolf.prefab
      HollowStag.prefab
      ObsidianWraith.prefab
    /structures
      Campfire.prefab
      Workbench.prefab
      RuneAltar.prefab
      Wall_T1.prefab
      Trap_Snare.prefab
      Ward_Totem.prefab
      Shrine.prefab
    /interactables
      Tree_Oak.prefab
      Rock_Granite.prefab
      Herb_Glowcap.prefab
      FishingSpot.prefab
    /fx
      DaylightProbe.prefab
      NightFog.prefab
      Moonbeam.prefab
      CleanseBurst.prefab
  /tests
    TestWaves.ts
    TestCrafting.ts
    TestSaveLoad.ts
  /net
    AuthorityGuards.ts
    RPC.ts

# FILE CONTENTS

## /game/README.md
Provide:
- Project overview
- Quick start (npm scripts: build, dev, test)
- Where to wire Hytopia API calls
- How to run the demo tick loop

## /game/tsconfig.json
Reasonable TS config targeting ES2022, moduleResolution node16, strict true, outDir ./dist, rootDir ./.

## /game/package.json
Scripts:
- "build": tsc
- "dev": tsx scripts/demo/main.ts
- "test": tsx tests/TestWaves.ts && tsx tests/TestCrafting.ts && tsx tests/TestSaveLoad.ts
Deps: none required beyond "tsx" and "typescript" as devDependencies.

## CORE

### /scripts/core/EventBus.ts
Implement a tiny typed event bus with `on`, `off`, `emit`. Export `EV` constants:
- NIGHT_BEGIN, NIGHT_END, ENEMY_KILLED, CRAFT_DONE, CAMP_UPGRADE, BOSS_DEFEATED

### /scripts/core/RNG.ts
Seeded RNG with mulberry32 or xorshift. Constructor accepts seed number/string. Methods: next(), range(min,max), pick<T>(arr).

### /scripts/core/SaveStore.ts
Key-value in-memory store with namespaced getters/setters. Stub TODOs for replacing with Hytopia cloud storage:
```ts
// TODO: Replace with HytopiaAPI.storage when integrating.
```

### /scripts/core/MathUtil.ts
Clamp, lerp, vec helpers as needed.

## TIME

### /scripts/time/TimeManager.ts
Implements a 14-minute full cycle demo with properties:
- dayLengthSec = 14*60
- nightStart = 10*60
- dawnStart = 10*60 + 5*60
Tracks isNight; emits EV.NIGHT_BEGIN/EV.NIGHT_END. Method applyLighting() has a TODO with comments for Hytopia environment lerp.

### /scripts/time/WeatherController.ts
Stub weather states: Clear, Mist, Moonlit. Expose setWeather(state) and getWeather(). Hook into TimeManager events in comments.

## WORLD

### /scripts/world/ZoneRegistry.ts
Load zones from /data/zones.json; provide `getZoneById`, `samplePoint(zoneId)`, and `sampleRing(rMin,rMax)` around camp=(0,0).

### /scripts/world/SpawnManager.ts
Spawn enemy by id using /data/enemies.json; TODO comments where engine spawning will occur. For now, log spawn intents.

### /scripts/world/LootSystem.ts
Resolve loot tables in /data/loot_tables.json with RNG. Return drops array.

### /scripts/world/Interactables.ts
Basic gatherable interface for trees/rocks/herbs with respawn timers (stub logic).

### /scripts/world/ShrineFastTravel.ts
Track discovered shrine IDs; unlock & list travelable shrines.

## AI

### /scripts/ai/AIState.ts
Export enum AIState { Idle, Patrol, Chase, Attack, Flee, Dead }

### /scripts/ai/EnemyController.ts
Minimal state machine with tick(dt) and TODOs for navigation/aggro. Accepts config from enemies.json.

### /scripts/ai/ThreatDirector.ts
Configure night difficulty using waves.json scaling. Compose squads using RNG. Plan orders and call SpawnManager. Clear on stop().

### /scripts/ai/BehaviorTrees.ts
Placeholders for future BT nodes (SeekTarget, KeepDistance, PackFlank).

## COMBAT

### /scripts/combat/DamageSystem.ts
Export applyDamage(targetId, amount, element) with TODO authority note. Element union: "nature" | "spirit" | "shadow".

### /scripts/combat/StatusEffects.ts
Simple effect registry (snare, slow, root) with durations.

### /scripts/combat/Hitbox.ts
Stub collider/hitbox link (with comments on how to bind to engine physics).

### /scripts/combat/ThreatTags.ts
String tags for team/faction: "Player", "Enemy", "Neutral", etc.

## RUNES

### /scripts/runes/RuneSystem.ts
Track active/passive rune ids, cooldowns map. cast(id, ctx) dispatches to Abilities.

### /scripts/runes/Abilities.ts
Switch on effect type: spawn_aoi_snare, damage_aoe, stamina_regen (log actions now; TODO engine FX/spawn hooks).

### /scripts/runes/AbilityDefs.ts
Helper to compute numeric magnitudes from runes.json.

## CRAFT

### /scripts/craft/Inventory.ts
24-slot inventory with add/remove/count and simple stacking.

### /scripts/craft/Items.ts
Load items.json, provide lookup helpers.

### /scripts/craft/Recipes.ts
Load recipes.json, provide find(recipeId).

### /scripts/craft/CraftingSystem.ts
tryCraft(recipeId, inv): validates inputs, simulates time delay (setTimeout) then outputs and emits EV.CRAFT_DONE.

### /scripts/craft/BuildSystem.ts
Placement validator (camp bounds), server-side TODO guards.

### /scripts/craft/CampUpgrades.ts
Unlock structures based on camp level and nights survived. Reads camp_upgrades.json.

## NIGHTS

### /scripts/nights/NightDirector.ts
Holds currentNight in SaveStore (key "world.currentNight"). On NIGHT_BEGIN -> start waves; on NIGHT_END -> stop waves and increment night + save.

### /scripts/nights/WaveScheduler.ts
startNight(n), stop(). Combines explicit “nights” overrides and procedural fill from waves.json using ThreatDirector.

### /scripts/nights/RitualNight.ts
Boss helper: schedule boss + minions; hook for cinematic banner.

## AUDIO

### /scripts/audio/AudioBus.ts
Centralized playSFX(name), playMusic(state), with TODOs to swap for real engine audio.

### /scripts/audio/MusicDirector.ts
State machine: "Day", "Dusk", "Night", "Boss". Subscribes to EV.

### /scripts/audio/SFXEvents.ts
Helper triggers for crafting complete, shrine unlock, boss roar.

## UI

### /scripts/ui/HUD.ts
Console print of health/stamina/time-of-day for the demo.

### /scripts/ui/CraftingUI.ts
Console UI that lists recipes + triggers CraftingSystem.tryCraft().

### /scripts/ui/RuneWheelUI.ts
Stub: register/cast rune by id.

### /scripts/ui/BuildUI.ts
Stub: attempt structure placement (logs).

### /scripts/ui/NightBanner.ts
Print “Night X begins/ends” + boss warnings.

### /scripts/ui/DialogueUI.ts
Stub convo panels with Elder Mira sample lines.

## META

### /scripts/meta/Cosmetics.ts
Slots: head, cloak, weapon_trail, pet, camp_theme.

### /scripts/meta/MarketplaceHooks.ts
showShop(category), grantCosmetic(playerId, sku), equipCosmetic(slot,id). TODO for Hytopia marketplace wiring.

### /scripts/meta/Achievements.ts
Track simple milestones (Night10/Night20/Night30).

## DEMO

### /scripts/demo/main.ts
- Import TimeManager, NightDirector, WaveScheduler, ThreatDirector, SpawnManager, SaveStore, EventBus, EV.
- Create instances and a simple 60 FPS tick loop using setInterval(1000/10) for fast demo.
- Simulate one full day/night cycle in ~60 seconds by temporarily scaling times (override TimeManager for demo).
- Log: lighting state, “enemies spawned,” “craft completed” when invoked.
- Provide a sample “press c to craft torch” and “press r to cast rune” using stdin listener if available; otherwise simulate actions on timers.

## DATA (provide small, valid samples)
- items.json: wood, stone, herb_glowcap, rune_dust, torch, ward_totem_t1
- recipes.json: craft_torch, build_ward_totem_t1 (placeable=true)
- runes.json: rune_vine_snare, rune_moonlight_burst, rune_ember_leaf
- enemies.json: wispling, feral_sprout, shadow_wolf
- waves.json: base config + nights overrides 1/3/7/10; scaling numbers
- loot_tables.json: wispling_basic, wolf_corrupt
- zones.json: spawn_clearing, crystal_stream, whispering_glade
- npcs.json: elder_mira, bram
- camp_upgrades.json: camp_t1, camp_t2

## PREFABS (placeholders)
All .prefab files contain a JSON object with a “name” field and expected component stubs.

## NET
- AuthorityGuards.ts: input validation skeletons.
- RPC.ts: rpc_playerCastRune, rpc_requestCraft, rpc_placeStructure (logging only).

## TESTS
- TestWaves.ts: plan squads for night 1 and 10 (assert not empty).
- TestCrafting.ts: craft torch via timer then assert inventory changed.
- TestSaveLoad.ts: set/get world.currentNight within same process instance.

# FINAL TOUCHES
At the end of generation, print:
- Next Steps checklist for wiring real Hytopia API calls (environment lighting, spawn, audio, storage, marketplace).
- A short “Run it” section:
  1) npm i
  2) npm run dev
- A short “Where to plug in the engine” section referencing TODO comments.

Generate all files now.
```

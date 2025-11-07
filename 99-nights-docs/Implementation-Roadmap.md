# 🚧 Implementation Roadmap (Hytopia SDK)

## 0) Principles
Data-driven JSON content, thin entities + reusable systems, server/host authority, deterministic nights, composable content.

## 1) Project Structure
```
/game
  /scripts (core, time, world, ai, combat, runes, craft, nights, audio, ui, meta, demo)
  /data (items, recipes, enemies, waves, runes, loot_tables, zones, npcs, camp_upgrades)
  /prefabs (player, enemies, structures, interactables, fx)
  /tests
  /net
```
*(See Scaffold Prompt for exact tree.)*

## 2) Prefabs & Entities
- **Player**: Health, Stamina, Inventory(24), AbilitySlots(3), RuneSlots(3), BuildTool, InteractionRay, CosmeticSlots.  
- **Enemies**: Wispling, ShadowWolf, HollowStag, ObsidianWraith (AI states + loot tables).  
- **Structures**: RuneAltar, Campfire, WardTotem, Walls, Traps, Shrine.  
- **Interactables**: Trees, Rocks, Herbs, FishingSpot.

## 3) Core Data Schemas (samples)
- `items.json`, `recipes.json`, `runes.json`, `enemies.json`, `waves.json`, `loot_tables.json`, `zones.json`, `camp_upgrades.json`, `npcs.json` with small, valid examples.

## 4) Key Systems (TypeScript Skeletons)
- **EventBus/EV** — global decoupled events.  
- **TimeManager** — 14-min cycle, emits NIGHT_BEGIN/END, lighting lerp TODO.  
- **NightDirector/WaveScheduler/ThreatDirector** — start/stop nights, difficulty scaling, squad composition, spawn orders.  
- **SpawnManager** — spawn intents → engine API (TODO).  
- **Inventory/CraftingSystem** — recipes + timers + EV.CRAFT_DONE.  
- **RuneSystem/Abilities** — active/passive runes with cooldowns.  
- **DamageSystem/StatusEffects** — elemental damage; snare/slow/root.  
- **SaveStore** — in-memory now, TODO cloud storage.  
- **UI stubs** — HUD, CraftingUI, RuneWheel, BuildUI, NightBanner, Dialogue.

## 5) Networking & Authority
Authoritative systems: time, nights, spawns, damage, loot. RPCs: cast rune, craft, place structure. Guards validate inventory, placement, rate limits.

## 6) Balancing
Threat = base + night*k; co-op multiplier. Boss every 10 nights with minions & weather affixes. Loot tiers common/uncommon/rare.

## 7) Marketplace
Cosmetic slots: head, cloak, weapon_trail, pet, camp_theme. Hooks to show shop, grant SKUs, equip cosmetics. Keep buffs light/QOL.

## 8) Audio & Music
`MusicDirector` states: Day/Dusk/Night/Boss. `SFXEvents` for craft complete, shrine unlock, boss roar. Ambient layers via TimeManager.

## 9) QA Checklist
- Day/Night reliability, spawn caps, despawns  
- Craft consume/produce, timers handle disconnects  
- Save/load night index, camp level, shrines, inventory, runes  
- Boss nights end correctly; no soft-locks  
- Net guards; late-join sync; performance caps (AI tick throttle)

## 10) Milestones (6 Weeks)
- W1 Foundations  
- W2 Craft & Build  
- W3 Enemies & Combat  
- W4 Nights & Waves  
- W5 Progression & Camp  
- W6 Polish & Monetization

## 11) Today’s First Steps
1) Create scaffolding files.  
2) Implement EventBus, TimeManager, NightDirector (skeleton).  
3) Place Campfire, Workbench, RuneAltar in Spawn Clearing.  
4) Wire CraftingSystem to craft Torch.  
5) Spawn 6 Wisplings on Night 1 using SpawnManager.

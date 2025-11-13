# Detailed Game Summary: 99 Nights in the Forest

## Game Overview
**"99 Nights in the Forest"** is a mythic-cozy survival adventure game built with the Hytopia SDK v0.11.2. The core premise is that players are trapped in a cursed Ancient Grove and must survive 99 consecutive nights to break the curse and restore the forest. It combines survival mechanics, resource gathering, crafting, combat, and progressive difficulty scaling.

## Core Game Loop

### Day/Night Cycle (14 minutes per cycle)
The game operates on a carefully timed day/night cycle managed by the **TimeManager**:

1. **Morning** (4 minutes): Safe period for gathering resources, crafting, and preparing
2. **Afternoon** (3 minutes): Exploration and discovering new areas
3. **Evening** (1 minute): Warning phase - prepare defenses before night
4. **Night** (5 minutes): Enemy waves spawn and attack - survival challenge
5. **Dawn** (1 minute): Rewards, healing, and progression

After each full 14-minute cycle, the night counter advances (1/99, 2/99, etc.)

### Dynamic Lighting & Music
- Each phase has custom lighting configurations (warm morning light, bright afternoon, orange sunset, dark blue night, pink dawn)
- Music automatically transitions between day themes, evening tension, night combat, and special boss music
- Smooth interpolation creates atmospheric transitions

## Game Systems

### 1. Resource Gathering System
Players interact with resource nodes scattered across the 817k+ block custom forest map:

**Resource Types:**
- **Trees** (Wood): 15 nodes spawn, respawn in 2 minutes, yield 3-6 wood per gather (2s gather time)
- **Rocks** (Stone): 10 nodes spawn, respawn in 3 minutes, yield 2-5 stone per gather (2.5s gather time)
- **Herbs** (Glowcap Mushrooms): 12 nodes spawn, respawn in 1.5 minutes, yield 1-3 herbs per gather (1.5s gather time)

Resources are gathered via **right-click raycast interaction** - players look at a resource and right-click to start gathering. Visual feedback includes color tinting (gray when depleted), sound effects based on resource type, and success notifications.

### 2. Inventory System
- **24-slot inventory** with intelligent stacking (items stack up to their maxStack limit)
- Persistent across sessions (saved with player data)
- Real-time UI updates showing inventory status
- Starting items: 10 wood, 5 stone
- Items categorized by type: resources, tools, weapons, consumables, runes

### 3. Crafting System
**CraftingManager** handles time-based crafting with these recipes:

| Recipe | Input | Output | Craft Time |
|--------|-------|--------|------------|
| Torch | 2 wood | 1 torch | 2s |
| Campfire | 10 wood + 5 stone | 1 campfire | 4s |
| Wooden Sword | 8 wood + 2 stone | 1 sword | 3s |
| Healing Potion | 3 glowcap mushrooms | 1 potion | 2.5s |
| Ward Totem (Basic) | 5 wood + 3 stone + 2 rune dust | 1 totem | 5s |

Players craft via `/craft <recipe_id>` command or through UI. Crafting consumes resources immediately and delivers output after the craft timer completes. Only one craft active per player at a time.

### 4. Combat System

**Player Combat:**
- **Click-to-attack**: Left-click performs raycast attack (8 block range)
- Base damage: 10 + (player level × 2)
- Legacy `/attack` command for area attacks (3 block radius)
- Visual feedback, sound effects, and knockback on hit
- Right-click for resource gathering or structure placement

**Enemy System:**
11 enemy types with progressive difficulty:

**Early Game (Nights 1-5):**
- Wispling: 20 HP, 5 damage, 2.5 speed (XP: 10)
- Forest Bat: 15 HP, 4 damage, 4.0 speed (XP: 8)
- Feral Sprout: 35 HP, 8 damage, 1.8 speed (XP: 20)
- Cursed Zombie: 45 HP, 12 damage, 2.0 speed (XP: 25)

**Mid Game (Nights 5-15):**
- Forest Stalker: 60 HP, 18 damage, 3.5 speed (XP: 40)
- Skeleton Warrior: 30 HP, 10 damage, 2.2 speed (XP: 30)
- Shadow Wolf: 50 HP, 15 damage, 4.0 speed (XP: 35)
- Frost Wraith: 55 HP, 16 damage, 3.2 speed (XP: 38)
- Night Phantom: 80 HP, 20 damage, 3.8 speed (XP: 60)

**Boss Enemies (Nights 10, 25, 50, 75, 99):**
- Hollow Stag: 150 HP, 25 damage, 3.0 speed (XP: 100)
- Ancient Guardian: 300 HP, 35 damage, 2.5 speed (XP: 250)

**Night Spawning:**
- Wave size scales: Base 10 + (night number × 2), capped at 50 enemies
- Spawn rate increases: Starts 5000ms, decreases 100ms per night, min 1500ms
- Max 15 concurrent enemies (performance limit)
- Enemies spawn in a ring 30-50 blocks from center
- Boss nights spawn a single powerful boss instead of waves

**Enemy AI (EnemyController):**
- Chase players when within 30 blocks
- Collision-based damage system (1 second cooldown)
- Appropriate sounds for each enemy type (skeleton, zombie, spider variants)
- Loot drops on death from configured loot tables

### 5. Player Progression

**Stats System:**
- **Health**: 100 base, +10 per level, regenerates 1 HP/5 seconds
- **Stamina**: 100 base, +10 per level, regenerates 5 stamina/second
- **Level**: Start at 1, level up every 100 XP (resets XP counter)
- **XP Sources**: Enemy kills, crafting (10 XP), gathering resources

**Level Benefits:**
- Increased max health/stamina
- Higher damage output
- Full health/stamina restoration on level up

### 6. Structure Placement System

Players can place defensive structures via right-click:

**Campfire**:
- Costs: 10 wood + 5 stone
- Provides warm orange light (15 block radius)
- Healing aura: +2 HP every 3 seconds within 8 blocks
- Animated fire effect

**Torch**:
- Costs: 2 wood
- Provides basic lighting
- Portable light source

**Ward Totem (Tier 1)**:
- Costs: 5 wood + 3 stone + 2 rune dust
- Weakens nearby enemies (defensive structure)
- Protective radius effect

Structures are placed via raycast targeting - look at a block, right-click, and the structure spawns on top of it. Items are consumed from inventory on successful placement.

### 7. Death & Respawn System

**Death Mechanics:**
- Players die at 0 health
- Death announcement broadcast to all players
- Death screen UI shown with 5-second countdown
- Automatic respawn at Safe Clearing (0, 10, 0)
- Full health/stamina restoration on respawn
- **No inventory loss on death** (player-friendly)
- Death sound effects and visual feedback

### 8. Game State Management

**GameManager** tracks:
- Current night (1-99)
- Current phase (morning/afternoon/evening/night/dawn)
- Game started status
- Camp level (future upgrade system)
- Global game state persistence

**Win Condition:**
- Survive all 99 nights
- Epic victory ceremony with:
  - Victory music
  - Broadcast messages about breaking the curse
  - 1000 XP bonus to all players
  - Game stops, allowing celebration

### 9. Audio System

**Background Music:**
- Day theme (morning/afternoon/dawn)
- Evening theme (building tension)
- Night theme (dark, foreboding)
- Boss theme (epic combat)
- Victory theme (triumph)

**Sound Effects:**
- Resource gathering (dig sounds per type)
- Combat (swing, hit, death per enemy type)
- UI notifications
- Player actions
- Ambient environmental sounds

### 10. Multiplayer Features

- Multiple players can join simultaneously
- Shared world state and night progression
- Individual player inventories and stats
- Cooperative survival gameplay
- Broadcast messages for key events
- Player-specific UI updates
- Persistent player data per user

## Technical Architecture

### Manager Pattern (Singletons)
- **GameManager**: Global state, config data loading
- **TimeManager**: Day/night cycle, phase transitions
- **NightManager**: Enemy spawning, wave management
- **ResourceManager**: Resource node spawning/tracking
- **AudioManager**: Music and SFX playback
- **InventoryManager**: Inventory utilities
- **CraftingManager**: Recipe validation, crafting timers

### Entity System
- **GamePlayerEntity**: Custom player with RPG stats
- **BaseEnemyEntity**: Enemy behavior, health, damage
- **ResourceNodeEntity**: Gatherable resources with respawn
- **BaseStructureEntity**: Placeable defensive structures
  - CampfireEntity (healing + light)
  - TorchEntity (light)
  - WardTotemEntity (enemy debuff)

### Data Configuration (JSON)
- **items.json**: Item definitions (9 items configured)
- **recipes.json**: Crafting recipes (5 recipes configured)
- **enemies.json**: Enemy stats (11 enemy types)
- **loot_tables.json**: Drop tables for enemies
- **zones.json**: Map zone definitions

### Persistence
- Player data saved per user (inventory, stats, runes, level)
- Global game state saved (night, phase, camp level)
- Uses Hytopia PersistenceManager

## Map & World

- **Custom forest map** with 817k+ blocks
- Spawn point: "Safe Clearing" at (0, 10, 0)
- Dynamic lighting that changes with time of day
- Ambient and directional light configurations
- Resource nodes scattered around spawn area (20-60 block radius)
- Enemy spawn ring at 30-50 blocks from center

## Command System

**Player Commands:**
- `/start` - Begin the game and start time cycle
- `/status` - View game status (night, phase, progress)
- `/stats` - View player stats (health, stamina, level, XP)
- `/inventory` or `/inv` - Open inventory UI
- `/recipes` - List all craftable recipes
- `/craft <recipe_id>` - Craft an item
- `/use <item_id>` - Use a consumable item
- `/attack` - Attack nearby enemies (legacy melee)
- `/gather <item> <amount>` - Dev command for testing
- `/reset` - Reset game to initial state
- `/time` - Show detailed time information
- `/skipphase` - Skip to next phase (dev/testing)
- `/debug` - Show debug information
- `/testdata` - Test JSON data loading
- `/rocket` - Launch into air (fun easter egg)
- `/help` - Show all available commands

## UI System

**UI Data Types Sent to Client:**
- `player_stats`: Health, stamina, level, XP progress
- `hotbar`: First 8 inventory slots
- `inventory`: Full inventory view
- `game_info`: Current night and phase
- `phase_change`: Phase transition banners
- `recipes`: Crafting menu data
- `notification`: Toast notifications
- `death`: Death screen with respawn timer

**UI Features:**
- Real-time stat bars (health, stamina, XP)
- Hotbar showing first 8 items
- Full inventory panel
- Crafting interface
- Phase change banners
- Game info overlay (night/phase)

## Development Status

Built in **Phase 3: Player Systems** stage, the game includes:
- ✅ Core survival loop implemented
- ✅ Day/night cycle functional
- ✅ Resource gathering complete
- ✅ Crafting system working
- ✅ Combat system functional
- ✅ Enemy AI and spawning active
- ✅ Player progression (XP, leveling)
- ✅ Structure placement working
- ✅ Audio/music system integrated
- ✅ Persistence implemented
- ✅ Multiplayer support

**Technical Stack:**
- Hytopia SDK v0.11.2
- TypeScript
- Node.js runtime
- Custom entity/component architecture
- JSON-based configuration
- Event-driven systems

## Game Feel & Polish

- Smooth lighting transitions between phases
- Dynamic music that responds to gameplay
- Contextual sound effects for all actions
- Visual feedback (tinting, particles implied)
- Knockback on hit for satisfying combat
- Healing notifications from campfires
- XP and level-up celebrations
- Death and respawn ceremony
- Boss night announcements
- Victory celebration at game completion

## Summary

**99 Nights in the Forest** is a well-architected survival game that successfully blends resource management, crafting, combat, and progression systems into a cohesive 99-night challenge. The game features a complete gameplay loop with meaningful player choices, escalating difficulty, cooperative multiplayer, and satisfying progression. The technical implementation demonstrates solid software architecture with clear separation of concerns, persistent data, and scalable systems ready for future expansion.

The game is currently in a playable state with all core systems functional, providing an estimated 23+ hours of gameplay (99 cycles × 14 minutes each) with meaningful variety through 11 enemy types, 5 crafting recipes, boss fights, and progressive difficulty scaling.

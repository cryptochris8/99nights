# 🎮 99 Nights in the Forest — Game Design Document (Hytopia Edition)

## 🌲 1. Core Concept
**Genre:** Mythic-Cozy Survival Adventure  
**Platform:** Hytopia (multiplayer voxel engine)  
**Camera:** 3rd-person free camera  
**Mode:** Solo or 4-player co-op  
**Goal:** Survive 99 nights while purifying a cursed forest and uncovering the lore of the **Ancient Grove**.

**Tagline:**  
> *“Survive. Restore. Awaken the forest spirit within 99 nights.”*

## 🌅 2. Game Loop Overview
| Phase | Duration | Player Focus | Systems Involved |
|---|---|---|---|
| **Morning** | 4 min | Gather, craft, talk to NPCs | Resource nodes, crafting, camp upgrades |
| **Afternoon** | 3 min | Explore, find runes, mini-quests | Exploration, map events, skill XP |
| **Evening Warning** | 1 min | Prepare defenses, light fires | Time triggers, sound cue, ambient change |
| **Night** | 5 min | Defend camp, fight or flee | Enemy waves, AI scaling, rune powers |
| **Dawn** | 1 min | Rewards, healing, next-day unlocks | XP gain, narrative progression |

**Full Day/Night cycle ≈ 14 minutes.**

## 🔮 3. World & Setting
**Biome:** Ancient forest: *Heart Grove, Whispering Glade, Crystal Stream, Hollow Den, Obsidian Spire* (final).  
**Visual Style:** **Studio Ghibli forestcore** — mossy greens, god-rays, glowing mushrooms, floating petals.  
**Lighting:** Warm golden day, cool ethereal night. Ambient FX: particle fog, drifting spores, faint auroras.

## 🌿 4. Core Systems
**Resource Gathering:** Wood, Stone, Herbs, Critter Drops.  
**Crafting & Construction:** Workbench (tools/weapons), Rune Altar (enchantments), Campfire (cooking), Fortifications (walls, traps, wards).  
**Day/Night:** Lighting transition, enemy spawns, SFX layers; **Ritual Night** every 10 nights.  
**Combat:** Light/heavy, dodge, rune abilities. Elements: Nature / Spirit / Shadow.  
**Progression:** Hybrid — **Player Level**, **Camp Level**, **Runes** (3 slots).

## 🧙 5. NPCs & Story Threads
| Name | Role | Description |
|---|---|---|
| **Elder Mira** | Mentor | Teaches rune crafting; remembers pre-curse forest. |
| **Twig** | Trickster Spirit | Odd quests; comic relief; random goods. |
| **Bram** | Blacksmith | Repairs tools; unlocks weapons after Night 10. |
| **Lyra** | Forest Guardian | Appears during Ritual Nights to test courage. |

**Narrative:** The forest was sealed 99 years ago; each night survived weakens the shadow veil.

## 👹 6. Enemies
| Type | Description | Spawn Night |
|---|---|---|
| **Wispling** | Floating light that drains energy if touched | 1+ |
| **Feral Sprout** | Corrupted plant beast | 3+ |
| **Shadow Wolf** | Pack AI, fast & deadly | 7+ |
| **Hollow Stag** | Mini-boss; teleports | 10,20,30… |
| **Obsidian Wraith** | Final boss of Night 99 | 99 |

Each enemy drops unique mats for higher-tier crafting.

## 🧭 7. Map & Progression Flow
1. **Safe Clearing (Spawn)** → tutorial, first camp  
2. **Crystal Stream** → water, fish, herbs  
3. **Whispering Glade** → rune altar discovery  
4. **Hollow Den** → underground mini-boss  
5. **Obsidian Spire** → final ascent & boss

Fast-travel via **Forest Shrines** once discovered.

## 💎 8. Monetization & Rewards
**Cosmetics:** Outfits, cloaks, glowing weapons, camp themes.  
**Pets:** Firefly, Sprig Spirit, Mini Wisp (minor buffs/QOL).  
**Season Pass:** Lore journals, exclusive rune effects.  
**Music Packs:** Alternate night themes.  
**Retention:** Daily tasks, leaderboards, seasonal events.

## 🧠 9. Technical Implementation (Hytopia SDK)
| System | Method |
|---|---|
| Day/Night | Environment lighting interpolation + scheduled events |
| Enemies | Entity templates + AI state machines |
| Crafting | Inventory + JSON recipe registry |
| Save | Cloud persistence (player & world) |
| Co-op | Shared camp state; host authority |
| Audio | Layered SFX triggers by time/biome/combat |

## 📅 10. MVP Production Roadmap (6 Weeks)
1) Map block-out & resource nodes  
2) Day/Night + lighting FX  
3) Crafting + camp system  
4) AI/combat + 3 enemy types  
5) Runes + Ritual Night boss  
6) Polish, UI, audio, marketplace hooks

## 🎵 11. Audio & Music
Day: gentle harp/woodwind; Night: low drums/whispers; Boss: orchestral-percussion with ethereal chants.

## 🌟 12. Future Expansions
- **Winter Veil**, **Ember Hollow**, **Azure Dreams** biomes.

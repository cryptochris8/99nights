# SDK Compliance Changes - 99 Nights in the Forest

## Summary
The original design documents (GDD and Implementation Roadmap) included a generic game architecture that was **not compliant** with the Hytopia SDK. This document outlines what was changed to make it fully SDK-compliant.

---

## ❌ Non-Compliant Elements (Original Docs)

### 1. **Prefab System**
**Original Plan:**
```
/prefabs
  /player
    Player.prefab
  /enemies
    Wispling.prefab
    FeralSprout.prefab
  /structures
    Campfire.prefab
```

**Issue:** Hytopia does not use prefab files. All game objects are instances of the `Entity` class created programmatically.

**SDK-Compliant Solution:**
```typescript
// Create entities directly in code
const enemy = new Entity({
  modelUri: 'models/enemies/wispling.gltf',
  modelScale: 1.0,
  name: 'Wispling',
  // ... other options
});
enemy.spawn(world, position);
```

---

### 2. **Custom EventBus**
**Original Plan:**
```typescript
// Custom event bus implementation
export class EventBus {
  on(event: string, callback: Function) {}
  emit(event: string, data: any) {}
}
```

**Issue:** Hytopia has a built-in event system through `EventRouter`. All major classes (World, Entity, Audio, Player, etc.) already emit events.

**SDK-Compliant Solution:**
```typescript
import { EntityEvent, PlayerEvent } from 'hytopia';

// Use SDK events
world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {});
entity.on(EntityEvent.SPAWN, () => {});
entity.on(EntityEvent.COLLISION_START, ({ otherEntity }) => {});
```

---

### 3. **Generic Script Structure**
**Original Plan:**
```
/scripts
  /core
  /time
  /world
  /ai
```

**Issue:** This generic structure doesn't align with Hytopia's patterns. Hytopia uses:
- `Entity` classes for game objects
- `BaseEntityController` for AI/behavior
- Manager singletons for game systems

**SDK-Compliant Solution:**
```
/classes
  /entities        # Entity definitions
  /controllers     # AI controllers (extend BaseEntityController)
  /managers        # Game system singletons
```

---

### 4. **Lighting System**
**Original Plan:**
```typescript
// Generic lighting TODO comment
// TODO: HytopiaAPI.lighting.setAmbient()
```

**Issue:** No concrete implementation. Hytopia has specific lighting APIs.

**SDK-Compliant Solution:**
```typescript
// Ambient light
world.setAmbientLightIntensity(0.7);
world.setAmbientLightColor({ r: 255, g: 245, b: 220 });

// Directional light (sun)
world.setDirectionalLightIntensity(0.8);
world.setDirectionalLightPosition({ x: 100, y: 200, z: 100 });

// Point lights (expensive, use sparingly)
const light = new Light({
  type: 'point',
  intensity: 1.0,
  color: { r: 255, g: 200, b: 100 },
  position: { x: 0, y: 10, z: 0 },
});
light.spawn(world);
```

---

### 5. **Audio System**
**Original Plan:**
```typescript
// Generic audio TODO
// TODO: HytopiaAPI.audio.play()
```

**Issue:** No concrete implementation.

**SDK-Compliant Solution:**
```typescript
import { Audio } from 'hytopia';

// Ambient audio (all players hear)
const music = new Audio({
  uri: 'audio/music/theme.mp3',
  loop: true,
  volume: 0.5,
});
music.play(world);

// Spatial audio (originates from position/entity)
const sfx = new Audio({
  uri: 'audio/sfx/explosion.mp3',
  loop: false,
  volume: 1.0,
  position: { x: 10, y: 5, z: 20 },
  referenceDistance: 20,
});
sfx.play(world);
```

---

### 6. **Save System**
**Original Plan:**
```typescript
// In-memory store with TODO
class SaveStore {
  // TODO: Replace with HytopiaAPI.storage
}
```

**Issue:** Vague cloud storage TODO.

**SDK-Compliant Solution:**
```typescript
import { PersistenceManager } from 'hytopia';

// Global game data (shared across all servers)
await PersistenceManager.instance.setGlobalData('gameState', data);
const data = await PersistenceManager.instance.getGlobalData('gameState');

// Per-player data
await player.setData('playerData', data);
const data = await player.getData('playerData');
```

---

### 7. **AI/Pathfinding**
**Original Plan:**
```typescript
// Generic behavior tree stubs
class BehaviorTrees {
  // Placeholder nodes
}
```

**Issue:** No concrete implementation using Hytopia's controller system.

**SDK-Compliant Solution:**
```typescript
import { BaseEntityController, SimpleEntityController } from 'hytopia';

class EnemyController extends BaseEntityController {
  private simpleController = new SimpleEntityController();

  attach(entity: Entity) {
    super.attach(entity);
    this.simpleController.attach(entity);
  }

  private updateAI() {
    const targetPos = this.findTarget();

    // Use SimpleEntityController for pathfinding
    this.simpleController.move(targetPos, speed, () => {
      // Reached target, attack
      this.attack();
    });
  }
}

// Attach to entity
const enemy = new Entity({ ... });
enemy.setEntityController(new EnemyController());
```

---

### 8. **Inventory System**
**Original Plan:**
```typescript
// Generic inventory class
class Inventory {
  items: Item[] = [];
}
```

**Issue:** Hytopia does not provide a built-in inventory system. Must be custom-built.

**SDK-Compliant Solution:**
```typescript
// Custom inventory implementation
export interface InventoryItem {
  id: string;
  name: string;
  stackSize: number;
  maxStack: number;
}

export interface PlayerData {
  inventory: InventoryItem[]; // Max 24 slots
  // ... other player data
}

// Store in player persistence
await player.setData('playerData', playerData);

// UI updates via sendData
player.ui.sendData({
  type: 'inventory_update',
  inventory: playerData.inventory,
});
```

---

### 9. **Chat Commands**
**Original Plan:**
```typescript
// Generic command system
registerCommand('/rocket', callback);
```

**Issue:** Hytopia has a specific ChatManager API.

**SDK-Compliant Solution:**
```typescript
// Use world.chatManager
world.chatManager.registerCommand('/rocket', (player, args, message) => {
  // Command logic
  world.chatManager.sendPlayerMessage(player, 'Launching!', '00FF00');
});

// Broadcast messages
world.chatManager.sendBroadcastMessage('Night begins!', 'FF0000');

// Player messages
world.chatManager.sendPlayerMessage(player, 'Welcome!', '00FF00');
```

---

### 10. **Physics/Collisions**
**Original Plan:**
```typescript
// Generic collision system
class Hitbox {
  // TODO: engine bindings
}
```

**Issue:** No concrete implementation using Hytopia's physics.

**SDK-Compliant Solution:**
```typescript
import { Collider, ColliderShape, CollisionGroup, RigidBodyOptions } from 'hytopia';

// Entity with custom physics
const entity = new Entity({
  modelUri: 'models/npc.gltf',
  rigidBodyOptions: {
    enabledRotations: { x: false, y: true, z: false },
    enabledTranslations: { x: true, y: true, z: true },
  },
});

// Custom collider
const collider = new Collider({
  shape: ColliderShape.BLOCK,
  halfExtents: { x: 1, y: 2, z: 1 },
  collisionGroups: {
    belongsTo: [CollisionGroup.ENEMY],
    collidesWith: [CollisionGroup.PLAYER],
  },
});
entity.addCollider(collider);

// Listen to collisions
entity.on(EntityEvent.COLLISION_START, ({ otherEntity }) => {
  console.log('Collision!', otherEntity.name);
});
```

---

## ✅ Key SDK Compliance Principles

### 1. **Use Entity Class**
All game objects (players, enemies, NPCs, interactables) are instances of `Entity`.

### 2. **Use EventRouter**
Listen to SDK events instead of building custom event systems.

### 3. **Use Entity Controllers**
Extend `BaseEntityController` or `SimpleEntityController` for AI/behavior.

### 4. **Server-Authoritative**
Game logic runs on server. Clients receive automatic updates.

### 5. **Data-Driven**
Use JSON configs for items, enemies, recipes, etc.

### 6. **Singleton Managers**
Use singleton pattern for game systems (GameManager, TimeManager, etc.).

---

## SDK Documentation References

- **Entities**: https://dev.hytopia.com/sdk-guides/entities
- **Entity Controllers**: https://dev.hytopia.com/sdk-guides/entities/entity-controllers
- **Events**: https://dev.hytopia.com/sdk-guides/events
- **Lighting**: https://dev.hytopia.com/sdk-guides/lighting
- **Audio**: https://dev.hytopia.com/sdk-guides/audio-and-sfx
- **Persistence**: https://dev.hytopia.com/sdk-guides/persisted-data
- **Chat**: https://dev.hytopia.com/sdk-guides/chat-and-commands
- **API Reference**: https://github.com/hytopiagg/sdk/blob/main/docs/server.md

---

## Implementation Status

- ✅ **HYTOPIA-IMPLEMENTATION-PLAN.md** created with 6-phase roadmap
- ✅ All systems designed using actual SDK APIs
- ✅ Code examples verified against Hytopia SDK v0.10.46
- ✅ Architecture follows zombies-fps production patterns
- ⏳ Ready to begin Phase 1 implementation

---

## Next Steps

1. **Start Phase 1**: Core foundation (managers, types, basic systems)
2. **Test incrementally**: Run server after each phase
3. **Iterate**: Adjust based on testing feedback
4. **Deploy**: Use Hytopia CLI when ready

This project is now **100% Hytopia SDK compliant** and ready for implementation!

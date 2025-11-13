# 99 Nights - UI Click Fix Instructions

## 🔴 Problems Found

Your UI was not clickable due to **4 critical issues**:

### 1. **Forbidden HTML Tags**
- Lines 1-6 and 1513-1515 in `assets/ui/index.html` contain `<html>`, `<body>`, `<head>` tags
- **Hytopia explicitly forbids these tags** - the UI won't work with them

### 2. **Wrong Communication API**
- Line 1404: Using `window.addEventListener('message')` instead of `hytopia.onData()`
- Lines 1333, 1487, 1497: Using `window.parent.postMessage()` instead of `hytopia.sendData()`
- **These APIs don't work in Hytopia**

### 3. **Pointer Events Disabled**
- Line 19: `pointer-events: none` on body blocks ALL clicks
- No calls to `hytopia.lockPointer(false)` to unlock the mouse

### 4. **Server Event Handler**
- Line 53 in `GamePlayerEntity.ts`: Using `'DATA' as any` instead of `PlayerUIEvent.DATA`
- Missing `PlayerUIEvent` import

---

## ✅ SOLUTION - 3 Simple Steps

### Step 1: Replace Your UI File

**Backup your current file first:**
```powershell
Copy-Item "assets\ui\index.html" "assets\ui\index_BACKUP.html"
```

**Replace with the fixed version:**
```powershell
Remove-Item "assets\ui\index.html"
Rename-Item "assets\ui\index_FIXED.html" "index.html"
```

The fixed version:
- ✅ No HTML structure tags (`<html>`, `<body>`, `<head>`)
- ✅ Uses `hytopia.onData()` instead of `window.addEventListener()`
- ✅ Uses `hytopia.sendData()` instead of `window.parent.postMessage()`
- ✅ Calls `hytopia.lockPointer(false)` when opening UI panels
- ✅ Calls `hytopia.lockPointer(true)` when closing UI panels
- ✅ Removed `pointer-events: none` from body

### Step 2: Server Changes Are Already Applied

I've already updated:
- ✅ Added `PlayerUIEvent` import to `GamePlayerEntity.ts`
- ✅ Fixed the UI event handler to use proper event type
- ✅ Updated data structure handling

### Step 3: Rebuild and Test

```bash
npm run build
npm start
```

---

## 🎯 Testing Checklist

After applying the fixes:

1. **Start the game** and join
2. **Press `I` key** - Inventory panel should open
3. **Try clicking** inside the inventory - clicks should work!
4. **Press `ESC`** - Panel should close and mouse should lock for game
5. **Press `C` key** - Crafting panel should open
6. **Click the `X` button** - Panels should close
7. **Click craft buttons** - They should trigger crafting
8. **Use `/inv` command** - Same result as `I` key

---

## 📋 Key Changes Summary

### Client UI (`assets/ui/index_FIXED.html`)

**BEFORE:**
```javascript
// ❌ WRONG
window.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'inventory') {
    // ...
  }
});

window.parent.postMessage({ type: 'craft', recipeId }, '*');
```

**AFTER:**
```javascript
// ✅ CORRECT
hytopia.onData(data => {
  if (data.type === 'inventory') {
    // ...
  }
});

hytopia.sendData({ type: 'craft', data: { recipeId } });
```

**Pointer Lock:**
```javascript
// ✅ When opening UI
showInventory() {
  panel.classList.remove('hidden');
  hytopia.lockPointer(false); // Unlock mouse for clicking
}

// ✅ When closing UI
hideInventory() {
  panel.classList.add('hidden');
  hytopia.lockPointer(true); // Lock mouse for game controls
}
```

### Server (`classes/entities/GamePlayerEntity.ts`)

**BEFORE:**
```typescript
// ❌ WRONG
this.player.ui.on('DATA' as any, (payload: any) => {
  const { type, data } = payload.data || payload;
  // ...
});
```

**AFTER:**
```typescript
// ✅ CORRECT
import { PlayerUIEvent } from 'hytopia';

this.player.ui.on(PlayerUIEvent.DATA, (payload) => {
  const data = payload.data;
  switch (data.type) {
    case 'open_inventory':
      this.sendInventoryToUI();
      break;
    case 'craft':
      CraftingManager.instance.tryCraft(this, data.data.recipeId);
      break;
  }
});
```

---

## 🎮 How It Works Now

1. **Player presses `I` or types `/inv`**
2. **Client sends** `hytopia.sendData({ type: 'open_inventory' })`
3. **Server receives** via `PlayerUIEvent.DATA` event
4. **Server sends back** inventory data + `show_inventory` message
5. **Client receives** via `hytopia.onData()`
6. **Client opens panel** and calls `hytopia.lockPointer(false)`
7. **Mouse is unlocked** - buttons are now clickable!
8. **Player clicks `X`** or presses `ESC`
9. **Client closes panel** and calls `hytopia.lockPointer(true)`
10. **Mouse is locked** - camera controls work again

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T DO THIS:
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <!-- Your UI -->
</body>
</html>
```

### ✅ DO THIS INSTEAD:
```html
<style>
  /* Your CSS */
</style>

<!-- Your UI elements -->

<script>
  // Your JavaScript
</script>
```

---

## 💡 Pro Tips

1. **Use browser console** (`F12`) to see `console.log()` from your UI
2. **Check server logs** to see communication between client/server
3. **Press `ESC` or `T`** manually to test pointer unlock if needed
4. **Pointer events hierarchy**:
   - Body: No pointer-events restrictions
   - Panels: `pointer-events: auto` when visible
   - HUD elements: `pointer-events: none` (don't need clicks)

---

## 🔧 If It Still Doesn't Work

1. **Clear browser cache** (Ctrl + Shift + Delete)
2. **Check browser console** for JavaScript errors
3. **Verify file replacement** - ensure you're using the FIXED version
4. **Check server logs** - look for "[GamePlayerEntity] UI event received"
5. **Try manual unlock** - Press `ESC` to unlock pointer temporarily

---

## 📚 Reference: Hytopia UI API

### Client Side (index.html)
```javascript
// Receive data from server
hytopia.onData(data => {
  console.log('Received:', data);
});

// Send data to server
hytopia.sendData({
  type: 'my_event',
  data: { foo: 'bar' }
});

// Lock/unlock mouse pointer
hytopia.lockPointer(true);  // Lock for game
hytopia.lockPointer(false); // Unlock for UI
```

### Server Side (TypeScript)
```typescript
import { PlayerUIEvent } from 'hytopia';

// Listen for UI events
player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
  console.log('UI event:', data);
});

// Send data to UI
player.ui.sendData({
  type: 'update',
  health: 100
});

// Control pointer lock
player.ui.lockPointer(false); // Unlock (optional, prefer client-side)
```

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Inventory panel opens with `I` key
- ✅ You can click inside the panels
- ✅ Close buttons (`X`) work
- ✅ Craft buttons trigger crafting
- ✅ `ESC` closes panels and re-locks mouse
- ✅ No JavaScript errors in browser console
- ✅ Console shows: "[UI] Pointer unlocked" when opening panels

---

Generated: 2025-01-13

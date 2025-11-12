# Forking klinecharts to Add Touch Separator Support

If the JavaScript workarounds continue to not work, we can fork and modify the klinecharts library.

## Option 1: Fork on GitHub (Recommended)

### Steps:

1. **Fork the repository:**
   - Go to https://github.com/liihuu/KLineChart
   - Click "Fork" button
   - This creates your own copy

2. **Clone locally:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/KLineChart.git
   cd KLineChart
   ```

3. **Locate separator code:**
   - Search for files handling `pane-separator` or `ns-resize`
   - Look for pointer/mouse event handlers
   - Likely in `src/renderer/` or `src/pane/`

4. **Add touch event support:**
   - Copy existing `pointerdown` handler logic
   - Add `touchstart` event listener with same logic
   - Add `touchmove` and `touchend` similarly

5. **Build:**
   ```bash
   npm install
   npm run build
   ```

6. **Update package.json:**
   ```json
   {
     "dependencies": {
       "klinecharts": "github:YOUR-USERNAME/KLineChart#branch-name"
     }
   }
   ```

7. **Install:**
   ```bash
   npm install
   ```

## Option 2: Patch the Library (Faster)

If you don't want to fork, use `patch-package`:

1. **Install patch-package:**
   ```bash
   npm install --save-dev patch-package
   ```

2. **Modify node_modules version:**
   - Edit `node_modules/klinecharts/` directly
   - Find the separator event handlers
   - Add touch event listeners

3. **Generate patch:**
   ```bash
   npx patch-package klinecharts
   ```

4. **Auto-apply on install:**
   - Add to `package.json` scripts:
   ```json
   "postinstall": "patch-package"
   ```

## Option 3: Use Local Version

1. **Create local lib:**
   ```bash
   mkdir -p libs/klinecharts
   ```

2. **Copy or link:**
   ```bash
   npm link /path/to/klinecharts/clone
   ```

## What to Look For in klinecharts Code

### File Structure (typical):
```
src/
├── pane/
│   └── Pane.ts  (handles separators)
├── renderer/
│   └── (rendering logic)
└── index.ts
```

### Separator Event Pattern:
```typescript
// Look for code like this:
element.addEventListener('pointerdown', (e) => {
  // start drag
});

// Add alongside:
element.addEventListener('touchstart', (e) => {
  // same logic
});
```

### Critical Points:
- Handle both `pointerdown` and `touchstart`
- Track `pointermove` and `touchmove`
- Handle `pointerup` and `touchend`
- Call `preventDefault()` to stop default behaviors

## Testing After Modifications

1. **Test locally:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Test on mobile device**

3. **If working, publish:**
   - Push to your fork
   - Update package.json to point to your fork
   - Or submit PR to original repo

## Questions to Answer First

Before forking:
- ✅ Are touch events even reaching the separator?
- ✅ Is `touch-action: none` CSS applied correctly?
- ✅ Does the library have *any* touch support code?
- ✅ What version of klinecharts is being used?

Run this in console to check:
```javascript
// Check if touch events fire at all
document.addEventListener('touchstart', (e) => {
  console.log('📱 Touch event fired on:', e.target);
}, true);

// Then touch the separator and check console
```

## Recommendation

Given you're on alpha version (`10.0.0-alpha.9`), the library might still be in development. Consider:

1. Check GitHub Issues - someone might have reported this
2. Open an issue on klinecharts GitHub with your use case
3. Check if newer alpha versions have touch support
4. If urgent, fork and add it yourself

The effort to fork is ~2 hours of work if the code is clean.


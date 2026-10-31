# Juice recipes (CSS + small React patterns)

Patterns that add feel cheaply. All animate only `transform`/`opacity`, and
all have a reduced-motion fallback. Adapt names to the project's tokens.

## Contents
1. Press feedback
2. Success pop and burst
3. Failure shake
4. Screen entrance
5. Number tick-up
6. Confetti without a library
7. Floating "+1"
8. Reduced motion

## 1. Press feedback
```css
.tappable { transition: transform .08s ease; touch-action: manipulation; }
.tappable:active:not(:disabled) { transform: scale(.94); }
```
For buttons with a "lip", move down and shrink the shadow instead of scaling.

## 2. Success pop and burst
Pop the thing that succeeded, and emit a ring/burst from the touch point.
Re-trigger animations by changing a React `key` (remounts the element).
```css
@keyframes pop { 0% { transform: scale(.8) } 60% { transform: scale(1.08) } 100% { transform: scale(1) } }
.pop { animation: pop .28s cubic-bezier(.3, 1.6, .5, 1); }

@keyframes burst { from { transform: translate(-50%,-50%) scale(.2); opacity: .9 } to { transform: translate(-50%,-50%) scale(1.6); opacity: 0 } }
.burst {
  position: fixed; width: 90px; height: 90px; border-radius: 50%; pointer-events: none;
  border: 4px solid var(--accent); animation: burst .45s ease-out forwards;
}
```
```tsx
// Spawn at the pointer position, remove after the animation.
const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
function burstAt(e: React.PointerEvent) {
  const b = { id: Date.now(), x: e.clientX, y: e.clientY };
  setBursts((all) => [...all, b]);
  setTimeout(() => setBursts((all) => all.filter((o) => o.id !== b.id)), 500);
}
```

## 3. Failure shake
```css
@keyframes shake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-8px) } 40%,80% { transform: translateX(8px) } }
.shake { animation: shake .32s ease-in-out; }
```
Pair with a tint/desaturate on the thing that's now locked, plus an icon or
text so it doesn't rely on color.

## 4. Screen entrance
```css
@keyframes enter { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
.screen { animation: enter .25s ease-out; }
/* stagger children */
.screen > * { animation: enter .3s ease-out both; }
.screen > *:nth-child(2) { animation-delay: .03s } /* … up to ~6 */
```
Keying the screen container on the route makes the entrance replay per screen.

## 5. Number tick-up
For a changing score, animate the old→new change briefly (scale + color
flash) instead of counting through every value:
```css
@keyframes bump { 50% { transform: scale(1.25) } }
.bump { display: inline-block; animation: bump .3s ease-out; }
```
Key the element on the value so it replays on change.

## 6. Confetti without a library
Render ~40 absolutely positioned spans with random `--x`, `--r`, delay and
color from the palette; one keyframe falls and rotates them. Remove after
~2.5 s. Cap the count on small screens.
```css
.confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 30; }
.confetti i {
  position: absolute; top: -10px; left: var(--x); width: 8px; height: 14px; border-radius: 2px;
  background: var(--c); animation: fall var(--d, 2.2s) var(--delay, 0s) cubic-bezier(.2,.6,.4,1) forwards;
}
@keyframes fall { to { transform: translate(var(--drift, 0), 105vh) rotate(var(--r, 540deg)); opacity: .9 } }
```

## 7. Floating "+1"
A label that rises and fades from where points were earned:
```css
@keyframes rise { from { transform: translate(-50%, 0); opacity: 1 } to { transform: translate(-50%, -48px); opacity: 0 } }
.plus { position: fixed; font-weight: 800; pointer-events: none; animation: rise .7s ease-out forwards; }
```

## 8. Reduced motion
Keep the feedback, drop the movement:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  .confetti { display: none; }
}
```
Pair state changes with sound/haptics and text so nothing is lost when motion is off.

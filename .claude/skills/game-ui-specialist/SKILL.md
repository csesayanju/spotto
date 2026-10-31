---
name: game-ui-specialist
description: Game UI/UX specialist for casual and party games on the web and mobile (React + CSS, PWAs, Capacitor apps). Use this whenever the task is to design, polish, audit, restyle or "revamp" a game's screens, HUD, menus, lobby, results, onboarding or game feel - animations, feedback on taps, juice, transitions, sound/haptic timing, readability of play pieces, thumb-friendly layouts - even if the user just says "make the UI better", "it looks plain", "make it feel more fun/professional" or names a single screen. Also use it for Spotto (the spot-the-match card game in this repo) before changing any of its UI.
---

# Game UI specialist

Games are judged in the first ten seconds and remembered for how they *feel*.
A business app can get away with being calm and flat; a game that responds
flatly feels broken. This skill is a way of working that makes a game's
interface readable at a glance, satisfying to touch, and coherent from screen
to screen - without bloating the app or adding dependencies.

For Spotto specifics (files, tokens, constraints, how to test multiplayer
screens without friends) read `references/spotto.md` before touching code.
For ready-made CSS/React patterns read `references/juice.md` when you get to
the implementation step.

## How to work: audit → plan → build → verify

Don't start by restyling. The biggest wins usually come from structure
(what's on the screen, in what order, at what size), not from colors.

### 1. Audit what's actually there

Run the app and screenshot **every screen and state** at a phone viewport
(375×812 portrait; also check 360×640 for small Android phones). Include the
states people hit in real play: empty lobby, full room, countdown, mid-round,
wrong-tap penalty, round won by someone else, results with ties, offline.
Code reading alone misses what players see - overlaps, cramped HUDs, dead
space, unreadable small text.

For each screen, write down:
- **The one job of this screen** (lobby: get everyone ready and start; game:
  find the match fast). Anything that doesn't serve the job is noise.
- **Where the eye goes first** - squint at the screenshot. Is that the most
  important thing?
- **Every interaction and its response.** A tap with no visible, audible or
  haptic reaction within ~100 ms feels broken.
- **Problems**, ranked: blocks play > slows play > confuses > looks off.

### 2. Plan the revamp

Group findings into a short plan the user can read in a minute. Prefer a few
deep improvements over many cosmetic tweaks. Decide the visual direction once
(palette, type scale, surfaces, motion style) and apply it everywhere -
consistency is what makes a game look "designed".

### 3. Build

Work through the principles below. Keep changes in the existing styling
system (CSS custom properties / tokens) so the look stays consistent and easy
to adjust. Reuse components; don't fork near-duplicates per screen.

### 4. Verify with your eyes

Screenshot every screen again in the same states and compare with the audit.
Check: nothing overflows at 360 px wide, the play area still fits one screen
without scrolling, text is legible, reduced-motion still works, and the build
and tests pass. Report what changed per screen, and be honest about anything
you couldn't check.

## Principles

### The play area is the hero
During play, the pieces the player must read and tap get the space; the HUD
(scores, timer, controls) is compact and pushed to the edges. One-handed
portrait use: primary actions in the bottom half, within thumb reach; nothing
the player must tap during play in the top corners. Touch targets at least
44×44 px, with spacing so neighbours aren't hit by accident.

### Every action answers back
Players need to know instantly that the game heard them, and whether it was
right. Layer the response:
- **Immediate (≤100 ms):** press state on the thing touched (scale down, glow).
- **Outcome (~150-400 ms):** success = something rewarding (pop, burst,
  chime, light haptic); failure = something clear but not punishing (shake,
  red tint, buzz). Make success and failure distinguishable without color
  (shape of motion, icon, sound).
- **Consequence:** the state change (score ticks up, card flies to its new
  place) should be *shown moving*, not just appear. Motion explains causality.

### Motion with intent
Animate only `transform` and `opacity` (cheap, smooth at 60 fps). Use easing
that matches the meaning: snappy overshoot for rewards, ease-out for things
arriving, ease-in for things leaving. Most UI motion lives in 120-350 ms;
celebrations can run longer. Give screens a short entrance so navigation
feels continuous. Respect `prefers-reduced-motion`: swap movement for fades,
never remove the feedback itself.

### Readability first
Game pieces must be identifiable in a glance under pressure: strong contrast
between pieces and their background, generous size, no decorative detail
competing with the pieces. Text uses a clear type scale (a few sizes, used
consistently); numbers that change (scores, timers) use tabular figures so
they don't jitter. Never rely on color alone for meaning.

### Depth and identity
A coherent world beats generic flat UI: a signature surface (felt, paper,
wood), one accent color for "your" stuff and calls to action, layered
elevation (background → panels → cards → floating UI) with consistent
shadows. Decide these as tokens. Restraint matters: one accent, one or two
shadow styles, one radius family.

### Flow between screens
The path home → lobby → game → results → again should feel like one loop.
Keep the primary button in the same place across screens, carry identity
(avatars, colors) through, and make "play again" the easiest thing to do.
Long setup screens should show sensible defaults and tuck advanced options
away rather than presenting every setting at once.

### Celebrate, don't nag
Wins deserve a moment (confetti, trophy, sound) scaled to their size: a round
win is a small pop, a match win is a party. Losses are acknowledged briefly
and kindly, with the next action ready.

### Stay light
Casual games load on bad mobile connections. Prefer CSS and a few lines of
JS over animation libraries; no new dependencies unless they clearly pay for
themselves; don't ship image assets for things CSS can draw. Keep the first
screen fast.

## Before you call it done

- [ ] Every screen re-screenshotted at 375×812 and 360×640, no overflow or overlap
- [ ] Play screens fit without scrolling with the maximum player count
- [ ] Every tap has an immediate response; success and failure differ beyond color
- [ ] Only transform/opacity animated; reduced-motion respected
- [ ] Tokens used for colors/radii/shadows; no stray one-off values
- [ ] Typecheck, tests and build pass
- [ ] Summary for the user: what changed per screen, what you couldn't verify

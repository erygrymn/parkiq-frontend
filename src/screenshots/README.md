# Screenshot scenes

In `__DEV__`: **Settings > Developer > Screenshot scenes**. Tap a row, the sheet closes,
then capture the frame from the **real** screen behind it.

No fake screens were written — fake **state** was. `scenarios.ts` pushes state into the
stores and the production surface renders it. A second "screenshot version" of each
component would quietly go stale the moment the real UI changed.

⚠️ This folder lives on the **`screenshots` branch and never merges into `main`.**
CLAUDE.md: placeholder data does not ship.

## Scenes (frame numbers match aso.md §4)

| # | Scene | Where to shoot |
|---|---|---|
| 1 | Active session · amber | Simulator (dev build) |
| 3 | Celebration · SAVED | Simulator (dev build) |
| 4 | Typographic frame | Simulator — full-screen poster, EN/TR toggle at the bottom |
| 5 | Find My Car · indoor card | Simulator (dev build) |
| 6 | Tariff · scan result | Simulator — *not the camera-on-board frame, see below* |
| 7 | Map · charging filter | Simulator (dev build, needs a Mapbox token) |

`assets/tariff-board.png` is not bundled into the app — it is a **physical prop**. Open it
on another screen or print it, then point a real device's camera at it. Its numbers
(50/100/150/300) match the mock tariff in `scenarios.ts` and aso.md's "₺50 → ₺100" caption
exactly.

## What CANNOT be produced inside the app

1. **Frame 2 — Lock Screen + Dynamic Island.** Live Activity is an OS surface: the
   simulator has no Lock Screen card and Expo Go has no ActivityKit at all. Real device +
   dev build: start a session, lock the phone, take the device's own screenshot.
   Dynamic Island needs a 14 Pro or newer.
2. **The real frame 6 — the camera looking at a board.** The camera preview is a live
   feed; the simulator has no camera and it cannot be mocked. On a real device, put
   `assets/tariff-board.png` on a screen or paper and scan it. Scene 6 only gives you the
   *result* of a scan (tiers filled into the form) — a usable frame on its own, but if the
   caption says "Point the camera", you need the device.
3. **The AR frame** (frame 8 in aso.md, optional). ARKit does not run in the simulator.
4. **The map** needs a dev build (Mapbox is native). It comes up empty in Expo Go, and
   `EXPO_PUBLIC_MAPBOX_TOKEN` must be set.

## Note

The amber and celebration moments in frames 1 and 3 are built relative to `Date.now()`:
don't wait around after picking the scene, the clock is running. The amber window is
about 8 minutes.

# Member 2 — Simulation (the fake driver / walker)

Because we pitch inside one building, the app never uses the real GPS. You build the **simulated GPS**: a car or a person that moves along the route like a real navigation trip.

You own: `src/features/simulation/` only (`index.js`, `SimulationLayer.jsx`, `SimulationPanel.jsx`, `useSimulation.js`, `vehicleIcons.js`, `simulation.css`).

Wait for M1 to say **"scaffold is on main"**, then `git pull` and start. Meanwhile, read `CLAUDE.md` and think about the look of the vehicle icon and HUD.

## Paste into Claude Code

````
Read CLAUDE.md and docs/member-2-simulation.md. I am Member 2. Implement everything below, touching ONLY files in src/features/simulation/. Keep the existing export names (SimulationLayer, SimulationPanel). Run `npm run build` before each commit.

A) useSimulation.js (headless engine; called once by SimulationLayer)
- Inputs (read from the store): route, mode, sim.timeScale, blocked, traffic.segments.
- Precompute cumulative distances along the route (use cumulativeKm from lib/geo). Keep the distance travelled as a float; derive sim.index (last passed vertex) and sim.pos (interpolated point, use pointAlong) and sim.heading (smoothed bearing to the next vertex).
- Speed model: baseKmh = CONFIG.SIM_BASE_SPEED_KMH[mode] (drive 30, walk 5). Traffic factor from the traffic level of the segment containing sim.index: [1, 0.6, 0.3, 0.1] for levels 0..3 (if no segments, 1). Real-equivalent speed = baseKmh * factor (add a little random wobble, +/- 5%). Movement per frame = speed * dt * sim.timeScale (time is compressed so the demo finishes fast; timeScale is 1, 5, 20 or 50).
- Game loop with requestAnimationFrame. Write to the store at about 15 to 20 Hz (not every frame) with setSim({index, pos, heading, speedKmh, progress}).
- Status rules: 'running' moves; 'paused' (by user) or store.blocked === true stops movement (do NOT change status to 'paused' because of blocked; just freeze and show speedKmh 0). When blocked becomes false, continue.
- Events:
  - Listen TRIP_START: if a route exists, set status 'running'.
  - Listen ROUTE_READY: reset distance to 0, pos = route[0], index = 0, progress = 0. If payload.rerouted is true AND status was 'running' before, keep running on the new route (route[0] is the current position, so it feels continuous). If rerouted is false, status 'idle'.
  - Listen TRIP_RESET: status 'idle', pos null, index 0.
  - When progress >= 0.9 for the first time on a route, emit ARRIVAL_NEAR once. At the end, set status 'arrived', speedKmh 0, emit ARRIVED.
- Clean up listeners and the animation frame on unmount.

B) SimulationLayer.jsx (rendered INSIDE the map, uses react-leaflet; always pass pane="overlays")
- Calls useSimulation().
- Draws the vehicle at sim.pos: drive = 🚗 (rotated by heading; correct the emoji's default orientation), walk = 🚶 with a small bobbing CSS animation. Alternatively a Google-Maps style blue dot with a direction cone for walking. Use a Leaflet DivIcon built in vehicleIcons.js. Add a pulsing circle around it.
- Draws the traveled part of the route as a gray Polyline (trail).
- Follow camera: when sim.follow is true and status is 'running', keep the map centered on the vehicle (throttled, setView without animation or a short pan). If the user drags the map, set follow false (a "Recenter" button in the panel sets it true again). Use a good navigation zoom (about 16 for walk, 15 for drive) when a trip starts.

C) SimulationPanel.jsx (bottom-left, className includes `panel`, max 340px)
- Shows only when a route exists (renders a tiny hint otherwise).
- Speedometer: big number of sim.speedKmh (real-equivalent, e.g. 28 km/h) with the mode icon.
- Progress bar (sim.progress), distance remaining (km) and a small "x20" time-scale badge.
- Controls: Play/Pause (sets status 'running'/'paused'), Restart, time-scale buttons from CONFIG.SIM_TIME_SCALES (writes sim.timeScale), Follow toggle/Recenter.
- Show "Captcha in progress: car stopped" text when store.blocked is true.
- Funny labels in Bisaya-English ("Naa na ba ta? Wala pa.").

D) Do NOT write to any store field except `sim`. Do not import from other features.

Test alone (before others merge): set a route manually in the console, e.g. `__store.getState().setRoute([[10.31,123.88],[10.32,123.89],[10.33,123.9]], {distanceKm:3, shortestKm:2, durationMin:10, steps:[]})`, then `__bus.emit('route:ready',{rerouted:false}); __bus.emit('trip:start',{})`.
````

## Definition of done

- A car (drive) or walker (walk) glides smoothly along any route, turning with the road, and the camera follows.
- Speedometer shows believable speeds; the vehicle visibly slows in red traffic segments and freezes while a captcha is open.
- Play/pause, restart, 1x/5x/20x/50x and recenter all work.
- Rerouting mid-trip continues from the current position without a jump.
- Works with a route from the fallback (offline) data.

## Watch out for

- Don't write to the store every animation frame (about 15 to 20 Hz is enough) and always use selectors in React, or the whole app re-renders constantly.
- Leaflet wants `[lat, lng]`; our store uses `[lat, lng]` everywhere. Never mix with GeoJSON `[lng, lat]`.

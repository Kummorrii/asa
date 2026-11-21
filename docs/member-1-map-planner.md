# Member 1 (Lead) — Scaffold, Map, Start/Destination Picker, Longest Route

You have **two phases**. Phase 0 blocks everyone else, so do it first and fast (target: 20 minutes).

Before starting: create the GitHub repo, add `CLAUDE.md` (repo root) and the five `docs/member-*.md` files, commit them, then run `claude` in the repo folder.

---

## PHASE 0 — Scaffold (paste this into Claude Code)

````
Read CLAUDE.md completely. It is the source of truth. Build the scaffold ONLY (no real feature logic), so that 5 people can then work in parallel without ever touching the same file.

1. Initialize a Vite + React (JavaScript) project in this folder (keep CLAUDE.md and docs/ intact). Install exactly: leaflet react-leaflet zustand (nothing else; no backend, no API keys). Use the react-leaflet major version that matches the installed React version (react-leaflet 5 for React 19, 4 for React 18).

2. Create EVERY file listed in CLAUDE.md section 3. For files owned by M1..M5, create a minimal WORKING STUB: it compiles, exports exactly what src/App.jsx imports, renders null (or a tiny placeholder), and contains a `// TODO(Mx)` comment. Each features/<name>/index.js re-exports its public components:
   - map/index.js: export { default as MapView } from './MapView'; export { default as PlannerPanel } from './PlannerPanel';
   - simulation/index.js: export { SimulationLayer, SimulationPanel }
   - traffic/index.js: export { TrafficLayer, TrafficPanel }
   - roasts/index.js: export { RoastBanner, DirectionsCard }
   - captcha/index.js: export { CaptchaModal }
   - demo/index.js: export { DemoPanel }
   MapView stub must accept `children` and render a react-leaflet MapContainer (CONFIG.MAP_CENTER / MAP_ZOOM, OpenStreetMap tiles, fills its parent) with children wrapped in <Pane name="overlays" style={{ zIndex: 460 }}>.

3. Write these FROZEN files completely and carefully:
   - src/lib/events.js: export const EVENTS with the exact names and string values from CLAUDE.md section 5.2.
   - src/lib/bus.js: tiny pub/sub: export const bus = { on(event, fn) -> returns unsubscribe, emit(event, payload) }.
   - src/lib/geo.js: export haversineKm(a, b), bearing(a, b), polylineLengthKm(coords), cumulativeKm(coords), pointAlong(coords, km) -> {pos, index, heading}, nearestIndex(coords, point). Points are [lat, lng].
   - src/config.js: export const CONFIG with exactly the values from CLAUDE.md section 5.5.
   - src/store.js: zustand store with exactly the state and actions from CLAUDE.md section 5.1 (patch-merge for object slices; resetAll restores initial state). Initial sim = {status:'idle', index:0, pos:null, heading:0, speedKmh:0, progress:0, timeScale: CONFIG.SIM_TIME_SCALE, follow:true}. Initial plan = {status:'idle', error:null}. Initial traffic = {segments:[], incidents:[], eta:{minutes:0,label:''}}.
   - src/main.jsx: import leaflet/dist/leaflet.css, ./styles/theme.css, ./App.css; render <App/>; in dev expose window.__store = useStore and window.__bus = bus.
   - src/App.jsx: exactly the layout in CLAUDE.md section 5.4. Each slot component wrapped in a small ErrorBoundary class component (shows nothing or a tiny error chip if the child crashes, never white-screens the app). Render order inside MapView: <TrafficLayer/> then <SimulationLayer/>.
   - src/App.css: full-screen map; `.slot` absolutely positioned wrappers (slot-top-left, slot-top-center, slot-top-right, slot-bottom-left, slot-bottom-center, slot-bottom-right) with the max-widths from CLAUDE.md, `pointer-events: none` on .slot; stack order above the map (z-index 1000).
   - src/styles/theme.css (stub for M5, but with a working baseline): CSS variables (--panel-bg, --panel-fg, --accent, --danger, --radius, --font), a `.panel` class (dark rounded card, pointer-events:auto, padding, shadow), and a `.btn` class.
   - package.json scripts: dev, build, preview.
   - .gitignore (node_modules, dist).

4. Verify `npm run dev` shows a full-screen empty Cebu map and `npm run build` passes. Make the first commit and push to main.

Do not implement real feature logic. Keep stubs tiny.
````

When it passes: `git push`, and **tell the team in the group chat: "scaffold is on main"**. Then continue below.

---

## PHASE 1 — Your feature (paste after the scaffold is pushed)

You own: `src/features/map/` only (`index.js`, `MapView.jsx`, `PlannerPanel.jsx`, `useRouteController.js`, `routing.js`, `geocode.js`, `presets.js`, `fallbackRoutes.js`, `map.css`).

````
Read CLAUDE.md and docs/member-1-map-planner.md. I am Member 1. Implement everything below, touching ONLY files in src/features/map/. Do not change the stub export names. Run `npm run build` before each commit.

A) MapView.jsx
- Keep the Pane "overlays" wrapper for children (other members render inside it).
- Render the chosen origin and destination as markers (green "A" pin, red "B" pin), DRAGGABLE: dragging a pin updates origin/destination in the store (setOrigin / setDestination) and reverse-geocodes its name.
- Draw the current `route` from the store as a thick blue Polyline in its own lower pane (z-index 450) so traffic colors (M3) draw above it.
- Auto-fit bounds when `route` changes while plan.status is 'preview'. During 'navigating', do NOT auto-fit (M2's camera follows the vehicle).
- Map click handling: when the planner is in "pick on map" mode (see below), a click sets that point. Also add a right-click / long-press context menu with "Set as start" and "Set as destination", like Google Maps.

B) PlannerPanel.jsx (top-left, className includes `panel`, max 340px) — Google Maps style
- Two inputs: "Choose starting point" (A) and "Choose destination" (B). Typing shows autocomplete suggestions (max 5). Choosing one sets origin/destination. Next to each input a small "pick on map" button: the next map click fills that field.
- A swap button (⇅) that swaps A and B.
- Mode tabs 🚗 Drive / 🚶 Walk (writes `mode` with setMode). If a trip is already navigating and the mode changes, emit REROUTE_REQUEST {to: destination, reason:'mode'} to itself (handled by the controller below).
- Buttons by state: plan.status 'idle' with both points set -> "Get route"; 'preview' -> show distance, "(shortest would be X km, we took Y km!)" and a big "Start" button; 'navigating' -> "Stop trip"; 'arrived' -> "New trip". "Stop trip" and "New trip" emit TRIP_RESET.
- A "Quick demo trip" button: picks a preset from presets.js and starts planning (also triggered by the DEMO_TRIP event, so it must work with no typing).
- Loading and error states, with funny Bisaya-English microcopy ("Gikalkula ang pinakalayo nga dalan...").

C) geocode.js
- searchPlaces(query): Nominatim search `https://nominatim.openstreetmap.org/search?format=jsonv2&q=<q>&limit=5&countrycodes=<CONFIG.SEARCH_COUNTRY>` biased to Cebu (viewbox 123.7,10.5,124.1,10.2, bounded=0). Debounce 600 ms in the component; max 1 request per second; cache results per query. On any error, fall back to filtering presets.js by name.
- reverseGeocode(lat, lng): Nominatim reverse; on error return "Pinned location".
- Both return {lat, lng, name}.

D) presets.js
- 15 to 20 real, well-known places around Cebu City (e.g. CIT-U, Fuente Osmeña, Colon Street, Ayala Center Cebu, SM Seaside, IT Park, Magellan's Cross, Carbon Market, Fort San Pedro, Basilica del Santo Niño, Cebu Provincial Capitol, Mactan-Cebu Airport...) as {name, lat, lng}, plus 3 DEMO TRIPS {id, name, origin, destination, mode} chosen so the longest route is interesting. Double-check coordinates are plausible.

E) routing.js
- getLongestRoute(origin, destination, mode, { avoid? }) -> { coords: [[lat,lng],...], distanceKm, shortestKm, durationMin, steps }.
- Drive: OSRM public server `https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?alternatives=3&overview=full&geometries=geojson&steps=true`. NOTE: OSRM uses lng,lat; our store uses lat,lng. Convert carefully.
- Walk: try `https://routing.openstreetmap.de/routed-foot/route/v1/foot/...` (some deployments of that server expect `driving` in the path instead; test both and use whichever answers). If the foot server fails, use the driving route and just treat it as a walking trip.
- Take every route returned. shortestKm = minimum distance; pick the LONGEST as the result.
- If only one route comes back, force a longer one: add 1 to 2 random detour waypoints 1 to 4 km (drive) or 0.3 to 1 km (walk) away from the straight line, route through them, and keep the longest of everything tried.
- Map OSRM steps to {index, type, modifier, name, distanceM} where index = nearest route vertex to the maneuver location (use nearestIndex from lib/geo).
- Cache results in memory keyed by origin+destination+mode. Respect rate limits (no more than ~1 request per second).
- On ANY failure return a route from fallbackRoutes.js (believable Cebu routes, at least 40 vertices, one for drive and one shorter for walk), flagged so the UI can show "offline mode".

F) useRouteController.js (called inside PlannerPanel; handles everything headless)
- "Get route": setPlan({status:'loading'}) -> getLongestRoute -> setRoute(coords, info) -> setPlan({status:'preview'}) -> emit ROUTE_READY {rerouted:false}.
- "Start": setPlan({status:'navigating'}) -> emit TRIP_START.
- Listen to REROUTE_REQUEST {to, reason}: from = current `sim.pos` (or origin if none). setDestination(to) (also update the B field), fetch the longest route from that position, setRoute so that route[0] is exactly the current position, keep plan.status 'navigating', emit ROUTE_READY {rerouted:true, reason}.
- Listen to DEMO_TRIP: load the first demo trip (set origin, destination, mode), run "Get route".
- Listen to ARRIVED: setPlan({status:'arrived'}).
- Listen to TRIP_RESET: resetAll() from the store, clear inputs.
- Always unsubscribe bus listeners on unmount. Keep one request in flight at a time.

Test alone with: `__bus.emit('demo:trip', {})`, then `__bus.emit('reroute:request', {to:{lat:10.3,lng:123.9,name:'Test'}, reason:'demo'})`.
````

---

## Definition of done

- I can pick start/destination by search, by map click, by dragging the pins, and by the demo-trip button.
- A visibly long route is drawn; the panel says how much longer than the shortest it is.
- Car/Walk changes the route; mid-trip mode change and redirects both reroute from the current vehicle position.
- No Wi-Fi: the demo trip still works via fallback routes.

## Your other duties as Lead

- You are the only one who changes FROZEN files. Batch requests from the team, change them in one commit, and announce it in the group chat.
- At each checkpoint, pull everything, run the full flow, and send each owner a short bug list (their files only).

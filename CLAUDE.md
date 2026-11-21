# ASA — General Instructions (CLAUDE.md)

> This file lives at the **repo root** as `CLAUDE.md`, so Claude Code reads it automatically.
> Every team member's Claude Code session must follow it. If your own doc (in `docs/`) and this file disagree, **this file wins**.

Hackathon: MALFUNCTION 2026 (iDE.A). Team of 5. One day. Pitch is shown in ONE building.

---

## 1. What we are building

**ASA** (Bisaya for "where?") is a joke navigation app that works like Google Maps, except it is deliberately terrible:

- You pick a **starting point** and a **destination** (search box or click on the map, like Google Maps). No real GPS is used.
- It routes you the **LONGEST** way instead of the shortest.
- It shows **fake traffic** and silly incidents, and the ETA keeps getting worse.
- Every few minutes it **redirects** you to a random new place "so you can explore".
- A **fake "AI helper"** (a chat bubble with typing dots) pops up at random moments with scripted insults in Bisaya-English, rotating through a shuffled list. It is NOT real AI: just a hard-coded script. The app also gives absurd turn-by-turn directions.
- Every few minutes it freezes with an **"Are you a robot?" captcha**.
- **Simulation:** because we pitch inside one building, the app does NOT use the device's GPS. A **simulated driver (car) or walker (person)** moves along the route, like a real GPS trip, with a speedometer, follow camera, and speed controls.

**Hard rule: no real AI, no paid APIs, no API keys, no accounts, no backend, no voice.** Everything is front-end code plus free public services (OpenStreetMap tiles, OSRM routing, Nominatim search). The "AI helper" is a parody and must be presented as a joke, never as real AI.

Awards we are aiming for: Most Frustrating, Funniest, Most Pointless Yet Brilliant.

---

## 2. Team and ownership

| Member | Doc | Owns |
|---|---|---|
| **M1** (Lead) | `docs/member-1-map-planner.md` | Scaffold (Phase 0), map, start/destination picker, routing (longest route), route events |
| **M2** | `docs/member-2-simulation.md` | Simulated car/walker, speedometer, play/pause/speed, follow camera |
| **M3** | `docs/member-3-traffic-redirect.md` | Fake traffic, incidents, fake ETA, random redirects |
| **M4** | `docs/member-4-roasts-directions.md` | Fake "AI helper" (scripted insults), absurd turn-by-turn card |
| **M5** | `docs/member-5-captcha-demo-deploy.md` | Captcha, hidden demo panel, global theme, README, deploy, final QA |

---

## 3. Repo map and who owns each file

**FROZEN** = created once in Phase 0 by M1. After that, nobody edits it. If you need a change, STOP and ask the human to message M1.

```
CLAUDE.md                          FROZEN
docs/member-*.md                   FROZEN
package.json, package-lock.json    FROZEN
vite.config.js, index.html         FROZEN
.gitignore                         FROZEN
README.md                          M5

src/main.jsx                       FROZEN
src/App.jsx                        FROZEN    (mounts every feature; nobody edits it)
src/App.css                        FROZEN    (screen slots)
src/config.js                      FROZEN
src/store.js                       FROZEN    (shared state)
src/lib/bus.js                     FROZEN    (event bus)
src/lib/events.js                  FROZEN    (event names)
src/lib/geo.js                     FROZEN    (distance/bearing helpers)
src/styles/theme.css               M5        (global look; keep existing class + variable names)

src/features/map/                  M1   index.js MapView.jsx PlannerPanel.jsx useRouteController.js
                                        routing.js geocode.js presets.js fallbackRoutes.js map.css
src/features/simulation/           M2   index.js SimulationLayer.jsx SimulationPanel.jsx
                                        useSimulation.js vehicleIcons.js simulation.css
src/features/traffic/              M3   index.js TrafficLayer.jsx TrafficPanel.jsx useTraffic.js
                                        useEta.js useRedirect.js buildTraffic.js incidents.js
                                        landmarks.js traffic.css
src/features/roasts/               M4   index.js RoastBanner.jsx DirectionsCard.jsx useRoasts.js
                                        roastLines.js directionsText.js roasts.css
src/features/captcha/              M5   index.js CaptchaModal.jsx useCaptchaTimer.js
                                        puzzles/*.jsx captcha.css
src/features/demo/                 M5   index.js DemoPanel.jsx demo.css
```

You may create NEW files only **inside your own feature folder**.

---

## 4. Golden rules (these are what keep GitHub conflict-free)

1. **Only touch files you own.** Never edit another member's folder or any FROZEN file. Claude Code: if a task seems to need that, stop and tell the human.
2. **No cross-feature imports.** Features never import from each other's folders. They talk ONLY through (a) the shared **store** (read anything, write only your own slice) and (b) the **event bus**. Allowed imports: `src/store.js`, `src/config.js`, `src/lib/*`.
3. **Never run `npm install <package>`** and never modify `package.json` / lockfile. All dependencies are installed in Phase 0 (`leaflet`, `react-leaflet`, `zustand`). Need another package? Ask M1 to add it.
4. **Never run repo-wide formatters or fixers** (no `prettier --write .`, `eslint --fix .`, `npm audit fix`).
5. **Never `git add .` or `git add -A`.** Stage only your own paths, for example `git add src/features/simulation`.
6. **Push straight to `main`, no branches needed.** Routine: `git pull --rebase origin main` → `npm run build` (must pass) → `git add <own paths>` → `git commit` → `git push`. Since files never overlap, rebases never conflict. Push at least every 30 to 45 minutes.
7. **Never push code that breaks `npm run build`.** Other people's running apps depend on `main`.
8. **CSS:** each feature imports its own `*.css` from its own components, and prefixes every class (`map-`, `sim-`, `traf-`, `roast-`, `cap-`, `demo-`). Use CSS variables from `theme.css` with fallbacks, for example `var(--panel-bg, rgba(20,20,28,.92))`.
9. **Every store field has ONE writer** (table below). Everyone else only reads it.
10. **Do not rename** anything in the contracts below (store fields, event names, exports). Adding is fine only inside your own files.
11. Wrap risky code (network calls, timers) in try/catch. One member's crash must never take down the app. The app must keep working when the network is down (routing falls back to saved routes; the helper uses its local script).

---

## 5. Shared contract

### 5.1 Store (`src/store.js`, zustand) and who writes what

`import { useStore } from '../../store'`. Outside React use `useStore.getState()`. In React always use selectors: `useStore(s => s.sim.index)`.

| Field | Shape | Writer |
|---|---|---|
| `mode` | `'drive' \| 'walk'` | M1 |
| `origin` | `{lat, lng, name} \| null` | M1 |
| `destination` | `{lat, lng, name} \| null` | M1 |
| `plan` | `{status: 'idle'\|'loading'\|'preview'\|'navigating'\|'arrived'\|'error', error: string\|null}` | M1 |
| `route` | `[[lat, lng], ...]` (current polyline; after a reroute, `route[0]` is the current position) | M1 |
| `routeInfo` | `{distanceKm, shortestKm, durationMin, steps: [{index, type, modifier, name, distanceM}]} \| null` (`index` = route vertex where the maneuver happens) | M1 |
| `sim` | `{status: 'idle'\|'running'\|'paused'\|'arrived', index, pos: [lat,lng]\|null, heading, speedKmh, progress (0..1), timeScale, follow}` | M2 |
| `blocked` | `boolean` (true while a captcha is open; the sim must pause) | M5 |
| `traffic` | `{segments: [{from, to, level}], incidents: [{id, lat, lng, label}], eta: {minutes, label}}` (`level` 0=free 1=slow 2=heavy 3=standstill; `from`/`to` are route indexes) | M3 |
| `roast` | `{id, kind, text} \| null` | M4 |

Actions (already written in Phase 0, merge a patch into their slice): `setMode`, `setOrigin`, `setDestination`, `setPlan(patch)`, `setRoute(route, info)`, `setSim(patch)`, `setBlocked`, `setTraffic(patch)`, `setRoast`, `resetAll()`.

### 5.2 Event bus (`src/lib/bus.js`, names in `src/lib/events.js`)

`import { bus } from '../../lib/bus'` and `import { EVENTS } from '../../lib/events'`.
API: `const off = bus.on(EVENTS.X, fn)` (returns an unsubscribe function, call it in effect cleanup), `bus.emit(EVENTS.X, payload)`.

| Event (string) | Payload | Emitted by | Listened by |
|---|---|---|---|
| `TRIP_START` (`trip:start`) | `{}` | M1 (user taps Start) | M2, M4 |
| `TRIP_RESET` (`trip:reset`) | `{}` | M5 (demo) and M1 (reset button) | M1, M2, M3, M4 |
| `ROUTE_READY` (`route:ready`) | `{rerouted: boolean, reason?: string}` (data is already in the store) | M1 | M2, M3, M4 |
| `REROUTE_REQUEST` (`reroute:request`) | `{to: {lat,lng,name}, reason: 'redirect'\|'mode'\|'demo'}` | M3 | M1 |
| `REDIRECT_FORCE` (`redirect:force`) | `{}` | M5 (demo) | M3 |
| `DEMO_TRIP` (`demo:trip`) | `{}` (loads a preset trip and starts planning) | M5 (demo) | M1 |
| `ROAST_REQUEST` (`roast:request`) | `{kind, ctx?}` | M5 (demo) | M4 |
| `CAPTCHA_REQUEST` (`captcha:request`) | `{}` | M5 | M5 |
| `CAPTCHA_RESULT` (`captcha:result`) | `{success: boolean}` | M5 | M4 |
| `ARRIVAL_NEAR` (`arrival:near`) | `{}` (progress hits 90%) | M2 | M3, M4 |
| `ARRIVED` (`arrived`) | `{}` | M2 | M1, M4 |
| `INCIDENT_HIT` (`incident:hit`) | `{incident}` | M3 | M4 |
| `TRAFFIC_WORSE` (`traffic:worse`) | `{}` | M3 | M4 |
| `ETA_BUMP` (`eta:bump`) | `{minutes?: number}` | M5 (demo) | M3 |

Internally the fake helper's messages are called "roasts" (so event and store names stay `roast`). **Roast kinds** (used by M4 internally and in `ROAST_REQUEST`): `destination`, `start`, `redirect`, `incident`, `traffic`, `captcha_ok`, `captcha_fail`, `arrival_near`, `arrived`, `idle`. `ctx` may hold `{place}` or `{label}`.

### 5.3 Typical flow (so everyone sees how the pieces connect)

1. User picks start and destination, chooses car or walk, taps **Get route** (M1). M1 fetches the longest route, writes `route`/`routeInfo`, `plan.status='preview'`, emits `ROUTE_READY`.
2. M3 builds fake traffic and ETA; M4 roasts the destination; M2 resets the simulated vehicle to the start.
3. User taps **Start** (M1): `plan.status='navigating'`, emits `TRIP_START`. M2 begins moving the car/walker.
4. While moving: M2 slows down in traffic (reads `traffic.segments`), pauses if `blocked`. M3 emits `INCIDENT_HIT` when passing an incident. M4 shows absurd directions and roasts.
5. Every few minutes M3 emits `REROUTE_REQUEST`, M1 reroutes from the current position (`ROUTE_READY` with `rerouted: true`). M5 randomly sets `blocked=true` and shows a captcha.
6. At 90% M2 emits `ARRIVAL_NEAR` (M3 makes the ETA jump). At the end M2 emits `ARRIVED`.

### 5.4 Screen slots (`src/App.jsx`, FROZEN)

| Slot | Component | Owner |
|---|---|---|
| fullscreen map | `<MapView>` with children `<TrafficLayer/>` then `<SimulationLayer/>` | M1 (+ M3, M2 inside) |
| top-left | `<PlannerPanel/>` | M1 |
| top-center | `<DirectionsCard/>` | M4 |
| top-right | `<TrafficPanel/>` (ETA, traffic banner, redirect toast) | M3 |
| bottom-left | `<SimulationPanel/>` | M2 |
| bottom-center | `<RoastBanner/>` | M4 |
| bottom-right | `<DemoPanel/>` (hidden, toggle with key `D`) | M5 |
| full overlay | `<CaptchaModal/>` | M5 |

Each slot is wrapped in an error boundary. Panels must stay compact so they never overlap on a 1280px wide screen (top-left max 340px, top-right max 300px, top-center max 420px, bottom-left max 340px, bottom-center max 480px, bottom-right max 260px). `.slot` wrappers have `pointer-events: none`; your root element must set `pointer-events: auto`.

**Map panes:** `MapView` wraps its children in a Leaflet pane named `"overlays"` (z-index 460). M3 and M2 must pass `pane="overlays"` explicitly to their Polylines/Markers. Render order in `App.jsx` is Traffic first, then Simulation, so the vehicle draws on top.

### 5.5 Config (`src/config.js`, FROZEN, `CONFIG` object)

`MAP_CENTER [10.3157, 123.8854]`, `MAP_ZOOM 13`, `SEARCH_COUNTRY 'ph'`, `DEMO_MODE true`,
`SIM_BASE_SPEED_KMH {drive: 30, walk: 5}`, `SIM_TIME_SCALE 20`, `SIM_TIME_SCALES [1, 5, 20, 50]`,
`REDIRECT_INTERVAL_MS 25000`, `CAPTCHA_INTERVAL_MS 30000`, `TRAFFIC_WORSEN_INTERVAL_MS 20000`,
`HELPER_NAME 'ASA Assistant'`, `HELPER_IDLE_MIN_MS 15000`, `HELPER_IDLE_MAX_MS 40000`, `HELPER_THINK_MS 1500`.
Need your own constant? Put it in a `constants.js` inside your own feature folder.

### 5.6 Dev helpers (exposed in `main.jsx` so you can test alone)

In the browser console: `__store.getState()`, `__bus.emit('roast:request', {kind:'idle'})`, `__bus.emit('route:ready', {rerouted:false})`, etc. Use these to test your part before the others are merged.

---

## 6. Content and tone rules

- All user-facing text is **funny, sarcastic, and in Bisaya-English mix**. Keep it light.
- Never write jokes about real people, religion, disabilities, or anything sensitive. No slurs.
- No API keys, no accounts, no paid services anywhere. Do not add any fetch to a paid or key-based service.
- Presentation must survive bad Wi-Fi: routing has a fallback route, the helper uses a local script, nothing may white-screen.

---

## 7. Timeline (relative, adapt to the real event schedule)

| When | What |
|---|---|
| T+0 to T+20 min | **M1 only** runs Phase 0 and pushes the scaffold. Others: read the docs, prepare content (helper insult lines, landmark coordinates, puzzle ideas, incident jokes) in notes. |
| T+20 min | Everyone `git pull`, then starts their own doc with Claude Code. |
| First checkpoint (about 90 min in) | Everyone pulls, runs the whole app together, fixes problems on their own side only, reports contract issues to M1. |
| Second checkpoint (about 3 to 4 hours in) | Full flow works end to end. Start polish. |
| Last 1 to 2 hours | **Feature freeze.** Only bug fixes, rehearsal, M5's final QA and deploy. |

Priority if time runs short: **must** (map + planner + longest route + simulation) → **next** (traffic, ETA, redirects, directions card) → **then** (fake AI helper, 3 captcha puzzles) → **bonus** (more puzzles, extra polish).

---

## 8. How each member starts Claude Code

In the repo folder, run `claude`, then paste:

```
Read CLAUDE.md and docs/<your-doc>.md completely. You are implementing ONLY what your doc assigns to me.
Rules: touch only files I own, no cross-feature imports, no npm installs, never git add . (stage only my paths).
Work in small steps. Before every commit run `npm run build` and make sure it passes.
If something requires editing a file I do not own, stop and tell me what to ask the owner.
```

---

## 9. Final checklist (M5 runs this before the pitch)

- [ ] `npm run dev` runs with no console errors; `npm run build` passes
- [ ] Pick start and destination by search AND by clicking the map; swap works; car/walk toggle works
- [ ] Longest route appears, colored with traffic; incidents show; ETA keeps growing
- [ ] Simulated car and walker both move; speed controls, pause, follow camera work
- [ ] Redirect fires and reroutes from the current position
- [ ] Captcha freezes the vehicle and unfreezes after solving
- [ ] Fake AI helper shows typing dots then an insult, rotates without repeats, and fires at random moments; directions card updates
- [ ] Demo panel (key `D`) buttons all work; "Load demo trip" works with Wi-Fi off
- [ ] Pitch script rehearsed at least twice, on the actual presentation machine

# Member 3 — Fake Traffic, Incidents, ETA, Random Redirects

Everything here is **fake**. No traffic API. Your job is to make the trip look hopeless and then keep changing where we are going.

You own: `src/features/traffic/` only (`index.js`, `TrafficLayer.jsx`, `TrafficPanel.jsx`, `useTraffic.js`, `useEta.js`, `useRedirect.js`, `buildTraffic.js`, `incidents.js`, `landmarks.js`, `traffic.css`).

Wait for M1 to say **"scaffold is on main"**, then `git pull`. Meanwhile prepare content in notes: 25+ funny Cebu-style incident labels and 30+ real landmarks with coordinates.

## Paste into Claude Code

````
Read CLAUDE.md and docs/member-3-traffic-redirect.md. I am Member 3. Implement everything below, touching ONLY files in src/features/traffic/. Keep the existing export names (TrafficLayer, TrafficPanel). Run `npm run build` before each commit.

A) buildTraffic.js: buildTraffic(route) -> { segments, incidents }
- Chop the route into chunks of about 8 to 15 vertices. Each chunk is {from, to, level} (route indexes, level 0..3). Weighted random: about 15% level 0, 25% level 1, 30% level 2, 30% level 3. Make neighbors correlated (clusters of red) so it looks realistic.
- incidents: 4 to 8 points spread along the route: {id, lat, lng, label}. Labels come from incidents.js (at least 25 funny Cebu-style jokes), e.g. "Carabao crossing", "Prosisyon sa Santo Niño", "Nagbaligya og balut sa tunga sa dalan", "Tricycle nga nag-U-turn sa highway", "Road closed for no reason", "Lechon delivery nga stalled", "Mayor nagpa-ribbon cutting". Add your own. Walk mode: use walking-flavored jokes ("Nag-selfie ang mga tawo sa sidewalk", "Aso nga ayaw paagi").

B) TrafficLayer.jsx (rendered INSIDE the map, uses react-leaflet; pass pane="overlays" on every Polyline/Marker)
- Calls useTraffic().
- Draws each segment as a Polyline over the route colored by level: green #22c55e, orange #f59e0b, red #ef4444, dark red #7f1d1d (weight a bit thinner than the blue route so the route still reads).
- Draws incidents as emoji markers (🚧 🐄 ⛪ 🐔 🚚 etc., picked by label or random) with a popup showing the label.

C) useTraffic.js
- On ROUTE_READY: build traffic from the current `route` and write setTraffic({segments, incidents}). On TRIP_RESET: clear it.
- Every CONFIG.TRAFFIC_WORSEN_INTERVAL_MS while a trip is navigating: re-roll 2 to 4 random segments one level worse (max 3), update the store, emit TRAFFIC_WORSE.
- While navigating, check the simulated position (store sim.pos) every ~500 ms; when within 80 m of an incident that has not fired yet, emit INCIDENT_HIT {incident} once. (You only READ sim; never write it.)

D) useEta.js (called by TrafficPanel)
- Fake ETA written with setTraffic({eta:{minutes, label}}). Base = routeInfo.durationMin scaled by remaining progress and by average traffic level, then plus a growing "delay" offset. The ETA must GROW over time (add a few minutes every few seconds), never go down, and never reach "arrived" while navigating.
- Labels with funny variety: "Arriving in 2 hr 14 min", later "Arriving sometime this week", "Arriving in 0 min... charot, 1 hr 40 min".
- Listen ARRIVAL_NEAR: jump ETA by +45 min with label "Hala, bag-ong traffic! +45 min". Listen ETA_BUMP: add payload.minutes (default 30).

E) useRedirect.js (called by TrafficPanel) + landmarks.js
- landmarks.js: at least 30 real places in and around Cebu {name, lat, lng, blurb}; blurb = a funny reason to go there ("Importante ni, believe me"). Include some very far ones (Moalboal, Kawasan Falls, Sirao Garden). Check coordinates.
- Every CONFIG.REDIRECT_INTERVAL_MS (+/- 20% random jitter), only when plan.status === 'navigating', sim.status === 'running' and blocked === false: pick a landmark that is not the current destination and not within 500 m of sim.pos. Drive: 30% chance to pick from the 10 farthest. Walk: pick only landmarks within 2 km of the current position (if none, skip).
- Sequence: show a "Recalculating..." toast for 2 seconds, then emit REROUTE_REQUEST {to: {lat,lng,name}, reason:'redirect'}. After ROUTE_READY with rerouted:true, the toast shows "Bag-ong destinasyon: {name}. {blurb}" for 4 seconds.
- Cap at 4 redirects per trip (then stop redirecting, so we eventually arrive). Reset the counter on TRIP_RESET.
- Listen REDIRECT_FORCE: redirect immediately (ignores jitter and the cap).
- Clean up all timers and listeners on unmount.

F) TrafficPanel.jsx (top-right, className includes `panel`, max 300px)
- Calls useEta() and useRedirect().
- Shows: big ETA label, a red "Heavy traffic ahead" banner when the average level is high, an incident counter ("7 ka insidente"), and the redirect toast (below the card).
- Renders nothing visible when there is no route.

G) Only write to the store field `traffic`. Never import from other features.

Test alone: put any route in the store (see M2's doc for a console snippet), then `__bus.emit('route:ready',{rerouted:false})`, `__bus.emit('redirect:force',{})`, `__bus.emit('eta:bump',{minutes:30})`.
````

## Definition of done

- After a route appears, it is colored mostly red/dark red, incident emoji pop up, and the ETA climbs.
- The vehicle (M2) slows down on red segments because it reads your `traffic.segments`.
- Redirects fire on a timer with a toast, reroute from the current position (via M1), and stop after 4 redirects.
- Walk mode redirects only to nearby places.
- Demo panel buttons (`REDIRECT_FORCE`, `ETA_BUMP`) work.

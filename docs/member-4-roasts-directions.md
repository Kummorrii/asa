# Member 4 — The Fake "AI Helper" (Scripted Insults) and Absurd Directions

ASA has a "helper" that looks like an AI assistant but is **100% fake**: a hard-coded script of insults that pops up at random moments and rotates through a shuffled list. **No AI, no API, no server, no voice, no keys, no network calls.** It is a parody, and we always present it as a joke (badge: "✨ powered by absolutely nothing").

You own: `src/features/roasts/` only (`index.js`, `RoastBanner.jsx`, `DirectionsCard.jsx`, `useRoasts.js`, `roastLines.js`, `directionsText.js`, `roasts.css`).

Wait for M1 to say **"scaffold is on main"**, then `git pull`. Meanwhile write insult lines in your notes: at least 10 per kind, Bisaya-English, funny but never mean about real people, religion, disabilities, or anything sensitive. No slurs.

## Paste into Claude Code

````
Read CLAUDE.md and docs/member-4-roasts-directions.md. I am Member 4. Implement everything below, touching ONLY files in src/features/roasts/. Keep the existing export names (RoastBanner, DirectionsCard). There must be NO network calls, NO speech synthesis, NO API keys, and NO AI of any kind. Run `npm run build` before each commit.

A) roastLines.js
- Export ROAST_LINES, an object keyed by kind: destination, start, redirect, incident, traffic, captcha_ok, captcha_fail, arrival_near, arrived, idle. For each kind export { mild: [...], spicy: [...] } with at least 6 mild and 4 spicy lines. Funny, sarcastic, Bisaya-English mix, max about 20 words each. Templates may use {place} (destination/redirect) and {label} (incident). Tone examples: "Ana ka {place}? Bold choice, kay layo ra kaayo." / "Wow, nilahi imong tuyo? Wala man ko gi-tug-an."
- The 'idle' kind should include some "fake AI" parody lines that make clear it is a joke, e.g. "As an AI language model, I cannot find your destination. Joke, wala koy AI." / "Calculating... calculating... nah, wala koy gibuhat."

B) useRoasts.js (headless hook, called once by RoastBanner; returns { typing })
- Subscribes to events and picks the kind:
  - ROUTE_READY with rerouted false -> 'destination' (ctx.place = store destination name)
  - TRIP_START -> 'start'
  - ROUTE_READY with rerouted true -> 'redirect' (ctx.place = new destination name)
  - INCIDENT_HIT -> 'incident' (ctx.label = incident.label)
  - TRAFFIC_WORSE -> 'traffic'
  - CAPTCHA_RESULT -> 'captcha_ok' or 'captcha_fail' by payload.success
  - ARRIVAL_NEAR -> 'arrival_near'; ARRIVED -> 'arrived'
  - ROAST_REQUEST {kind, ctx} -> that kind (the demo panel uses this)
  - TRIP_RESET -> clear the banner and reset the mood counter.
- Random pop-ups "at any moment": while plan.status === 'navigating' and blocked is false, schedule a random timer between CONFIG.HELPER_IDLE_MIN_MS and CONFIG.HELPER_IDLE_MAX_MS and fire an 'idle' insult each time (then reschedule).
- ROTATION with a "shuffle bag": for each kind keep a shuffled copy of its lines; take lines one by one; when the bag is empty, reshuffle (never start the new bag with the line just used). So no line repeats until all lines of that kind have been used.
- Mood escalation: keep a counter of redirects + captcha fails + incidents this trip. Low counter -> take lines from `mild`, higher counter -> mix in `spicy` (use separate shuffle bags for mild and spicy).
- Fake "AI thinking": before showing a message, set typing = true for CONFIG.HELPER_THINK_MS (+/- 500 ms random), then setRoast({id, kind, text}) and set typing = false. Ignore new triggers while typing, and ignore any trigger less than 4 seconds after the last message, EXCEPT captcha events and ROAST_REQUEST.
- Clean up all timers and listeners on unmount. Wrap everything in try/catch so a bad line template can never crash the app.

C) RoastBanner.jsx (bottom-center, className includes `panel`, max 480px)
- Looks like an AI chat widget: a small avatar (robot or smug face emoji), the name CONFIG.HELPER_NAME ("ASA Assistant") and a badge "✨ powered by absolutely nothing".
- While `typing` is true: animated typing dots. Then the message appears with a quick character-by-character typing animation, auto-hides after about 8 seconds (fade out).
- BONUS: a tiny "Ask me anything..." input. Whatever the user types, after the fake thinking delay the helper answers with a random 'idle' insult from the shuffle bag (no logic, no network). Make sure typing in this input does not trigger the demo panel's `D` hotkey (M5 ignores keys while typing in inputs).
- It must stay compact so it never covers the map controls or other panels.

D) directionsText.js + DirectionsCard.jsx (top-center, className includes `panel`, max 420px)
- Reads routeInfo.steps, route, sim.index, sim.pos, plan.status (read only).
- nextStep = first step whose index > sim.index. Distance to it = length of the route between sim.pos and route[nextStep.index] (use polylineLengthKm from lib/geo), rounded to the nearest 10 m.
- Convert the OSRM maneuver {type, modifier} to an arrow emoji and a plain sentence ("In 120 m, turn left onto Colon St."), then add an ABSURD twist at random: "...then immediately make a U-turn.", "Then another one.", "Continue straight for 14 km. Why not.", "Turn left. No, your other left.", "You have arrived. Joke lang." Keep the real instruction readable so it still looks like a legit GPS. If steps are empty (offline fallback), generate plausible fake directions.
- Show only while plan.status === 'navigating'.

E) Only write to the store field `roast` (via setRoast). Never import from other features.

Test alone: `__bus.emit('roast:request', {kind:'destination', ctx:{place:'Carbon Market'}})`, `__bus.emit('incident:hit', {incident:{label:'Carabao crossing'}})`, `__bus.emit('captcha:result', {success:false})`.
````

## Definition of done

- Key moments (destination, start, redirect, incident, traffic worse, captcha, near-arrival, arrival) each trigger an insult, and extra ones pop up randomly during the trip.
- The helper shows typing dots first, then the message, and the lines rotate with no repeats until the whole list has been used.
- Lines get spicier as the trip gets worse.
- Directions card shows real next-turn info with an absurd twist.
- Zero network calls and zero keys. Works with Wi-Fi off.

## Tips

- Have the whole team read your lines once before the pitch. Cut anything that could offend someone in the audience.
- Put your best 3 lines in the 'destination' and 'captcha_fail' kinds. Those are the ones judges will see in the first minute.

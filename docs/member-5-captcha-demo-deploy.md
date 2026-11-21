# Member 5 — Captcha Chaos, Demo Panel, Theme, README, Deploy, Final QA

You make the app **frustrating** (captchas), make the pitch **safe** (hidden demo controls), make everything **look like one product** (global theme), and make sure it **ships** (README, deploy, QA).

You own: `src/features/captcha/` (`index.js`, `CaptchaModal.jsx`, `useCaptchaTimer.js`, `puzzles/*.jsx`, `captcha.css`), `src/features/demo/` (`index.js`, `DemoPanel.jsx`, `demo.css`), `src/styles/theme.css`, and `README.md`.

Wait for M1 to say **"scaffold is on main"**, then `git pull`. Meanwhile list captcha puzzle ideas and draft the pitch script.

## Paste into Claude Code

````
Read CLAUDE.md and docs/member-5-captcha-demo-deploy.md. I am Member 5. Implement everything below, touching ONLY the files I own (src/features/captcha/, src/features/demo/, src/styles/theme.css, README.md). Keep the existing export names (CaptchaModal, DemoPanel). Run `npm run build` before each commit.

A) useCaptchaTimer.js (called once by CaptchaModal)
- Every CONFIG.CAPTCHA_INTERVAL_MS (+/- 20% jitter), only when plan.status === 'navigating', sim.status === 'running' and blocked === false: pick a random puzzle and open the captcha: setBlocked(true).
- Listen CAPTCHA_REQUEST: open a captcha immediately (used by the demo panel).
- Clean up timers and listeners on unmount. Reset on TRIP_RESET (close any open captcha, setBlocked(false)).

B) CaptchaModal.jsx (full-screen overlay above everything, dark translucent backdrop)
- Visible only when store.blocked is true. Shows a header "Are you a robot?" and ONE puzzle at a time from puzzles/.
- On success: setBlocked(false), emit CAPTCHA_RESULT {success:true}.
- On failure: show a funny message, emit CAPTCHA_RESULT {success:false}, then show a NEW, weirder puzzle (blocked stays true).
- The Escape key and clicking the backdrop must NOT close it (that's the joke). BUT include a hidden safety: pressing Ctrl+Shift+K closes it, so the demo can never get stuck.

C) puzzles/ (each puzzle is a self-contained component: props {onSuccess, onFail}; all client side, no external services). Build at least 6:
- Emoji grid 3x3: "Select all squares with a jeepney" using vehicle emojis; slightly ambiguous.
- Wobbly distorted text to type (CSS transforms + noise lines via SVG/canvas).
- Slider "drag to verify you're human" where the handle runs backward or jumps randomly.
- Silly math: "What is 7 x 8? (Hint: not 56)" with consistent, discoverable logic (document it in a comment).
- "Click the button that is NOT a button": many identical buttons, one is a div that only looks different.
- "Type the word human without using the letter h": always fails with a funny message, accepted on the third try.
- Bonus: "Hold this button for 10 seconds" that resets if the pointer moves.
- Every puzzle must be solvable in under 20 seconds, so the demo doesn't stall. Failure messages are funny Bisaya-English ("Robot gyud ka, ayaw pag-deny.", "Suspicious ang imong clicking.").

D) DemoPanel.jsx (bottom-right, className includes `panel`, max 260px)
- Hidden by default; the `D` key toggles it (ignore the key while typing in an input). It is our safety net during judging.
- Buttons (each just emits an event, nothing more):
  - Load demo trip -> DEMO_TRIP
  - Force redirect -> REDIRECT_FORCE
  - Force captcha -> CAPTCHA_REQUEST
  - Force helper insult -> ROAST_REQUEST {kind:'idle'}
  - ETA +30 min -> ETA_BUMP {minutes:30}
  - Reset trip -> TRIP_RESET
- Also show a tiny live status line (plan.status, sim.status, blocked), read only.

E) theme.css (global look)
- Keep every existing class and CSS variable name from the scaffold (--panel-bg, --panel-fg, --accent, --danger, --radius, --font, .panel, .btn); you may change their values and add more. Goal: it looks like a legit modern navigation app (dark glassy panels, consistent buttons/inputs, readable fonts on a projector), so that the sabotage is funnier. Style Leaflet's zoom controls to match. Do not use feature class prefixes of other members.

F) README.md
- Project name (ASA, Bisaya for "where?"), one-paragraph pitch, features, how to run (`npm i`, `npm run dev`; no keys or backend needed), the team, and the 60-second pitch script below.

G) Never import from other features. Write to the store only via setBlocked.

Test alone: `__bus.emit('captcha:request', {})`, press D to open the demo panel.
````

## 60-second pitch script (put it in the README)

1. **0:00** "Meet ASA, Bisaya for 'where?'. Everyone hates traffic. We made a GPS that loves it." Show the Google-Maps-style picker, choose start and destination.
2. **0:10** Get route. The route is way too long and red. The fake "AI helper" pops up and insults the destination.
3. **0:20** Tap Start. The car drives along the simulated route. Toggle to a walker once for effect, then back to the car.
4. **0:30** Force redirect: "Recalculating... pumunta ka sa Sirao Garden!"
5. **0:40** Captcha pops up and the car stops. Fail it once on purpose, funny line.
6. **0:50** ETA keeps growing. Close with: "ASA: we will get you there, eventually."

Rehearse on the real presentation machine at least twice. Use the demo panel (`D`) to skip waiting.

## Deploy and QA (after the feature freeze)

- Deploy the static build to Vercel or Netlify as a backup link. The whole app is static, so it deploys with no backend and no keys. For the pitch, run locally with `npm run dev` (or use the deployed link as backup).
- Run the final checklist in `CLAUDE.md` section 9 with Wi-Fi ON and again with Wi-Fi OFF (demo trip must still work via fallback routes).
- Send each owner a bug list for their own files only; don't fix other people's files yourself.

## Definition of done

- Captchas appear on a timer, freeze the vehicle, and release it when solved; at least 6 puzzles work and none can deadlock the demo.
- Demo panel (key `D`) controls everything we need during judging.
- The app looks like one coherent product.
- README is complete and the pitch has been rehearsed.

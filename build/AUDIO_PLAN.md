# Audio robustness: investigation and fix plan (hand-off)

Symptom: the Teacher's voice "randomly breaks" (cuts off, skips, goes silent, or overlaps) since some APK update. Web may be affected too.

## What I found (read-only investigation, no code changed)

- The speech engine code is almost untouched since 2.4: `narrate.js` only gained table reading, `Bridge.java` only gained network and clipboard helpers, `MainActivity.java` is unchanged. So the regression is probably **timing or load**, not a logic edit. Things that did grow: webxdc iframes, MicroPython WASM, IndexedDB course store, longer lecture chunks (ELI5, tables), AI network calls (all main-thread or memory heavy).
- Files: `build/src/narrate.js` (narrator state machine + `makeEnv` backends), `android/.../Bridge.java` (`speak/stop/isReady`), `MainActivity.java` (TTS init/shutdown), `Progress.java` (events), `build/src/app.html` ~L470-500 and every `NAR.stop/pause/play` call site.

## Ranked hypotheses (each needs a test to confirm or kill)

1. **Error storm skips a whole chapter.** `Bridge.speak` returns "error" immediately if `ttsReady` is false (engine still initialising, engine process died, or `onInit` failed). JS treats error as "advance", so every chunk errors in turn and the lecture flashes by silently. No re-init, no retry, no user message.
2. **Watchdog cuts speech.** `narrate.js` advances after `len*95/rate + 5000` ms even if the engine is still speaking (slow engine start, cold voice, CPU busy with WASM/IndexedDB, rate > 2). The next `speak` uses `QUEUE_FLUSH`, chopping the sentence mid-word.
3. **Web: stale closure keeps talking.** `makeEnv` web `speak` splits text into parts and chains `u.onend = next`, with no cancelled flag. After `cancel()`, some browsers still fire `end`, so the old chunk queues its next part over the new one (overlap/garble).
4. **Web: `cancel()` immediately followed by `speak()`** is dropped or glitchy in Chrome; `getVoices()` is empty at first call (needs `voiceschanged`); long speech stops after about 15 s; synthesis stays paused/stuck after a tab goes to background.
5. **No lifecycle handling.** No `onPause/onResume`, `visibilitychange`, `pagehide`, or audio focus. Phone calls, other media, screen off, and switching apps leave the engine and the narrator state out of sync (`playing=true` but silent).
6. **Event identity.** `pending = {}` is reset in `cancel()`; late `done/error` for an old id are ignored, but a `start`/`range` for the new id can arrive before `pending[id]` is set only if `speak` is slow. Check ordering under load.
7. **Webxdc/Python labs** share the WebView process; a heavy lab (WASM) can starve the UI thread so `evaluateJavascript` callbacks (`__ttsEvent`) arrive late, triggering hypothesis 2.

## Step 1: build a test harness first (no behaviour changes yet)

Goal: reproduce deterministically before fixing.

1. `build/tests/narrate_fuzz.js` (node, no browser): drive `createNarrator` with a **fake env** that can inject faults: late `end` (after watchdog), missing `end`, immediate `error`, `error` storm, duplicate `end`, `end` after `cancel`, events for stale ids, slow `onstart`. Assert invariants:
   - never two chunks speaking at once (fake env counts active utterances);
   - chunk index only moves forward by one per natural end, or by explicit next/prev/jump;
   - after `pause()` nothing is spoken and no timer fires;
   - an error storm (N consecutive errors) stops with an `onError` hook instead of racing to the end;
   - `setRate` mid-speech restarts the **same** chunk once.
   Run with seeded random sequences of user actions (play, pause, next, prev, jump, setRate, stop) plus faults, 5000 runs.
2. `build/tests/audio_web_test.py` (Playwright): inject a **mock `speechSynthesis`** with the real browser quirks (cancel fires `end` or `error:canceled`, speak-after-cancel dropped unless delayed, empty voices then `voiceschanged`, 15 s cutoff, stuck paused). Open a course lecture, play, and run the same action fuzz. Check the avatar mouth state, the progress counter, and that exactly one utterance is active.
3. `build/tests/audio_bridge_test.py`: Playwright with a **fake `window.AndroidTTS`** (speak/stop/isReady) that emits `__ttsEvent` with injected delay/loss/error and an engine-restart scenario (`isReady` false for 3 s). Same assertions.
4. Real-device matrix (manual checklist for the user, 10 min): Samsung TTS and Google TTS, rate 1.0 / 1.5 / 2.0, a long Rust or Quantum chapter, while a MicroPython lab loads, screen off/on, incoming notification sound, headset plug/unplug, background and return. Record result per cell.
5. **Bisect by APK**: the repo has 2.4.0 to 3.0.0 in `android/`. Install in order on the same phone and play the same chapter at rate 1.5 with a Python lab opened in between; the first bad version names the culprit commit (`git log` between tags: 2.6.0 AI/network, 2.8.0 IndexedDB, 2.9/3.0 labs and big courses).
6. Add `ttsDiag()` (see below) so a failing phone can export the last 200 audio events; ask the user to attach it.

## Step 2: fixes, in priority order (do after the harness reproduces)

A. **Narrator (`narrate.js`)**
   - Replace the fixed watchdog with a **progress-aware watchdog**: reset it on every `start`/`range` event; only fire if no event for `max(8 s, estimate)`. When it fires, do not flush blindly: call `env.cancel()`, wait for idle, then speak the next chunk.
   - Count consecutive errors; after 3, pause, call `hooks.onError('engine')` and show a toast ("Voice engine not responding, tap to retry") instead of skipping the chapter. One retry of the same chunk before counting.
   - Make `advance()` idempotent per token and ignore `end` once the chunk is already advanced.
   - Debounce `setRate` (restart only after 250 ms idle).
B. **Web env (`makeEnv`)**
   - Per-call `cancelled` flag; `cancel()` sets it and the `next()` chain checks it. Ignore `error` with `canceled`/`interrupted`.
   - After `cancel()` delay `speak` by about 60 ms; wait for `voiceschanged` (timeout 1.5 s) before choosing the voice; keep-alive `pause()/resume()` every 10 s for the 15 s Chrome cutoff; on `visibilitychange` hidden, pause, on visible, resume or reset.
C. **Android (`Bridge.java`, `MainActivity.java`, `Progress.java`)**
   - Queue `speak` calls until `ttsReady` (up to 3 s) instead of failing; expose `isReady()` polling to JS and re-init the engine (`shutdown()` then `new TextToSpeech`) on `onError` with `ERROR_SERVICE`/`ERROR_NOT_INSTALLED_YET` or on `ttsReady=false` after init failure; set `tts.setOnUtteranceProgressListener` again after re-init.
   - Request **audio focus** (`AudioManager.requestAudioFocus`, usage MEDIA/speech, transient may-duck) before speaking; abandon on stop/done; on focus loss, call JS `__ttsEvent(0,'focusloss')` so the narrator pauses.
   - `onPause`: `tts.stop()` and tell JS to pause; `onResume`: do not auto-play. Use `QUEUE_FLUSH` only after `tts.stop()` has returned; consider `QUEUE_ADD` with explicit per-chunk ids.
   - Include `onStop(id, interrupted)` and `onError(id, errorCode)` in events (send the code) so JS can tell interruption from failure; log codes to `ttsDiag`.
   - Run `speak/stop` on a single-thread executor (WebView calls arrive on a background thread, so ordering stop-then-speak is not guaranteed today).
D. **Load shedding**: while a webxdc/Python lab is loading, defer non-critical JS timers; make sure `evaluateJavascript` events are not queued behind big messages (Python output) by batching lab messages.
E. **Diagnostics**: `ttsDiag` ring buffer (event, id, chunk index, ms since request, engine, rate), a Settings button "Voice test" (already `#vtest`) that plays 5 canned sentences and reports pass/fail, and "Copy audio log".

## Acceptance criteria

- Fuzz tests pass 5000 seeded runs with all fault types; mock-browser tests pass on Chromium and (if available) Firefox/WebKit.
- A full 13-chapter autoplay in a mock engine with 5% injected faults never overlaps, never skips more than the failed chunk, and ends with the right progress count.
- On device: 3 consecutive chapters at rates 1.0/1.5/2.0 with Samsung and Google TTS, with and without a Python lab opened, no silent skips, no cut-off sentences; phone call or other app taking focus pauses the Teacher and it resumes on tap.
- No regression in `tests/run_all.sh`; build APK 3.0.1 and bump the web `docs/app`.

## Notes for the next agent

- Do not change course content or lab code. Keep the narrator API (`load/play/pause/next/prev/jump/setRate/stop/state`) stable; add hooks only.
- Commit trailers per repo convention. Rebuild web with `python3 build_web.py --pages ../docs/app` and APK with `android/build_apk.sh VERSION_NAME VERSION_CODE APK_NAME`.

# Controls demo lifecycle review

Reviewed the uncommitted demo integration on 2026-10-13. Scope: the pure lifecycle helpers, app start/finish/retry/resume flow, and endoscope readiness. Browser checks are owned by the main task and are not claimed here.

## Verification

`node --test training/demo-lifecycle.test.mjs training/control-demo.test.mjs training/app-lifecycle.test.mjs`: **26 passed, 0 failed**.

The eight pure lifecycle tests verify:

- Watching, hands-on practice, loading failures, and the return transition save the original case checkpoint instead of the demo's gastric pose.
- Checkpoints cannot cross session IDs; a case with no original checkpoint stays null.
- Retry uses a pending checkpoint only for the matching case.
- Return-state normalization and persisted snapshots are independent of live mutations.
- Paused and active sessions, including manual mode, remain eligible for the demo.
- Safety drills and unfinished accessory workflows block entry.
- The action guard blocks observation, photography, findings, specimens, time credit, report changes, and phase transitions; an explicit safety pause remains available.

Two further regression tests execute the production loader/app transition functions in bounded harnesses with deferred I/O and stubbed rendering. They verify graphics-loss recovery and paused/reduced-motion pose restoration. Removing either fix in memory causes its corresponding test to fail. These checks do not substitute for browser verification.

## Findings resolved in the current changes

### Resolved P1 — A graphics interruption during mesh loading could hide the only recovery action

Source anchors: `training/app.mjs:158`, `training/app.mjs:163`, `training/endoscope.mjs:65`, `training/endoscope.mjs:73`.

In the initial implementation, if WebGL context loss happened while `prepareScope()` was awaiting `loadCase()`, the error callback marked the scope unavailable and showed Retry. The loader checked only disposal and its load token after the mesh promise resolved, so it still returned true after context loss. The app then marked the scope ready and hid the loading/error overlay while the runtime's `contextLost` flag prevented rendering and controls. This affected opening the demo, restoring a case, and retrying.

An isolated harness executing the initial `prepareScope()` and `showScopeError()` functions with a deferred loader reproduced the state sequence:

```text
After context loss:           scopeReady=false, retryVisible=true,  enabled=false
After pending mesh resolves:  scopeReady=true,  retryVisible=false, enabled=false
```

The loader now throws on context loss before activating the mesh (`training/endoscope.mjs:74`). The app catches this failure and its existing `finally` clears the loading flag. The regression check confirms `scopeReady=false`, visible Retry, disabled controls, zero mesh activations, and the intact original pending case checkpoint after the deferred mesh resolves. **Resolved.**

### Resolved P3 — Retrying a paused demo could reset the taught orientation without restoring its illustration pose

Source anchors: `training/app.mjs:201`, `training/app.mjs:303`, `training/app.mjs:357`.

The initial retry path restored the neutral `DEMO_CHECKPOINT`, reset elapsed time, and never applied the selected pose. The paused animation frame could not repair it. With reduced motion enabled, the frozen illustrative bend disappeared after a successful retry even though the panel described and highlighted the chosen motion.

The app now retains the latest ready demo telemetry as `lastPose`, captures it before replacing the runtime, and reapplies it after a successful retry. If no prior pose exists, it initializes the current step using the same reduced-motion offset as initial readiness. The regression check covers both a manually paused pose and a reduced-motion step with no prior telemetry. **Resolved.**

The closing transition also immediately refreshes the restored case HUD after clearing the demo flag (`training/app.mjs:213`), preventing the final demo labels from lingering until the next telemetry update. This addition was reviewed read-only; browser verification belongs to the main task.

## Reviewed behavior without further findings

- Starting the demo captures the case pose before loading normal anatomy and pauses an active procedure.
- The session action guard and timer branch prevent demo time and demonstration views from entering the case record.
- Finish/skip serialize case restoration with a returning flag; the app generation and renderer load token reject superseded loads.
- Saves during the demo and during restoration use the captured return checkpoint. A page reload therefore restores the case record and its original position, rather than reopening the gastric practice pose.
- A failed case restoration keeps its pending checkpoint available for the ordinary retry flow.

No files outside `training/demo-lifecycle.test.mjs` and this review were edited by this reviewer. No commit was created.

## Final integration follow-up

Step navigation now replaces the cached non-practice pose, so retry cannot reuse the previous axis illustration. Reduced-motion preference starts demonstrations paused at a representative pose; explicitly resuming or replaying opts into animation, and hands-on practice stays available. The host immediately refreshes the case HUD after restoration. These corrections were integrated by the owner after the review.

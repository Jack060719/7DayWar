# Knight dagger shield pair — 2026-10-11

The existing shield-bearing full-body artwork is retained. The new shield-free half consists of six actions, eight directions and 336 frames. This record covers desktop staging inspection and native Chromium image decoding; game-scene playback and phone acceptance are recorded separately.

Accepted staging sources are listed with SHA-256 in each action's `qa.json` under `processed/knight-dagger-v6-trial`. Every action uses the same frozen idle profile (`profiles/knight-dagger-v6-pending.json`); differences in generated sheet resolution only convert this fixed scale. There is no per-frame or per-action body fitting. All original frame durations remain unchanged.

All 336 generated frames were viewed on gray backgrounds for direction, equipment hand, shield absence, complete silhouette and action progression. Native PNG/WebP decoding found no alpha mismatch or nonzero-alpha cell-edge pixels in the 48 clips. The exact original alpha >= 2 pixels are preserved through background cleanup. Removed alpha-1 noise is recorded with coordinates and source hashes. These gates do not establish phone performance.

Specific corrections:

- Idle v1/v4/v5 retained shield-like plates and were rejected. Idle v6 starts from the original shield-free knight body and adds the dagger; all 48 frames were accepted visually.
- Walk/hit/death/cast north-facing hand mistakes were corrected by image edits, followed by inverse placement. Reinsert records prove all pixels outside the selected direction remained unchanged.
- Death N frame 6 received a further one-frame edit; all other 63 frames remain unchanged. Parent review independently confirmed the left-hand dagger against adjacent frames.
- Cast NW v4 fixed the heading but produced a duplicate arm at the peak and was rejected. NW v5 raises the single dagger-holding arm following the original casting sequence; all eight corrected frames were inspected and independently reviewed by the parent. Other 56 frames remain unchanged.
- Death W frames 6–8 originally registered against the dagger tip. The job now names visible foreground boot-sole coordinates in source/native and raw space. Only translation changed; the full silhouette and fixed scale remain intact. The automatic lower-band error metric is not an anatomical foot metric for these three fallen poses.

Attack frame 3 and cast release frame 4 retain original presentation timing. The new cast emitter points were read at native 4x coordinate zoom, with a four-pixel tolerance. The new poses do not imply a newly measured combat delay: damage/RNG remain engine-owned. The NW gesture uses the weapon hand, while other directions retain their existing empty-hand gestures.

Native integration: Chrome/154.0.8037.98 drew all 672 frames across both halves through `FullRenderer.actor`, checked source timing and selected frame identity, and rejected reuse of the shield texture while the shield-free clip was deliberately unavailable. The real `FullRenderer.draw` map scene at 844x390 was visually inspected with the selected character and a synthetic nearby peer using opposite halves, then swapping halves. No simulation state changed. The native test passed once on the final scene-enabled test; this is one test, not 672 independent tests. The affected unit group passed 10/10.

Known limits: repeated leg poses and modest torso changes remain in the walk cycle; this is not a newly captured full gait. The painted character is slightly fuller than the old shield-bearing half. Equipment-panel clicks, real Android/iPhone touch, GPU and sustained performance have not been measured here.

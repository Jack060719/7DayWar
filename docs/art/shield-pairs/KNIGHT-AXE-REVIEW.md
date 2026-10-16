# Knight axe without shield

Six original imagegen actions provide 336 frames; the original with-shield half remains unchanged. Saved prompts/raws and the fixed idle geometry profile trace every result. Native Canvas performs deterministic alpha-component extraction, uniform bundle scale, source-foot translation and alpha-1 background cleanup because Python was unavailable. No per-frame fitting or shield overlay is used.

Tool-output images were inspected for removed shields, single axe and gross direction/hand errors. Hit N was corrected by one imagegen 2x2 edit, then inverse-inserted with zero changed pixels outside its four bodies. Cast v1 retained shield-like plates; v2 instead edits the accepted no-shield attack body and retains one raised axe with original cast durations. This leaves similar attack/cast gestures.

All final actions report zero strict geometry failures. Output interpolation introduced alpha-1-only distant background specks in two cast frames; the output cleanup removes only alpha 1 at least three Chebyshev pixels from any alpha>=2, recording coordinates and before/after hashes. Every alpha>=2 pixel is preserved.

As requested, no new per-action native codec or game-scene acceptance was run. Both remain pending the single final integrated check; phone acceptance remains with the user. Original repeated walking poses, coarse recoil changes, natural rear-view weapon occlusion and approximate cast hand emission points are retained limitations. Geometry is not proof of animation quality.

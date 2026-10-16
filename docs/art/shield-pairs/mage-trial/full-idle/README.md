# Mage staff: eight-direction shield idle trial

This is staging artwork, not a runtime asset or a completed shield animation family. Existing game images, manifests and gameplay code are unchanged.

## Generation record

The target is `../../inputs/mage-staff/idle.png`: 48 original mage staff idle frames, rows S/SW/W/NW/N/NE/E/SE and six frames per row, prepared from the current runtime manifest. The first edit used `../raw-shield.png` only as a shield-design reference. Every original frame duration is 160 ms; no timing change was requested.

The built-in image generator returned a transparent 1086 × 1448 PNG. `raw-shield.png` is its unchanged output. The first version incorrectly retained the convex steel shield face in NW back-three-quarter views. A single targeted image edit corrected NW toward a dark inner face and made a small far-side shield rim readable in E. The unchanged second output is `revision2/raw-shield.png`. Both exact prompts and raw SHA-256 hashes are preserved in the respective provenance files. No shield pixels were drawn by code.

## Native visual review

Both raw versions were decoded in isolated Chrome Canvas. Gray composites and all eight six-frame zoom sheets were inspected, covering all 48 frames in each version. Zoom sheets are fixed raw-grid crops for visual inspection only; apparent NW/N overlap in version 1 and other row overlaps in version 2 are not accepted extraction boundaries. Complete-component/seam extraction belongs to the separate staging processor.

The second version retains the slender mage, purple embroidered robe, staff in the anatomical right hand and shield at the anatomical left forearm. S/SW/SE show the steel front; W a foreshortened front/edge; N a brown inner back; NE/E a naturally partly occluded inner/side edge. NW now shows a dark brown inner face and steel rim. Root independently reviewed all six NW zooms and accepted this as a candidate: the small bright central detail can reasonably be a grip/fastener, rather than the earlier convex exterior steel boss. Individual leather straps are not clearly resolved at the approximately 10–20-pixel native shield size; that limitation is retained.

Subtle idle pose changes exist, but image generation did not preserve every source pixel or exact raw placement. Geometry, common profile, foot anchors, playback continuity and runtime integration are separate acceptance gates.

## Alpha evidence

- Version 1: 48 nonempty raw grid slots; 116 outer-edge pixels with alpha 1–7, zero outer-edge pixels at alpha ≥8.
- Version 2: 48 nonempty raw grid slots; 13 outer-edge pixels with alpha 1–7, zero outer-edge pixels at alpha ≥8.
- Neither native gray composite shows the broad brown halo sometimes visible in the image-tool preview.
- Raw files were not opacity-thresholded, painted over, trimmed or frame-rescaled.

The tiny outer-edge alpha values are recorded, not misreported as visible body cropping. Main-body extraction and detached-fringe cleanup require the staging processor's component/seam evidence.

## Status

Second-version eight-direction shield semantics are accepted as a staging candidate, with the small strap-detail limitation above. The common processor has now produced all 48 frames in `../../processed/mage-staff-v2-trial/idle/` at uniform scale 0.7416769420468557, with zero empty, edge-contact or clipped frames. The profile is reused by the walk candidate without refitting. Processed-frame codec/playback and final family acceptance remain separate gates. No runtime binding, other-action completion or mobile visual acceptance is claimed.

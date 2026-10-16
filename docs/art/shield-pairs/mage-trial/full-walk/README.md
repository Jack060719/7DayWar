# Mage staff: shield walk candidate

This is an eight-direction, 64-frame staging candidate. No runtime image, manifest or gameplay code was changed.

## Generation and geometry

The built-in image generator edited the existing `../../inputs/mage-staff/walk.png` and used the corrected idle image `../full-idle/revision2/raw-shield.png` only as the equipment/style reference. Rows are S/SW/W/NW/N/NE/E/SE, eight original walk frames per row. `raw-shield.png` preserves the complete original generation. The exact prompt, provenance and SHA-256 are retained.

The common processor used the existing mage idle geometry profile unchanged; no walk-specific fit or per-frame resize was introduced. Raw cells are 156.75 square pixels. The idle profile's reference-cell normalization produces a uniform 0.8564180319647903 scale for every walk frame. The resulting silhouette-height diagnostic is +0.763% relative to the original walk source; this includes staff/pose shape and is not a direct anatomical measurement.

All 64 processed frames are nonempty, with zero clipped bounds, zero visible edge contacts and zero any-alpha edge contacts. Every frame retains the source 192 × 192 cell, anchor (96,150), and 90 ms timing. Measured foot-centroid X error is at most 0.860 pixels; foot-bottom Y error is zero. Output and complete per-frame geometry evidence are in `../../processed/mage-staff-v2-trial/walk/`.

## Actual visual review

The processed eight-direction preview and all eight `processed-*-zoom.png` contact sheets were decoded by isolated Chrome Canvas and inspected. These cover every one of the 64 frames. Staff and shield remain in the right and left hands respectively. S/SW/SE retain the steel front; W shows the oblique outer/edge view; NW/N show the dark inner surface. NE naturally exposes part of the left-side shield behind the body/hair during the walking pose, and E largely occludes the far arm/shield. No floating second shield, hand swap, wrong-direction row, missing staff tip or clipped foot was identified.

The robe, slender mage identity, staff design and shield materials remain consistent with the idle candidate. Fine shield straps/fasteners remain limited by native pixel size. Foot/robe/body poses vary, but several leg poses repeat and the motion remains subtle; this retains the existing source's limited walk family and is **not** evidence of a newly authored complete alternating gait. Exact source-pixel pose retention is not claimed.

Frame inspection, native codec/playback checks, all-action continuity, runtime rendering and real-phone acceptance are separate gates. This candidate has passed the listed geometry and static frame semantics; it is not a completed six-action runtime family.

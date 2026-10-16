# Mage staff shield trial: south idle

This is a six-frame feasibility trial, not a runtime asset or a completed shield pair. Built-in imagegen edited the exact existing south idle frames; no shield pixels were drawn by code. Original runtime images and manifests are unchanged.

## Inputs and processing

- Source: `dist/full/art/actors/mage/clips/idle-S.webp`, selected through the existing mage runtime manifest.
- Six 192 × 192 source cells were enlarged uniformly 2× and arranged in two columns, three rows, retaining frame order. The edit target is 768 × 1152 with 384 × 384 cells and local anchor (192, 300).
- Every source frame remains 160 ms; six frames total 960 ms. This trial stores the original timing contract but is not wired to playback.
- Built-in imagegen returned a 1024 × 1536 transparent PNG. The original file is retained unchanged as `raw-shield.png`. A whole-sheet 0.75 scale was used only for measurement and the normalized preview; no frame-specific scaling, translating, opacity threshold, paint-over, or cleanup was applied.
- `prompt-used.txt` contains the exact request. `sha256.json` hashes the reference, raw output, prompt and QC files.

## Actual visual review

The edit target, generated image and Chrome Canvas gray-background comparison were inspected. All six frames have one complete small steel shield at the anatomical left forearm (screen right); the staff remains in the right hand (screen left). Hood, purple robe, slender mage identity and overall pose remain recognizable. The six shields share a consistent design.

At alpha ≥16, all six generated cells are nonempty and have zero edge-contact pixels. Their measured height is 204 pixels at the 384-cell scale; source heights are 198–202 (mean 200), a 2% mean increase. Generated top is y101 throughout; source tops are y100–102. Generated bottom is y304 throughout, versus source y299–301. Therefore raw generation does **not** exactly preserve the original anchor: feet are about 1.5–2.5 native pixels lower. No compensating runtime offset has been added.

The image-tool preview showed an apparent brown halo. The decoded Chrome gray composite does not show that broad halo, and alpha ≥8 bounds remain local to the actor. Alpha 1–7 includes scattered faint remote pixels; these remain unmodified and are separately reported in `alpha-qc.json`. This is not opaque black-background art.

The original small idle differences appear reduced in the generated sequence. Exact frame pose retention and full animation quality have not passed. Uniform frame scale and containment are promising, but the trial is **not production-approved** until anchor/pose retention is resolved and the complete required directions/actions are checked.

## Files

- `original-idle-S.webp`: byte-identical existing source clip.
- `edit-target-2x3.png`: six unchanged frames at 2×.
- `raw-shield.png`: untouched built-in output.
- `raw-grid-normalized-preview.png`: uniform whole-sheet rescale for QC.
- `comparison-192px.png`: original/shield pairs on gray backgrounds with the original foot anchor marked.
- `source-contract.json`, `reference-metrics.json`, `raw-metrics.json`, `alpha-qc.json`: exact frame/timing and measured alpha data.

Only this south idle trial was produced. There is no runtime binding, no other-direction or other-action claim, and no mobile visual acceptance.

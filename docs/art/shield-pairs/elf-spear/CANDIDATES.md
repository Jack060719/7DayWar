# Elf spear shield pair candidate

The original idle establishes the blonde elf, navy/gold outfit and left-arm kite shield. Five remaining actions were generated from the corresponding original poses, with the idle as the style reference. All six actions retain eight directions, original frame counts and durations.

The family uses a 1.5-times wider raw layout. Existing idle pixels were only translated; its layout evidence records zero lost or collided pixels. The derived profile retains uniformReferenceScale 0.8301272106732859 and uses rawReferenceCell 271.5. There is no action-specific size fit.

All six processed actions have zero empty frames, clipping failures and nonzero-alpha pixels on the 192-cell border. This is geometry evidence, not native or phone acceptance. Long spear packing translates pixels and each frame anchor equally, so it does not move the character in world space.

The attack SW third-frame floating debris was removed in an image edit and reinserted at the original fixed canvas scale. The inverse-mapping report records outsideChangedPixels=0. Original raw, prompt, edited output and hashes are retained. Alpha-1 background cleanup uses the existing restricted helper; no alpha>=2 threshold deletion was used.

Generated sheets were inspected for hands, equipment and action progression. Rear interiors and fine straps are simplified, with far-arm occlusion retained. No further per-action browser acceptance was run: final combined in-game and physical-phone acceptance remain open.

Cast origin estimates use spaced/emitter-reference.png. Attack and cast contact indices are 3 for every direction, matching the original marker modules. Emitter anchors incorporate the frame packing offset.

Limitations:

- Generated output inspected; native codec and in-game review are deferred to the final integration pass under the current user instruction. Physical phone review remains open.
- Fixed idle profile preserved across all six actions. Alpha silhouette diagnostics: walk +8.47%, attack about +10%, hit +17.39%, cast +5.33%, death +7.34%. These include spear/pose and are not anatomical torso measurements; no per-action fit was applied.
- Rear shield fine details and naturally occluded far-arm shields are limited at runtime size. Several motion poses remain similar to adjacent frames.
- Attack SW third frame background debris was cleaned through imagegen and inversely reinserted; all other raw pixels remained unchanged.
- 19 attack frames and 10 cast frames use integer atlas packing with equal frame-anchor translation, preserving world-space placement and scale.
- Cast origins are manual current-image estimates with four-pixel tolerance; original release/contact index 3 and all durations are preserved.

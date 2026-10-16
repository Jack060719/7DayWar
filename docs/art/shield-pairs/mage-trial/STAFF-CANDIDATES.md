# Mage staff shield candidates

These files are staging candidates. Runtime manifests and engine timing are unchanged. The six actions contain 336 frames total; all were inspected on native Chromium gray composites, and the current processed versions have zero empty, clipped, visible-edge, or all-alpha-edge failures. Independent final review remains separate.

| Action | Current source | Frames | Status |
|---|---|---:|---|
| Idle | full-idle/revision2/raw-shield.png | 48 | Directional shield surfaces reviewed by two agents; prior WebP decode passed |
| Walk | full-walk/raw-shield.png | 64 | Prior native WebP decode passed; subtle/repeated leg movement remains |
| Attack | full-attack/revision2/raw-shield-patched-final.png | 64 | SE frame3 and all N frames corrected; final codec review pending |
| Hit | full-hit/raw-shield.png | 32 | Small original recoil preserved; final codec review pending |
| Death | full-death/raw-shield-patched.png | 64 | S/SW frame8 shields restored; final codec review pending |
| Cast | full-cast/raw-shield.png | 64 | Original casting sequence and left-arm shield retained; final codec review pending |

All actions reuse `../processed/mage-staff-v2-trial/geometry-profile.json`, scaled only by the full raw-cell ratio. The native cell remains 192×192, anchor [96,150], base height92, with source frame durations retained. No per-action bounding-box fit was used. Attack uses complete component extraction after the N repair because rectangular row seams cross the raised staff silhouette; all586831 nonzero pixels are assigned once, with no character pixels erased.

The generated staff has a larger round orb than the original small crystal, and the robe is slightly fuller. Attack silhouette height is +13.74%; raised staff/orb height is not anatomical size, and head/torso proportions were independently reviewed. Death changes from upright to prone and is not resized to a standing box. Fine rear shield straps are limited at native size. These differences are retained explicitly, not described as pixel-identical restoration.

Single-frame repairs preserve their original generated PNG, exact prompts, inverse mapping, hashes and zero outsideChangedPixels reports. The N repair removed only entire isolated8-connected components whose alpha was exactly1 throughout (893 components/2598 pixels); every component containing alpha>=2 remained intact. No extra foot registration was applied. Source and intermediate rejected variants remain available.

`staff-candidate.json` links the current raw hashes, geometry evidence and limitations. Real gameplay playback, integration and physical-phone acceptance are still separate gates.

## 整合候選

最後北向攻擊修正已由另一位審查者核對：右臂多盾已移除，左盾自然遮擋。六動作共 336 幀／48 clips 已封裝；同一 profile、原逐幀時長維持。攻擊接觸第 4 幀，施法第 5 幀（NE 第 4 幀）沿用原標記；新手部發射位置由目前 192px 素材估讀，4px 容差，不冒稱精密量測。依最新使用者要求不再逐動作開啟瀏覽器驗收，最終整合／手機驗收仍待完成。

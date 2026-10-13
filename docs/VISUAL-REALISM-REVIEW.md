# Gastric visual realism and steering review

Reviewed **13 October 2026**. Scope: normal white-light gastric body, antrum and pylorus; distal tip angulation and shaft rotation. These are renderer recommendations, not validation of the synthetic model. No clinical images were downloaded or changed during this review. No runtime code was changed.

## Evidence used

| Reference | Evidence and limit |
| --- | --- |
| [BSG/AUGIS best practice for upper gastrointestinal endoscopy, 2026](https://www.bsg.org.uk/getmedia/e6c6a429-4fc9-478f-afaf-16e085363d5f/UGI-Best-Practice-Endoscopy-(flgastro-2025-103455nn).pdf) | Current society guidance; stomach inspection, separate body/antrum views, visibility and retroflexion. Figure 2 provides normal landmark photographs; Figure 16 includes examples of normal collecting venules. This is a clinical reference, not a material or mesh specification. |
| [Olympus: Upper GI screening method, Yamamoto, 2018](https://www.olympusprofed.com/wp-content/uploads/2018/09/Upper-GI-screening-method.pdf) | Manufacturer-hosted clinician teaching poster with separate lower body, antrum, prepylorus, pylorus and retroflex views. Its images support visual comparison of regional contours and folds. It distinguishes tip up-angulation from scope rotation and describes spreading folds with distension. It is an illustrative teaching method, not a universal mandatory inspection order. |
| [PENTAX manufacturer device description: EG29-i10c, FDA K190805, 2019](https://www.accessdata.fda.gov/cdrh_docs/pdf19/K190805.pdf) | PDF pp. 6–7: the angulation knob bends the bending section; objective lens and light guide are at the distal end; reflected light is captured at that end. This device description establishes mechanism, not simulator-specific steering calibration. |
| [Chen et al.: Association between regular arrangement of collecting venules and Helicobacter pylori status in routine endoscopy, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8527606/) | Prospective primary study. Figure 1a depicts minute regularly spaced red dots with claw-like morphology in close-up corpus views. The paper distinguishes this from diffuse redness, mosaic and cleft-like patterns. Fine vessel visibility depends on region and imaging conditions. This review does not add an infection classifier. |
| [Borgli et al.: HyperKvasir, Scientific Data, 2020](https://www.nature.com/articles/s41597-020-00622-y) | Primary dataset paper, Figure 1 upper GI landmark examples. The unchanged local full figure was inspected at `training/assets/clinical/hyperkvasir-figure1.png`. Its pylorus and retroflex stomach panels help compare overall shape and wet highlights, but their approximately 142-pixel panels cannot validate microtexture, dimensions or histology. |

Existing source and rights records remain in [CLINICAL-SOURCES.md](./CLINICAL-SOURCES.md) and [CLINICAL-MEDIA.md](./CLINICAL-MEDIA.md). Old prototype reference photographs have not been cleared for the published training suite; their presence does not authorize photographic texture reuse.

## Five concrete renderer corrections

These are visual inferences from the cited photographs and device descriptions. Numeric material settings and motion timings require visual tuning; none of these sources establishes a calibrated shader parameter.

1. **Give the body and antrum distinct fold geography.** Preserve an asymmetric gastric chamber. Use broad rounded longitudinal/oblique rugae in the body, with variable spacing, branching and termination; fade their height and density into the smoother antrum. Avoid a regular ribbed cylinder or spokes converging at a polar axis. Let distension flatten folds as well as enlarge the cavity. Relevant code: `anatomy.mjs` ellipsoids; `tissue.mjs` `tissueField`, `body`, `axisFade`, `deformation`. Compare body/antrum photographs in the [Olympus poster](https://www.olympusprofed.com/wp-content/uploads/2018/09/Upper-GI-screening-method.pdf) and normal landmarks in [BSG 2026 Figure 2](https://www.bsg.org.uk/getmedia/e6c6a429-4fc9-478f-afaf-16e085363d5f/UGI-Best-Practice-Endoscopy-(flgastro-2025-103455nn).pdf).

2. **Make the pylorus a localized aperture within the antral wall.** Give it a soft tissue rim, short narrowing and visible continuity into the bulb. Keep the antral chamber around it substantially wider; avoid making it appear as a long uniformly corrugated pipe or a permanently circular black hole. A moving antral contraction and a separately changing pyloric opening are useful illustrative motions. The exact periods already in `antralScale` are artistic timings, not physiological measurements. Relevant code: fourth gastric ellipsoid and outlet tubes in `anatomy.mjs`; `antralScale` and `deformGLSL` in `tissue.mjs`. Compare the [Olympus prepylorus/pylorus views](https://www.olympusprofed.com/wp-content/uploads/2018/09/Upper-GI-screening-method.pdf) and [HyperKvasir Figure 1](https://www.nature.com/articles/s41597-020-00622-y).

3. **Reduce repeating red bands and large dark texture patches in the normal baseline.** `synthetic-tissue.mjs` creates vessels from a spatial sine stripe across every region. Replace that with restrained, fine, broken vessel detail and low-contrast regional variation. Keep the antrum comparatively smooth. If corpus collecting venules are illustrated, make them subtle small dot/claw motifs visible only in a sufficiently close view; do not put a magnified vascular network across the whole stomach. Avoid accidental diffuse redness, cleft-like cracks or ulcer-like pale patches in the normal case. Compare the normal close-up with abnormal texture examples in [Chen et al. Figure 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC8527606/). Preserve `pathology.mjs` finding masks as distinct authored overlays.

4. **Make wet sheen and brightness respond to the tip.** Use localized highlights over rounded folds and smooth wall surfaces; preserve midtone detail rather than glazing the entire view white. Keep distant cavity regions darker, with sufficient visibility to read the opening. The light and view should move together, and proximity should alter apparent brightness. Tune roughness/clearcoat against a fixed camera/light comparison instead of assuming that maximum gloss is realistic. Relevant code: `createSyntheticTissue`, `createTissueMaterial` and the camera-attached lights in `endoscope.mjs`; camera lights are already attached and should remain so. Distal light/lens placement is documented in [PENTAX K190805](https://www.accessdata.fda.gov/cdrh_docs/pdf19/K190805.pdf); highlight appearance is compared with the [unchanged HyperKvasir figure](https://www.nature.com/articles/s41597-020-00622-y). This is an optical inference, not a measured tissue reflectance model.

5. **Show bending and shaft rotation as separate visible actions.** Angulation should visibly redirect the distal line of sight in two planes. Shaft rotation should change the field orientation; when the tip is bent, it also changes the direction of that bend relative to the anatomy. With a straight tip, rotation can primarily roll the view. Neutralizing controls should reset their commanded values without claiming that the anatomy or lumen has been centered. Relevant code: the ordered quaternion composition in `endoscope.mjs` `pose`, the `centre` operation and the control guide in `app.mjs`. The bent-tip versus rotation distinction is supported by [PENTAX K190805](https://www.accessdata.fda.gov/cdrh_docs/pdf19/K190805.pdf) and [BSG 2026 stomach inspection](https://www.bsg.org.uk/getmedia/e6c6a429-4fc9-478f-afaf-16e085363d5f/UGI-Best-Practice-Endoscopy-(flgastro-2025-103455nn).pdf). A route-assisted camera may point along its predefined route at neutral; label this assistance explicitly.

## Demo wording

Suggested control help:

> The wheels bend the distal tip up/down and left/right. Shaft rotation turns the field; with the tip bent, it also turns the direction of the bend relative to the anatomy. Use the visible lumen and landmarks to orient the view. Centre controls resets the simulated control values. It does not automatically center the lumen. This demo uses route-assisted insertion and illustrative tissue motion.

Suggested neutral-button label: **Reset angulation and rotation**. Suggested brief status after activation: **Control values reset — check the visible lumen.**

Suggested normal-case visual caption:

> Synthetic white-light gastric view: rounded body folds, smoother antrum and a localized pyloric opening. Compare with the clinical reference atlas. The model illustrates appearance and steering; it is not a patient recording.

## Review checks for the owner

- Compare normal body, antrum and pylorus at the same gas setting and distance before altering pathology.
- Check a slow rotation with straight and bent tips; the wall and opening must remain coherent through the motion.
- Reset controls from an off-axis view and verify that the interface does not promise lumen centering.
- Compare low and moderate distension for fold flattening, antral continuity and localized pyloric motion.
- Check that normal-case red detail does not resemble the authored inflammatory or vascular findings.

These checks can establish coherent rendering and teaching behavior. They do not establish anatomical measurement accuracy, procedural competence or diagnostic performance.

# Gastric mucosa visual provenance

- Asset: `training/assets/gastric-mucosa-v2.png`
- Created: 2026-10-13
- Method: OpenAI built-in `image_gen.imagegen` tool, new image generation, opaque background. No CLI/API runner was used.
- Dimensions: 1254 × 1254 pixels, PNG.
- Source output: `/Users/doitrous/.codex/generated_images/01a13372-53b8-7530-b712-71340b0c11e5/exec-00f0987a-63cd-44d6-b9fd-efdec222c9b3.png`
- Model identity: the built-in tool does not expose a selectable or independently verified model version; no claim of a particular GPT Image version is made.
- Status: fully synthetic, medically unvalidated visualization. No clinical photograph was supplied or copied. This is a simulator appearance asset, not clinical reference evidence.
- Intended use: base-color texture projected onto actual 3D gastric geometry with dynamic lighting. Macro rugal folds, normals, wetness response, and shadows belong to the renderer.
- Visual inspection: salmon/coral tissue color, subtle branching capillary detail, shallow irregular surface detail, no lumen, macro rugae, text, or lesions. Some small pale surface accents and local color shading remain; these are generated color features rather than a measured albedo map.
- Tiling: seamless opposing edges were requested, but mathematical periodicity has not been established. Shader integration should check visible seams and repeated patterns at the intended scale.
- Processing: the selected output was copied unchanged into the project. No image editing or clinical photo compositing was performed.

## Exact generation prompt

```text
Use case: scientific-educational
Asset type: seamless square gastric mucosa base-color/albedo texture for a 3D virtual endoscope simulator; physically lit triplanar material.
Primary request: Generate a photorealistic, medically plausible close-up of normal healthy human gastric mucosal surface, seen directly perpendicular to the surface, with no perspective or depth composition. Fill the entire square with continuous tissue. Make this a seamless tile whose opposing edges match naturally.
Subject and texture: normal gastric mucosa in a warm salmon pink and soft coral palette, modest organic color variation, extremely fine shallow areae gastricae separated by delicate irregular shallow boundaries; faint irregular branching reddish subepithelial capillaries seen beneath a translucent epithelial surface. The microscopic gland openings should be soft, fine, and subtle. Moist living translucent epithelial appearance conveyed by color detail, not specular reflections. Natural irregularity, no uniform cellular lattice, no repeated motifs.
Composition/framing: near-orthographic flat texture sample, uniform detail and focus across the full square, fine details at a consistent small scale; no central feature, no focal point, no borders.
Lighting: evenly illuminated with flat diffuse illumination suitable for a base-color map; absolutely no baked glossy highlights, specular points, strong directional shading, vignettes, cast shadows, or dark edges.
Constraints: gastric epithelium, not human skin. No macro rugal folds, tubular folds, noodles, deep furrows, wrinkles, bulges, lumen, cavities, camera effects, blood pools, gore, lesions, inflammation, ulcers, tools, labels, text, watermark, scale bars, hair, skin pores, leather texture, embossed cellular honeycomb or artificial plastic rendering. This is a texture of the fine mucosal surface; macro folds and all lighting will be supplied by the 3D renderer.
Output: high-detail square image, opaque background, seamless tile.
```


## Runtime integration

The renderer uses mirrored wrapping and triplanar blending, avoiding visible hard tile boundaries without editing the image file. Its color contribution is restrained and reduced in the oesophagus. Fine relief and varying roughness complement geometry-based folds; paired camera lights generate local highlights. Deformed normals follow simulated distension. These settings are visual approximations, not measured mucosal optical properties. Normal and gastric-ulcer views were visually checked in the running application at desktop and phone viewport sizes.

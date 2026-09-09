# Virtual Endoscope

An open-source, browser-based upper-GI endoscopy teaching prototype. Explore a guided route from the oesophagus to the descending duodenum, practise core scope functions, compare simulated findings with reference images, and run a resumable guided walkthrough.

**Live demo:** https://virtualendoscope.doitrous.com/

> [!IMPORTANT]
> This is an illustrative, unvalidated educational prototype. It is not a patient reconstruction, diagnostic system, certified simulator, or substitute for supervised clinical training.

## Features

- Guided endoscope navigation with independent viewing direction
- Insufflation, suction, irrigation and lens-wash controls
- Visible oesophageal and gastric motility
- Circular endoscopic optics, illumination and exposure effects
- Twenty selectable normal/disease views with optional related findings
- Real-image comparison galleries with condition references
- A smooth, resumable 53-second walkthrough
- Mouse, keyboard and on-screen controls
- Adaptive rendering for current desktop browsers

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
git clone https://github.com/doitrous/virtualendoscope.git
cd virtualendoscope
npm ci
npm start
```

Open http://127.0.0.1:5194. Set `PORT` to use another port. The server listens on all container interfaces so it can run behind a reverse proxy.

Run the automated checks with `npm test`.

## Controls

| Action | Control |
| --- | --- |
| Continue / stop guided travel | `Space` or the on-screen button |
| Advance / withdraw manually | `W` / `S` or `↑` / `↓` |
| Look horizontally | `A` / `D`, `←` / `→`, or drag |
| Look vertically | `T` / `G` or drag |
| Centre view | `C` |
| Insufflate | Hold `I` |
| Irrigate | Hold `J` |
| Suction | Hold `K` |
| Wash lens | Hold `L` |

## Deploy on Coolify

Use the **Nixpacks** build pack with the repository root as the base directory:

- Install command: `npm ci`
- Build command: leave empty
- Start command: `npm start`
- Exposed port: `5194`
- Health-check path: `/`

Coolify may supply its own `PORT`; the server honours it automatically.

## Project layout

The active simulator is in [`prototypes/upper-gi-mesh`](prototypes/upper-gi-mesh). Prepared mesh assets are committed because generating them is intentionally an offline development task. The browser loads only selected cases and keeps a bounded cache.

- [Implementation notes](prototypes/upper-gi-mesh/README.md)
- [Medical references](prototypes/upper-gi-mesh/DISEASE-RESEARCH.md)
- [Motion and physics notes](prototypes/upper-gi-mesh/PHYSICS-AND-VIDEO-NOTES.md)
- [Contribution guide](CONTRIBUTING.md)

## License and media

The original source code and synthetic mesh assets are available under the [MIT License](LICENSE).

Clinical photographs, videos, research PDFs, fonts and other third-party materials keep their original copyrights and are **not relicensed under MIT**. Most supplied endoscopic photographs were attributed to [GASTROLAB](https://gastrolab.net/), but individual authorship and reuse permissions have not been independently verified. Review [the third-party notices](THIRD_PARTY_NOTICES.md) before reusing or redistributing media.

## Contributing

Bug reports, accessibility improvements, performance work and medically reviewed corrections are welcome. Please distinguish visual approximations from validated anatomy or physiology, cite clinical claims, and never add identifiable patient data.

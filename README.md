# Virtual Endoscope

**Lumen** is a browser-based upper GI learning suite. Move through a theory room, procedure room and recovery space, following a fictional patient from briefing and preparation to a synthetic endoscopic examination, documentation, specimen handling and debrief.

The recovered application includes **3 rooms, 7 cases, 16 lessons, 15 preparation checks and 8 recovery checks**. It imports existing Three.js anatomy and mesh modules directly; there is no iframe bridge or external AI examiner. The original twenty-view laboratory remains available separately.

This is an **unvalidated educational prototype**. Navigation follows a prescribed synthetic route. It does not reproduce oral intubation, calibrated shaft forces, looping or haptics. Recorded actions, photograph labels and sample counts cannot establish diagnostic accuracy or clinical competence. See [release readiness](docs/RELEASE-READINESS.md).

[Existing hosted demo](https://virtualendoscope.doitrous.com/) — the deployed version may differ from this development branch.

## Learning workflow

- Explore the rooms or use room tabs and station buttons for direct access.
- Read source-linked lessons on indications, anatomy, instruments, optics, preparation, safety, examination and aftercare.
- Select normal anatomy, reflux esophagitis, suspected Barrett's mucosa, gastric ulcer, duodenal ulcer, esophageal varices or suspected celiac disease.
- Review the fictional patient and complete preparation before entering the examination.
- Operate scope controls, inspect regions and label captured views; follow case-specific sampling rules and separate-container requirements.
- Withdraw, complete handover and recovery, then download an illustrated HTML report or JSON session record.

Progress and captured views are stored in the current browser. There is no account sync, live instructor, voice chat or AI feedback service. Use fictional information only. Rendering settings, reduced tissue motion and visible controls support different devices; broad accessibility and device testing remain pending.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
git clone https://github.com/doitrous/virtualendoscope.git
cd virtualendoscope
npm ci
npm start
```

Open [http://127.0.0.1:5194](http://127.0.0.1:5194). The server honors `PORT` and listens on `0.0.0.0` for reverse-proxy use.

| Command | Purpose |
| --- | --- |
| `npm start` | Serve training from source |
| `npm run build` | Create standalone training output in `dist/` |
| `npm run preview` | Serve built output; build first |
| `npm test` | Run prototype, build/server and training checks |
| `npm run start:prototype` | Open the preserved original laboratory |
| `npm run prepare:training` | Regenerate synthetic Barrett and gastric-ulcer mesh assets offline |

The training server/build includes local dependencies, selected meshes and the attributed atlas. Legacy `references/` photographs, videos and research PDFs are excluded. The laboratory uses its own server and retains historical galleries; it is not included in the standalone training build.

## Controls

Controls depend on whether you are walking through the suite or operating the scope.

| Action | Suite | Scope workspace |
| --- | --- | --- |
| Move / advance / withdraw | `W A S D` or arrows to walk | Hold `W` / `S` to advance / withdraw |
| Look / angulate | Drag to look | Drag or arrows; `A` / `D` also steer horizontally |
| Interact / rotate | `E` interacts with a nearby station | `Q` / `E` rotate the shaft view |
| Faster room movement | Hold `Shift` | — |
| Center scope controls | — | `C` |
| Insufflate / irrigate / suction / lens wash | — | Hold `I` / `J` / `K` / `L` |
| Retroflex, capture, document or pause | Station and room buttons | Visible buttons and angulation sliders |

Release held controls to stop. Session state gates scope movement; view changes, dialogs and focus changes clear active input. Release retroflexion and account for accessories before withdrawal/recovery. The controller is a teaching interface, not a calibrated manufacturer control head.

## Build and host

For static hosting, run `npm ci` and `npm run build`, then publish `dist/` at the origin root. Absolute `/training/` and `/vendor/` paths need changes for subdirectory deployment.

For Coolify/Nixpacks:

- Install: `npm ci`
- Build: `npm run build`
- Start: `npm run preview`
- Port: `5194`, or supplied `PORT`
- Health-check path: `/`

Serving build output is a deployment mechanism, not evidence of clinical, security or performance certification. Review [release readiness](docs/RELEASE-READINESS.md) before production claims.

## Project layout and evidence

- [`training/`](training/): recovered direct runtime, rooms, scope, sessions, lessons, cases and atlas.
- [`scripts/`](scripts/): build, restricted serving and related checks.
- [`prototypes/upper-gi-mesh/`](prototypes/upper-gi-mesh/): preserved laboratory and shared modules.
- [Implementation plan and recovery decision](docs/UPPER-GI-WORLD-PLAN.md)
- [Clinical sources and audit](docs/CLINICAL-SOURCES.md)
- [Atlas licenses and limitations](docs/CLINICAL-MEDIA.md)
- [Generated visual provenance](docs/VISUAL-PROVENANCE.md)
- [Original laboratory notes](prototypes/upper-gi-mesh/README.md)

## License and contribution

Original code and synthetic mesh assets use the [MIT License](LICENSE). Third-party media, fonts and libraries retain their own terms. The atlas contains publication figures with verified attribution permissions; older GASTROLAB-attributed material has unresolved individual permissions and is excluded from the training build. Read [third-party notices](THIRD_PARTY_NOTICES.md) before redistribution.

Contributions are welcome through [the contribution guide](CONTRIBUTING.md). Cite clinical corrections, distinguish approximations from validated anatomy and never add identifiable patient data. Lower GI indications appear in theory; there is no lower GI practical simulator in this release.

# Virtual Endoscope

Browser-based upper-GI endoscopy teaching prototype with a guided route, insufflation, peristalsis, disease views, real-photo references and a resumable walkthrough. Coffee-colored interface, without product branding.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm start
```

Open http://127.0.0.1:5194. The local server redirects to the simulator. No Nishany application or account is required. The server binds only to localhost; GitHub publication alone does not deploy a live website.

```sh
npm test
```

Prepared meshes and reference media are included, so the repository is larger than a code-only project. See [simulator notes](prototypes/upper-gi-mesh/README.md) and [research references](prototypes/upper-gi-mesh/DISEASE-RESEARCH.md).

## Clinical and media notice

Illustrative, unvalidated educational prototype, not a patient reconstruction or a clinical decision tool. Walkthrough cases are separate teaching examples, not one patient's disease progression.

Most supplied clinical photographs were identified by the contributor as originating from [GASTROLAB](https://gastrolab.net/). Individual image authorship and reuse permissions have not been independently verified. Third-party media remain copyright of their respective owners; inclusion and credit do not grant downstream reuse rights. Review permissions before redistributing or deploying publicly. Condition references and photo attribution are available inside the photo viewer. This repository does not grant a blanket license to its reference media.

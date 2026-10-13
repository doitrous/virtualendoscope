import * as THREE from 'three';

/** A walkable, connected teaching suite. Coordinates and apparatus are illustrative. */
export function createWorld({ container, onInteract = () => {}, onLocation = () => {}, quality = 'balanced' }) {
  if (!container) throw new Error('A container is required for the training suite.');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    const message = document.createElement('div');
    message.setAttribute('role', 'status');
    message.style.cssText = 'padding:32px;color:#163f43;background:#edf2ef;font:16px/1.6 system-ui;';
    message.textContent = 'The 3D suite could not start on this device. You can continue your training using the station controls and procedure monitor.';
    container.append(message);
    return { setRoom() {}, setMonitorTexture() {}, setProcedureActive() {}, setPatientPrepared() {}, setQuality() {}, setMuted() {}, focusStation(id) { onInteract({ id, room: 'theory', title: 'Training station' }); }, update() {}, dispose() { message.remove(); }, getPosition() { return { room: 'theory', x: -8, z: 3, heading: 0 }; } };
  }
  renderer.setClearColor(0xe6ebe7);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;outline:none;';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Walkable endoscopy training suite. Use W A S D or arrow keys to walk, drag to look, and E to interact.');
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdde7e3);
  scene.fog = new THREE.Fog(0xdde7e3, 18, 38);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.06, 65);
  camera.rotation.order = 'YXZ';
  const ownedTextures = new Set();
  const colliders = [];
  const interactables = [];
  const materials = new Set();
  const geometries = new Set();
  const keys = new Set();
  const lightPanels = [];
  const stations = new Map();
  const eyeHeight = 1.64;
  let yaw = 0, pitch = -0.03, disposed = false, procedureActive = false, patientPrepared = false;
  let room = 'theory', lastLocation = 0, lastTime = 0, frame = 0, nearest = null, monitorTexture = null;
  let pointer = null, moved = false, animationTarget = null, lastState = {}, muted = true;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  const mat = (color, options = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, ...options });
    materials.add(material);
    return material;
  };
  const palette = {
    wall: mat(0xf3f1e9, { roughness: 0.91 }), trim: mat(0xe0e5df), teal: mat(0x276866),
    dark: mat(0x173b40), ink: mat(0x203039), pale: mat(0xd6e3df), white: mat(0xf4f6ef),
    steel: mat(0xa8bac0, { metalness: 0.82, roughness: 0.26 }), black: mat(0x202a2d, { roughness: 0.38 }),
    rubber: mat(0x3b4241, { roughness: 0.94 }), linen: mat(0xe8eadf, { roughness: 1 }),
    mint: mat(0xbdd4ca, { roughness: 0.98 }), blue: mat(0x8caeb6, { roughness: 0.95 }),
    wood: mat(0xb09b7c), skin: mat(0xd2a387, { roughness: 0.97 }), gown: mat(0x97b5ba, { roughness: 1 }),
    glass: mat(0xd0e6e3, { metalness: 0.1, roughness: 0.12, transparent: true, opacity: 0.18 }),
    light: mat(0xfff9e7, { emissive: 0xffefd5, emissiveIntensity: 0.7 }),
  };
  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = scene) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (w, h, d, material, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const cylinder = (r, h, material, x, y, z, parent, rBottom = r) => mesh(new THREE.CylinderGeometry(r, rBottom, h, 24), material, x, y, z, parent);
  function ellipsoid(rx, ry, rz, material, x, y, z, parent) {
    const object = mesh(new THREE.SphereGeometry(1, 24, 16), material, x, y, z, parent);
    object.scale.set(rx, ry, rz);
    return object;
  }
  function roundedBox(w, h, d, material, x, y, z, parent, r = 0.07) {
    // Chamfered clinical furniture has soft, molded edges without a dependency.
    const shape = new THREE.Shape();
    const a = w / 2, b = d / 2, radius = Math.min(r, a, b);
    shape.moveTo(-a + radius, -b);
    shape.lineTo(a - radius, -b); shape.quadraticCurveTo(a, -b, a, -b + radius);
    shape.lineTo(a, b - radius); shape.quadraticCurveTo(a, b, a - radius, b);
    shape.lineTo(-a + radius, b); shape.quadraticCurveTo(-a, b, -a, b - radius);
    shape.lineTo(-a, -b + radius); shape.quadraticCurveTo(-a, -b, -a + radius, -b);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, -h / 2, 0);
    return mesh(geo, material, x, y, z, parent);
  }
  function capsuleBetween(a, b, radius, material, parent) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const tube = cylinder(radius, start.distanceTo(end), material, ...mid.toArray(), parent);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    ellipsoid(radius, radius, radius, material, ...a, parent);
    ellipsoid(radius, radius, radius, material, ...b, parent);
    return tube;
  }
  function tube(points, radius, material, parent = scene) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 60, radius, 10, false), material, 0, 0, 0, parent);
  }
  function collide(x, z, w, d) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); }
  function labelTexture(text, sub = '', { background = '#f1f4ee', color = '#204d50', width = 1024, height = 256 } = {}) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.font = `500 ${Math.round(height * 0.2)}px Arial, sans-serif`;
    ctx.fillText(text, height * 0.15, height * (sub ? 0.38 : 0.51), width - height * 0.3);
    if (sub) { ctx.globalAlpha = 0.68; ctx.font = `${Math.round(height * 0.10)}px Arial, sans-serif`; ctx.fillText(sub, height * 0.15, height * 0.71, width - height * 0.3); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; ownedTextures.add(texture);
    return texture;
  }
  function plaque(text, sub, w, h, x, y, z, rotation = 0, color = '#204d50', background = '#f1f4ee', parent = scene) {
    const material = new THREE.MeshBasicMaterial({ map: labelTexture(text, sub, { color, background }), toneMapped: false }); materials.add(material);
    const object = mesh(new THREE.PlaneGeometry(w, h), material, x, y, z, parent); object.rotation.y = rotation; object.castShadow = false; return object;
  }
  function makeNoiseTexture(base, secondary, grid = false) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = i % 2 ? secondary : '#ffffff'; ctx.globalAlpha = 0.08 + Math.random() * 0.1; ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1); }
    ctx.globalAlpha = 0.1;
    if (grid) { ctx.strokeStyle = '#6d8179'; ctx.strokeRect(0.5, 0.5, 255, 255); }
    const texture = new THREE.CanvasTexture(c); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(12, 5); texture.colorSpace = THREE.SRGBColorSpace; ownedTextures.add(texture); return texture;
  }
  const floorMat = mat(0xd5dbd0, { map: makeNoiseTexture('#cfd8cf', '#85958b', true), roughness: 0.75 });
  palette.linen.map = makeNoiseTexture('#e5e8dc', '#81938a'); palette.linen.map.repeat.set(3, 5);
  palette.wood.map = makeNoiseTexture('#baa386', '#6f5537'); palette.wood.map.repeat.set(2, 2);

  // A single continuous floor and honest openings connect all three teaching areas.
  box(24, 0.12, 9, floorMat, 0, -0.075, 0);
  box(24, 0.13, 9, palette.wall, 0, 3.22, 0);
  const wallHeight = 3.16;
  function wall(w, d, x, z, material = palette.wall) {
    box(w, wallHeight, d, material, x, wallHeight / 2, z); collide(x, z, w, d);
    box(w, 0.13, d + 0.012, palette.trim, x, 0.07, z);
    box(w, 0.035, d + 0.018, palette.teal, x, 0.155, z);
  }
  wall(0.16, 9, -12, 0); wall(0.16, 9, 12, 0); wall(24, 0.16, 0, 4.5);
  // Full-height back piers surround glazed panels; trees and sky are behind actual glazing.
  [-11.5, -4, 4, 11.5].forEach(x => wall(x === -4 || x === 4 ? 0.35 : 1, 0.18, x, -4.5));
  box(24, 0.82, 0.18, palette.wall, 0, 0.41, -4.5);
  box(24, 0.42, 0.18, palette.wall, 0, 2.97, -4.5);
  collide(0, -4.5, 24, 0.18);
  for (const cx of [-8, 0, 8]) {
    box(7.1, 1.94, 0.035, palette.glass, cx, 1.8, -4.49);
    for (let j = -2; j <= 2; j++) box(0.045, 1.99, 0.09, palette.trim, cx + j * 1.38, 1.8, -4.48);
    box(7.15, 0.075, 0.42, palette.white, cx, 0.86, -4.34);
    box(7.15, 0.08, 0.1, palette.trim, cx, 2.78, -4.47);
    // Pale roller blinds provide believable softened north-light.
    box(7.1, 0.2, 0.07, palette.linen, cx, 2.63, -4.39);
    for (let j = 0; j < 7; j++) box(7.1, 0.006, 0.035, palette.trim, cx, 2.53 + j * 0.022, -4.34);
  }
  const skyMat = mat(0xbad5d0, { emissive: 0xbad5d0, emissiveIntensity: 0.22, roughness: 1 });
  box(38, 12, 0.1, skyMat, 0, 3, -12);
  const outsideGround = mat(0xa0b69d, { roughness: 1 }); box(45, 0.08, 12, outsideGround, 0, -0.2, -9);
  const leaf = mat(0x819a7e, { roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const tx = -16 + i * 2.8, tz = -7.8 - (i % 3) * 0.6;
    cylinder(0.09, 2.5, palette.wood, tx, 1.1, tz);
    ellipsoid(0.75, 1.35, 0.75, leaf, tx, 2.1, tz);
    ellipsoid(0.6, 0.85, 0.7, leaf, tx + 0.45, 2, tz);
  }
  for (const x of [-4, 4]) {
    // Door opening: z=1.52..3.22, with a clear 1.7 m route through the suite.
    wall(0.16, 6.02, x, -1.49);
    wall(0.16, 1.28, x, 3.86);
    box(0.18, 0.73, 1.72, palette.wall, x, 2.795, 2.37);
    box(0.22, 2.43, 0.06, palette.teal, x, 1.215, 1.48);
    box(0.22, 2.43, 0.06, palette.teal, x, 1.215, 3.26);
    box(0.22, 0.07, 1.8, palette.teal, x, 2.46, 2.37);
    // Recessed sliding glass doors are visibly parked open to leave a real passage.
    box(0.034, 2.35, 1.6, palette.glass, x - 0.12, 1.2, 0.63);
    box(0.06, 2.36, 0.045, palette.steel, x - 0.12, 1.2, 1.43);
    plaque(x < 0 ? '02 / PROCEDURE' : '03 / RECOVERY', 'TRAINING SUITE', 1.2, 0.22, x - 0.115, 2.73, 2.37, -Math.PI / 2);
    plaque(x < 0 ? '01 / LEARNING' : '02 / PROCEDURE', 'TRAINING SUITE', 1.2, 0.22, x + 0.115, 2.73, 2.37, Math.PI / 2);
  }
  // Perimeter coves, recessed lighting, daylight, and broad soft shadows.
  scene.add(new THREE.HemisphereLight(0xeaf5f0, 0x899285, 2.1));
  const sun = new THREE.DirectionalLight(0xfff4de, 2.6); sun.position.set(-4, 8, -8); sun.target.position.set(2, 0, 1); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9; sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.00015;
  for (const x of [-8, 0, 8]) {
    box(7.75, 0.03, 0.09, palette.light, x, 3.03, -4.05);
    box(7.75, 0.03, 0.09, palette.light, x, 3.03, 4.08);
    for (const z of [-1.8, 1.5]) {
      box(2.7, 0.045, 0.74, palette.trim, x, 3.13, z);
      box(2.61, 0.026, 0.65, palette.light, x, 3.096, z);
      const light = new THREE.PointLight(0xfff2df, 7, 10, 2); light.position.set(x, 2.8, z); scene.add(light); lightPanels.push(light);
    }
  }

  // Helpers keep all equipment dimensional and built from inspectable geometry.
  function castor(x, z, parent, y = 0.14) {
    cylinder(0.035, 0.15, palette.steel, x, y + 0.08, z, parent);
    const wheel = cylinder(0.082, 0.055, palette.rubber, x, y - 0.025, z, parent); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(0.038, 0.057, palette.steel, x, y - 0.025, z, parent); hub.rotation.z = Math.PI / 2;
    box(0.11, 0.04, 0.06, palette.steel, x, y + 0.05, z + 0.025, parent);
  }
  function cart(cx, cz, width = 0.76, depth = 0.6, shelves = 3) {
    const group = new THREE.Group(); group.position.set(cx, 0, cz); scene.add(group);
    for (const x of [-width / 2 + 0.04, width / 2 - 0.04]) for (const z of [-depth / 2 + 0.04, depth / 2 - 0.04]) {
      cylinder(0.018, 0.9, palette.steel, x, 0.65, z, group); castor(x, z, group);
    }
    for (let i = 0; i < shelves; i++) {
      const y = 0.27 + i * (0.68 / Math.max(1, shelves - 1));
      roundedBox(width, 0.04, depth, palette.white, 0, y, 0, group);
      box(width, 0.055, 0.025, palette.steel, 0, y + 0.03, -depth / 2 + 0.015, group);
    }
    capsuleBetween([-width / 2, 0.96, -depth / 2], [-width / 2, 1.05, -depth / 2], 0.015, palette.steel, group);
    capsuleBetween([width / 2, 0.96, -depth / 2], [width / 2, 1.05, -depth / 2], 0.015, palette.steel, group);
    capsuleBetween([-width / 2, 1.05, -depth / 2], [width / 2, 1.05, -depth / 2], 0.015, palette.steel, group);
    collide(cx, cz, width + 0.08, depth + 0.08); return group;
  }
  function plant(x, z, scale = 1) {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(scale); scene.add(p);
    cylinder(0.19, 0.38, palette.white, 0, 0.19, 0, p, 0.14);
    const green = mat(0x3c715b, { roughness: 0.93 });
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399, top = 0.6 + (i % 4) * 0.12;
      capsuleBetween([0, 0.32, 0], [Math.sin(angle) * 0.23, top, Math.cos(angle) * 0.23], 0.012, green, p);
      const l = ellipsoid(0.065, 0.21, 0.025, green, Math.sin(angle) * 0.24, top, Math.cos(angle) * 0.24, p); l.rotation.set(0.4, angle, -0.45);
    }
  }
  function chair(x, z, angle = 0, upholstery = palette.teal) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = angle; scene.add(g);
    for (const tx of [-0.22, 0.22]) for (const tz of [-0.21, 0.21]) capsuleBetween([tx, 0.05, tz], [tx * 0.9, 0.48, tz * 0.9], 0.016, palette.steel, g);
    roundedBox(0.6, 0.08, 0.58, upholstery, 0, 0.49, 0, g);
    const back = roundedBox(0.6, 0.075, 0.56, upholstery, 0, 0.81, -0.23, g); back.rotation.x = Math.PI / 2 - 0.12;
    collide(x, z, 0.66, 0.65); return g;
  }
  function instrumentScreen(w, h, x, y, z, parent, angle = 0, texture = null) {
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = angle; parent.add(group);
    roundedBox(w + 0.08, 0.09, h + 0.08, palette.black, 0, 0, -0.03, group).rotation.x = Math.PI / 2;
    const material = new THREE.MeshBasicMaterial({ map: texture || labelTexture('VITALS', 'TRAINING DISPLAY', { background: '#101f26', color: '#7bd2b7' }), toneMapped: false }); materials.add(material);
    const face = mesh(new THREE.PlaneGeometry(w, h), material, 0, 0, 0.025, group); face.castShadow = false;
    cylinder(0.013, 0.011, palette.teal, w / 2 - 0.03, -h / 2 - 0.017, 0.025, group).rotation.x = Math.PI / 2;
    return { group, face, material };
  }

  // Theory area: hospitality-scale learning alcove, desk, wall curriculum and device display.
  box(6.8, 2.54, 0.055, palette.pale, -8, 1.33, 4.375);
  plaque('ENDOSCOPY / LEARNING STUDIO', 'A safe place to build procedural confidence', 5.5, 0.66, -8, 2.6, 4.335, Math.PI);
  const curriculumTexture = labelTexture('01   PREPARE   /   02   PRACTICE   /   03   REFLECT', 'Theory, equipment checks and patient preparation before the procedure.', { width: 1536, height: 768, background: '#153e43', color: '#e6eeea' });
  const display = instrumentScreen(3.2, 1.58, -8, 1.76, 4.3, scene, Math.PI, curriculumTexture);
  box(5.1, 0.8, 0.48, palette.wood, -8, 0.44, 4.17); collide(-8, 4.17, 5.1, 0.48);
  box(5.16, 0.04, 0.53, palette.white, -8, 0.86, 4.15);
  for (let j = 0; j < 4; j++) { box(1.23, 0.69, 0.03, palette.wood, -9.9 + j * 1.26, 0.47, 3.909); box(0.12, 0.016, 0.022, palette.dark, -9.9 + j * 1.26, 0.73, 3.89); }
  const desk = roundedBox(2.15, 0.07, 1.05, palette.wood, -8.5, 0.76, 0.8);
  for (const x of [-9.35, -7.65]) box(0.055, 0.75, 0.65, palette.dark, x, 0.38, 0.8);
  collide(-8.5, 0.8, 2.18, 1.05);
  const laptop = new THREE.Group(); laptop.position.set(-8.35, 0.81, 0.87); laptop.rotation.y = 0.12; scene.add(laptop);
  roundedBox(0.42, 0.014, 0.28, palette.steel, 0, 0, 0, laptop, 0.015);
  const laptopScreen = instrumentScreen(0.39, 0.245, 0, 0.12, -0.128, laptop, 0, labelTexture('LEARNING PATH', 'Choose a module to begin', { background: '#e5efeb' })); laptopScreen.group.rotation.x = -0.15;
  for (let i = 0; i < 3; i++) roundedBox(0.3, 0.009, 0.22, i === 1 ? palette.pale : palette.white, -9.02, 0.81 + i * 0.01, 0.75);
  chair(-8.5, 1.85, 0); chair(-10.7, -1.0, Math.PI / 2); chair(-10.7, -2.2, Math.PI / 2);
  plant(-10.8, 3.9, 1.4); plant(-5.1, -3.75, 1.3);
  plaque('LEARNING', '01 / Orientation & fundamentals', 2.8, 0.55, -8, 2.44, -4.3);
  const equipment = cart(-5.5, -1.9, 0.9, 0.62, 2);
  const kit = roundedBox(0.67, 0.11, 0.45, palette.dark, 0, 1.03, 0, equipment);
  tube([[-0.17, 1.11, 0.02], [-0.23, 1.13, -0.13], [0.15, 1.13, -0.14], [0.25, 1.13, 0.08], [-0.1, 1.13, 0.12]], 0.018, palette.black, equipment);
  plaque('EQUIPMENT', 'Scope, valves & checks', 0.68, 0.16, 0, 0.65, 0.322, 0, '#204d50', '#edf2ef', equipment);

  // Procedure bed and articulated training mannequin, in a clearly visible left lateral pose.
  function bed(x, z, isRecovery = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    for (const tx of [-0.44, 0.44]) for (const tz of [-0.79, 0.79]) castor(tx, tz, g, 0.16);
    roundedBox(0.72, 0.15, 1.78, palette.trim, 0, 0.28, 0, g);
    box(0.25, 0.31, 0.65, palette.steel, 0, 0.47, 0, g);
    roundedBox(1.03, 0.1, 2.3, palette.white, 0, 0.69, 0, g);
    roundedBox(0.93, 0.145, 2.16, palette.blue, 0, 0.81, 0, g);
    roundedBox(0.91, 0.025, 2.13, palette.linen, 0, 0.89, 0, g);
    const pillow = roundedBox(0.65, 0.13, 0.4, palette.white, 0, 0.96, -0.78, g, 0.16);
    for (const side of [-1, 1]) {
      const y = side < 0 && !isRecovery ? 0.95 : 1.09;
      for (const tz of [-0.54, 0.55]) cylinder(0.014, y - 0.72, palette.steel, side * 0.535, (y + 0.72) / 2, tz, g);
      capsuleBetween([side * 0.535, y, -0.58], [side * 0.535, y, 0.58], 0.023, palette.white, g);
      capsuleBetween([side * 0.535, y - 0.07, -0.58], [side * 0.535, y - 0.07, 0.58], 0.014, palette.steel, g);
    }
    roundedBox(0.88, 0.045, 0.33, palette.white, 0, 0.92, 1.125, g).rotation.x = Math.PI / 2;
    collide(x, z, 1.17, 2.38); return g;
  }
  const procedureBed = bed(-0.55, -0.75);
  const mannequin = new THREE.Group(); procedureBed.add(mannequin);
  // Head, torso and bent limbs are deliberately modeled as a clothed simulator mannequin.
  ellipsoid(0.19, 0.15, 0.245, palette.skin, -0.05, 1.17, -0.78, mannequin).rotation.z = -0.3;
  ellipsoid(0.028, 0.048, 0.032, palette.skin, -0.225, 1.135, -0.87, mannequin);
  ellipsoid(0.03, 0.06, 0.047, palette.skin, -0.17, 1.2, -0.66, mannequin);
  const hair = ellipsoid(0.19, 0.16, 0.16, palette.rubber, 0.007, 1.205, -0.69, mannequin); hair.rotation.z = -0.25;
  capsuleBetween([-0.005, 1.115, -0.55], [0.015, 1.115, -0.42], 0.077, palette.skin, mannequin);
  ellipsoid(0.22, 0.25, 0.43, palette.gown, 0.02, 1.14, -0.15, mannequin).rotation.z = -0.38;
  ellipsoid(0.23, 0.2, 0.22, palette.gown, 0.035, 1.08, 0.2, mannequin);
  capsuleBetween([-0.07, 1.0, -0.35], [-0.23, 0.98, -0.55], 0.07, palette.gown, mannequin);
  capsuleBetween([-0.23, 0.98, -0.55], [-0.25, 1.05, -0.75], 0.055, palette.skin, mannequin);
  ellipsoid(0.055, 0.035, 0.09, palette.skin, -0.25, 1.06, -0.75, mannequin);
  capsuleBetween([0.08, 1.3, -0.34], [-0.2, 1.2, -0.38], 0.074, palette.gown, mannequin);
  capsuleBetween([-0.2, 1.2, -0.38], [-0.28, 1.07, -0.7], 0.052, palette.skin, mannequin);
  ellipsoid(0.055, 0.035, 0.09, palette.skin, -0.28, 1.08, -0.7, mannequin);
  capsuleBetween([0.055, 1.01, 0.25], [-0.25, 1.01, 0.57], 0.1, palette.gown, mannequin);
  capsuleBetween([-0.25, 1.01, 0.57], [-0.17, 0.99, 0.96], 0.065, palette.skin, mannequin);
  capsuleBetween([0.13, 1.17, 0.25], [-0.14, 1.17, 0.54], 0.1, palette.gown, mannequin);
  capsuleBetween([-0.14, 1.17, 0.54], [-0.02, 1.11, 0.92], 0.065, palette.skin, mannequin);
  ellipsoid(0.08, 0.045, 0.14, palette.linen, -0.17, 1, 0.99, mannequin);
  ellipsoid(0.08, 0.045, 0.14, palette.linen, -0.02, 1.1, 0.95, mannequin);
  const drape = roundedBox(0.67, 0.045, 0.65, palette.mint, 0.045, 1.25, 0.44, mannequin, 0.15); drape.rotation.x = -0.12;
  plaque('TRAINING MANNEQUIN', 'Left lateral position', 0.75, 0.15, 0, 0.55, 1.2, 0, '#204d50', '#edf2ef', procedureBed);

  // Instrument tower: workstation, video processor, light source, irrigation and screen.
  const tower = cart(2.03, -2.25, 0.85, 0.7, 3);
  for (const y of [0.45, 0.74]) {
    roundedBox(0.74, 0.18, 0.55, palette.white, 0, y, 0, tower, 0.025);
    box(0.53, 0.11, 0.01, palette.dark, -0.055, y, 0.28, tower);
    for (let i = 0; i < 3; i++) { const button = cylinder(0.017, 0.006, i === 0 ? palette.teal : palette.steel, 0.23 + i * 0.025, y, 0.29, tower); button.rotation.x = Math.PI / 2; }
    for (let i = 0; i < 7; i++) box(0.02, 0.06, 0.01, palette.trim, -0.3 + i * 0.036, y, 0.287, tower);
  }
  cylinder(0.035, 0.77, palette.steel, 0, 1.3, -0.15, tower);
  const monitorCanvas = document.createElement('canvas'); monitorCanvas.width = 640; monitorCanvas.height = 400;
  const mctx = monitorCanvas.getContext('2d'); mctx.fillStyle = '#14262c'; mctx.fillRect(0, 0, 640, 400);
  mctx.strokeStyle = '#416b70'; mctx.lineWidth = 1; for (let x = 0; x < 640; x += 32) { mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, 400); mctx.stroke(); }
  mctx.fillStyle = '#d6e8e2'; mctx.font = '24px Arial'; mctx.fillText('ENDOSCOPY', 36, 60); mctx.fillStyle = '#83aba9'; mctx.font = '16px Arial'; mctx.fillText('PROCEDURE MONITOR', 36, 89);
  mctx.beginPath(); mctx.arc(320, 242, 87, 0, Math.PI * 2); mctx.strokeStyle = '#74a5a3'; mctx.lineWidth = 2; mctx.stroke(); mctx.font = '17px Arial'; mctx.fillText('Ready when you are', 240, 248);
  const idleMonitorTexture = new THREE.CanvasTexture(monitorCanvas); idleMonitorTexture.colorSpace = THREE.SRGBColorSpace; ownedTextures.add(idleMonitorTexture);
  const monitor = instrumentScreen(1.28, 0.8, 0, 1.75, 0.035, tower, -0.26, idleMonitorTexture);
  plaque('VIDEO PROCESSOR', 'Light source / image controls', 0.65, 0.12, 0, 0.93, 0.367, 0, '#dfeae6', '#204d50', tower);
  tube([[0.22, 0.76, 0.22], [0.44, 0.52, 0.23], [0.53, 0.19, 0.01], [0.31, 0.13, -0.42]], 0.017, palette.black, tower);
  cylinder(0.105, 0.25, palette.glass, -0.2, 1.095, 0.08, tower); cylinder(0.06, 0.025, palette.teal, -0.2, 1.232, 0.08, tower);
  const scopeCart = cart(1.4, 0.18, 0.72, 0.53, 2);
  roundedBox(0.61, 0.035, 0.42, palette.blue, 0, 1.002, 0, scopeCart);
  const controlHead = new THREE.Group(); controlHead.position.set(-0.08, 1.05, 0.02); controlHead.rotation.set(0, 0.32, -0.18); scopeCart.add(controlHead);
  roundedBox(0.1, 0.075, 0.28, palette.black, 0, 0, 0, controlHead, 0.045);
  for (const r of [0.045, 0.036]) { const knob = cylinder(r, 0.019, palette.rubber, 0.052 + (r < 0.04 ? 0.017 : 0), 0.019, -0.025, controlHead); knob.rotation.z = Math.PI / 2; }
  for (const z of [-0.095, -0.055]) cylinder(0.015, 0.025, palette.blue, -0.013, 0.05, z, controlHead);
  tube([[-0.08, 1.06, -0.1], [-0.21, 1.06, -0.16], [-0.26, 1.06, 0.12], [0.18, 1.06, 0.15], [0.25, 1.06, -0.11], [0.05, 1.06, -0.16]], 0.012, palette.black, scopeCart);
  tube([[-0.07, 1.05, 0.17], [-0.33, 0.9, 0.1], [-0.38, 0.4, 0], [-0.12, 0.35, -0.18], [0.34, 0.68, -0.22]], 0.021, palette.black, scopeCart);
  plaque('ENDOSCOPE', 'Control head & insertion tube', 0.58, 0.13, 0, 0.73, 0.282, 0, '#204d50', '#edf2ef', scopeCart);

  // Hand hygiene and PPE station, with a ceramic basin, mixer and dispensers.
  const hygiene = new THREE.Group(); hygiene.position.set(-2.65, 0, -3.48); scene.add(hygiene);
  box(1.53, 0.71, 0.65, palette.pale, 0, 0.4, 0, hygiene);
  box(1.62, 0.05, 0.74, palette.white, 0, 0.78, 0, hygiene);
  roundedBox(0.65, 0.065, 0.43, palette.steel, -0.28, 0.815, 0.015, hygiene, 0.16);
  roundedBox(0.53, 0.028, 0.32, palette.dark, -0.28, 0.853, 0.015, hygiene, 0.14);
  roundedBox(0.46, 0.025, 0.27, palette.white, -0.28, 0.868, 0.015, hygiene, 0.12);
  tube([[-0.3, 0.82, -0.2], [-0.3, 1.06, -0.2], [-0.3, 1.12, -0.12], [-0.3, 1.09, 0.015]], 0.023, palette.steel, hygiene);
  box(0.026, 0.08, 0.022, palette.steel, -0.21, 0.95, -0.21, hygiene);
  for (const x of [0.38, 0.61]) {
    roundedBox(0.18, 0.06, 0.3, x === 0.38 ? palette.blue : palette.teal, x, 0.84, 0.07, hygiene, 0.025);
    plaque(x === 0.38 ? 'GLOVES' : 'MASKS', '', 0.16, 0.04, x, 0.881, 0.23, 0, '#edf2ef', '#204d50', hygiene);
  }
  box(1.5, 1.2, 0.035, palette.white, 0, 1.62, -0.52, hygiene);
  for (const x of [-0.38, 0.08]) {
    roundedBox(0.26, 0.13, 0.36, palette.white, x, 1.66, -0.42, hygiene).rotation.x = Math.PI / 2;
    box(0.16, 0.08, 0.025, palette.teal, x, 1.71, -0.338, hygiene);
    box(0.13, 0.038, 0.04, palette.steel, x, 1.47, -0.32, hygiene);
  }
  box(0.31, 0.32, 0.1, palette.pale, 0.51, 1.65, -0.41, hygiene);
  box(0.21, 0.007, 0.03, palette.white, 0.51, 1.48, -0.32, hygiene);
  plaque('HAND HYGIENE / PPE', 'Prepare before patient contact', 1.42, 0.22, 0, 2.05, -0.485, 0, '#204d50', '#edf2ef', hygiene);
  collide(-2.65, -3.48, 1.65, 0.8);
  cylinder(0.18, 0.48, palette.white, -3.35, 0.25, -2.5); cylinder(0.19, 0.027, palette.teal, -3.35, 0.506, -2.5);
  box(0.065, 0.035, 0.1, palette.steel, -3.35, 0.075, -2.28); collide(-3.35, -2.5, 0.4, 0.4);
  // Biopsy trolley: a specimen rack, sealed jars, instrument tray and accessory packets.
  const biopsyCart = cart(2.6, 1.05, 0.8, 0.58, 2);
  roundedBox(0.45, 0.025, 0.35, palette.steel, -0.11, 0.987, 0, biopsyCart);
  for (let i = 0; i < 4; i++) {
    const x = -0.27 + i * 0.115;
    cylinder(0.038, 0.13, palette.glass, x, 1.066, 0.015, biopsyCart);
    cylinder(0.041, 0.021, palette.teal, x, 1.142, 0.015, biopsyCart);
    box(0.05, 0.035, 0.002, palette.white, x, 1.072, 0.055, biopsyCart);
  }
  roundedBox(0.13, 0.04, 0.31, palette.pale, 0.27, 1.0, 0.025, biopsyCart, 0.015);
  tube([[-0.23, 1.0, -0.19], [-0.14, 1.002, -0.22], [0.01, 1.002, -0.2], [0.12, 1.002, -0.16]], 0.004, palette.steel, biopsyCart);
  for (let i = 0; i < 3; i++) roundedBox(0.3, 0.013, 0.22, palette.white, 0.03, 0.308 + i * 0.016, 0, biopsyCart);
  plaque('BIOPSY & SPECIMENS', 'Accessories / collection', 0.65, 0.14, 0, 0.66, 0.309, 0, '#204d50', '#edf2ef', biopsyCart);
  // Vitals and suction create a recognizable clinical context without medical simulation claims.
  const vitalsCart = cart(-2.5, -0.4, 0.52, 0.48, 2);
  const vitalsTex = labelTexture('SIMULATION', 'SpO2   —      HR   —      BP   —', { background: '#14242a', color: '#82d4b5', width: 768, height: 384 });
  instrumentScreen(0.51, 0.32, 0, 1.17, 0, vitalsCart, 0.4, vitalsTex);
  cylinder(0.07, 0.17, palette.glass, -0.12, 0.38, 0.04, vitalsCart);
  tube([[0.23, 0.98, 0.1], [0.32, 0.71, 0.15], [0.3, 0.26, 0.21]], 0.009, palette.rubber, vitalsCart);
  const iv = new THREE.Group(); iv.position.set(-1.45, 0, -2.8); scene.add(iv);
  cylinder(0.017, 2.05, palette.steel, 0, 1.04, 0, iv);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; capsuleBetween([0, 0.12, 0], [Math.cos(a) * 0.26, 0.08, Math.sin(a) * 0.26], 0.018, palette.steel, iv); castor(Math.cos(a) * 0.26, Math.sin(a) * 0.26, iv, 0.09); }
  capsuleBetween([-0.16, 2.06, 0], [0.16, 2.06, 0], 0.012, palette.steel, iv);
  roundedBox(0.17, 0.065, 0.28, palette.glass, 0.13, 1.83, 0, iv, 0.035).rotation.x = Math.PI / 2;
  tube([[0.12, 1.68, 0], [0.1, 1.34, 0.04], [0.18, 0.92, 0.15]], 0.004, palette.white, iv);
  plaque('PROCEDURE', '02 / Prepare, check, practice', 2.9, 0.5, 0.6, 2.43, -4.32);
  // Wall medical service panel.
  box(2, 0.16, 0.09, palette.white, -0.2, 1.48, -4.23);
  for (let i = 0; i < 5; i++) cylinder(0.027, 0.023, i < 2 ? palette.teal : palette.steel, -0.85 + i * 0.28, 1.48, -4.168).rotation.x = Math.PI / 2;
  plaque('TRAINING / NO CLINICAL USE', '', 1.15, 0.14, 0.8, 1.48, -4.165, 0, '#55716d', '#edf2ef');

  // Recovery: quieter materials, separate bay, chair and nurse observation console.
  const recoveryBed = bed(7.5, -1.15, true);
  roundedBox(0.85, 0.06, 1.35, palette.mint, 0, 0.97, 0.33, recoveryBed, 0.18);
  const recoveryHead = ellipsoid(0.17, 0.15, 0.23, palette.skin, 0, 1.16, -0.76, recoveryBed);
  ellipsoid(0.32, 0.12, 0.55, palette.linen, 0, 1.075, -0.1, recoveryBed);
  const recoveryVitals = cart(8.65, -2.5, 0.55, 0.47, 2); instrumentScreen(0.56, 0.35, 0, 1.22, 0, recoveryVitals, -0.28, vitalsTex);
  chair(10, -1.2, -0.35, palette.blue);
  roundedBox(0.55, 0.06, 0.62, palette.wood, 9.63, 0.61, -2.35); cylinder(0.024, 0.59, palette.steel, 9.63, 0.3, -2.35); cylinder(0.22, 0.025, palette.trim, 9.63, 0.025, -2.35);
  cylinder(0.035, 0.075, palette.white, 9.65, 0.683, -2.3); box(0.27, 0.008, 0.2, palette.pale, 9.56, 0.657, -2.46);
  // A gathered textile privacy curtain, parked clear of the walking route.
  tube([[5.8, 2.83, -3.7], [5.8, 2.83, -0.6], [5.8, 2.83, 1.0], [6.3, 2.83, 1.25]], 0.017, palette.steel);
  const curtainMaterial = mat(0xadc9bc, { roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 13; i++) {
    const x = 5.8 + Math.sin(i * 1.8) * 0.075, z = -3.6 + i * 0.07;
    box(0.023, 2.2, 0.10, curtainMaterial, x, 1.56, z);
    const ring = mesh(new THREE.TorusGeometry(0.031, 0.008, 6, 10), palette.white, 5.8, 2.79, z); ring.rotation.y = Math.PI / 2;
  }
  plaque('RECOVERY', '03 / Observe, hand over, reflect', 3.1, 0.5, 8.1, 2.43, -4.32);
  plant(10.8, -3.7, 1.35); plant(10.8, 3.75, 1.45);
  box(2.5, 0.75, 0.58, palette.wood, 9.4, 0.4, 4.05); box(2.6, 0.045, 0.66, palette.white, 9.4, 0.79, 4.05); collide(9.4, 4.05, 2.6, 0.66);
  const recoveryConsole = instrumentScreen(0.61, 0.39, 9.5, 1.09, 4.04, scene, Math.PI, labelTexture('RECOVERY', 'Assessment & handover', { background: '#173e42', color: '#d6e8e2' }));
  plaque('OBSERVATION & HANDOVER', 'Recovery assessment station', 2.3, 0.34, 9.4, 2.1, 4.375, Math.PI);
  // Wayfinding floor inlays are material details, not movement constraints.
  for (const x of [-4, 4]) box(0.09, 0.008, 1.7, palette.pale, x, 0.003, 2.37);
  plaque('LEARN  /  PREPARE  /  PRACTICE  /  REFLECT', '', 5.5, 0.24, 0, 2.3, 4.37, Math.PI, '#53756f', '#e5ebe3');

  function station(id, title, stationRoom, object, target, view) {
    const entry = { id, title, room: stationRoom, object, target: new THREE.Vector3(...target), view };
    stations.set(id, entry);
    object.traverse(child => { if (child.isMesh) { child.userData.stationId = id; interactables.push(child); } });
    // Floating medallions gently guide attention without covering the apparatus.
    const discMaterial = mat(0x276e69, { emissive: 0x276e69, emissiveIntensity: 0.18, metalness: 0.15, roughness: 0.5 });
    const marker = mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 28), discMaterial, ...target);
    marker.position.y += 0.34; marker.userData.stationId = id; interactables.push(marker); entry.marker = marker;
    const dot = ellipsoid(0.017, 0.017, 0.017, discMaterial, ...marker.position.toArray()); entry.dot = dot;
    return entry;
  }
  station('curriculum', 'Theory & learning path', 'theory', display.group, [-8, 1.7, 4.25], [-8, 1.64, 2.5, Math.PI, 0.02]);
  station('equipment', 'Equipment orientation', 'theory', equipment, [-5.5, 1.0, -1.9], [-5.6, 1.64, -0.45, 0, -0.25]);
  station('hygiene', 'Hand hygiene & PPE', 'procedure', hygiene, [-2.65, 1.65, -3.25], [-2.5, 1.64, -1.9, 0, -0.08]);
  station('patient', 'Patient preparation', 'procedure', mannequin, [-0.55, 1.2, -0.75], [-1.75, 1.64, 0.75, -0.68, -0.26]);
  station('monitor', 'Procedure monitor', 'procedure', tower, [2.03, 1.75, -2.19], [1.7, 1.64, -0.85, -0.23, 0.08]);
  station('scope', 'Endoscope controls', 'procedure', scopeCart, [1.4, 1.02, 0.18], [0.7, 1.64, 1.55, -0.42, -0.28]);
  station('biopsy', 'Biopsy & specimen collection', 'procedure', biopsyCart, [2.6, 1.03, 1.05], [2.6, 1.64, 2.25, 0, -0.28]);
  station('recovery', 'Recovery & handover', 'recovery', recoveryBed, [7.5, 1.1, -1.15], [6.25, 1.64, 0.45, -0.65, -0.2]);
  station('exit', 'Return to learning studio', 'recovery', recoveryConsole.group, [9.4, 1.2, 4.05], [9.3, 1.64, 2.6, Math.PI, -0.16]);

  const prompt = document.createElement('div'); prompt.setAttribute('aria-live', 'polite'); prompt.style.cssText = 'position:absolute;left:50%;bottom:28px;transform:translateX(-50%);padding:10px 16px;border:1px solid rgba(226,242,235,.2);border-radius:7px;background:rgba(16,48,53,.86);color:#eff7f3;font:12px/1.3 system-ui;letter-spacing:.02em;pointer-events:none;opacity:0;transition:opacity .15s;white-space:nowrap;z-index:3;'; container.append(prompt);
  const roomPositions = { theory: [-8, eyeHeight, 2.72, Math.PI, 0], procedure: [-1.75, eyeHeight, 2.62, -0.33, -0.09], recovery: [6.3, eyeHeight, 2.45, -0.31, -0.06] };
  function notifyLocation(force = false) {
    const now = performance.now();
    const nextRoom = camera.position.x < -4 ? 'theory' : camera.position.x > 4 ? 'recovery' : 'procedure';
    if (nextRoom !== room) { room = nextRoom; force = true; }
    if (force || now - lastLocation > 240) { lastLocation = now; onLocation({ room, x: camera.position.x, z: camera.position.z, heading: yaw }); }
  }
  function moveView(position, instant = false) {
    keys.clear();
    if (instant) { camera.position.set(position[0], position[1], position[2]); yaw = position[3]; pitch = position[4]; camera.rotation.set(pitch, yaw, 0); animationTarget = null; notifyLocation(true); }
    else animationTarget = { position: new THREE.Vector3(...position.slice(0, 3)), yaw: position[3], pitch: position[4], elapsed: 0 };
  }
  function setRoom(id) { if (roomPositions[id]) { moveView(roomPositions[id], true); nearest = null; prompt.style.opacity = '0'; } }
  function focusStation(id) {
    const s = stations.get(id); if (!s) return;
    moveView(s.view, true);
    // Focus is navigation only. The host decides whether focusing should open its station panel.
  }
  function emitInteraction(entry) { if (entry) onInteract({ id: entry.id, room: entry.room, title: entry.title }); }
  function getNearest() {
    let candidate = null, distance = 2.7;
    const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
    for (const entry of stations.values()) {
      const delta = entry.target.clone().sub(camera.position), d = delta.length();
      const facing = delta.normalize().dot(direction);
      if (d < distance && facing > 0.22 && entry.room === room) { candidate = entry; distance = d; }
    }
    return candidate;
  }
  function validPosition(x, z) {
    const radius = 0.22;
    if (x < -11.76 || x > 11.76 || z < -4.18 || z > 4.18) return false;
    for (const obstacle of colliders) if (x > obstacle.minX - radius && x < obstacle.maxX + radius && z > obstacle.minZ - radius && z < obstacle.maxZ + radius) return false;
    return true;
  }
  function walk(dx, dz) {
    // Resolve each axis separately, allowing natural sliding along walls and beds.
    if (validPosition(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (validPosition(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
  }
  const isTyping = event => event.target?.matches?.('input,textarea,select,[contenteditable="true"]');
  function keydown(event) {
    if (procedureActive || document.querySelector('dialog[open]') || isTyping(event) || event.ctrlKey || event.metaKey || event.altKey || disposed) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) { keys.add(key); animationTarget = null; event.preventDefault(); }
    if (key === 'e' && !event.repeat) { emitInteraction(getNearest()); event.preventDefault(); }
  }
  function keyup(event) { keys.delete(event.key.toLowerCase()); }
  function pointerDown(event) {
    if (procedureActive || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
    moved = false; animationTarget = null; renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.focus({ preventScroll: true });
  }
  function pointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    yaw -= dx * 0.0033; pitch = THREE.MathUtils.clamp(pitch - dy * 0.0027, -1.12, 1.0);
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 4) moved = true;
    pointer.x = event.clientX; pointer.y = event.clientY;
  }
  function pointerUp(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!moved) {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointerNdc.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length && hits[0].distance < 6) emitInteraction(stations.get(hits[0].object.userData.stationId));
    }
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch {}
    pointer = null;
  }
  function clearInput() { keys.clear(); pointer = null; }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', clearInput);
  window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', clearInput);

  function resize() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  }
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(container); window.addEventListener('resize', resize);
  function setQuality(value) {
    quality = value;
    const low = value === 'low' || value === 'performance', high = value === 'high' || value === 'ultra';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : high ? 2 : 1.5));
    renderer.shadowMap.enabled = !low; sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }
  function setMonitorTexture(input) {
    if (!input) { monitor.material.map = idleMonitorTexture; monitor.material.needsUpdate = true; return; }
    if (input.isTexture) { monitor.material.map = input; }
    else {
      if (monitorTexture?.image !== input) {
        if (monitorTexture) { ownedTextures.delete(monitorTexture); monitorTexture.dispose(); }
        monitorTexture = new THREE.CanvasTexture(input); monitorTexture.colorSpace = THREE.SRGBColorSpace; ownedTextures.add(monitorTexture);
      }
      monitor.material.map = monitorTexture; monitorTexture.needsUpdate = true;
    }
    monitor.material.needsUpdate = true;
  }
  function setProcedureActive(active) { procedureActive = Boolean(active);if(procedureActive){clearInput();prompt.style.opacity='0';} }
  function setPatientPrepared(prepared) { patientPrepared = Boolean(prepared); drape.material = prepared ? palette.mint : palette.blue; }
  function setMuted(value) { muted = Boolean(value); }
  function update(delta, state) {
    if (state) {
      lastState = state;
      if ('procedureActive' in state) setProcedureActive(state.procedureActive);
      if ('patientPrepared' in state) setPatientPrepared(state.patientPrepared);
    }
    // Rendering is owned by this module; update is a host-facing state synchronizer.
    if (monitorTexture) monitorTexture.needsUpdate = true;
  }
  function tick(time) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const delta = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 0.016); lastTime = time;
    if (document.hidden) return;
    if (animationTarget) {
      const factor = 1 - Math.exp(-delta * 8);
      camera.position.lerp(animationTarget.position, factor);
      let angle = animationTarget.yaw - yaw; angle = Math.atan2(Math.sin(angle), Math.cos(angle)); yaw += angle * factor; pitch += (animationTarget.pitch - pitch) * factor;
      animationTarget.elapsed += delta; if (animationTarget.elapsed > 1.2) animationTarget = null;
    }
    let forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    let strafe = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    if (!procedureActive && (forward || strafe)) {
      const len = Math.hypot(forward, strafe), speed = (keys.has('shift') ? 3.2 : 1.8) * delta;
      forward /= len; strafe /= len;
      walk((-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed, (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed);
    }
    camera.rotation.set(pitch, yaw, 0);
    for (const s of stations.values()) {
      s.marker.quaternion.copy(camera.quaternion);
      const near = camera.position.distanceTo(s.target) < 5.2 && s.room === room;
      s.marker.visible = s.dot.visible = near;
      s.marker.material.emissiveIntensity = 0.18 + Math.sin(time * 0.0016) * 0.09;
    }
    const found = procedureActive ? null : getNearest();
    if (found !== nearest) { nearest = found; prompt.textContent = found ? `E · ${found.title}` : ''; prompt.style.opacity = found ? '1' : '0'; }
    if (monitorTexture) monitorTexture.needsUpdate = true;
    notifyLocation(); renderer.render(scene, camera);
  }
  function visibility() { clearInput(); lastTime = 0; }
  document.addEventListener('visibilitychange', visibility);
  setQuality(quality); setRoom('theory'); frame = requestAnimationFrame(tick);
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame);
    resizeObserver?.disconnect(); window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', clearInput);
    for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); for (const texture of ownedTextures) texture.dispose();
    sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); prompt.remove();
  }
  return { setRoom, setMonitorTexture, setProcedureActive, setPatientPrepared, setQuality, setMuted, focusStation, update, dispose, getPosition: () => ({ room, x: camera.position.x, z: camera.position.z, heading: yaw }) };
}

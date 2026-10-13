const neutralPose = () => ({ pitch: 0, yaw: 0, roll: 0 });

export const demoSteps = Object.freeze([
  { id: 'intro', title: 'Meet the scope controls', controlId: null, label: 'Watch first', body: 'This practice view is inside the stomach. Watch each control move the view, then try the controls yourself.', cue: 'The highlighted control and the stomach view work together. Insertion stays fixed during the demonstration.' },
  { id: 'pitch', title: 'Up/down angulation', controlId: 'pitch', label: 'Up/down', body: 'Up/down angulation bends the tip and redirects the view upward or downward.', cue: 'Watch the gastric folds travel vertically across the image as the tip changes direction.' },
  { id: 'yaw', title: 'Left/right angulation', controlId: 'yaw', label: 'Left/right', body: 'Left/right angulation bends the tip sideways and redirects the view left or right.', cue: 'Watch the folds travel across the image. Make small changes while keeping the view in sight.' },
  { id: 'roll', title: 'Shaft rotation', controlId: 'roll', label: 'Shaft rotation', body: 'Shaft rotation turns the scope around its long axis and changes the orientation of the view.', cue: 'Watch the same stomach view rotate. This is a different motion from bending the tip.' },
  { id: 'centre', title: 'Return to neutral', controlId: 'centre', label: 'Centre', body: 'Centre resets the up/down, left/right and shaft rotation commands to zero.', cue: 'Watch the view return to its neutral orientation. Centre does not automatically find or centre the lumen.' },
  { id: 'practice', title: 'Your turn', controlId: null, label: 'Try the controls', body: 'Move Up/down, Left/right and Shaft rotation, then press Centre. Notice how each change affects the stomach view.', cue: 'You control the motion now. Take as long as you need, then finish the demo to continue.' },
].map(step => Object.freeze(step)));

/** Elapsed time is in seconds. Practice yields null: the learner owns its pose. */
export function demoPose(stepId, elapsedSeconds = 0) {
  if (stepId === 'practice') return null;
  const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const pose = neutralPose();
  if (['pitch', 'yaw', 'roll'].includes(stepId)) {
    // Eight seconds per loop: neutral, one direction, neutral, the other, neutral.
    pose[stepId] = .45 * Math.sin((time % 8) * Math.PI / 4);
  } else if (stepId === 'centre') {
    const progress = Math.min(1, time / 3);
    const remaining = 1 - progress * progress * (3 - 2 * progress);
    pose.pitch = .35 * remaining;
    pose.yaw = -.28 * remaining;
    pose.roll = .45 * remaining;
  }
  return pose;
}

export function createControlDemoState({ initialStep = 'intro', initialPaused = false } = {}) {
  const found = demoSteps.findIndex(step => step.id === initialStep);
  const index = found < 0 ? 0 : found;
  const practicing = demoSteps[index].id === 'practice';
  return Object.freeze({ stepId: demoSteps[index].id, index, paused: practicing ? false : Boolean(initialPaused), practicing, elapsedSeconds: 0, replayCount: 0, closed: false });
}

/** Pure navigation state. The simulator owns time, rendering and procedure state. */
export function reduceControlDemoState(state, action) {
  if (state.closed) return state;
  const type = typeof action === 'string' ? action : action?.type;
  if (type === 'finish' || type === 'skip') return Object.freeze({ ...state, closed: true });
  if (type === 'toggle-motion') {
    if (state.practicing || state.stepId === 'intro') return state;
    return Object.freeze({ ...state, paused: !state.paused });
  }
  if (type === 'replay') {
    if (state.practicing || state.stepId === 'intro') return state;
    return Object.freeze({ ...state, paused: false, elapsedSeconds: 0, replayCount: state.replayCount + 1 });
  }
  let index = state.index;
  if (type === 'next') index = Math.min(demoSteps.length - 1, index + 1);
  else if (type === 'previous') index = Math.max(0, index - 1);
  else if (type === 'try-controls') index = demoSteps.length - 1;
  else return state;
  if (index === state.index) return state;
  const practicing = demoSteps[index].id === 'practice';
  return Object.freeze({ ...state, index, stepId: demoSteps[index].id, practicing, paused: practicing ? false : state.paused, elapsedSeconds: 0 });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function diagramElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text) node.textContent = text;
  return node;
}

function createTipDiagram() {
  const root = element('figure', 'control-demo-diagram');
  const svg = diagramElement('svg', { viewBox: '0 0 250 112', role: 'img' });
  const shaft = diagramElement('path', { class: 'control-demo-diagram-shaft', d: 'M28 55H88C114 55 127 55 147 55' });
  const camera = diagramElement('circle', { class: 'control-demo-diagram-camera', cx: 147, cy: 55, r: 5 });
  const direction = diagramElement('path', { class: 'control-demo-diagram-direction' });
  const rotation = diagramElement('g', { class: 'control-demo-diagram-rotation' });
  rotation.append(diagramElement('ellipse', { cx: 70, cy: 55, rx: 12, ry: 23 }), diagramElement('path', { d: 'm62 35 7-5 1 9' }));
  const orientation = diagramElement('g', { class: 'control-demo-diagram-orientation' });
  const orientationLine = diagramElement('path');
  orientation.append(diagramElement('circle', { cx: 219, cy: 55, r: 14 }), orientationLine);
  svg.append(shaft, camera, direction, rotation, orientation,
    diagramElement('text', { x: 28, y: 18 }, 'Shaft'),
    diagramElement('text', { x: 112, y: 101 }, 'Distal tip'),
    diagramElement('text', { x: 161, y: 18 }, 'Camera direction'));
  const caption = element('figcaption', 'control-demo-diagram-caption');
  root.append(svg, caption);
  return { root, svg, shaft, camera, direction, rotation, orientation, orientationLine, caption };
}

/**
 * Mount in the existing coach body. No clocks, global events or procedure credit.
 * onStep(step, state) fires immediately and whenever navigation/replay resets time.
 * onMotionChange(state) lets the caller pause its demonstration clock.
 */
export function mountControlDemo(container, {
  onStep = () => {}, onFinish = () => {}, onSkip = () => {},
  onReplay = () => {}, onMotionChange = () => {}, initialStep = 'intro', initialPaused,
} = {}) {
  if (!container || typeof container.append !== 'function') throw new TypeError('mountControlDemo requires a DOM container.');
  let state = createControlDemoState({ initialStep, initialPaused: initialPaused ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false });
  let destroyed = false;
  const root = element('section', 'control-demo');
  root.setAttribute('aria-label', 'Scope controls demonstration');
  const header = element('div', 'control-demo-header');
  const progress = element('span', 'control-demo-progress');
  const skip = element('button', 'control-demo-skip', 'Skip demo');
  skip.type = 'button';
  header.append(element('span', 'control-demo-eyebrow', 'CONTROLS DEMO'), skip);
  const track = element('div', 'control-demo-track');
  track.setAttribute('aria-hidden', 'true');
  const marks = demoSteps.map(() => element('span', 'control-demo-mark'));
  track.append(...marks);
  const title = element('h2', 'control-demo-title');
  title.tabIndex = -1;
  const label = element('div', 'control-demo-control');
  const body = element('p', 'control-demo-body');
  const cue = element('p', 'control-demo-cue');
  const diagram = createTipDiagram();
  const motionStatus = element('p', 'control-demo-motion-status');
  motionStatus.setAttribute('role', 'status');
  const motionActions = element('div', 'control-demo-motion-actions');
  const replay = element('button', 'control-demo-replay', 'Replay motion');
  const pause = element('button', 'control-demo-pause', 'Pause motion');
  replay.type = pause.type = 'button';
  motionActions.append(replay, pause);
  const navigation = element('div', 'control-demo-navigation');
  const previous = element('button', 'control-demo-previous', 'Previous');
  const next = element('button', 'control-demo-next', 'Next');
  previous.type = next.type = 'button';
  navigation.append(previous, next);
  const tryControls = element('button', 'control-demo-try', 'Try controls');
  const finish = element('button', 'control-demo-finish', 'Finish demo');
  tryControls.type = finish.type = 'button';
  const note = element('p', 'control-demo-note', 'Orientation values are simulator commands, not calibrated bend angles for a real device. This demo does not add procedure credit.');
  const content = element('div', 'control-demo-content');
  content.append(title, label, body, diagram.root, cue, motionStatus, motionActions, note);
  const footer = element('div', 'control-demo-footer');
  footer.append(navigation, tryControls, finish);
  root.append(header, progress, track, content, footer);
  container.append(root);

  function updatePose(pose) {
    if (destroyed || !pose) return;
    const safe = axis => Number.isFinite(pose[axis]) ? Math.max(-1.5, Math.min(1.5, pose[axis])) : 0;
    const active = state.stepId === 'yaw' ? safe('yaw') : safe('pitch');
    const angle = active * 1.4;
    const tipY = 55 - Math.sin(angle) * 25;
    const endX = 147 + Math.cos(angle) * 40;
    const endY = tipY - Math.sin(angle) * 40;
    const arrowX = endX - Math.cos(angle) * 8;
    const arrowY = endY + Math.sin(angle) * 8;
    diagram.shaft.setAttribute('d', `M28 55H88C114 55 127 ${tipY} 147 ${tipY}`);
    diagram.camera.setAttribute('cy', tipY);
    diagram.direction.setAttribute('d', `M155 ${tipY}L${endX} ${endY}M${arrowX - Math.sin(angle) * 4} ${arrowY - Math.cos(angle) * 4}L${endX} ${endY}L${arrowX + Math.sin(angle) * 4} ${arrowY + Math.cos(angle) * 4}`);
    const roll = safe('roll');
    diagram.orientationLine.setAttribute('d', `M${219 - Math.sin(roll) * 9} ${55 - Math.cos(roll) * 9}L${219 + Math.sin(roll) * 9} ${55 + Math.cos(roll) * 9}`);
  }

  function render({ focus = false } = {}) {
    const step = demoSteps[state.index];
    root.setAttribute('data-step', step.id);
    root.setAttribute('data-control', step.controlId || '');
    progress.textContent = `Step ${state.index + 1} of ${demoSteps.length}`;
    marks.forEach((mark, index) => mark.setAttribute('data-status', index === state.index ? 'current' : index < state.index ? 'seen' : 'upcoming'));
    title.textContent = step.title;
    label.textContent = step.controlId ? `Highlighted control · ${step.label}` : step.label;
    body.textContent = step.body;
    cue.textContent = step.cue;
    const rotating = step.id === 'roll';
    diagram.rotation.setAttribute('visibility', rotating ? 'visible' : 'hidden');
    diagram.orientation.setAttribute('visibility', rotating ? 'visible' : 'hidden');
    diagram.svg.setAttribute('aria-label', rotating ? 'Illustration of rotation around the shaft and the changing image orientation' : 'Illustration of the distal tip bend and its camera direction');
    diagram.caption.textContent = rotating ? 'Turn around the shaft · image orientation rotates' : step.id === 'yaw' ? 'View from above · tip aims left or right' : step.id === 'centre' ? 'Neutral commands · the lumen may still be off-centre' : 'Tip bend redirects the camera · illustrative only';
    updatePose(demoPose(step.id, 0) || neutralPose());
    const hasMotion = !state.practicing && step.id !== 'intro';
    motionStatus.textContent = state.practicing ? 'Hands-on practice · automatic motion is off' : hasMotion ? state.paused ? 'Motion paused · resume when you are ready' : 'Demonstration motion is playing' : 'A fixed stomach view, ready for the demonstration';
    motionActions.hidden = !hasMotion;
    replay.disabled = pause.disabled = !hasMotion || state.closed;
    pause.textContent = state.paused ? 'Resume motion' : 'Pause motion';
    pause.setAttribute('aria-pressed', String(state.paused));
    previous.disabled = state.index === 0 || state.closed;
    next.hidden = state.practicing;
    next.disabled = state.closed;
    next.textContent = step.id === 'intro' ? 'Show Up/down' : step.id === 'centre' ? 'Try controls' : 'Next';
    tryControls.hidden = state.practicing;
    finish.hidden = !state.practicing;
    tryControls.disabled = finish.disabled = skip.disabled = state.closed;
    if (focus) {
      content.scrollTop = 0;
      title.focus({ preventScroll: true });
    }
  }

  function dispatch(action) {
    if (destroyed) return;
    const before = state;
    state = reduceControlDemoState(state, action);
    if (state === before) return;
    render({ focus: state.index !== before.index });
    if (action === 'finish') onFinish(state);
    else if (action === 'skip') onSkip(state);
    else if (action === 'toggle-motion') onMotionChange(state);
    else {
      onStep(demoSteps[state.index], state);
      if (action === 'replay') onReplay(demoSteps[state.index], state);
    }
  }
  skip.addEventListener('click', () => dispatch('skip'));
  previous.addEventListener('click', () => dispatch('previous'));
  next.addEventListener('click', () => dispatch('next'));
  tryControls.addEventListener('click', () => dispatch('try-controls'));
  finish.addEventListener('click', () => dispatch('finish'));
  replay.addEventListener('click', () => dispatch('replay'));
  pause.addEventListener('click', () => dispatch('toggle-motion'));
  render();
  onStep(demoSteps[state.index], state);
  return {
    getState: () => state,
    next: () => dispatch('next'), previous: () => dispatch('previous'),
    tryControls: () => dispatch('try-controls'), replay: () => dispatch('replay'),
    toggleMotion: () => dispatch('toggle-motion'),
    updatePose,
    finish: () => dispatch('finish'), skip: () => dispatch('skip'),
    destroy() { destroyed = true; root.remove(); },
  };
}

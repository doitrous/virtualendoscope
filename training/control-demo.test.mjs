import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSteps, demoPose, createControlDemoState, reduceControlDemoState, mountControlDemo } from './control-demo.mjs';

test('each taught axis has a single control target and practice has no automatic pose', () => {
  assert.deepEqual(demoSteps.map(step => step.id), ['intro', 'pitch', 'yaw', 'roll', 'centre', 'practice']);
  assert.deepEqual(demoSteps.map(step => step.controlId), [null, 'pitch', 'yaw', 'roll', 'centre', null]);
  assert.equal(demoPose('practice', 5), null);
  assert.deepEqual(demoPose('intro', 5), { pitch: 0, yaw: 0, roll: 0 });
  assert.match(demoSteps.find(step => step.id === 'centre').cue, /does not automatically.*centre the lumen/);
});

test('single-axis demonstration moves both directions, stays bounded, and returns to neutral', () => {
  for (const axis of ['pitch', 'yaw', 'roll']) {
    assert.deepEqual(demoPose(axis, 0), { pitch: 0, yaw: 0, roll: 0 });
    assert.equal(demoPose(axis, 2)[axis], .45);
    assert.equal(demoPose(axis, 6)[axis], -.45);
    assert.deepEqual(demoPose(axis, 8), { pitch: 0, yaw: 0, roll: 0 });
    for (let time = 0; time < 16; time += .03125) {
      const pose = demoPose(axis, time);
      for (const [name, angle] of Object.entries(pose)) {
        assert.ok(Number.isFinite(angle) && Math.abs(angle) <= .55);
        if (name !== axis) assert.equal(angle, 0);
      }
    }
  }
});

test('Centre smoothly returns all commands to zero and invalid time cannot corrupt the pose', () => {
  const start = demoPose('centre', 0);
  const middle = demoPose('centre', 1.5);
  assert.deepEqual(start, { pitch: .35, yaw: -.28, roll: .45 });
  for (const axis of ['pitch', 'yaw', 'roll']) assert.equal(middle[axis], start[axis] / 2);
  assert.deepEqual(demoPose('centre', 3), { pitch: 0, yaw: -0, roll: 0 });
  assert.deepEqual(demoPose('centre', 500), demoPose('centre', 3));
  for (const time of [NaN, Infinity, -Infinity, -10, '2', null]) {
    assert.deepEqual(demoPose('centre', time), start);
    assert.deepEqual(demoPose('pitch', time), demoPose('pitch', 0));
  }
});

test('pure navigation preserves pauses, allows practice immediately, and never exceeds step bounds', () => {
  let state = createControlDemoState({ initialStep: 'missing' });
  assert.equal(state.stepId, 'intro');
  assert.equal(reduceControlDemoState(state, 'previous'), state);
  state = reduceControlDemoState(state, 'next');
  assert.equal(state.stepId, 'pitch');
  state = reduceControlDemoState(state, 'toggle-motion');
  assert.equal(state.paused, true);
  state = reduceControlDemoState(state, 'next');
  assert.equal(state.stepId, 'yaw');
  assert.equal(state.paused, true);
  state = reduceControlDemoState(state, 'replay');
  assert.equal(state.paused, false);
  assert.equal(state.replayCount, 1);
  state = reduceControlDemoState(state, 'try-controls');
  assert.equal(state.stepId, 'practice');
  assert.equal(state.practicing, true);
  for (const action of ['next', 'toggle-motion', 'replay']) assert.equal(reduceControlDemoState(state, action), state);
  state = reduceControlDemoState(state, 'previous');
  assert.equal(state.stepId, 'centre');
  assert.equal(state.practicing, false);
});

test('closing state is final and immutable', () => {
  const state = createControlDemoState();
  const closed = reduceControlDemoState(state, 'skip');
  assert.equal(state.closed, false);
  assert.equal(closed.closed, true);
  assert.ok(Object.isFrozen(closed));
  for (const action of ['next', 'previous', 'replay', 'finish', 'skip']) assert.equal(reduceControlDemoState(closed, action), closed);
});

test('entering practice always enables manual controls after a paused demonstration', () => {
  const paused = createControlDemoState({ initialStep: 'centre', initialPaused: true });
  for (const action of ['next', 'try-controls']) {
    const practice = reduceControlDemoState(paused, action);
    assert.equal(practice.practicing, true);
    assert.equal(practice.paused, false);
  }
  assert.equal(createControlDemoState({ initialStep: 'practice', initialPaused: true }).paused, false);
});

class TestElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.attributes = {}; this.handlers = {}; this.className = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { (this.handlers[name] ??= []).push(handler); }
  focus() { this.focused = true; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  fire(name) { (this.handlers[name] || []).forEach(handler => handler()); }
  querySelector(selector) { return descendants(this).find(child => child.className.split(' ').includes(selector.slice(1))) || null; }
}
function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
function setup(t, options = {}) {
  const original = globalThis.document;
  globalThis.document = { createElement: tag => new TestElement(tag), createElementNS: (_, tag) => new TestElement(tag) };
  t.after(() => { if (original === undefined) delete globalThis.document; else globalThis.document = original; });
  const container = new TestElement('div');
  const mounted = mountControlDemo(container, options);
  return { container, mounted, get: name => container.querySelector(`.control-demo-${name}`) };
}

test('panel exposes watching, pause, replay and ungated hands-on practice through callbacks', t => {
  const steps = [], replayed = [], motion = [], finished = [];
  const { get, mounted } = setup(t, {
    onStep: (step, state) => steps.push([step.id, state.paused]),
    onReplay: step => replayed.push(step.id),
    onMotionChange: state => motion.push(state.paused),
    onFinish: state => finished.push(state.stepId),
  });
  assert.deepEqual(steps, [['intro', false]]);
  assert.equal(get('previous').disabled, true);
  assert.equal(get('motion-actions').hidden, true);
  get('next').fire('click');
  assert.equal(mounted.getState().stepId, 'pitch');
  assert.equal(get('motion-actions').hidden, false);
  get('pause').fire('click');
  assert.equal(get('pause').textContent, 'Resume motion');
  assert.deepEqual(motion, [true]);
  get('replay').fire('click');
  assert.deepEqual(replayed, ['pitch']);
  assert.equal(mounted.getState().paused, false);
  get('try').fire('click');
  assert.equal(mounted.getState().practicing, true);
  assert.equal(get('finish').hidden, false);
  assert.equal(get('next').hidden, true);
  assert.equal(get('motion-actions').hidden, true);
  get('finish').fire('click');
  get('finish').fire('click');
  mounted.skip();
  assert.deepEqual(finished, ['practice']);
});

test('skip is available before any demonstration and destroys only its own panel', t => {
  const skips = [];
  const { container, get, mounted } = setup(t, { onSkip: state => skips.push(state.closed) });
  const sibling = new TestElement('p');
  container.append(sibling);
  get('skip').fire('click');
  mounted.next();
  get('skip').fire('click');
  assert.deepEqual(skips, [true]);
  mounted.destroy();
  mounted.replay();
  assert.deepEqual(container.children, [sibling]);
});

test('reduced motion starts paused but explicit replay enables demonstration motion', t => {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  t.after(() => { if (original === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = original; });
  const { get, mounted } = setup(t);
  mounted.next();
  assert.equal(mounted.getState().paused, true);
  assert.equal(get('pause').textContent, 'Resume motion');
  mounted.replay();
  assert.equal(mounted.getState().paused, false);
});

test('telemetry updates the tip illustration without changing demo or learner state', t => {
  const { container, mounted, get } = setup(t, { initialStep: 'pitch' });
  const state = mounted.getState();
  const svgNodes = descendants(container);
  const shaft = svgNodes.find(node => node.attributes.class === 'control-demo-diagram-shaft');
  const initial = shaft.attributes.d;
  mounted.updatePose({ pitch: .45, yaw: 0, roll: 0 });
  assert.notEqual(shaft.attributes.d, initial);
  assert.equal(mounted.getState(), state);
  mounted.updatePose({ pitch: NaN, yaw: Infinity, roll: -Infinity });
  assert.equal(shaft.attributes.d, initial);
  mounted.next();
  assert.match(get('diagram-caption').textContent, /left or right/);
  mounted.next();
  assert.match(get('diagram-caption').textContent, /orientation rotates/);
});

test('navigation remains outside scrolling explanations and a new step restores its reading position', t => {
  const { get, mounted } = setup(t);
  const content = get('content');
  const footer = get('footer');
  assert.equal(get('title').parent, content);
  assert.equal(get('note').parent, content);
  assert.equal(get('motion-actions').parent, content);
  assert.equal(get('navigation').parent, footer);
  assert.equal(get('try').parent, footer);
  assert.equal(get('finish').parent, footer);
  content.scrollTop = 180;
  mounted.next();
  assert.equal(content.scrollTop, 0);
  content.scrollTop = 95;
  mounted.toggleMotion();
  assert.equal(content.scrollTop, 95, 'pausing preserves the explanation position');
});

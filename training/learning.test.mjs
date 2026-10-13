import test from 'node:test';
import assert from 'node:assert/strict';
import { mountLearning } from './learning.mjs';

// A small DOM boundary lets these tests exercise real event handlers without
// installing a browser dependency. Rendering and focus details have browser QA.
class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.handlers = {};
    this.style = {};
    this.scrollTop = 0;
    this.className = '';
    this._text = '';
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(' '), ...names])].join(' ').trim(); },
      remove: (...names) => { this.className = this.className.split(' ').filter(name => !names.includes(name)).join(' '); },
    };
  }
  get lastChild() { return this.children.at(-1); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { (this.handlers[name] ??= []).push(handler); }
  querySelector(selector) { return descendants(this, child => selector.startsWith('.') ? child.className.split(' ').includes(selector.slice(1)) : child.tagName === selector)[0] || null; }
  focus() { this.focused = true; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  fire(name) { (this.handlers[name] || []).forEach(handler => handler({ preventDefault() {} })); }
}
function descendants(node, predicate) {
  return node.children.flatMap(child => [...(predicate(child) ? [child] : []), ...descendants(child, predicate)]);
}
function setup(t, options = {}) {
  const original = globalThis.document;
  globalThis.document = { createElement: tag => new TestElement(tag), createElementNS: (_, tag) => new TestElement(tag) };
  t.after(() => { if (original === undefined) delete globalThis.document; else globalThis.document = original; });
  const container = new TestElement('div');
  const mounted = mountLearning(container, { lessons, ...options });
  const root = container.children[0];
  return { container, root, mounted, get: className => root.querySelector(`.${className}`) };
}
const lessons = [
  { id: 'optics', title: 'Optics', category: 'Equipment', sections: [{ heading: 'Clear images', body: 'Restore visibility before navigation.' }], question: { prompt: 'First action?', options: ['Advance blindly', 'Restore the view'], answer: 1, explanation: 'Clear the view.' } },
  { id: 'hygiene', title: 'Hand hygiene', category: 'Preparation', sections: [{ title: 'Clean hands', body: 'Gloves do not replace hand hygiene.' }], question: { prompt: 'Routine preparation?', options: ['Hand hygiene and PPE', 'Gloves only'], correctIndex: 0, explanation: 'Clean hands before patient contact.' } },
];
function choose(root, answer) {
  descendants(root, child => child.type === 'radio')[answer].fire('change');
  root.querySelector('.learning-answer-form').fire('submit');
}

test('initialLesson opens its exact lesson ID and marks the matching navigation item current', t => {
  const { root, get } = setup(t, { initialLesson: 'hygiene' });
  assert.equal(get('learning-article-title').textContent, 'Hand hygiene');
  assert.equal(get('learning-subheading').textContent, 'Clean hands', 'legacy section titles must render');
  const current = descendants(root, child => child.attributes['aria-current'] === 'true');
  assert.equal(current.length, 1);
  assert.match(current[0].textContent, /Hand hygiene/);
  assert.equal(get('learning-primary-button').disabled, true);
  choose(root, 0);
  assert.equal(get('learning-complete-button').disabled, false, 'legacy correctIndex is supported for the initial lesson');
});

test('missing or unknown initialLesson uses the first available lesson and empty libraries stay usable', t => {
  const { get, mounted, container } = setup(t, { initialLesson: 'unavailable' });
  assert.equal(get('learning-article-title').textContent, 'Optics');
  mounted.destroy();
  const empty = mountLearning(container, { lessons: [], initialLesson: 'hygiene' });
  assert.equal(container.querySelector('.learning-progress-label').textContent, '0 of 0 completed');
  assert.ok(container.querySelector('.learning-reader-empty'));
  empty.destroy();
});

test('completion is gated by a correct answer and updates the parent once with the selected lesson ID', t => {
  const callbacks = [];
  const { root, get } = setup(t, { initialLesson: 'hygiene', onComplete: id => callbacks.push(id) });
  get('learning-complete-button').fire('click');
  assert.deepEqual(callbacks, []);
  choose(root, 1);
  assert.equal(get('learning-complete-button').disabled, true);
  get('learning-complete-button').fire('click');
  assert.deepEqual(callbacks, []);
  choose(root, 0);
  assert.equal(get('learning-complete-button').disabled, false);
  assert.deepEqual(callbacks, [], 'checking the answer must not mark completion automatically');
  get('learning-complete-button').fire('click');
  get('learning-complete-button').fire('click');
  assert.deepEqual(callbacks, ['hygiene']);
  assert.equal(get('learning-progress-label').textContent, '1 of 2 completed');
  assert.equal(get('learning-complete-button').disabled, true);
  assert.match(get('learning-completion-note').textContent, /Lesson completed/);
});

test('parent-owned completion survives closing and mounting a newly requested lesson', t => {
  const persisted = { optics: true };
  const callbacks = [];
  const { root, get, mounted, container } = setup(t, {
    initialLesson: 'hygiene', completed: Object.keys(persisted),
    onComplete(id) { persisted[id] = true; callbacks.push(id); },
  });
  assert.equal(get('learning-progress-label').textContent, '1 of 2 completed');
  choose(root, 0);
  get('learning-complete-button').fire('click');
  assert.deepEqual(persisted, { optics: true, hygiene: true });
  mounted.destroy();
  const reopened = mountLearning(container, {
    lessons, initialLesson: 'hygiene', completed: Object.keys(persisted),
    onComplete: id => callbacks.push(id),
  });
  assert.equal(container.querySelector('.learning-article-title').textContent, 'Hand hygiene');
  assert.equal(container.querySelector('.learning-progress-label').textContent, '2 of 2 completed');
  assert.equal(descendants(container, child => child.className.split(' ').includes('is-complete')).length, 2);
  assert.equal(container.querySelector('.learning-complete-button').textContent, 'Lesson completed');
  choose(container, 0);
  assert.equal(container.querySelector('.learning-complete-button').disabled, true);
  container.querySelector('.learning-complete-button').fire('click');
  assert.deepEqual(callbacks, ['hygiene'], 'restored completion must not emit a duplicate callback');
  reopened.destroy();
});

test('filtering retains the selected initial lesson and switching lessons resets answer state', t => {
  const { root, get } = setup(t, { initialLesson: 'hygiene' });
  choose(root, 0);
  get('learning-reader').scrollTop = 180;
  const search = get('learning-search-input');
  search.value = 'optics';
  search.fire('input');
  assert.equal(get('learning-article-title').textContent, 'Hand hygiene');
  descendants(root, child => child.className === 'learning-lesson')[0].fire('click');
  assert.equal(get('learning-article-title').textContent, 'Optics');
  assert.equal(get('learning-primary-button').disabled, true);
  assert.equal(get('learning-complete-button').disabled, true);
  assert.equal(get('learning-feedback').textContent, '');
  search.value = '';
  search.fire('input');
  descendants(root, child => child.className === 'learning-lesson')[1].fire('click');
  assert.equal(get('learning-reader').scrollTop, 180);
  assert.equal(get('learning-primary-button').disabled, true);
});

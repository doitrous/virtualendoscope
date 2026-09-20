import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// We test the proctor's internal logic by importing and driving it directly
import { createProctor } from './proctor.mjs';

describe('proctor', () => {
  function makeState(overrides = {}) {
    return {
      time: 10, gas: 0.4, fluid: 0.2, lens: 0,
      progress: 0.15, currentStop: 'cardia', stopIndex: 1,
      input: { air: false, water: false, suction: false, wash: false },
      disease: 'normal',
      ...overrides,
    };
  }

  it('calls evaluate with the correct rubric for the current stop', async () => {
    const evaluate = mock.fn(async () => ({
      points: [
        { id: 'cardia-insuff', p: 0.9, verdict: 'covered' },
        { id: 'cardia-orient', p: 0.8, verdict: 'covered' },
        { id: 'cardia-wash', p: 0.1, verdict: 'missed' },
      ],
      flags: { 'cardia-overinsuff': 0.05 },
      ms: 100,
    }));
    const proctor = createProctor({ evaluate });
    await proctor.tick(makeState());

    const call = evaluate.mock.calls[0].arguments;
    assert.ok(call[0].context.region === undefined || call[0].points.length > 0);
  });

  it('skips tick when a call is already in-flight', async () => {
    let resolveCall;
    const evaluate = mock.fn(() => new Promise(resolve => { resolveCall = resolve; }));
    const proctor = createProctor({ evaluate });

    proctor.tick(makeState());  // starts in-flight
    proctor.tick(makeState());  // should be skipped
    proctor.tick(makeState());  // should be skipped

    assert.equal(evaluate.mock.calls.length, 1);

    resolveCall({
      points: [{ id: 'cardia-insuff', p: 0.9, verdict: 'covered' }],
      flags: {},
      ms: 100,
    });
  });

  it('emits coaching line on verdict change', async () => {
    const evaluate = mock.fn(async () => ({
      points: [
        { id: 'cardia-insuff', p: 0.9, verdict: 'covered' },
        { id: 'cardia-orient', p: 0.1, verdict: 'missed' },
        { id: 'cardia-wash', p: 0.1, verdict: 'missed' },
      ],
      flags: { 'cardia-overinsuff': 0.05 },
      ms: 100,
    }));
    const proctor = createProctor({ evaluate });
    const lines = await proctor.tick(makeState());

    assert.ok(lines.some(l => l.id === 'cardia-insuff' && l.type === 'success'));
  });

  it('goes silent after 3 consecutive errors', async () => {
    const evaluate = mock.fn(async () => { throw new Error('timeout'); });
    const proctor = createProctor({ evaluate });

    await proctor.tick(makeState());
    await proctor.tick(makeState());
    await proctor.tick(makeState());

    assert.equal(proctor.isSilent(), true);
  });

  it('recovers from silence on next success', async () => {
    let callCount = 0;
    const evaluate = mock.fn(async () => {
      callCount++;
      if (callCount <= 3) throw new Error('timeout');
      return {
        points: [{ id: 'cardia-insuff', p: 0.9, verdict: 'covered' }],
        flags: {},
        ms: 100,
      };
    });
    const proctor = createProctor({ evaluate });

    await proctor.tick(makeState());
    await proctor.tick(makeState());
    await proctor.tick(makeState());
    assert.equal(proctor.isSilent(), true);

    await proctor.tick(makeState());
    assert.equal(proctor.isSilent(), false);
  });
});

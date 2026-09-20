import { RUBRICS } from './rubrics.mjs';

// Real-time technique proctor. Ticks against the current sim state, sends
// the active stop's rubric + state to an injected `evaluate` (Task 8 wires
// this to the examiner server proxy), and turns verdict changes into
// coaching lines. One call in flight at a time (natural backpressure);
// three consecutive evaluate() failures go silent until the next success.
export function createProctor({ evaluate }) {
  let inflight = false;
  let consecutiveErrors = 0;
  let silent = false;
  const prevVerdicts = {};
  const stopResults = {};

  async function tick(simState) {
    if (inflight) return [];

    const rubric = RUBRICS[simState.currentStop];
    if (!rubric) return [];

    const fullRubric = {
      context: { region: simState.currentStop, disease: simState.disease, simState },
      points: rubric.points,
      flags: rubric.flags,
    };

    inflight = true;
    try {
      const result = await evaluate(fullRubric, simState);
      consecutiveErrors = 0;
      silent = false;

      const lines = [];
      for (const point of result.points) {
        const prev = prevVerdicts[point.id];
        if (prev !== point.verdict && point.verdict === 'covered') {
          const text = rubric.points.find(p => p.id === point.id)?.text;
          lines.push({ id: point.id, type: 'success', text: `Good: ${text}` });
        }
        prevVerdicts[point.id] = point.verdict;
      }

      for (const flag of rubric.flags ?? []) {
        const p = result.flags?.[flag.id] ?? 0;
        if (p > 0.7 && !prevVerdicts[`_flag_${flag.id}`]) {
          lines.push({ id: flag.id, type: 'warning', text: `Warning: ${flag.instructions}` });
          prevVerdicts[`_flag_${flag.id}`] = true;
        }
      }

      const allCovered = rubric.points.every(p => prevVerdicts[p.id] === 'covered');
      if (allCovered) {
        stopResults[simState.currentStop] = {
          stop: simState.currentStop,
          points: result.points,
          complete: true,
        };
      }

      return lines;
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) silent = true;
      return [];
    } finally {
      inflight = false;
    }
  }

  function isSilent() { return silent; }
  function getResults() { return stopResults; }

  return { tick, isSilent, getResults };
}

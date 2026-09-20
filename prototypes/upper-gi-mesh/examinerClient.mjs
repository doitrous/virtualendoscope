// Copied from /Users/doitrous/Documents/CodexGPT/Contributions/packages/examiner/examiner.mjs
// (same pattern Task 3 used for the synapse server): @omary98/examiner is not
// published, so server.mjs cannot depend on it as a real package yet. Swap
// this import for the real package once it ships.
export class ExaminerHTTPError extends Error {
  constructor(status, body) {
    super(`Jev returned ${status}`)
    this.name = 'ExaminerHTTPError'
    this.status = status
    this.body = body
  }
}

export class ExaminerTimeoutError extends Error {
  constructor() {
    super('Jev request timed out')
    this.name = 'ExaminerTimeoutError'
  }
}

const API_URL = 'https://api.typesafe.ai/v1/systemone'

export function createExaminer({
  apiKey,
  fetch: fetchFn,
  model = 'jev-latest',
  thresholds = { covered: 0.7, missed: 0.3, classify: 0.6 },
  timeout = 3000,
}) {
  async function callJev(body, signal) {
    const t0 = performance.now()
    let res
    try {
      res = await fetchFn(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') throw new ExaminerTimeoutError()
      throw err
    }
    const ms = Math.round(performance.now() - t0)
    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      throw new ExaminerHTTPError(res.status, errBody)
    }
    const data = await res.json()
    return { data, ms }
  }

  function verdictFor(p, th) {
    if (p >= th.covered) return 'covered'
    if (p <= th.missed) return 'missed'
    return 'uncertain'
  }

  function exactMatch(terms, evidence) {
    const lower = typeof evidence === 'string' ? evidence.toLowerCase() : JSON.stringify(evidence).toLowerCase()
    return terms.every(t => lower.includes(t.toLowerCase()))
  }

  async function evaluate(rubric, evidence) {
    const questions = {}
    for (const point of rubric.points) {
      questions[point.id] = {
        type: 'noul',
        instructions: `The evidence in \`evidence\` covers this marking point: ${point.text}`,
      }
    }
    if (rubric.quality) {
      questions.quality = {
        type: 'score',
        instructions: rubric.quality.instructions,
        criteria: rubric.quality.levels,
      }
    }
    if (rubric.flags) {
      for (const flag of rubric.flags) {
        questions[flag.id] = { type: 'noul', instructions: flag.instructions }
      }
    }

    const signal = timeout ? AbortSignal.timeout(timeout) : undefined
    const { data, ms } = await callJev({ model, state: { context: rubric.context, evidence }, questions }, signal)
    const answers = data.answers ?? data

    const points = rubric.points.map(point => {
      const p = answers[point.id]?.noul ?? 0
      let verdict = verdictFor(p, thresholds)
      let exact
      if (point.exact) {
        exact = exactMatch(point.exact, evidence)
        if (!exact) verdict = 'missed'
      }
      return { id: point.id, p, verdict, ...(point.exact ? { exact } : {}) }
    })

    const quality = rubric.quality ? {
      score: answers.quality?.score,
      confidence: answers.quality?.confidence,
      probabilities: answers.quality?.probabilities,
    } : undefined

    const flags = {}
    if (rubric.flags) {
      for (const flag of rubric.flags) {
        flags[flag.id] = answers[flag.id]?.noul ?? 0
      }
    }

    return { points, quality, flags, usage: data.usage, ms, model: data.model ?? model }
  }

  async function classify(options, query) {
    const choiceOptions = [
      ...options.map(o => ({ id: o.id, name: o.triggers })),
      { id: '_none', name: 'None of the above — the query does not match any option' },
    ]
    const questions = {
      _match: {
        type: 'choice',
        instructions: 'Which option best matches the query in `query`?',
        options: choiceOptions,
      },
    }

    const signal = timeout ? AbortSignal.timeout(timeout) : undefined
    const { data, ms } = await callJev({ model, state: { query }, questions }, signal)
    const answer = (data.answers ?? data)._match

    const picked = answer?.choice
    const confidence = answer?.confidence ?? 0
    const probabilities = answer?.probabilities ?? {}

    if (picked === '_none' || confidence < thresholds.classify) {
      return { pick: null, confidence, probabilities }
    }
    return { pick: picked, confidence, probabilities }
  }

  return { evaluate, classify }
}
